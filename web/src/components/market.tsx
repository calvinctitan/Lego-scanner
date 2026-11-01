import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PriceBrick, RarityMark } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FIGURES, PRICES_CHECKED, SORTS, THEMES, formatPrice, matchesSearch, sortFigures, themeColor, type Figure, type SortKey } from '@/lib/figures';
import { cn } from '@/lib/utils';

const ALL = 'All themes';
// Tiles slide to their new places when you filter or sort: quick, with no bounce, because this is data.
const SLIDE = { type: 'spring', stiffness: 520, damping: 44, mass: 0.8 } as const;

export function Market({ onOpen }: { onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(ALL);
  const [sort, setSort] = useState<SortKey>('value-desc');

  const shown = useMemo(
    () => sortFigures(FIGURES.filter((f) => (theme === ALL || f.theme === theme) && matchesSearch(f, query)), sort),
    [query, theme, sort],
  );
  const usedThemes = THEMES.filter((t) => FIGURES.some((f) => f.theme === t));

  return (
    <section id="market" aria-labelledby="market-title" className="border-t border-border">
      <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 md:py-24">
        <h2 id="market-title" className="text-[clamp(38px,5.4vw,68px)] leading-[0.95] font-[860] tracking-[-0.03em] [font-stretch:116%]">
          The market
        </h2>
        <p className="mt-4 max-w-[38rem] text-[17px] leading-[1.5] text-muted-foreground">
          Pick a figure to see its typical price and where to buy it. Prices are rough estimates for a complete, used figure,
          checked {PRICES_CHECKED}.
        </p>

        <div className="mt-9 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:max-w-md md:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
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
            ) : null}
          </div>
          <label className="relative inline-flex items-center gap-2 md:ml-auto">
            <span className="text-[15px] text-muted-foreground">Sort by</span>
            <select
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
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors',
                  on ? 'border-foreground bg-foreground text-background' : 'border-border bg-background hover:border-foreground/40',
                )}
              >
                {t !== ALL ? <span className="size-2.5 rounded-full" style={{ background: themeColor(t) }} aria-hidden="true" /> : null}
                {t === ALL ? 'All' : t}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-[15px] font-semibold" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'figure' : 'figures'}
          {theme !== ALL ? ` in ${theme}` : ''}
          {query.trim() ? ` matching “${query.trim()}”` : ''}
        </p>

        {shown.length ? (
          <motion.ul layout className="mt-4 grid grid-flow-dense grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((figure) => {
                const wide = figure.rarity === 'Very rare';
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
                    <FigureTile figure={figure} wide={wide} onOpen={onOpen} />
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
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FigureTile({ figure, wide, onOpen }: { figure: Figure; wide: boolean; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(figure.id)}
      className="group flex h-full w-full flex-col rounded-[var(--radius)] border border-border bg-background p-2.5 text-left transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-foreground/35 hover:shadow-[0_12px_24px_-16px_rgb(5_19_29/0.5)] sm:p-3"
      aria-label={`${figure.name}, ${figure.theme}, ${figure.year}${figure.rarity !== 'Common' ? `, ${figure.rarity}` : ''}, about ${formatPrice(figure.priceUsed)} used`}
    >
      <motion.span layoutId={`art-${figure.id}`} className="block">
        <FigureArt figure={figure} cols={wide ? 27 : 13} />
      </motion.span>
      <span className="mt-3 flex flex-1 flex-col px-0.5">
        <span className={cn('font-semibold leading-snug', wide ? 'text-[20px] [font-stretch:108%]' : 'line-clamp-2 text-[16px]')}>{figure.name}</span>
        <span className="mt-0.5 text-[14px] text-muted-foreground">
          {figure.theme}, {figure.year}
        </span>
        {wide ? <span className="mt-2 line-clamp-2 max-w-[44ch] text-[14px] leading-[1.45] text-muted-foreground">{figure.note}</span> : null}
        <span className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5 pt-3">
          <PriceBrick size={wide ? 'md' : 'sm'}>{formatPrice(figure.priceUsed)}</PriceBrick>
          <RarityMark rarity={figure.rarity} quiet />
        </span>
      </span>
    </button>
  );
}
