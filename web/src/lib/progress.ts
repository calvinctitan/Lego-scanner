import { isRecord, localStore, strings } from '@/lib/local-store';

// Small things the badges count: best streak in Higher or lower, whether you've compared figures,
// which days you opened the figure of the day, and which badges you've already been told about.
// Kept in this browser only.

export type Progress = { quizBest: number; compared: boolean; dailyDays: string[]; seenBadges: string[] };
const EMPTY: Progress = { quizBest: 0, compared: false, dailyDays: [], seenBadges: [] };

export const progress = localStore<Progress>(
  'legara.progress.v1',
  (v) =>
    isRecord(v)
      ? {
          quizBest: typeof v.quizBest === 'number' && v.quizBest >= 0 ? Math.floor(v.quizBest) : 0,
          compared: v.compared === true,
          dailyDays: strings(v.dailyDays).slice(-60),
          seenBadges: strings(v.seenBadges),
        }
      : EMPTY,
  EMPTY,
);

export const useProgress = progress.use;

export function recordQuizStreak(streak: number): void {
  if (streak > progress.get().quizBest) progress.set({ ...progress.get(), quizBest: streak });
}

export function recordCompared(): void {
  if (!progress.get().compared) progress.set({ ...progress.get(), compared: true });
}

export function recordDailyVisit(day: string): void {
  const p = progress.get();
  if (!p.dailyDays.includes(day)) progress.set({ ...p, dailyDays: [...p.dailyDays, day].slice(-60) });
}

export function markBadgesSeen(ids: string[]): void {
  const p = progress.get();
  const next = [...new Set([...p.seenBadges, ...ids])];
  if (next.length !== p.seenBadges.length) progress.set({ ...p, seenBadges: next });
}

/** Today's date in this browser's own time zone, like "2026-11-26". */
export function today(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
