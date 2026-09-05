/**
 * Five colours per theme and not one more:
 * background, surface, text, accent, muted.
 * Everything else in the UI is derived from these.
 */
export interface Theme {
  id: string;
  name: string;
  emojiFree: string; // a tiny swatch label, no emoji
  bg: string;
  surface: string;
  text: string;
  accent: string;
  muted: string;
  dark?: boolean;
}

export const THEMES: Theme[] = [
  {
    id: 'paper',
    name: 'Cozy Paper',
    emojiFree: 'cream',
    bg: '#FFFBF5',
    surface: '#FFF6EA',
    text: '#4A3B35',
    accent: '#E8A598',
    muted: '#D9C7B8',
  },
  {
    id: 'matcha',
    name: 'Matcha Latte',
    emojiFree: 'green',
    bg: '#F7F6EC',
    surface: '#FFFDF4',
    text: '#41493B',
    accent: '#A8C09A',
    muted: '#CBCDB6',
  },
  {
    id: 'strawberry',
    name: 'Strawberry Milk',
    emojiFree: 'pink',
    bg: '#FFF5F5',
    surface: '#FFFAFA',
    text: '#54393E',
    accent: '#F0A7B5',
    muted: '#E4C6CB',
  },
  {
    id: 'blueberry',
    name: 'Blueberry Jam',
    emojiFree: 'blue',
    bg: '#F4F5FB',
    surface: '#FBFBFF',
    text: '#3E3A52',
    accent: '#A3AEE0',
    muted: '#C8CBE0',
  },
  {
    id: 'honey',
    name: 'Honey Toast',
    emojiFree: 'gold',
    bg: '#FFF9EC',
    surface: '#FFFDF6',
    text: '#4F3E2B',
    accent: '#EFC26B',
    muted: '#DFCBA4',
  },
  {
    id: 'lavender',
    name: 'Lavender Fog',
    emojiFree: 'purple',
    bg: '#F8F5FC',
    surface: '#FDFBFF',
    text: '#453A52',
    accent: '#C0A9DB',
    muted: '#D5C9E2',
  },
  {
    id: 'cocoa',
    name: 'Cocoa Night',
    emojiFree: 'dark',
    bg: '#332A28',
    surface: '#3E3331',
    text: '#F6E9DC',
    accent: '#E8A598',
    muted: '#6A5750',
    dark: true,
  },
  {
    id: 'plum',
    name: 'Plum Dusk',
    emojiFree: 'dusk',
    bg: '#2E2A3A',
    surface: '#393349',
    text: '#EFE7F5',
    accent: '#B49BE0',
    muted: '#5F5573',
    dark: true,
  },
];

/** Pastel accents that sectors, avatars and contact chips all draw from. */
export const PASTELS: { id: string; name: string; value: string }[] = [
  { id: 'lavender', name: 'Lavender', value: '#C0A9DB' },
  { id: 'mint', name: 'Mint', value: '#9FCFB8' },
  { id: 'sky', name: 'Soft Blue', value: '#A3C4E0' },
  { id: 'peach', name: 'Peach', value: '#F2B58F' },
  { id: 'rose', name: 'Rose', value: '#EFA3B0' },
  { id: 'butter', name: 'Butter', value: '#EFCE7B' },
  { id: 'sage', name: 'Sage', value: '#B4C69A' },
  { id: 'clay', name: 'Clay', value: '#D89A86' },
  { id: 'periwinkle', name: 'Periwinkle', value: '#AAB0E8' },
  { id: 'seafoam', name: 'Seafoam', value: '#95CBC8' },
];

/** Suggested life sectors offered during onboarding. */
export const SECTOR_PRESETS: { name: string; accent: string; icon: string }[] = [
  { name: 'Work', accent: '#A3C4E0', icon: 'briefcase' },
  { name: 'School', accent: '#C0A9DB', icon: 'book' },
  { name: 'Health', accent: '#9FCFB8', icon: 'heart' },
  { name: 'Social', accent: '#EFA3B0', icon: 'people' },
  { name: 'Home', accent: '#F2B58F', icon: 'house' },
  { name: 'Money', accent: '#EFCE7B', icon: 'coin' },
  { name: 'Creative', accent: '#95CBC8', icon: 'palette' },
  { name: 'Rest', accent: '#AAB0E8', icon: 'moon' },
];

/* ---------- colour helpers ---------- */

function clamp(n: number, lo = 0, hi = 255) {
  return Math.min(hi, Math.max(lo, n));
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(Math.round(v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Blend two colours. amount = 0 returns a, 1 returns b. */
export function mix(a: string, b: string, amount: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * amount,
    g1 + (g2 - g1) * amount,
    b1 + (b2 - b1) * amount,
  );
}

export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Relative luminance, used to pick readable text on a pastel fill. */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pastels are for fills, warm dark brown is for text — always.
 *
 * Note this deliberately ignores the theme's own ink: in a dark theme the ink
 * is cream, and cream text on a pastel chip is unreadable. A light fill always
 * wants dark type, whatever the rest of the page is doing.
 */
export const DARK_INK = '#4A3B35';

export function readableOn(bg: string, ink: string = DARK_INK, cream = '#FFFBF5') {
  return luminance(bg) > 0.42 ? ink : cream;
}
