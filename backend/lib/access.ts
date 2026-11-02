// Who may scan. Two kinds of access code work:
//
//  1. Codes linked to one email address (the normal way). The owner creates them on the private
//     admin page, which uses the same SCAN_CODE_SECRET. The code is worked out from the secret and
//     the email, so nothing has to be stored: the server works it out again and compares.
//     A code only works together with the email it was made for.
//  2. Shared codes listed in SCAN_ACCESS_CODES (comma-separated), for the iPhone app or for testing.
//
// To stop one person scanning, add their email to SCAN_BLOCKED_EMAILS (comma-separated).
// To cancel every email code at once, change SCAN_CODE_SECRET (then make new codes).

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// 32 letters and digits that can't be confused with each other (no 0/O, 1/I/L... I and O are left out).
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_PREFIX = 'legara-scan-v1:';
const MIN_SECRET_LENGTH = 16;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>()",;:\\[\]]+@[^\s@<>()",;:\\[\]]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

/** The code for an email: 8 characters from an HMAC of the email, shown as XXXX-XXXX. */
export function codeForEmail(secret: string, email: string): string {
  const mac = createHmac('sha256', secret).update(CODE_PREFIX + email).digest();
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of mac) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < 8) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length === 8) break;
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/** "k7qm 4ztd" → "K7QM4ZTD": codes are compared without spaces, dashes or case. */
function plainCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function sameText(a: string, b: string): boolean {
  const hash = (text: string) => createHash('sha256').update(text).digest();
  return timingSafeEqual(hash(a), hash(b));
}

function listFromEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export function sharedCodes(): string[] {
  return listFromEnv('SCAN_ACCESS_CODES');
}

export function codeSecret(): string | null {
  const secret = process.env.SCAN_CODE_SECRET?.trim() ?? '';
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

/** True when at least one kind of code is set up. */
export function anyAccessConfigured(): boolean {
  return sharedCodes().length > 0 || codeSecret() !== null;
}

export function accessIsValid(givenCode: unknown, givenEmail: unknown): boolean {
  if (typeof givenCode !== 'string' || !givenCode.trim()) return false;
  const code = givenCode.trim().toLowerCase();
  // Shared codes: check every one (no early exit), so timing gives nothing away.
  let ok = sharedCodes().reduce((found, valid) => sameText(valid, code) || found, false);
  const secret = codeSecret();
  const email = normalizeEmail(givenEmail);
  if (secret && email && !listFromEnv('SCAN_BLOCKED_EMAILS').includes(email)) {
    ok = sameText(plainCode(codeForEmail(secret, email)), plainCode(code)) || ok;
  }
  return ok;
}
