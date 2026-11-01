import { useSyncExternalStore } from 'react';

import { getFigure } from '@/lib/figures';
import { read, write } from '@/lib/storage';

// "My shelf": the figures you have and the ones you want, plus the ones you looked at lately.
// It's all kept in this browser only (localStorage). Nothing is sent anywhere.

export type ShelfList = 'have' | 'want';

type Shelf = { have: string[]; want: string[]; recent: string[] };

const KEY = 'legara.shelf.v1';
const RECENT_MAX = 8;

function load(): Shelf {
  try {
    const parsed = JSON.parse(read(KEY) ?? '{}') as Partial<Shelf>;
    const clean = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string' && !!getFigure(id)) : []);
    return { have: clean(parsed.have), want: clean(parsed.want), recent: clean(parsed.recent).slice(0, RECENT_MAX) };
  } catch {
    return { have: [], want: [], recent: [] };
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

/** Puts a figure on a list or takes it off. Having a figure takes it off "want", and the other way round. */
export function toggleShelf(list: ShelfList, id: string): void {
  const on = shelf[list].includes(id);
  const other: ShelfList = list === 'have' ? 'want' : 'have';
  set({
    ...shelf,
    [list]: on ? shelf[list].filter((x) => x !== id) : [id, ...shelf[list]],
    [other]: on ? shelf[other] : shelf[other].filter((x) => x !== id),
  });
}

export function rememberViewed(id: string): void {
  if (shelf.recent[0] === id) return;
  set({ ...shelf, recent: [id, ...shelf.recent.filter((x) => x !== id)].slice(0, RECENT_MAX) });
}

export function clearRecent(): void {
  set({ ...shelf, recent: [] });
}
