import type { Rarity } from '../lib/types';
import rawFigures from './figures.json';

// To add, remove, or change figures, edit figures.json in this folder.
// Each entry needs: name, theme, year, priceUsed (US dollars), rarity, note.

export const THEMES = [
  'Star Wars',
  'Harry Potter',
  'Marvel',
  'DC',
  'Ninjago',
  'City',
  'Collectibles',
  'Lord of the Rings',
  'Classic Space',
] as const;

export type Theme = (typeof THEMES)[number];

// Brick color for each theme (official LEGO colors).
const THEME_COLORS: Record<Theme, string> = {
  'Star Wars': '#6C6E68', // dark bluish gray
  'Harry Potter': '#720E0F', // dark red
  Marvel: '#D01012', // red
  DC: '#0A3463', // dark blue
  Ninjago: '#237841', // green
  City: '#0055BF', // blue
  Collectibles: '#923978', // magenta
  'Lord of the Rings': '#582A12', // reddish brown
  'Classic Space': '#36AEBF', // medium azure
};

export function themeColor(theme: string): string {
  return THEME_COLORS[theme as Theme] ?? '#6C6E68';
}

export type Figure = {
  id: string;
  name: string;
  theme: string;
  year: number;
  priceUsed: number;
  rarity: Rarity;
  note: string;
};

/** "Cloud City Boba Fett" → "CF", "Mr. Gold" → "MG" */
export function initials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9\u00C0-\u024F]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Lowercase and strip accents, so "Legará" matches "legara". */
export function fold(text: string): string {
  let out = text;
  try {
    out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    // Older JavaScript engines without normalize(): just lowercase.
  }
  return out.toLowerCase();
}

function slugify(text: string): string {
  return fold(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const seen = new Map<string, number>();

export const FIGURES: Figure[] = rawFigures.map((f) => {
  const base = slugify(f.name) || 'figure';
  const count = (seen.get(base) ?? 0) + 1;
  seen.set(base, count);
  return {
    id: count === 1 ? base : `${base}-${count}`,
    name: f.name,
    theme: f.theme,
    year: f.year,
    priceUsed: f.priceUsed,
    rarity: f.rarity as Rarity,
    note: f.note,
  };
});

export function getFigure(id: string | undefined): Figure | undefined {
  return FIGURES.find((f) => f.id === id);
}
