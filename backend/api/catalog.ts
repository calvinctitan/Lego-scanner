// The "every minifigure" catalog: a page of minifigures from Rebrickable's free database
// (rebrickable.com), for the website's endless browsing. It needs a free Rebrickable API key in
// REBRICKABLE_API_KEY (README, "The endless catalog"); the key stays here, never in the website.
//
// Answers are cached by Vercel's network for a day, so Rebrickable is asked rarely and the
// catalog stays fast however many people browse.
//
//   GET /api/catalog?page=1&search=luke&theme=158  → { count, page, hasMore, items: [{ id, name, parts, url }] }
//   GET /api/catalog?themes=1                      → { themes: [{ id, name }] }  (top-level themes)

const PAGE_SIZE = 40;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  if (cacheSeconds) headers['Cache-Control'] = `public, max-age=600, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 7}`;
  return Response.json(body, { status, headers });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function apiBase(): string {
  return (process.env.REBRICKABLE_API_BASE || 'https://rebrickable.com/api/v3').replace(/\/+$/, '');
}

async function rebrickable(path: string): Promise<{ status: number; data: unknown }> {
  const response = await fetch(`${apiBase()}${path}`, {
    headers: { Authorization: `key ${process.env.REBRICKABLE_API_KEY!.trim()}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  const data: unknown = await response.json().catch(() => null);
  return { status: response.status, data };
}

type RawFig = { set_num?: unknown; name?: unknown; num_parts?: unknown; set_url?: unknown };
type RawTheme = { id?: unknown; name?: unknown; parent_id?: unknown };

export async function GET(request: Request): Promise<Response> {
  if (!process.env.REBRICKABLE_API_KEY?.trim()) {
    return json({ error: 'The catalog isn’t switched on yet.' }, 503);
  }
  const params = new URL(request.url).searchParams;

  try {
    if (params.get('themes')) {
      const { status, data } = await rebrickable('/lego/themes/?page_size=1000');
      if (status !== 200) return json({ error: 'Couldn’t load the themes right now.' }, status === 429 ? 503 : 502);
      const results = ((data as { results?: RawTheme[] })?.results ?? []).filter(
        (t) => typeof t.id === 'number' && typeof t.name === 'string' && t.parent_id == null,
      );
      const themes = results.map((t) => ({ id: t.id as number, name: t.name as string })).sort((a, b) => a.name.localeCompare(b.name));
      return json({ themes }, 200, 7 * 24 * 3600);
    }

    const page = Math.min(500, Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1));
    const search = (params.get('search') ?? '').trim().slice(0, 60);
    const theme = Number.parseInt(params.get('theme') ?? '', 10);
    const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (search) query.set('search', search);
    if (Number.isFinite(theme) && theme > 0) query.set('in_theme_id', String(theme));

    const { status, data } = await rebrickable(`/lego/minifigs/?${query}`);
    if (status === 404) return json({ count: 0, page, hasMore: false, items: [] }, 200, 3600); // past the last page
    if (status === 429) return json({ error: 'Lots of people are browsing. Try again in a minute.' }, 503);
    if (status !== 200) {
      console.error('Rebrickable answered', status, 'for', query.toString(), '- check REBRICKABLE_API_KEY.');
      return json({ error: 'Couldn’t load more minifigures right now.' }, 502);
    }
    const body = data as { count?: unknown; next?: unknown; results?: RawFig[] };
    const items = (body.results ?? [])
      .filter((f) => typeof f.set_num === 'string' && typeof f.name === 'string')
      .map((f) => ({
        id: f.set_num as string,
        name: (f.name as string).slice(0, 200),
        parts: typeof f.num_parts === 'number' ? f.num_parts : null,
        url: typeof f.set_url === 'string' && f.set_url.startsWith('https://rebrickable.com/') ? f.set_url : null,
      }));
    return json({ count: typeof body.count === 'number' ? body.count : items.length, page, hasMore: Boolean(body.next), items }, 200, 24 * 3600);
  } catch (error) {
    console.error('Catalog request failed:', error instanceof Error ? error.message : error);
    return json({ error: 'Couldn’t load more minifigures right now.' }, 502);
  }
}
