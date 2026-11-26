import { useSyncExternalStore } from 'react';

import { getFigure } from '@/lib/figures';
import { isRecord } from '@/lib/local-store';
import { read, write } from '@/lib/storage';

// "My shelf": the figures you have and the ones you want, what you paid for the ones you have,
// the ones you looked at lately, and every figure you've ever opened (for the Explorer badge).
// It's all kept in this browser only (localStorage). Nothing is sent anywhere.

export type ShelfList = 'have' | 'want';

export type Shelf = { have: string[]; want: string[]; recent: string[]; seen: string[]; paid: Record<string, number> };

const KEY = 'legara.shelf.v1';
const RECENT_MAX = 8;
const MAX_PAID = 100_000;

const known = (list: unknown) => (Array.isArray(list) ? [...new Set(list.filter((id): id is string => typeof id === 'string' && !!getFigure(id)))] : []);

function cleanPaid(v: unknown, have: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(v)) return out;
  for (const id of have) {
    const n = v[id];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= MAX_PAID) out[id] = Math.round(n * 100) / 100;
  }
  return out;
}

function parse(raw: unknown): Shelf {
  const p = isRecord(raw) ? raw : {};
  const have = known(p.have);
  const recent = known(p.recent).slice(0, RECENT_MAX);
  return { have, want: known(p.want).filter((id) => !have.includes(id)), recent, seen: [...new Set([...known(p.seen), ...recent])], paid: cleanPaid(p.paid, have) };
}

function load(): Shelf {
  try {
    return parse(JSON.parse(read(KEY) ?? '{}'));
  } catch {
    return parse({});
  }
}

let shelf: Shelf = load();
const listeners = new Set<() => void>();

function set(next: Shelf) {
  shelf = next;
  write(KEY, JSON.stringify(shelf));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the shelf: pick it up.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      shelf = load();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useShelf(): Shelf {
  return useSyncExternalStore(subscribe, () => shelf, () => shelf);
}

export const getShelf = () => shelf;

/** Puts a figure on a list or takes it off. Having a figure takes it off "want", and the other way round. */
export function toggleShelf(list: ShelfList, id: string): void {
  const on = shelf[list].includes(id);
  const other: ShelfList = list === 'have' ? 'want' : 'have';
  const next = {
    ...shelf,
    [list]: on ? shelf[list].filter((x) => x !== id) : [id, ...shelf[list]],
    [other]: on ? shelf[other] : shelf[other].filter((x) => x !== id),
  };
  // What you paid only means something while the figure is on your shelf.
  next.paid = cleanPaid(shelf.paid, next.have);
  set(next);
}

/** What you paid for a figure you have, in dollars (null clears it). */
export function setPaid(id: string, amount: number | null): void {
  if (!shelf.have.includes(id)) return;
  const paid = { ...shelf.paid };
  if (amount === null || !Number.isFinite(amount) || amount < 0) delete paid[id];
  else paid[id] = Math.min(MAX_PAID, Math.round(amount * 100) / 100);
  set({ ...shelf, paid });
}

export function rememberViewed(id: string): void {
  if (shelf.recent[0] === id && shelf.seen.includes(id)) return;
  set({
    ...shelf,
    recent: [id, ...shelf.recent.filter((x) => x !== id)].slice(0, RECENT_MAX),
    seen: shelf.seen.includes(id) ? shelf.seen : [...shelf.seen, id],
  });
}

export function clearRecent(): void {
  set({ ...shelf, recent: [] });
}

// ── Backup and restore ─────────────────────────────────────────────────────────
// The shelf lives in one browser. A backup file lets you move it to another device or browser.

const BACKUP_KIND = 'legara-shelf-backup';

export function backupText(): string {
  const { have, want, paid } = shelf;
  return JSON.stringify({ kind: BACKUP_KIND, version: 1, savedAt: new Date().toISOString(), have, want, paid }, null, 2);
}

/** Replaces the shelf with a backup. Returns how many figures came back, or an error message. */
export function restoreBackup(text: string): { ok: true; have: number; want: number } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file isn’t a Legará backup.' };
  }
  if (!isRecord(raw) || raw.kind !== BACKUP_KIND) return { ok: false, error: 'That file isn’t a Legará backup.' };
  const restored = parse({ ...raw, recent: shelf.recent, seen: shelf.seen });
  set(restored);
  return { ok: true, have: restored.have.length, want: restored.want.length };
}
