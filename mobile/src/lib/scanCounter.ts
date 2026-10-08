import AsyncStorage from '@react-native-async-storage/async-storage';

// Quietly counts scans per day on the phone. Nothing is limited yet.
//
// To add a "3 free scans per day" limit later, check before starting a scan:
//   if ((await getScansToday()) >= FREE_SCANS_PER_DAY) { /* show an upgrade message */ }
export const FREE_SCANS_PER_DAY = 3;

const STORAGE_KEY = 'legara.dailyScanCounts.v1';
const DAYS_TO_KEEP = 30;

type Counts = Record<string, number>; // { "2026-10-06": 4, ... }

/** Today's date on the phone's own clock, like "2026-10-06". */
function todayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function readCounts(): Promise<Counts> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Counts) : {};
  } catch {
    return {};
  }
}

export async function getScansToday(): Promise<number> {
  const counts = await readCounts();
  return counts[todayKey()] ?? 0;
}

/** Adds one to today's count and returns the new total. */
export async function recordScan(): Promise<number> {
  const counts = await readCounts();
  const today = todayKey();
  counts[today] = (counts[today] ?? 0) + 1;

  // Keep only the most recent days so this never grows forever.
  const recent = Object.keys(counts).sort().slice(-DAYS_TO_KEEP);
  const trimmed: Counts = {};
  for (const day of recent) trimmed[day] = counts[day];

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Counting is best-effort; never block a scan because of it.
  }
  return trimmed[today];
}
