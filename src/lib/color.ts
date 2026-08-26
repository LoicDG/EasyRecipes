function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(channel: number): string {
  return Math.round(Math.max(0, Math.min(255, channel)))
    .toString(16)
    .padStart(2, '0');
}

/** Blends `hex` toward `target` by `amount` (0 keeps hex, 1 returns target). */
export function mix(hex: string, target: string, amount: number): string {
  const [r1, g1, b1] = parseHex(hex);
  const [r2, g2, b2] = parseHex(target);
  return `#${toHex(r1 + (r2 - r1) * amount)}${toHex(g1 + (g2 - g1) * amount)}${toHex(
    b1 + (b2 - b1) * amount
  )}`;
}

/**
 * Tag colours are picked once and reused in both schemes, so each is adapted at
 * render time: lightened for legibility on dark, paled into a soft fill on light.
 */
export function tagPalette(
  hex: string,
  isDark: boolean
): { foreground: string; background: string } {
  if (isDark) {
    return {
      foreground: mix(hex, '#FFFFFF', 0.42),
      background: mix(hex, '#16120E', 0.78),
    };
  }
  return {
    foreground: mix(hex, '#000000', 0.06),
    background: mix(hex, '#FFFFFF', 0.85),
  };
}
