import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, X } from 'lucide-react';
import { useState } from 'react';

import { PriceBrick } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatPrice, getFigure, type Figure } from '@/lib/figures';
import { toggleShelf, useShelf, type ShelfList } from '@/lib/shelf';
import { cn } from '@/lib/utils';

const SPRING = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const;

/** "My shelf": the figures you have (and what they're worth together) and the ones you want. */
export function ShelfDrawer({
  open,
  onOpenChange,
  onOpenFigure,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFigure: (id: string) => void;
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  const from = wide ? { x: '100%', y: 0 } : { x: 0, y: '100%' };
  const shelf = useShelf();
  const [tab, setTab] = useState<ShelfList>('have');
  const figures = shelf[tab].map(getFigure).filter((f): f is Figure => !!f);
  const total = figures.reduce((sum, f) => sum + f.priceUsed, 0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[#05131d]/45 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                data-lenis-prevent
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl bg-background text-foreground outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-border"
                initial={from}
                animate={{ x: 0, y: 0 }}
                exit={from}
                transition={SPRING}
              >
                <div className="px-5 pt-6 md:px-7 md:pt-8">
                  <DialogTitle className="text-[30px] leading-none font-[860] tracking-[-0.02em] [font-stretch:114%]">My shelf</DialogTitle>
                  <DialogDescription className="mt-2 text-[15px]">
                    Saved in this browser only. Add figures from their page with “I have it” or “I want it”.
                  </DialogDescription>
                  <div role="tablist" aria-label="Lists" className="mt-5 grid grid-cols-2 rounded-lg bg-surface p-1">
                    {(['have', 'want'] as const).map((list) => {
                      const on = tab === list;
                      return (
                        <button
                          key={list}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => setTab(list)}
                          className={cn('relative h-10 rounded-md text-[15px] font-semibold transition-colors', on ? 'text-foreground' : 'text-muted-foreground')}
                        >
                          {on ? (
                            <motion.span layoutId="shelf-tab" className="absolute inset-0 rounded-md bg-background shadow-sm" transition={SPRING} aria-hidden="true" />
                          ) : null}
                          <span className="relative inline-flex items-center gap-2">
                            {list === 'have' ? <Check className="size-4" aria-hidden="true" /> : <Heart className="size-4" aria-hidden="true" />}
                            {list === 'have' ? 'I have' : 'I want'} ({shelf[list].length})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3 border-b border-border pb-5" aria-live="polite">
                    <p className="max-w-[20ch] text-[15px] leading-snug text-muted-foreground">
                      {tab === 'have' ? 'Your collection is worth about' : 'Buying them all would cost about'}
                    </p>
                    <PriceBrick size="md">{formatPrice(total)}</PriceBrick>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-8 md:px-7">
                  {figures.length ? (
                    <ul>
                      <AnimatePresence initial={false}>
                        {figures.map((figure) => (
                          <motion.li
                            key={figure.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={SPRING}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-3 py-2">
                              <button
                                type="button"
                                onClick={() => onOpenFigure(figure.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-surface"
                              >
                                <span className="w-20 shrink-0">
                                  <FigureArt figure={figure} cols={13} className="p-1.5" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-[16px] font-semibold">{figure.name}</span>
                                  <span className="block text-[14px] text-muted-foreground tabular-nums">{formatPrice(figure.priceUsed)}</span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleShelf(tab, figure.id)}
                                aria-label={`Remove ${figure.name}`}
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  ) : (
                    <p className="mt-6 rounded-md border border-dashed border-border px-5 py-8 text-center text-[15px] leading-relaxed text-muted-foreground">
                      {tab === 'have'
                        ? 'Nothing here yet. Open a figure in the market and choose “I have it” to add up what your collection is worth.'
                        : 'Nothing here yet. Open a figure in the market and choose “I want it” to keep a wishlist.'}
                    </p>
                  )}
                </div>
                <DialogPrimitive.Close
                  className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
