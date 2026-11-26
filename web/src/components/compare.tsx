import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Columns3, ExternalLink, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

import { PriceBrick, RarityMark } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { EASE_OUT } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { COMPARE_MAX, clearCompare, toggleCompare, useCompare } from '@/lib/compare';
import { FIGURES, brickLinkSearchUrl, formatPrice, getFigure, initials, sortFigures, themeColor, type Figure } from '@/lib/figures';
import { recordCompared } from '@/lib/progress';
import { cn } from '@/lib/utils';

const RANK = new Map(sortFigures(FIGURES, 'value-desc').map((f, i) => [f.id, i + 1]));

/** The figures picked for comparing, as a bar at the bottom of the screen. */
export function CompareTray({ onCompare, hidden }: { onCompare: () => void; hidden: boolean }) {
  const ids = useCompare();
  const figures = ids.map(getFigure).filter((f): f is Figure => !!f);
  return (
    <AnimatePresence>
      {figures.length && !hidden ? (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="fixed inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex justify-center px-3"
          role="region"
          aria-label="Figures to compare"
        >
          <div className="flex max-w-full items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pr-1.5 pl-3 shadow-[0_14px_40px_-12px_rgb(5_19_29/0.45)] backdrop-blur">
            <ul className="flex -space-x-1.5">
              {figures.map((f) => (
                <li key={f.id}>
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-full border-2 border-background text-[11px] font-bold text-white"
                    style={{ background: themeColor(f.theme) }}
                    title={f.name}
                  >
                    {initials(f.name)}
                  </span>
                </li>
              ))}
            </ul>
            <span className="px-1 text-[14px] font-medium whitespace-nowrap text-muted-foreground">
              {figures.length < 2 ? 'Pick one more' : `${figures.length} of ${COMPARE_MAX}`}
            </span>
            <Button size="sm" variant="brick" disabled={figures.length < 2} onClick={onCompare} className="rounded-full">
              <Columns3 />
              Compare
            </Button>
            <button type="button" onClick={clearCompare} aria-label="Clear the figures to compare" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Two or three figures side by side: price, rarity, age and rank, with the best of each marked. */
export function CompareDialog({ open, onOpenChange, onOpenFigure }: { open: boolean; onOpenChange: (open: boolean) => void; onOpenFigure: (id: string) => void }) {
  const ids = useCompare();
  const figures = ids.map(getFigure).filter((f): f is Figure => !!f);
  useEffect(() => {
    if (open) recordCompared();
    if (open && figures.length < 2) onOpenChange(false);
  }, [open, figures.length, onOpenChange]);

  const top = Math.max(...figures.map((f) => f.priceUsed));
  const oldest = Math.min(...figures.map((f) => f.year));
  const cols = { gridTemplateColumns: `repeat(${Math.max(figures.length, 1)}, minmax(150px, 1fr))` };
  const row = (label: string, cell: (f: Figure) => ReactNode) => [
    <p key={`${label}-label`} className="col-span-full mt-5 border-t border-border pt-4 text-[13px] font-semibold text-muted-foreground">
      {label}
    </p>,
    ...figures.map((f) => (
      <div key={`${label}-${f.id}`} className="min-w-0">
        {cell(f)}
      </div>
    )),
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-[#05131d]/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                data-lenis-prevent
                className="fixed inset-x-2 top-[max(16px,4vh)] bottom-[max(16px,4vh)] z-50 mx-auto flex max-w-[980px] flex-col overflow-hidden rounded-2xl bg-background text-foreground outline-none sm:inset-x-6"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
                  <div>
                    <DialogTitle className="text-[26px] leading-tight font-[860] [font-stretch:114%]">Side by side</DialogTitle>
                    <DialogDescription className="mt-1 text-[14px]">The best in each row is marked in yellow.</DialogDescription>
                  </div>
                  <DialogPrimitive.Close className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground" aria-label="Close">
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>
                <div className="flex-1 overflow-auto overscroll-contain px-5 pt-5 pb-8 sm:px-7">
                  <div className="grid gap-x-4" style={cols}>
                    {figures.map((f) => (
                      <div key={f.id} className="min-w-0">
                        <button type="button" onClick={() => onOpenFigure(f.id)} className="block w-full rounded-md text-left" aria-label={`Open ${f.name}`}>
                          <FigureArt figure={f} cols={13} className="max-w-[200px] p-2" />
                        </button>
                        <p className="mt-3 text-[17px] leading-snug font-[760]">{f.name}</p>
                        <button type="button" onClick={() => toggleCompare(f.id)} className="mt-1 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                          Remove
                        </button>
                      </div>
                    ))}
                    {row('Typical used price', (f) => (
                        <div className="flex flex-col items-start gap-1.5">
                          <PriceBrick size="sm" className={cn(f.priceUsed !== top && 'opacity-60 saturate-50')}>{formatPrice(f.priceUsed)}</PriceBrick>
                          {f.priceUsed === top ? <Best>Most valuable</Best> : <span className="text-[13px] text-muted-foreground">{formatPrice(top - f.priceUsed)} less</span>}
                        </div>
                    ))}
                    {row('Rank in the market', (f) => <p className="text-[17px] font-semibold tabular-nums">#{RANK.get(f.id)} of {FIGURES.length}</p>)}
                    {row('Rarity', (f) => (f.rarity === 'Common' ? <p className="text-[15px] text-muted-foreground">Common</p> : <RarityMark rarity={f.rarity} />))}
                    {row('First released', (f) => (
                        <div className="flex flex-col items-start gap-1.5">
                          <p className="text-[17px] font-semibold tabular-nums">{f.year}</p>
                          {f.year === oldest ? <Best>Oldest</Best> : null}
                        </div>
                    ))}
                    {row('Theme', (f) => (
                        <p className="inline-flex items-center gap-2 text-[15px]">
                          <span className="size-2.5 rounded-full" style={{ background: themeColor(f.theme) }} aria-hidden="true" />
                          {f.theme}
                        </p>
                    ))}
                    {row('Where to buy', (f) => (
                        <a href={brickLinkSearchUrl(f.name)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-link underline-offset-4 hover:underline">
                          BrickLink
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function Best({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-[4px] bg-brick-yellow px-2 py-0.5 text-[12px] font-bold text-on-yellow">{children}</span>;
}
