// SUBSCRIPTION PLAN SKELETON — Part II: counting each person's scans on the server
//
// The counter in the app (mobile/src/lib/scanCounter.ts) lives on the phone, so anyone can reset it
// by reinstalling the app. Real limits have to be counted here, on the server.

export type Usage = {
  scansToday: number;
  scansThisMonth: number;
};

/** Where the server keeps everyone's scan counts. */
export interface UsageStore {
  get(userId: string, now: Date): Promise<Usage>;
  /** Adds one scan to today's and this month's count. */
  add(userId: string, now: Date): Promise<void>;
}

/** "2026-10-15", by the server's clock (UTC), never the phone's. */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** "2026-10" */
export function monthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/**
 * Keeps counts in memory. Only good for trying the logic on your own computer: on Vercel the
 * memory is wiped often and every copy of the server has its own, so the counts would be wrong.
 *
 * TODO (later): a real database instead, for example Upstash Redis (it has a free plan).
 * Add with one atomic step (Redis INCR), so two scans sent at the same moment can't both slip through.
 */
export class MemoryUsageStore implements UsageStore {
  private counts = new Map<string, number>();

  async get(userId: string, now: Date): Promise<Usage> {
    return {
      scansToday: this.counts.get(`${userId}:${dayKey(now)}`) ?? 0,
      scansThisMonth: this.counts.get(`${userId}:${monthKey(now)}`) ?? 0,
    };
  }

  async add(userId: string, now: Date): Promise<void> {
    for (const key of [`${userId}:${dayKey(now)}`, `${userId}:${monthKey(now)}`]) {
      this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    }
  }
}
