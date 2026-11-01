import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, TrendingUp, X } from 'lucide-react';

import { PriceBrick, RarityMark } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { PRICES_CHECKED, brickLinkSearchUrl, ebaySearchUrl, ebaySoldUrl, formatPrice, type Figure } from '@/lib/figures';

export const BUYING_NOTE =
  'You buy on that website, from its sellers, under its rules. Check that the seller’s photos show the exact figure you want. Legará doesn’t sell anything or take payments, and isn’t part of BrickLink or eBay. Under 18? Ask a parent before you buy.';

const EASE = [0.2, 0.7, 0.1, 1] as const;

/** A figure's details, from the side on wide screens and from the bottom on phones. */
export function FigureSheet({ figure, onClose }: { figure: Figure | null; onClose: () => void }) {
  const wide = useMediaQuery('(min-width: 768px)');
  const from = wide ? { x: 48, y: 0 } : { x: 0, y: 64 };

  return (
    <DialogPrimitive.Root open={figure !== null} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {figure ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[#05131d]/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              forceMount
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement | null)?.focus();
              }}
            >
              <motion.div
                tabIndex={-1}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-background text-foreground outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[480px] md:rounded-none md:border-l md:border-border"
                initial={{ opacity: 0, ...from }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, ...from }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <FigureDetails figure={figure} />
                <DialogPrimitive.Close
                  className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-md bg-background/80 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
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

function FigureDetails({ figure }: { figure: Figure }) {
  return (
    <div className="px-5 pt-14 pb-8 md:px-8 md:pt-16">
      <motion.div layoutId={`art-${figure.id}`} transition={{ duration: 0.38, ease: EASE }}>
        <FigureArt figure={figure} cols={17} className="p-4" />
      </motion.div>
      {figure.photo ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Picture from{' '}
          <a href={figure.photo.page} target="_blank" rel="noopener noreferrer" className="text-link underline-offset-4 hover:underline">
            Rebrickable
          </a>
          , showing one version of this figure. Minifigure design © The LEGO Group.
        </p>
      ) : null}

      <DialogTitle className="mt-7 text-[34px] leading-[1.02] font-[860] tracking-[-0.02em] [font-stretch:112%]">{figure.name}</DialogTitle>
      <DialogDescription className="mt-2 text-[16px]">
        {figure.theme}, first released {figure.year}
      </DialogDescription>
      <RarityMark rarity={figure.rarity} className="mt-3" />

      <div className="mt-7">
        <p className="text-[14px] font-semibold text-muted-foreground">Typical used price</p>
        <PriceBrick size="lg" className="mt-2">
          {formatPrice(figure.priceUsed)}
        </PriceBrick>
        <p className="mt-3 text-[14px] leading-[1.5] text-muted-foreground">
          A rough estimate ({PRICES_CHECKED}) of what a complete, used one has sold for on eBay and BrickLink. It isn’t a live
          price or an offer to sell.
        </p>
      </div>

      <p className="mt-6 text-[17px] leading-[1.55]">{figure.note}</p>

      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        <Button asChild variant="brick" size="lg">
          <a href={brickLinkSearchUrl(figure.name)} target="_blank" rel="noopener noreferrer">
            Buy on BrickLink
            <ExternalLink />
          </a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={ebaySearchUrl(figure.name)} target="_blank" rel="noopener noreferrer">
            Buy on eBay
            <ExternalLink />
          </a>
        </Button>
      </div>
      <a
        href={ebaySoldUrl(figure.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-[15px] font-medium text-link underline-offset-4 hover:underline"
      >
        <TrendingUp className="size-4" aria-hidden="true" />
        See what it recently sold for on eBay
      </a>
      <p className="mt-7 rounded-md bg-surface p-4 text-[14px] leading-[1.55] text-muted-foreground">{BUYING_NOTE}</p>
    </div>
  );
}
