// The Marketplace list is shared with the iPhone app, so there's one file to edit:
// mobile/src/data/figures.json (see README, "Editing the Marketplace figures").
export {
  FIGURES,
  PRICES_CHECKED,
  THEMES,
  findFigureForScan,
  getFigure,
  initials,
  matchesSearch,
  themeColor,
} from '@figures/figures';
export type { Figure } from '@figures/figures';

import type { Figure } from '@figures/figures';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** 1800 → "$1,800" */
export function formatPrice(value: number): string {
  return dollars.format(Math.round(value));
}

/** [40, 60] → "$40 to $60" */
export function formatRange([low, high]: [number, number]): string {
  if (!low && !high) return 'No estimate';
  if (Math.round(low) === Math.round(high)) return formatPrice(low);
  return `${formatPrice(low)} to ${formatPrice(high)}`;
}

export function ebaySearchUrl(name: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`LEGO ${name} minifigure`)}`;
}

/** eBay search filtered to finished sales, so you see what it really sold for. */
export function ebaySoldUrl(name: string): string {
  return `${ebaySearchUrl(name)}&LH_Sold=1&LH_Complete=1`;
}

export function brickLinkSearchUrl(name: string): string {
  return `https://www.bricklink.com/v2/search.page?q=${encodeURIComponent(name)}#T=M`;
}

export type SortKey = 'value-desc' | 'value-asc' | 'newest' | 'oldest' | 'name';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'value-desc', label: 'Most valuable' },
  { key: 'value-asc', label: 'Least valuable' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'name', label: 'A to Z' },
];

export function sortFigures(list: Figure[], key: SortKey): Figure[] {
  const out = [...list];
  switch (key) {
    case 'value-desc':
      return out.sort((a, b) => b.priceUsed - a.priceUsed);
    case 'value-asc':
      return out.sort((a, b) => a.priceUsed - b.priceUsed);
    case 'newest':
      return out.sort((a, b) => b.year - a.year || b.priceUsed - a.priceUsed);
    case 'oldest':
      return out.sort((a, b) => a.year - b.year || b.priceUsed - a.priceUsed);
    case 'name':
      return out.sort((a, b) => a.name.localeCompare(b.name));
  }
}
