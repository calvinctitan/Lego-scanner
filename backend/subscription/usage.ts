// SUBSCRIPTION PLAN SKELETON — Part II: counting scans on the server
//
// The counter in the app (mobile/src/lib/scanCounter.ts) lives on the phone, where reinstalling the
// app resets it. The server counts too, using its own clock, so changing the phone's date doesn't
// help either. (A per-person count can still be dodged by someone determined; see Part VI.)

export type Usage = {
  scansToday: number;
  scansThisMonth: number;
};

/** Where the server keeps the scan counts, for each person and for "everyone" together. */
export interface UsageStore {
  get(key: string, now: Date): Promise<Usage>;
  /** Adds one scan to today's and this month's count and returns the new counts, in one step. */
  add(key: string, now: Date): Promise<Usage>;
  /** Takes one scan back off (used when a scan is refused). */
  undo(key: string, now: Date): Promise<void>;
}

/** "2026-10-15". A new day starts at midnight UTC, which is afternoon or evening in the US. */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** "2026-10" */
export function monthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/**
 * Keeps counts in memory. Only good for trying the logic on your own computer: on Vercel the
 * memory is wiped often and every copy of the server has its own, so the limits wouldn't work.
 *
 * TODO (later): a real database instead, for example Upstash Redis (it has a free plan).
 * Use Redis INCR for add(): it adds 1 and gives back the new number in one step. The gate adds
 * the scan BEFORE asking Claude and decides on that new number, so scans sent at the same moment
 * can't all squeeze through on the last free scan.
 */
export class MemoryUsageStore implements UsageStore {
  private counts = new Map<string, number>();

  private keys(key: string, now: Date): [string, string] {
    return [`${key}:${dayKey(now)}`, `${key}:${monthKey(now)}`];
  }

  async get(key: string, now: Date): Promise<Usage> {
    const [day, month] = this.keys(key, now);
    return { scansToday: this.counts.get(day) ?? 0, scansThisMonth: this.counts.get(month) ?? 0 };
  }

  async add(key: string, now: Date): Promise<Usage> {
    for (const k of this.keys(key, now)) this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
    return this.get(key, now);
  }

  async undo(key: string, now: Date): Promise<void> {
    for (const k of this.keys(key, now)) this.counts.set(k, Math.max(0, (this.counts.get(k) ?? 0) - 1));
  }
}
