// The endless catalog: pages of minifigures from Rebrickable's database, through the Legará server
// (backend/api/catalog.ts holds the Rebrickable key). There are no Legará prices for these.
import { endpoint, scanningIsOpen } from '@/lib/scan';

export type CatalogFigure = { id: string; name: string; parts: number | null; url: string | null };
export type CatalogPage = { count: number; page: number; hasMore: boolean; items: CatalogFigure[] };
export type CatalogTheme = { id: number; name: string };

export class CatalogOff extends Error {}

export function catalogCanBeOn(): boolean {
  return scanningIsOpen();
}

async function get(query: URLSearchParams, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${endpoint('catalog')}?${query}`, { signal });
  const data: unknown = await response.json().catch(() => null);
  if (response.status === 503 && data && typeof data === 'object' && String((data as { error?: unknown }).error).includes('switched on')) {
    throw new CatalogOff('off');
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : '';
    throw new Error(message || 'Couldn’t load more minifigures right now.');
  }
  return data;
}

export async function fetchCatalogPage(page: number, search: string, theme: number | null, signal?: AbortSignal): Promise<CatalogPage> {
  const query = new URLSearchParams({ page: String(page) });
  if (search.trim()) query.set('search', search.trim());
  if (theme) query.set('theme', String(theme));
  const data = (await get(query, signal)) as Partial<CatalogPage>;
  return {
    count: typeof data.count === 'number' ? data.count : 0,
    page,
    hasMore: Boolean(data.hasMore),
    items: Array.isArray(data.items) ? data.items.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string') : [],
  };
}

export async function fetchCatalogThemes(signal?: AbortSignal): Promise<CatalogTheme[]> {
  const data = (await get(new URLSearchParams({ themes: '1' }), signal)) as { themes?: CatalogTheme[] };
  return Array.isArray(data.themes) ? data.themes : [];
}

// Each figure gets one of LEGO's bright colours, picked from its name, so the sea of mosaics isn't all one colour.
const COLOURS = ['#c91a09', '#0055bf', '#237841', '#f2cd37', '#a0a5a9', '#fe8a18', '#923978', '#069d9f', '#583927', '#e4adc8'];
export function colourFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLOURS[h % COLOURS.length];
}

/** Rebrickable names are long ("Luke Skywalker - Tatooine, White Legs"); stores search best on the first part. */
export function shortName(name: string): string {
  return name.split(/ - |, | \(/)[0].trim().slice(0, 60) || name.slice(0, 60);
}
