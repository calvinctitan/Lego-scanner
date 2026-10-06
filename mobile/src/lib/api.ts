import { BACKEND_URL } from '../config';
import type { Confidence, Rarity, ScanResult } from './types';

const TIMEOUT_MS = 90_000;
const RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Very rare'];
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low'];

/** Thrown when the user taps Stop. The screen ignores it instead of showing an error. */
export class ScanCancelledError extends Error {
  constructor() {
    super('Scan cancelled');
    this.name = 'ScanCancelledError';
  }
}

/**
 * Sends the photo to our backend, which asks Claude what the figure is worth.
 * The app never talks to Claude directly, so the API key never ships inside the app.
 */
export async function analyzePhoto(base64Jpeg: string, signal: AbortSignal): Promise<ScanResult> {
  if (BACKEND_URL.includes('YOUR-BACKEND')) {
    throw new Error('The app doesn’t know where your backend is yet. Paste its address into src/config.ts.');
  }

  // One controller for both the Stop button and the time limit.
  const controller = new AbortController();
  const stop = () => controller.abort();
  signal.addEventListener('abort', stop);
  const timer = setTimeout(stop, TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL.replace(/\/+$/, '')}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Jpeg, mediaType: 'image/jpeg' }),
      signal: controller.signal,
    });
  } catch {
    if (signal.aborted) throw new ScanCancelledError();
    if (controller.signal.aborted) throw new Error('That took too long. Please try again.');
    throw new Error('Couldn’t reach the Legará server. Check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', stop);
  }

  const data: unknown = await response.json().catch(() => null);
  if (signal.aborted) throw new ScanCancelledError();
  if (!response.ok) {
    const message = isRecord(data) && typeof data.error === 'string' ? data.error : null;
    throw new Error(message ?? `The server had a problem (error ${response.status}). Please try again.`);
  }

  const result = toScanResult(data);
  if (!result) throw new Error('The server sent back something unexpected. Please try again.');
  return result;
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

/** Checks the backend's reply has the shape we expect, filling safe defaults where it doesn't. */
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
