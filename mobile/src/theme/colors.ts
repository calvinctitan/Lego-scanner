// The four classic LEGO brick colors used across the app.
export const brand = {
  red: '#D01012',
  yellow: '#F5CD2F',
  blue: '#0055BF',
  green: '#237841',
} as const;

export const darkText = '#1B1F23';
export const lightText = '#FFFFFF';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Lighten (amount > 0) or darken (amount < 0) a hex color. amount is between -1 and 1. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Picks dark or white text, whichever is easier to read on the given background. */
export function textOn(background: string): string {
  const bg = luminance(background);
  const contrastWithWhite = 1.05 / (bg + 0.05);
  const contrastWithDark = (bg + 0.05) / (luminance(darkText) + 0.05);
  return contrastWithDark > contrastWithWhite ? darkText : lightText;
}
