import { useSyncExternalStore } from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';
import { localStore } from '@/lib/local-store';

// Light or dark: "auto" follows the device, or the visitor picks one. The choice is put on <html
// data-theme="…">, and index.css switches the colours with it. index.html sets it before the first
// paint, so a dark choice never flashes white.

export type ThemeChoice = 'auto' | 'light' | 'dark';
const KEY = 'legara.theme.v1';
const store = localStore<ThemeChoice>(KEY, (v) => (v === 'light' || v === 'dark' ? v : 'auto'), 'auto');

const COLORS = { light: '#FFFFFF', dark: '#05131D' };

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'auto') delete root.dataset.theme;
  else root.dataset.theme = choice;
  // The browser's own bars follow too (phones colour the address bar with this).
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own = meta.media.includes('dark') ? COLORS.dark : COLORS.light;
    meta.content = choice === 'auto' ? own : COLORS[choice];
  });
}
if (typeof document !== 'undefined') apply(store.get());
store.subscribe(() => apply(store.get()));

export function setTheme(choice: ThemeChoice): void {
  store.set(choice);
}

/** The visitor's choice, and whether the page is dark right now. */
export function useTheme(): { choice: ThemeChoice; dark: boolean } {
  const choice = useSyncExternalStore(store.subscribe, store.get, store.get);
  const deviceDark = useMediaQuery('(prefers-color-scheme: dark)');
  return { choice, dark: choice === 'dark' || (choice === 'auto' && deviceDark) };
}
