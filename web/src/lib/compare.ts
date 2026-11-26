import { localStore, strings } from '@/lib/local-store';
import { getFigure } from '@/lib/figures';

// The figures picked to compare side by side (up to 3). Kept in this browser.
export const COMPARE_MAX = 3;
const store = localStore<string[]>('legara.compare.v1', (v) => strings(v).filter((id) => !!getFigure(id)).slice(0, COMPARE_MAX), []);

export const useCompare = store.use;

/** Adds or removes a figure. Adding a 4th drops the one picked first. */
export function toggleCompare(id: string): void {
  const list = store.get();
  store.set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id].slice(-COMPARE_MAX));
}

export function clearCompare(): void {
  store.set([]);
}
