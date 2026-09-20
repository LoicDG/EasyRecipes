import Svg, { Path } from 'react-native-svg';

/** Bowl silhouette; the checkmark's vertex sits inside it. */
const BOWL = 'M15 47 H85 C85 71 71 84 50 84 C29 84 15 71 15 47 Z';
/** Stroked twice: wide in `color` for the spoon's outline, narrow in `background` to hollow it. */
const CHECK = 'M31 55 L45 70 L77 26';

/**
 * The app mark — a spoon standing in a bowl, drawn as a checkmark.
 *
 * `background` is a prop rather than a mask because the spoon's interior is a
 * cut-out: react-native-svg's <Mask> is patchy on Android, and in-app the mark
 * always sits on a known theme surface, so painting the cut is both simpler and
 * safer. Pass the colour of whatever it is sitting on.
 */
export function LogoMark({
  size = 40,
  color,
  background,
}: {
  size?: number;
  color: string;
  background: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d={BOWL} fill={color} />
      <Path
        d={CHECK}
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={CHECK}
        stroke={background}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
