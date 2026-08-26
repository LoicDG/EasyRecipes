/**
 * Design tokens for EasyRecipes.
 *
 * Warm editorial direction: Newsreader for titles, Karla for everything else,
 * a paprika accent and an olive second colour reserved for the "you have this
 * ingredient" state. Values mirror the Tokens artboard in the design canvas.
 */

export type Palette = {
  background: string;
  surface: string;
  surfaceSunken: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  line: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  olive: string;
  oliveSoft: string;
  oliveInk: string;
  danger: string;
  overlay: string;
};

export const Colors: { light: Palette; dark: Palette } = {
  light: {
    background: '#FBF6EF',
    surface: '#FFFFFF',
    surfaceSunken: '#F2EAE0',
    ink: '#2B2019',
    inkMuted: '#7C6A5D',
    inkFaint: '#A6968A',
    line: '#E8DDD0',
    accent: '#C0532B',
    accentSoft: '#F7E5DA',
    onAccent: '#FFF6F0',
    olive: '#5E7247',
    oliveSoft: '#E7EBDC',
    oliveInk: '#46562F',
    danger: '#B8471F',
    overlay: 'rgba(251, 246, 239, 0.92)',
  },
  dark: {
    background: '#16120E',
    surface: '#1F1913',
    surfaceSunken: '#2A221A',
    ink: '#F6EEE4',
    inkMuted: '#A2907F',
    inkFaint: '#7A6A5C',
    line: '#362C22',
    accent: '#E4794B',
    accentSoft: '#3A241A',
    onAccent: '#1B1009',
    olive: '#9DB36C',
    oliveSoft: '#26301C',
    oliveInk: '#C6D69A',
    danger: '#E8785A',
    overlay: 'rgba(22, 18, 14, 0.9)',
  },
};

export type ThemeColor = keyof Palette;

/** Font families registered in the root layout. */
export const Fonts = {
  display: 'Newsreader_600SemiBold',
  displayRegular: 'Newsreader_500Medium',
  body: 'Karla_400Regular',
  bodyMedium: 'Karla_500Medium',
  bodySemi: 'Karla_600SemiBold',
  bodyBold: 'Karla_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  pill: 999,
} as const;

/** Height of the custom bottom tab bar, excluding the safe-area inset. */
export const TabBarHeight = 64;

/** Palette used for user-created tags, cycled in creation order. */
export const TagColors = [
  '#C0532B',
  '#5E7247',
  '#B07B18',
  '#8E5A2B',
  '#7A6099',
  '#2E7C77',
  '#A63D5B',
  '#4A6B99',
] as const;

/** Fills the parent, for an image layered behind a placeholder. */
export const AbsoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;
