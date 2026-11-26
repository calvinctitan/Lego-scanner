import { isRecord, localStore } from '@/lib/local-store';
import type { ScanResult } from '@/lib/scan';

// Your last scans, kept in this browser only (with a tiny picture), so you can look back at them.
export type ScanRecord = {
  id: string;
  at: string;
  thumb: string;
  result: ScanResult;
};

const MAX = 12;

const store = localStore<ScanRecord[]>(
  'legara.scanHistory.v1',
  (v) =>
    Array.isArray(v)
      ? v
          .filter(
            (r): r is ScanRecord =>
              isRecord(r) &&
              typeof r.id === 'string' &&
              typeof r.at === 'string' &&
              typeof r.thumb === 'string' &&
              r.thumb.startsWith('data:image/') &&
              isRecord(r.result) &&
              typeof (r.result as Record<string, unknown>).name === 'string' &&
              Array.isArray((r.result as Record<string, unknown>).valueUsed),
          )
          .slice(0, MAX)
      : [],
  [],
);

export const useScanHistory = store.use;
export const scanCount = () => store.get().length;

/** A small square picture of the photo (about 5 kB), so the history doesn't fill up the browser's storage. */
async function thumbnail(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const size = 112;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.72);
}

export async function rememberScan(photoUrl: string, result: ScanResult): Promise<void> {
  let thumb = '';
  try {
    thumb = await thumbnail(photoUrl);
  } catch {
    // No picture: the result is still worth keeping.
  }
  const record: ScanRecord = { id: `${Date.now()}`, at: new Date().toISOString(), thumb: thumb || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', result };
  store.set([record, ...store.get()].slice(0, MAX));
}

export function forgetScan(id: string): void {
  store.set(store.get().filter((r) => r.id !== id));
}

export function clearScans(): void {
  store.set([]);
}
