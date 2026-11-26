import { useSyncExternalStore } from 'react';

import { read, write } from '@/lib/storage';

/**
 * A small value kept in this browser (localStorage) that React components can watch.
 * If storage is blocked (private windows), it still works for the visit; it just isn't remembered.
 */
export function localStore<T>(key: string, parse: (raw: unknown) => T, empty: T) {
  const load = (): T => {
    try {
      const raw = read(key);
      return raw ? parse(JSON.parse(raw)) : empty;
    } catch {
      return empty;
    }
  };
  let value = load();
  const listeners = new Set<() => void>();
  const get = () => value;
  const set = (next: T) => {
    value = next;
    write(key, JSON.stringify(next));
    listeners.forEach((l) => l());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    // Another tab changed it: pick that up.
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        value = load();
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  };
  return { get, set, subscribe, use: () => useSyncExternalStore(subscribe, get, get) };
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
