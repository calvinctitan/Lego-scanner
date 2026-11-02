// "Request a scan code": the website sends the visitor's email here, and this emails it to the
// owner's Gmail. The owner then makes a code on the private admin page and sends it back.
//
// Email is sent through the owner's Gmail with an App Password (README, "Scan requests by email"):
//   GMAIL_USER          the Gmail address that sends (and, unless OWNER_EMAIL is set, receives)
//   GMAIL_APP_PASSWORD  a 16-letter App Password for that account (never the normal password)
//   OWNER_EMAIL         optional: where requests go, if not GMAIL_USER
//
// It only ever emails the owner, never the visitor, so nobody can use it to send email to others.
// Bots are slowed down by a hidden field, a minimum time on the form and a per-visitor limit.
//
//   POST /api/request-access → { email, name?, message?, over13: true, website: "", elapsedMs }

import nodemailer, { type Transporter } from 'nodemailer';

import { normalizeEmail } from '../lib/access.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Messages "sent" while testing (MAIL_TRANSPORT=test) land here instead of in Gmail.
export const testOutbox: { to: string; replyTo: string; subject: string; text: string }[] = [];

let transporter: Transporter | undefined;
function mailer(): Transporter | null {
  if (process.env.MAIL_TRANSPORT === 'test') return null;
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  if (!user || !pass) return null;
  transporter ??= nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
  return transporter;
}

// A small speed limit, kept in this server's memory: a few requests per visitor, and a cap overall.
// (Each server copy keeps its own count, so it isn't exact, but it stops floods.)
const recent = new Map<string, number[]>();
function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const times = (recent.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= max) {
    recent.set(key, times);
    return true;
  }
  times.push(now);
  recent.set(key, times);
  if (recent.size > 5000) recent.clear();
  return false;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // Plain text only: no control characters, single spaces, and not too long.
  return value
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'The request wasn’t valid.' }, 400);
  }

  const email = normalizeEmail(body.email);
  if (!email) return json({ error: 'That doesn’t look like an email address. Check it and try again.' }, 400);
  if (body.over13 !== true) return json({ error: 'Please confirm you’re 13 or older, or ask a parent to request a code for you.' }, 400);

  // A hidden "website" field that people never see: if it's filled in, a bot filled it. Pretend it worked.
  if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true });
  // People take at least a couple of seconds to type an email; scripts don't.
  if (typeof body.elapsedMs !== 'number' || body.elapsedMs < 1500) {
    return json({ error: 'That was very quick. Please wait a moment and send it again.' }, 400);
  }

  const visitor = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (tooMany(`ip:${visitor}`, 3, 60 * 60 * 1000) || tooMany(`email:${email}`, 2, 24 * 60 * 60 * 1000) || tooMany('all', 40, 60 * 60 * 1000)) {
    return json({ error: 'You’ve already sent a request. Please wait for the reply before asking again.' }, 429);
  }

  const name = clean(body.name, 80);
  const message = clean(body.message, 500);
  const owner = (process.env.OWNER_EMAIL || process.env.GMAIL_USER || '').trim();
  const mail = {
    to: owner,
    replyTo: email,
    subject: `Legará scan request from ${email}`,
    text: [
      'Someone asked for a Legará scan code.',
      '',
      `Email: ${email}`,
      `Name: ${name || '(not given)'}`,
      `Message: ${message || '(none)'}`,
      `Sent: ${new Date().toISOString()}`,
      '',
      'To let them scan: open your Legará admin page, type this email, choose "Create code", then',
      '"Open Gmail draft" and send it. The code only works together with this email address.',
      '',
      'Don’t know them, or don’t want to? Just ignore or delete this email.',
    ].join('\n'),
  };

  if (process.env.MAIL_TRANSPORT === 'test') {
    testOutbox.push({ ...mail, to: owner || 'owner@test' });
    return json({ ok: true });
  }
  const transport = mailer();
  if (!transport || !owner) {
    console.error('Scan requests are off: add GMAIL_USER and GMAIL_APP_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.');
    return json({ error: 'Requests aren’t open yet. Please try again later.' }, 503);
  }
  try {
    await transport.sendMail({ ...mail, from: { name: 'Legará requests', address: process.env.GMAIL_USER!.trim() } });
    return json({ ok: true });
  } catch (error) {
    console.error('Couldn’t send the request email. Check GMAIL_USER and GMAIL_APP_PASSWORD.', error instanceof Error ? error.message : error);
    return json({ error: 'Couldn’t send your request right now. Please try again later.' }, 502);
  }
}
