import { useMemo } from 'react';

import { FIGURES, getFigure } from '@/lib/figures';
import { useProgress, type Progress } from '@/lib/progress';
import { useScanHistory } from '@/lib/scan-history';
import { useShelf, type Shelf } from '@/lib/shelf';

// Badges you earn by using Legará. They're worked out from what this browser already remembers
// (your shelf, your scans, your best streak…), so there's nothing extra to store except which ones
// you've already been told about.

export type Badge = {
  id: string;
  name: string;
  how: string;
  color: string;
  earned: (s: { shelf: Shelf; progress: Progress; scans: number }) => boolean;
};

const worth = (ids: string[]) => ids.reduce((sum, id) => sum + (getFigure(id)?.priceUsed ?? 0), 0);
const themes = [...new Set(FIGURES.map((f) => f.theme))];

export const BADGES: Badge[] = [
  { id: 'first-brick', name: 'First brick', how: 'Put a figure on your shelf.', color: '#c91a09', earned: ({ shelf }) => shelf.have.length >= 1 },
  { id: 'collector', name: 'Collector', how: 'Have 5 figures on your shelf.', color: '#0055bf', earned: ({ shelf }) => shelf.have.length >= 5 },
  { id: 'treasure', name: 'Treasure hunter', how: 'Make your shelf worth $500 or more.', color: '#f2cd37', earned: ({ shelf }) => worth(shelf.have) >= 500 },
  { id: 'full-set', name: 'Full set', how: 'Have every figure from one theme.', color: '#237841', earned: ({ shelf }) => themes.some((t) => FIGURES.filter((f) => f.theme === t).every((f) => shelf.have.includes(f.id))) },
  { id: 'good-deal', name: 'Good deal', how: 'Own a figure worth more than you paid for it.', color: '#069d9f', earned: ({ shelf }) => shelf.have.some((id) => typeof shelf.paid[id] === 'number' && (getFigure(id)?.priceUsed ?? 0) > shelf.paid[id]) },
  { id: 'wishful', name: 'Wishful thinking', how: 'Put 3 figures on your wishlist.', color: '#923978', earned: ({ shelf }) => shelf.want.length >= 3 },
  { id: 'explorer', name: 'Explorer', how: 'Look at 10 different figures.', color: '#fe8a18', earned: ({ shelf }) => shelf.seen.length >= 10 },
  { id: 'sharp-eye', name: 'Sharp eye', how: 'Get 5 right in a row in Higher or lower.', color: '#36aebf', earned: ({ progress }) => progress.quizBest >= 5 },
  { id: 'price-master', name: 'Price master', how: 'Get 10 right in a row in Higher or lower.', color: '#ff698f', earned: ({ progress }) => progress.quizBest >= 10 },
  { id: 'side-by-side', name: 'Side by side', how: 'Compare figures.', color: '#a0a5a9', earned: ({ progress }) => progress.compared },
  { id: 'regular', name: 'Regular', how: 'Open the figure of the day on 3 different days.', color: '#583927', earned: ({ progress }) => progress.dailyDays.length >= 3 },
  { id: 'first-scan', name: 'First scan', how: 'Scan a figure.', color: '#5a93db', earned: ({ scans }) => scans >= 1 },
];

/** Every badge, and whether it's earned in this browser. */
export function useBadges(): { badge: Badge; earned: boolean }[] {
  const shelf = useShelf();
  const progress = useProgress();
  const scans = useScanHistory().length;
  return useMemo(() => BADGES.map((badge) => ({ badge, earned: badge.earned({ shelf, progress, scans }) })), [shelf, progress, scans]);
}
