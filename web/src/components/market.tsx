import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { Check, ChevronDown, Grid3x3, Heart, LayoutGrid, Search, Shuffle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

import { PriceBrick, RarityMark } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { EASE_OUT, Reveal, RevealHeading } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { FIGURES, PRICES_CHECKED, SORTS, THEMES, formatPrice, getFigure, initials, matchesSearch, sortFigures, themeColor, type Figure, type SortKey } from '@/lib/figures';
import { clearRecent, useShelf } from '@/lib/shelf';
import { cn } from '@/lib/utils';

const ALL = 'All themes';
// Tiles slide to their new places when you filter or sort: quick, with no bounce, because this is data.
const SLIDE = { type: 'spring', stiffness: 520, damping: 44, mass: 0.8 } as const;

export function Market({ onOpen }: { onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(ALL);
  const [sort, setSort] = useState<SortKey>('value-desc');
  const [rarity, setRarity] = useState('any');
  const [price, setPrice] = useState('any');
  const [owned, setOwned] = useState('all');
  const [small, setSmall] = useState(false);
  const shelf = useShelf();

  const shown = useMemo(() => {
    const band = PRICE_BANDS.find((b) => b.key === price) ?? PRICE_BANDS[0];
    return sortFigures(
      FIGURES.filter(
        (f) =>
          (theme === ALL || f.theme === theme) &&
          matchesSearch(f, query) &&
          (rarity === 'any' || f.rarity === rarity) &&
          f.priceUsed >= band.min &&
          f.priceUsed < band.max &&
          (owned === 'all' || shelf[owned as 'have' | 'want'].includes(f.id)),
      ),
      sort,
    );
  }, [query, theme, sort, rarity, price, owned, shelf]);
  const extraFilters = rarity !== 'any' || price !== 'any' || owned !== 'all';
  const usedThemes = THEMES.filter((t) => FIGURES.some((f) => f.theme === t));
  const search = useRef<HTMLInputElement>(null);
  const recent = shelf.recent.map(getFigure).filter((f): f is Figure => !!f);

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      search.current?.focus();
      search.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const surprise = () => {
    const pool = shown.length ? shown : FIGURES;
    onOpen(pool[Math.floor(Math.random() * pool.length)].id);
  };

  return (
    <section id="market" aria-labelledby="market-title" className="border-t border-border">
      <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 md:py-24">
        <RevealHeading id="market-title" className={SECTION_TITLE}>
          The market
        </RevealHeading>
        <Reveal delay={0.15}>
          <p className="mt-4 max-w-[38rem] text-[17px] leading-[1.5] text-muted-foreground">
            Pick a figure to see its typical price and where to buy it. Prices are rough estimates for a complete, used figure,
            checked {PRICES_CHECKED}.
          </p>
        </Reveal>

        {recent.length ? <RecentlyViewed figures={recent} onOpen={onOpen} /> : null}

        <Reveal delay={0.2} className="mt-9 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:max-w-md md:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, theme or year"
              aria-label="Search figures"
              className="pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[12px] leading-5 font-semibold text-muted-foreground md:block" aria-hidden="true">
                /
              </kbd>
            )}
          </div>
          <div className="flex items-center gap-2 md:ml-auto">
          <Button variant="outline" onClick={surprise} className="group">
            <Shuffle className="transition-transform duration-500 group-hover:rotate-180" />
            Surprise me
          </Button>
          <label className="relative inline-flex items-center gap-2">
            <span className="hidden text-[15px] text-muted-foreground sm:inline">Sort by</span>
            <select
              aria-label="Sort by"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 appearance-none rounded-md border border-input bg-background pr-9 pl-3 text-[15px] font-semibold text-foreground"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
          </label>
          </div>
        </Reveal>

        <div role="group" aria-label="Filter by theme" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {[ALL, ...usedThemes].map((t) => {
            const on = theme === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTheme(t)}
                className={cn(
                  'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors duration-300',
                  on ? 'border-foreground text-background' : 'border-border bg-background hover:border-foreground/40',
                )}
              >
                {on ? (
                  <motion.span layoutId="theme-pill" className="absolute -inset-px rounded-full bg-foreground" transition={{ type: 'spring', stiffness: 420, damping: 34 }} aria-hidden="true" />
                ) : null}
                {t !== ALL ? <span className="relative size-2.5 rounded-full" style={{ background: themeColor(t) }} aria-hidden="true" /> : null}
                <span className="relative">{t === ALL ? 'All' : t}</span>
              </button>
            );
          })}
        </div>

        <div role="group" aria-label="More filters" className="mt-3 flex flex-wrap items-center gap-2">
          <FilterSelect label="Rarity" value={rarity} onChange={setRarity} options={RARITY_OPTIONS} />
          <FilterSelect label="Price" value={price} onChange={setPrice} options={PRICE_BANDS.map((b) => ({ value: b.key, label: b.label }))} />
          <FilterSelect
            label="Show"
            value={owned}
            onChange={setOwned}
            options={[
              { value: 'all', label: 'All figures' },
              { value: 'have', label: `On my shelf (${shelf.have.length})` },
              { value: 'want', label: `On my wishlist (${shelf.want.length})` },
            ]}
          />
          {extraFilters ? (
            <button
              type="button"
              onClick={() => (setRarity('any'), setPrice('any'), setOwned('all'))}
              className="h-9 rounded-md px-2 text-[14px] font-medium text-link underline-offset-4 hover:underline"
            >
              Reset filters
            </button>
          ) : null}
          <div role="group" aria-label="Tile size" className="ml-auto inline-flex rounded-md border border-input p-0.5">
            {[
              { on: !small, label: 'Large tiles', icon: <LayoutGrid className="size-4" />, set: false },
              { on: small, label: 'Small tiles', icon: <Grid3x3 className="size-4" />, set: true },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                aria-pressed={b.on}
                aria-label={b.label}
                title={b.label}
                onClick={() => setSmall(b.set)}
                className={cn('inline-flex size-9 items-center justify-center rounded-[5px] transition-colors', b.on ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
              >
                {b.icon}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-[15px] font-semibold" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'figure' : 'figures'}
          {theme !== ALL ? ` in ${theme}` : ''}
          {query.trim() ? ` matching “${query.trim()}”` : ''}
          {extraFilters ? ', with filters' : ''}
        </p>

        {shown.length ? (
          <motion.ul
            layout
            aria-label="Market figures"
            className={cn(
              'mt-4 grid grid-flow-dense gap-3',
              small ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((figure) => {
                const wide = !small && figure.rarity === 'Very rare';
                return (
                  <motion.li
                    key={figure.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={SLIDE}
                    className={wide ? 'col-span-2' : undefined}
                  >
                    <FigureTile figure={figure} wide={wide} small={small} onOpen={onOpen} have={shelf.have.includes(figure.id)} want={shelf.want.includes(figure.id)} />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <div className="mt-4 rounded-[var(--radius)] border border-dashed border-border px-6 py-12 text-center">
            <p className="text-[17px] font-semibold">No figures match those filters.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {query ? (
                <Button variant="outline" onClick={() => setQuery('')}>
                  Clear the search
                </Button>
              ) : null}
              {theme !== ALL ? (
                <Button variant="outline" onClick={() => setTheme(ALL)}>
                  Show all themes
                </Button>
              ) : null}
              {extraFilters ? (
                <Button variant="outline" onClick={() => (setRarity('any'), setPrice('any'), setOwned('all'))}>
                  Reset filters
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const RARITY_OPTIONS = [
  { value: 'any', label: 'Any rarity' },
  { value: 'Very rare', label: 'Very rare' },
  { value: 'Rare', label: 'Rare' },
  { value: 'Uncommon', label: 'Uncommon' },
  { value: 'Common', label: 'Common' },
];

const PRICE_BANDS = [
  { key: 'any', label: 'Any price', min: 0, max: Infinity },
  { key: 'u10', label: 'Under $10', min: 0, max: 10 },
  { key: '10-50', label: '$10 to $50', min: 10, max: 50 },
  { key: '50-250', label: '$50 to $250', min: 50, max: 250 },
  { key: '250+', label: '$250 and up', min: 250, max: Infinity },
];

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== options[0].value;
  return (
    <label className="relative inline-flex items-center">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 appearance-none rounded-full border pr-8 pl-3.5 text-[14px] font-semibold transition-colors',
          active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:border-foreground/40',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={cn('pointer-events-none absolute right-2.5 size-4', active ? 'text-background' : 'text-muted-foreground')} aria-hidden="true" />
    </label>
  );
}

const SECTION_TITLE = 'text-[clamp(38px,5.4vw,68px)] leading-[0.95] font-[860] tracking-[-0.03em] [font-stretch:116%]';

/** The figures you opened lately, so you can get back to them. */
function RecentlyViewed({ figures, onOpen }: { figures: Figure[]; onOpen: (id: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold">Recently viewed</h3>
        <button type="button" onClick={clearRecent} className="text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Clear
        </button>
      </div>
      <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {figures.map((f) => (
          <li key={f.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onOpen(f.id)}
              className="flex items-center gap-2.5 rounded-full border border-border py-1 pr-4 pl-1 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-foreground/40"
            >
              <span
                className="inline-flex size-8 items-center justify-center rounded-full text-[12px] font-bold text-white [font-stretch:110%]"
                style={{ background: themeColor(f.theme), boxShadow: 'inset 0 -2px 0 rgb(0 0 0 / 0.2)' }}
                aria-hidden="true"
              >
                {initials(f.name)}
              </span>
              <span className="max-w-[16ch] truncate text-[14px] font-semibold">{f.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

const TILT = { stiffness: 300, damping: 26, mass: 0.6 };

function FigureTile({
  figure,
  wide,
  small = false,
  onOpen,
  have,
  want,
}: {
  figure: Figure;
  wide: boolean;
  small?: boolean;
  onOpen: (id: string) => void;
  have: boolean;
  want: boolean;
}) {
  // On a mouse, the tile tilts toward the pointer and a glow in the theme's colour follows it.
  const fine = useMediaQuery('(hover: hover) and (pointer: fine)');
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, TILT);
  const rotateY = useSpring(ry, TILT);
  const color = themeColor(figure.theme);

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!fine) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rx.set((0.5 - py) * (wide ? 5 : 8));
    ry.set((px - 0.5) * (wide ? 5 : 8));
    e.currentTarget.style.setProperty('--mx', `${px * 100}%`);
    e.currentTarget.style.setProperty('--my', `${py * 100}%`);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
    >
      <motion.button
        type="button"
        onClick={() => {
          reset();
          onOpen(figure.id);
        }}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-background p-2.5 text-left transition-[border-color,box-shadow] duration-300 hover:border-foreground/35 hover:shadow-[0_18px_36px_-20px_rgb(5_19_29/0.55)] sm:p-3"
        aria-label={`${figure.name}, ${figure.theme}, ${figure.year}${figure.rarity !== 'Common' ? `, ${figure.rarity}` : ''}, about ${formatPrice(figure.priceUsed)} used${have ? ', on my shelf' : ''}${want ? ', on my wishlist' : ''}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(circle at var(--mx, 50%) var(--my, 30%), color-mix(in oklab, ${color} 22%, transparent), transparent 55%)` }}
        />
        <motion.span layoutId={`art-${figure.id}`} className="relative block">
          <span className="block transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]">
            <FigureArt figure={figure} cols={wide ? 27 : 13} />
          </span>
          {have || want ? (
            <span className="absolute top-1.5 right-1.5 flex gap-1" aria-hidden="true">
              {have ? (
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="size-3.5" />
                </span>
              ) : null}
              {want ? (
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-brick-red text-white">
                  <Heart className="size-3.5 fill-current" />
                </span>
              ) : null}
            </span>
          ) : null}
        </motion.span>
        <span className="relative mt-3 flex flex-1 flex-col px-0.5">
          <span className={cn('font-semibold leading-snug', wide ? 'text-[20px] [font-stretch:108%]' : small ? 'line-clamp-2 text-[14px]' : 'line-clamp-2 text-[16px]')}>
            {figure.name}
          </span>
          {small ? null : (
            <span className="mt-0.5 text-[14px] text-muted-foreground">
              {figure.theme}, {figure.year}
            </span>
          )}
          {wide ? <span className="mt-2 line-clamp-2 max-w-[44ch] text-[14px] leading-[1.45] text-muted-foreground">{figure.note}</span> : null}
          <span className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5 pt-3">
            <PriceBrick size={wide ? 'md' : 'sm'}>{formatPrice(figure.priceUsed)}</PriceBrick>
            {small ? null : <RarityMark rarity={figure.rarity} quiet />}
          </span>
        </span>
      </motion.button>
    </motion.div>
  );
}
