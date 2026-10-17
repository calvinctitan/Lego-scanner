// Legará backend: one serverless function on Vercel.
//
// The phone app sends a photo here. This function adds a secret key (stored in Vercel, never in
// the app), asks an AI to appraise the minifigure, and sends back a small JSON answer.
//
// Which AI it asks depends on the keys you give it in Vercel (README, "Turn on scanning"):
//   - Cloudflare Workers AI (free daily allowance): CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
//   - Claude (paid, more accurate):                 ANTHROPIC_API_KEY
// If both are set, it uses Cloudflare unless SCAN_PROVIDER is set to "claude".
//
//   GET  /api/scan  → health check you can open in a browser
//   POST /api/scan  → { image: "<base64 JPEG>", mediaType?: "image/jpeg" }

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const MODEL = 'claude-opus-5-5';
// Meta's Llama 4 Scout, a free-to-use model that can look at pictures. Change it in Vercel with
// CLOUDFLARE_MODEL if Cloudflare retires it (pick another Workers AI model that accepts images).
const CLOUDFLARE_DEFAULT_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
// Vercel accepts request bodies up to 4.5 MB. The app shrinks photos to ~300 KB, so this is plenty.
const MAX_BASE64_LENGTH = 4_400_000;
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const SYSTEM_PROMPT = `You are the appraiser inside Legará, an app where LEGO fans photograph a minifigure to learn what it's worth.

Look at the photo and fill in every field:
- isMinifigure: true when the main subject is a LEGO minifigure (complete or nearly complete, including Collectible Minifigures). False for anything else, such as other brands' figures, loose bricks, sets, boxes, people or pets, and for photos too unclear to tell.
- name: the name collectors use for this exact version, specific enough to search on BrickLink or eBay (for example "Boba Fett (Cloud City)" rather than "Boba Fett"; for Collectible Minifigures, add the series, like "Mr. Gold (Series 10)"). If it isn't a minifigure, describe what you see in a few words.
- theme: the LEGO theme. When it fits, use one of: Star Wars, Harry Potter, Marvel, DC, Ninjago, City, Collectibles, Lord of the Rings, Classic Space. Otherwise use the official LEGO theme name. Empty if it isn't a minifigure.
- year: the year this version was first released, or null if you can't tell.
- valueUsedLow / valueUsedHigh: the typical range of recent secondary-market sale prices (BrickLink, eBay sold listings) in whole US dollars for this figure complete with its usual accessories (and its certificate, for figures that came with one) and in good used condition.
- valueNewLow / valueNewHigh: the same for new, unused condition (sealed, where that applies, like Collectible Minifigures bags).
- rarity: Common (in many sets, a few dollars), Uncommon, Rare, or Very rare (limited promotions, exclusives, or figures worth hundreds of dollars or more).
- confidence: high when you're sure of the exact version, medium when you know the character but not the exact version, low when the photo is unclear or you're guessing.
- note: one short sentence for a casual collector about what most affects this figure's value (exact version, printing, missing accessories, condition, how many were made, or, for figures that are often faked, what to check).

Give honest ranges rather than false precision; when you aren't sure of the exact version, widen the range. If it isn't a minifigure, set all four values to 0.`;

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very rare'] as const;
const CONFIDENCES = ['high', 'medium', 'low'] as const;

// Claude must answer in exactly this shape (structured outputs guarantee it).
// rarity and confidence are plain strings here and get matched to the allowed values in
// toScanResponse, so a different capitalization can never make a scan fail.
const Appraisal = z.object({
  isMinifigure: z.boolean(),
  name: z.string(),
  theme: z.string(),
  year: z.number().nullable(),
  valueUsedLow: z.number(),
  valueUsedHigh: z.number(),
  valueNewLow: z.number(),
  valueNewHigh: z.number(),
  rarity: z.string().describe(`One of: ${RARITIES.join(', ')}`),
  confidence: z.string().describe(`One of: ${CONFIDENCES.join(', ')}`),
  note: z.string(),
});
type Appraisal = z.infer<typeof Appraisal>;

/** The JSON the app receives. Prices are [low, high] in US dollars. */
export type ScanResponse = {
  isMinifigure: boolean;
  name: string;
  theme: string;
  year: number | null;
  valueUsed: [number, number];
  valueNew: [number, number];
  rarity: (typeof RARITIES)[number];
  confidence: (typeof CONFIDENCES)[number];
  note: string;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function errorResponse(status: number, message: string): Response {
  return json({ error: message }, status);
}

let client: Anthropic | undefined;
function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment. Vercel functions here stop after 60 seconds,
  // so give up a little before that and let the app show a friendly "try again".
  client ??= new Anthropic({ timeout: 55_000, maxRetries: 0 });
  return client;
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

type Provider = 'cloudflare' | 'claude';

/** Which AI to ask: the one SCAN_PROVIDER names, otherwise the free one if its keys are set. */
function chosenProvider(): Provider | null {
  const wanted = (process.env.SCAN_PROVIDER ?? '').trim().toLowerCase();
  const cloudflareReady = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim());
  const claudeReady = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  if (wanted === 'claude') return claudeReady ? 'claude' : null;
  if (wanted === 'cloudflare') return cloudflareReady ? 'cloudflare' : null;
  if (cloudflareReady) return 'cloudflare';
  if (claudeReady) return 'claude';
  return null;
}

function cloudflareModel(): string {
  return process.env.CLOUDFLARE_MODEL?.trim() || CLOUDFLARE_DEFAULT_MODEL;
}

export function GET(): Response {
  const provider = chosenProvider();
  return json({
    ok: true,
    message: 'Legará backend is running. The app sends photos here with a POST request.',
    apiKeyConfigured: provider !== null,
    service: provider === 'cloudflare' ? `Cloudflare Workers AI (${cloudflareModel()})` : provider === 'claude' ? `Claude (${MODEL})` : null,
  });
}

export async function POST(request: Request): Promise<Response> {
  const provider = chosenProvider();
  if (!provider) {
    console.error(
      'No AI service is set up. In Vercel → Project → Settings → Environment Variables, add CLOUDFLARE_ACCOUNT_ID and ' +
        'CLOUDFLARE_API_TOKEN (free) or ANTHROPIC_API_KEY (Claude), then redeploy. If SCAN_PROVIDER is set, its keys must be set too.',
    );
    return errorResponse(500, 'The server isn’t set up yet (missing AI service key).');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'The request wasn’t valid JSON.');
  }

  const photo = readPhoto(body);
  if ('error' in photo) return errorResponse(photo.status, photo.error);

  return provider === 'cloudflare' ? scanWithCloudflare(photo) : scanWithClaude(photo);
}

type Photo = { data: string; mediaType: MediaType };

async function scanWithClaude(photo: Photo): Promise<Response> {
  try {
    // create() rather than parse(): parse() throws before we can look at a refusal or a cut-off
    // answer, so we read and check the JSON ourselves below.
    const message = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Effort controls how long Claude thinks. "medium" balances accuracy and speed;
      // "low" is faster and cheaper, "high" is more careful but slower.
      output_config: { effort: 'medium', format: betaZodOutputFormat(Appraisal) },
      // If a safety check declines the request, retry automatically on Anthropic's recommended model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: photo.mediaType, data: photo.data } },
            { type: 'text', text: 'Appraise this minifigure.' },
          ],
        },
      ],
    });

    if (message.stop_reason === 'refusal') {
      console.warn('Claude declined to appraise this photo:', message.stop_details);
      return errorResponse(422, 'Couldn’t check that photo. Please try a different one.');
    }
    const appraisal = readAppraisal(message.content);
    if (!appraisal) {
      console.error('No usable answer. stop_reason:', message.stop_reason);
      return errorResponse(502, 'Couldn’t read the appraisal. Please try again.');
    }

    return json(toScanResponse(appraisal));
  } catch (error) {
    return claudeErrorResponse(error);
  }
}

/** Finds Claude's JSON answer and checks it has every field we need. */
function readAppraisal(content: Anthropic.Beta.BetaContentBlock[]): Appraisal | null {
  const text = content.filter((block) => block.type === 'text').pop()?.text;
  if (!text) return null;
  try {
    const result = Appraisal.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ─── Cloudflare Workers AI (free daily allowance) ───────────────────────────────

// Free models can't be forced into an exact answer shape the way Claude can, so the shape is
// spelled out here and the answer is read carefully (readLooseAppraisal).
const JSON_INSTRUCTIONS = `

Reply with only one JSON object and nothing else: no other words and no code fences. Use exactly these keys:
{"isMinifigure": true or false, "name": "...", "theme": "...", "year": a number or null,
"valueUsedLow": whole number, "valueUsedHigh": whole number, "valueNewLow": whole number, "valueNewHigh": whole number,
"rarity": "Common" or "Uncommon" or "Rare" or "Very rare", "confidence": "high" or "medium" or "low", "note": "..."}`;

async function scanWithCloudflare(photo: Photo): Promise<Response> {
  const account = (process.env.CLOUDFLARE_ACCOUNT_ID ?? '').trim();
  const token = (process.env.CLOUDFLARE_API_TOKEN ?? '').trim();
  // Only for testing with a fake server; normally leave CLOUDFLARE_API_BASE unset.
  const base = (process.env.CLOUDFLARE_API_BASE?.trim() || 'https://api.cloudflare.com/client/v4').replace(/\/+$/, '');

  let response: Response;
  try {
    // Cloudflare's OpenAI-style "chat completions" address, with the photo sent as a data URL.
    response = await fetch(`${base}/accounts/${encodeURIComponent(account)}/ai/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cloudflareModel(),
        max_tokens: 1000,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + JSON_INSTRUCTIONS },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Appraise this minifigure.' },
              { type: 'image_url', image_url: { url: `data:${photo.mediaType};base64,${photo.data}` } },
            ],
          },
        ],
      }),
      // Vercel stops this function after 60 seconds, so give up a little before that.
      signal: AbortSignal.timeout(55_000),
    });
  } catch (error) {
    console.error('Cloudflare Workers AI request failed:', error);
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return errorResponse(504, 'That took too long. Please try again.');
    }
    return errorResponse(503, 'The AI service is busy right now. Please try again in a moment.');
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    // Full details go to the Vercel logs; the app gets a short, friendly message.
    const details = JSON.stringify(data) ?? '';
    console.error(`Cloudflare Workers AI error ${response.status}:`, details.slice(0, 2000));
    if (/allocation|neurons/i.test(details)) {
      return errorResponse(429, 'Today’s free scans are used up. Please try again tomorrow.');
    }
    if (response.status === 401 || response.status === 403) {
      return errorResponse(500, 'The server’s Cloudflare key isn’t working. Check it in Vercel.');
    }
    if (response.status === 429) return errorResponse(429, 'Lots of scans right now. Please try again in a minute.');
    if (response.status >= 500) return errorResponse(503, 'The AI service is busy right now. Please try again in a moment.');
    return errorResponse(400, 'The AI service couldn’t use that request. Try another photo, or check the server logs.');
  }

  const appraisal = readLooseAppraisal(messageText(data));
  if (!appraisal) {
    console.error('No usable answer from Cloudflare Workers AI:', (JSON.stringify(data) ?? '').slice(0, 2000));
    return errorResponse(502, 'Couldn’t read the appraisal. Please try again.');
  }
  return json(toScanResponse(appraisal));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The answer's text, from Cloudflare's OpenAI-style reply (or its own "result.response" format). */
function messageText(data: unknown): unknown {
  if (!isRecord(data)) return null;
  const choice: unknown = Array.isArray(data.choices) ? data.choices[0] : undefined;
  if (isRecord(choice) && isRecord(choice.message)) return choice.message.content;
  if (isRecord(data.result)) return data.result.response;
  return null;
}

/** "$1,200" → 1200, 15 → 15, anything else → null. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const number = Number.parseFloat(value.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

/** Finds the JSON object in a free model's answer, forgiving small slips like numbers written as text. */
export function readLooseAppraisal(content: unknown): Appraisal | null {
  let value: unknown = content;
  if (Array.isArray(value)) value = value.map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : '')).join('');
  if (typeof value === 'string') {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      value = JSON.parse(value.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!isRecord(value)) return null;
  const v = value;
  // Some models answer "valueUsed": [low, high] instead of two separate numbers.
  const pair = (key: string, index: number) => (Array.isArray(v[key]) ? (v[key] as unknown[])[index] : undefined);
  const result = Appraisal.safeParse({
    isMinifigure: v.isMinifigure === true || String(v.isMinifigure).trim().toLowerCase() === 'true',
    name: typeof v.name === 'string' ? v.name : '',
    theme: typeof v.theme === 'string' ? v.theme : '',
    year: toNumber(v.year),
    valueUsedLow: toNumber(v.valueUsedLow ?? pair('valueUsed', 0)) ?? 0,
    valueUsedHigh: toNumber(v.valueUsedHigh ?? pair('valueUsed', 1)) ?? 0,
    valueNewLow: toNumber(v.valueNewLow ?? pair('valueNew', 0)) ?? 0,
    valueNewHigh: toNumber(v.valueNewHigh ?? pair('valueNew', 1)) ?? 0,
    rarity: typeof v.rarity === 'string' ? v.rarity : '',
    confidence: typeof v.confidence === 'string' ? v.confidence : '',
    note: typeof v.note === 'string' ? v.note : '',
  });
  return result.success ? result.data : null;
}

function readPhoto(body: unknown): Photo | { status: number; error: string } {
  if (typeof body !== 'object' || body === null) return { status: 400, error: 'Missing photo.' };
  const { image, mediaType } = body as { image?: unknown; mediaType?: unknown };

  if (typeof image !== 'string' || image.length === 0) return { status: 400, error: 'Missing photo.' };
  // Accept both plain base64 and "data:image/jpeg;base64,...".
  const data = image.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
  if (data.length > MAX_BASE64_LENGTH) return { status: 413, error: 'That photo is too big. Please try a smaller one.' };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { status: 400, error: 'The photo data was damaged. Please try again.' };

  const type = mediaType ?? 'image/jpeg';
  if (!MEDIA_TYPES.includes(type as MediaType)) return { status: 400, error: 'Please use a JPEG, PNG, WebP or GIF photo.' };
  return { data, mediaType: type as MediaType };
}

function dollars(value: number): number {
  return Number.isFinite(value) ? Math.min(1_000_000, Math.max(0, Math.round(value))) : 0;
}

function range(a: number, b: number): [number, number] {
  const low = dollars(a);
  const high = dollars(b);
  return low <= high ? [low, high] : [high, low];
}

/** Matches "very RARE" to "Very rare", falling back when nothing matches. */
function oneOf<T extends string>(value: string, options: readonly T[], fallback: T): T {
  const wanted = value.trim().toLowerCase();
  return options.find((option) => option.toLowerCase() === wanted) ?? fallback;
}

export function toScanResponse(a: Appraisal): ScanResponse {
  const thisYear = new Date().getFullYear();
  return {
    isMinifigure: a.isMinifigure,
    name: a.name.trim().slice(0, 120) || (a.isMinifigure ? 'Unknown minifigure' : 'Not a minifigure'),
    theme: a.theme.trim().slice(0, 60),
    // LEGO minifigures date from 1975; anything outside that window is a mistake.
    year: a.year !== null && a.year >= 1975 && a.year <= thisYear + 1 ? Math.round(a.year) : null,
    valueUsed: a.isMinifigure ? range(a.valueUsedLow, a.valueUsedHigh) : [0, 0],
    valueNew: a.isMinifigure ? range(a.valueNewLow, a.valueNewHigh) : [0, 0],
    rarity: oneOf(a.rarity, RARITIES, 'Common'),
    confidence: oneOf(a.confidence, CONFIDENCES, 'low'),
    note: a.note.trim().slice(0, 300),
  };
}

function claudeErrorResponse(error: unknown): Response {
  // Full details go to the Vercel logs; the app gets a short, friendly message.
  console.error('Claude request failed:', error);

  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return errorResponse(500, 'The server’s Claude API key isn’t working. Check it in Vercel.');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return errorResponse(429, 'Lots of scans right now. Please try again in a minute.');
  }
  if (error instanceof Anthropic.BadRequestError) {
    return errorResponse(400, 'Claude couldn’t use that request. Try another photo, or check the server logs.');
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return errorResponse(504, 'That took too long. Please try again.');
  }
  if (error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
    return errorResponse(503, 'Claude is busy right now. Please try again in a moment.');
  }
  return errorResponse(500, 'Something went wrong on the server. Please try again.');
}
