// Small things this browser remembers. Private windows and blocked storage just mean nothing is
// remembered; the site still works.

const ACCESS_KEY = 'legara.accessCode.v1';
const COUNTS_KEY = 'legara.dailyScanCounts.v1';
const DAYS_TO_KEEP = 30;

export function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the code just won't be remembered next time.
  }
}

export function savedAccessCode(): string {
  return read(ACCESS_KEY) ?? '';
}

export function saveAccessCode(code: string | null): void {
  write(ACCESS_KEY, code);
}

// Quietly counts scans per day in this browser. Nothing is limited yet; it's here so a
// "3 free scans per day" limit can be added later (see docs/subscription-plan.md).
function todayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function recordScan(): number {
  let counts: Record<string, number> = {};
  try {
    const parsed: unknown = JSON.parse(read(COUNTS_KEY) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) counts = parsed as Record<string, number>;
  } catch {
    counts = {};
  }
  const today = todayKey();
  counts[today] = (counts[today] ?? 0) + 1;
  const kept: Record<string, number> = {};
  for (const day of Object.keys(counts).sort().slice(-DAYS_TO_KEEP)) kept[day] = counts[day];
  write(COUNTS_KEY, JSON.stringify(kept));
  return kept[today];
}
