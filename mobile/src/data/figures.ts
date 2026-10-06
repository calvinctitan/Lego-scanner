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

// Words people use for the same thing, so searching "astronaut" finds "Spaceman".
const SYNONYMS: Record<string, string[]> = {
  astronaut: ['spaceman'],
  spaceman: ['astronaut'],
  trooper: ['stormtrooper'],
  stormtrooper: ['trooper'],
  cop: ['police'],
  policeman: ['police'],
  fireman: ['firefighter'],
  firefighter: ['fireman'],
  gold: ['golden'],
  golden: ['gold'],
  ninja: ['ninjago'],
};

function words(text: string): string[] {
  return fold(text).split(/[^a-z0-9]+/).filter(Boolean);
}

function withSynonyms(list: string[]): string[] {
  return list.flatMap((w) => [w, ...(SYNONYMS[w] ?? [])]);
}

/** True if every word typed matches the start of a word in the figure's name, theme or year. */
export function matchesSearch(figure: Figure, query: string): boolean {
  const typed = words(query);
  if (typed.length === 0) return true;
  const own = withSynonyms(words(`${figure.name} ${figure.theme} ${figure.year}`));
  const squashed = fold(figure.name).replace(/[^a-z0-9]/g, '');
  return typed.every((w) => own.some((o) => o.startsWith(w)) || squashed.includes(w));
}

/**
 * The Marketplace figure a scan most likely refers to, or undefined.
 * Every word of the Marketplace name must appear in the scanned name (allowing synonyms),
 * and the themes must agree, so "Classic Space Astronaut (Red)" finds "Red Classic Spaceman".
 */
export function findFigureForScan(scanName: string, scanTheme: string): Figure | undefined {
  const scanned = new Set(withSynonyms(words(scanName)));
  const themeWordsOf = (theme: string) => words(theme).filter((w) => !['the', 'of', 'and', 'lego'].includes(w));
  const scanThemeWords = themeWordsOf(scanTheme);
  let best: Figure | undefined;
  let bestCount = 0;
  for (const figure of FIGURES) {
    const nameWords = words(figure.name);
    if (!nameWords.every((w) => scanned.has(w))) continue;
    const themeWords = themeWordsOf(figure.theme);
    const themesAgree =
      scanThemeWords.length === 0 ||
      themeWords.some((t) => scanThemeWords.some((s) => s.startsWith(t.slice(0, 6)) || t.startsWith(s.slice(0, 6))));
    if (themesAgree && nameWords.length > bestCount) {
      best = figure;
      bestCount = nameWords.length;
    }
  }
  return best;
}
