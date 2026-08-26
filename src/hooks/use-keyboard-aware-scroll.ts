import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

/** Breathing room left between the focused field and the top of the keyboard. */
const REVEAL_MARGIN = 24;

/** Long enough for the keyboard padding and any layout shift to settle. */
const SETTLE_MS = 80;

type KeyboardAwareScroll = {
  scrollRef: React.RefObject<ScrollView | null>;
  /** Add to the scroll content's bottom padding so the last field can rise. */
  keyboardHeight: number;
  /** Pass to every TextInput's `onFocus`. */
  onInputFocus: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/**
 * Keeps the field being typed in above the keyboard.
 *
 * Android used to do this for free by resizing the window, but under
 * edge-to-edge (the default from SDK 54) the window keeps its full height and
 * the keyboard simply draws over the bottom of it — so nothing moves and the
 * lower fields end up hidden. This scrolls them back into view by hand.
 */
export function useKeyboardAwareScroll(): KeyboardAwareScroll {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const reveal = useCallback(() => {
    const height = keyboardHeightRef.current;
    const scroller = scrollRef.current;
    const input = TextInput.State.currentlyFocusedInput();
    if (height <= 0 || !scroller || !input) return;

    input.measureInWindow((_x, y, _width, inputHeight) => {
      const keyboardTop = Dimensions.get('window').height - height;
      const hidden = y + inputHeight + REVEAL_MARGIN - keyboardTop;
      if (hidden <= 0) return;
      // Never push the top of the field off the top of the screen.
      const shift = Math.min(hidden, Math.max(0, y - REVEAL_MARGIN));
      if (shift <= 0) return;
      scroller.scrollTo({ y: scrollY.current + shift, animated: true });
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(reveal, SETTLE_MS);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  // Moving from one field to the next fires no keyboard event — the keyboard is
  // already up — so each input has to say when it takes focus.
  const onInputFocus = useCallback(() => {
    if (keyboardHeightRef.current <= 0) return;
    setTimeout(reveal, SETTLE_MS);
  }, [reveal]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { scrollRef, keyboardHeight, onInputFocus, onScroll };
}
