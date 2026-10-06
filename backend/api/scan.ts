// Legará backend: one serverless function on Vercel.
//
// The phone app sends a photo here. This function adds the secret Claude API key
// (stored in Vercel, never in the app), asks Claude to appraise the minifigure,
// and sends back a small JSON answer.
//
//   GET  /api/scan  → health check you can open in a browser
//   POST /api/scan  → { image: "<base64 JPEG>", mediaType?: "image/jpeg" }

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const MODEL = 'claude-opus-5-5';
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

export function GET(): Response {
  return json({
    ok: true,
    message: 'Legará backend is running. The app sends photos here with a POST request.',
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.');
    return errorResponse(500, 'The server isn’t set up yet (missing Claude API key).');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'The request wasn’t valid JSON.');
  }

  const photo = readPhoto(body);
  if ('error' in photo) return errorResponse(photo.status, photo.error);

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

function readPhoto(body: unknown): { data: string; mediaType: MediaType } | { status: number; error: string } {
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
