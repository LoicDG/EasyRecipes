import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { Fonts, Radius } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { tagPalette } from '@/lib/color';
import type { Tag } from '@/lib/db';

/** Small uppercase tag shown on recipe cards and the detail header. */
export function TagPill({ tag, size = 'small' }: { tag: Tag; size?: 'small' | 'medium' }) {
  const isDark = useIsDark();
  const { foreground, background } = tagPalette(tag.color, isDark);
  const medium = size === 'medium';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: background,
          paddingHorizontal: medium ? 10 : 7,
          paddingVertical: medium ? 5 : 3,
        },
      ]}>
      <Text style={[styles.pillText, { color: foreground, fontSize: medium ? 11 : 10 }]}>
        {tag.name}
      </Text>
    </View>
  );
}

/** Selectable chip used for filtering on Home and for assigning tags in the form. */
export function TagChip({
  tag,
  selected,
  onPress,
  onLongPress,
  showCheck = false,
}: {
  tag: Tag;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  showCheck?: boolean;
}) {
  const theme = useTheme();
  const isDark = useIsDark();
  const { foreground } = tagPalette(tag.color, isDark);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: foreground, borderColor: foreground }
          : { backgroundColor: theme.surface, borderColor: theme.line },
        pressed && { opacity: 0.7 },
      ]}>
      {selected && showCheck ? <CheckIcon size={13} color={theme.surface} /> : null}
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? theme.surface : theme.ink,
            fontFamily: selected ? Fonts.bodySemi : Fonts.bodyMedium,
          },
        ]}>
        {tag.name}
      </Text>
    </Pressable>
  );
}

/** Neutral chip that is not backed by a tag, e.g. "All". */
export function PlainChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: theme.accent, borderColor: theme.accent }
          : { backgroundColor: theme.surface, borderColor: theme.line },
        pressed && { opacity: 0.7 },
      ]}>
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? theme.onAccent : theme.ink,
            fontFamily: selected ? Fonts.bodySemi : Fonts.bodyMedium,
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radius.pill,
  },
  pillText: {
    fontFamily: Fonts.bodySemi,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13.5,
  },
});
