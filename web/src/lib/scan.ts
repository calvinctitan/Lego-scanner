// Talks to the Legará server (backend/api/scan.ts). Scanning is invite-only: the server only
// scans for people with an access code from the owner, so it can't be used up by strangers.

/** Set by the publish workflow from the repository variable SCAN_SERVER_URL. Empty = scanning not open yet. */
const SERVER = (import.meta.env.VITE_SCAN_SERVER_URL ?? '').trim();

export function scanningIsOpen(): boolean {
  return SERVER !== '';
}

/** "legara.vercel.app/api/scan/" → "https://legara.vercel.app/api/scan" */
function endpoint(): string {
  let base = SERVER.replace(/\/+$/, '').replace(/\/api\/scan$/i, '');
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return `${base}/api/scan`;
}

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Very rare';
export type Confidence = 'high' | 'medium' | 'low';

export type ScanResult = {
  isMinifigure: boolean;
  name: string;
  theme: string;
  year: number | null;
  valueUsed: [number, number];
  valueNew: [number, number];
  rarity: Rarity;
  confidence: Confidence;
  note: string;
};

export type ScanErrorKind = 'access-code' | 'cancelled' | 'other';

export class ScanError extends Error {
  kind: ScanErrorKind;
  constructor(message: string, kind: ScanErrorKind = 'other') {
    super(message);
    this.name = 'ScanError';
    this.kind = kind;
  }
}

async function post(body: Record<string, unknown>, signal?: AbortSignal): Promise<{ status: number; data: unknown }> {
  let response: Response;
  try {
    response = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) throw new ScanError('Scan stopped.', 'cancelled');
    throw new ScanError('Couldn’t reach the Legará server. Check your internet connection and try again.');
  }
  const data: unknown = await response.json().catch(() => null);
  return { status: response.status, data };
}

function errorText(data: unknown, status: number): string {
  if (isRecord(data) && typeof data.error === 'string') return data.error;
  return `The server had a problem (error ${status}). Please try again.`;
}

/** Asks the server whether a code is valid, without scanning anything. */
export async function checkAccessCode(code: string): Promise<void> {
  const { status, data } = await post({ check: true, accessCode: code.trim() });
  if (status === 403) throw new ScanError(errorText(data, status), 'access-code');
  if (status >= 400) throw new ScanError(errorText(data, status));
}

/** Sends the photo with the access code; the server asks the AI and returns its estimate. */
export async function scanPhoto(base64Jpeg: string, code: string, signal: AbortSignal): Promise<ScanResult> {
  // One controller for both the Stop button and the time limit.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 90_000);
  const stop = () => controller.abort();
  signal.addEventListener('abort', stop);
  try {
    const { status, data } = await post({ image: base64Jpeg, mediaType: 'image/jpeg', accessCode: code.trim() }, controller.signal);
    if (status === 403) throw new ScanError(errorText(data, status), 'access-code');
    if (status >= 400) throw new ScanError(errorText(data, status));
    const result = toScanResult(data);
    if (!result) throw new ScanError('The server sent back something unexpected. Please try again.');
    return result;
  } catch (error) {
    if (signal.aborted) throw new ScanError('Scan stopped.', 'cancelled');
    if (controller.signal.aborted) throw new ScanError('That took too long. Please try again.');
    throw error;
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener('abort', stop);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toRange(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length < 2) return [0, 0];
  const low = Number(value[0]) || 0;
  const high = Number(value[1]) || 0;
  return low <= high ? [low, high] : [high, low];
}

const RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Very rare'];
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low'];

/** Checks the server's reply has the shape we expect, filling safe defaults where it doesn't. */
function toScanResult(data: unknown): ScanResult | null {
  if (!isRecord(data) || typeof data.isMinifigure !== 'boolean') return null;
  return {
    isMinifigure: data.isMinifigure,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Unknown minifigure',
    theme: typeof data.theme === 'string' ? data.theme.trim() : '',
    year: typeof data.year === 'number' && Number.isFinite(data.year) ? Math.round(data.year) : null,
    valueUsed: toRange(data.valueUsed),
    valueNew: toRange(data.valueNew),
    rarity: RARITIES.includes(data.rarity as Rarity) ? (data.rarity as Rarity) : 'Common',
    confidence: CONFIDENCES.includes(data.confidence as Confidence) ? (data.confidence as Confidence) : 'low',
    note: typeof data.note === 'string' ? data.note.trim() : '',
  };
}
