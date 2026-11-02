import { motion } from 'framer-motion';
import { ChevronDown, ExternalLink, Loader2, Search, X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { Reveal, RevealHeading, EASE_OUT } from '@/components/reveal';
import { StudMosaic } from '@/components/stud-mosaic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CatalogOff,
  catalogCanBeOn,
  colourFor,
  fetchCatalogPage,
  fetchCatalogThemes,
  shortName,
  type CatalogFigure,
  type CatalogTheme,
} from '@/lib/catalog';
import { brickLinkSearchUrl, ebaySearchUrl } from '@/lib/figures';

type Status = 'idle' | 'loading' | 'error' | 'off';

/**
 * "Every minifigure": an endless, scroll-to-load list of minifigures from Rebrickable's free database,
 * through the Legará server. Hidden when the server or its Rebrickable key isn't set up.
 */
export function Catalog() {
  if (!catalogCanBeOn()) return null;
  return <CatalogInner />;
}

function CatalogInner() {
  const [items, setItems] = useState<CatalogFigure[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(''); // the query, once typing pauses
  const [theme, setTheme] = useState<number | null>(null);
  const [themes, setThemes] = useState<CatalogTheme[]>([]);
  const inFlight = useRef<AbortController | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setStatus('loading');
      try {
        const result = await fetchCatalogPage(nextPage, search, theme, controller.signal);
        if (controller.signal.aborted) return;
        setItems((old) => {
          const seen = new Set(replace ? [] : old.map((f) => f.id));
          return [...(replace ? [] : old), ...result.items.filter((f) => !seen.has(f.id))];
        });
        setCount(result.count);
        setPage(nextPage);
        setHasMore(result.hasMore);
        setStatus('idle');
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof CatalogOff) return setStatus('off');
        setError(err instanceof Error ? err.message : 'Couldn’t load more minifigures right now.');
        setStatus('error');
      }
    },
    [search, theme],
  );

  // New search or theme: start again from page 1.
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    load(1, true);
    return () => inFlight.current?.abort();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogThemes(controller.signal).then(setThemes, () => {});
    return () => controller.abort();
  }, []);

  // Endless scrolling: load the next page before the bottom comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || status !== 'idle' || page === 0) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && load(page + 1, false), { rootMargin: '900px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, status, page, load]);

  if (status === 'off') return null;

  return (
    <section id="catalog" aria-labelledby="catalog-title" className="border-t border-border">
      <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 md:py-24">
        <RevealHeading id="catalog-title" className="text-[clamp(38px,5.4vw,68px)] leading-[0.95] font-[860] tracking-[-0.03em] [font-stretch:116%]">
          Every minifigure
        </RevealHeading>
        <Reveal delay={0.15}>
          <p className="mt-4 max-w-[42rem] text-[17px] leading-[1.5] text-muted-foreground">
            {count ? `${count.toLocaleString('en-US')} minifigures` : 'Thousands of minifigures'}, from{' '}
            <a href="https://rebrickable.com/minifigs/" target="_blank" rel="noopener noreferrer" className="text-link underline-offset-4 hover:underline">
              Rebrickable
            </a>
            ’s free database. Keep scrolling and more appear. These don’t have a Legará price yet: check live prices on BrickLink or
            eBay, or scan yours for an estimate.
          </p>
        </Reveal>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:max-w-md md:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search every minifigure"
              aria-label="Search every minifigure"
              maxLength={60}
              className="pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                aria-label="Clear catalog search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          {themes.length ? (
            <label className="relative inline-flex items-center gap-2 md:ml-auto">
              <span className="text-[15px] text-muted-foreground">Theme</span>
              <select
                aria-label="Catalog theme"
                value={theme ?? ''}
                onChange={(e) => setTheme(e.target.value ? Number(e.target.value) : null)}
                className="h-11 max-w-[16rem] appearance-none rounded-md border border-input bg-background pr-9 pl-3 text-[15px] font-semibold text-foreground"
              >
                <option value="">All themes</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
            </label>
          ) : null}
        </div>

        <p className="mt-6 text-[15px] font-semibold" aria-live="polite">
          {count === null ? 'Loading…' : count === 0 ? 'No minifigures match.' : `Showing ${items.length.toLocaleString('en-US')} of ${count.toLocaleString('en-US')}`}
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((figure, i) => (
            <CatalogTile key={figure.id} figure={figure} delay={(i % 40) * 0.015} />
          ))}
        </ul>

        <div ref={sentinel} className="mt-8 flex min-h-12 flex-col items-center justify-center gap-3 text-center">
          {status === 'loading' ? (
            <p className="inline-flex items-center gap-2 text-[15px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading more minifigures
            </p>
          ) : null}
          {status === 'error' ? (
            <>
              <p role="alert" className="text-[15px] font-medium text-brick-red">
                {error}
              </p>
              <Button variant="outline" onClick={() => load(page + 1, page === 0)}>
                Try again
              </Button>
            </>
          ) : null}
          {status === 'idle' && hasMore && page > 0 ? (
            <Button variant="outline" onClick={() => load(page + 1, false)}>
              Load more
            </Button>
          ) : null}
          {status === 'idle' && !hasMore && items.length > 0 ? <p className="text-[15px] text-muted-foreground">That’s all of them.</p> : null}
        </div>
      </div>
    </section>
  );
}

const CatalogTile = memo(function CatalogTile({ figure, delay }: { figure: CatalogFigure; delay: number }) {
  const short = shortName(figure.name);
  return (
    <motion.li
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
      className="flex flex-col rounded-[var(--radius)] border border-border bg-background p-2.5 [content-visibility:auto] [contain-intrinsic-size:auto_260px]"
    >
      <span className="block rounded-md bg-surface p-2">
        <StudMosaic name={short} theme="" color={colourFor(figure.name)} cols={13} className="block h-auto w-full" />
      </span>
      <p className="mt-2.5 line-clamp-2 px-0.5 text-[14px] leading-snug font-semibold" title={figure.name}>
        {figure.name}
      </p>
      <p className="mt-0.5 px-0.5 text-[13px] text-muted-foreground">
        {figure.parts ? `${figure.parts} parts` : figure.id}
        {figure.url ? (
          <>
            {', '}
            <a href={figure.url} target="_blank" rel="noopener noreferrer" className="text-link underline-offset-4 hover:underline">
              details
            </a>
          </>
        ) : null}
      </p>
      <span className="mt-auto flex gap-1.5 pt-3">
        <a
          href={brickLinkSearchUrl(short)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Find ${figure.name} on BrickLink`}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-brick-yellow text-[13px] font-semibold text-on-yellow shadow-[inset_0_-2px_0_rgb(0_0_0/0.16)]"
        >
          BrickLink
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
        <a
          href={ebaySearchUrl(short)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Find ${figure.name} on eBay`}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-border text-[13px] font-semibold hover:border-foreground/40"
        >
          eBay
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </span>
    </motion.li>
  );
});
