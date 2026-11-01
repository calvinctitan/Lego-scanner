import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Heart, Link2, Share2, TrendingUp, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { PriceBrick, RarityMark } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { EASE_OUT } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  FIGURES,
  PRICES_CHECKED,
  brickLinkSearchUrl,
  ebaySearchUrl,
  ebaySoldUrl,
  formatPrice,
  sortFigures,
  type Figure,
} from '@/lib/figures';
import { toggleShelf, useShelf } from '@/lib/shelf';
import { cn } from '@/lib/utils';

export const BUYING_NOTE =
  'You buy on that website, from its sellers, under its rules. Check that the seller’s photos show the exact figure you want. Legará doesn’t sell anything or take payments, and isn’t part of BrickLink or eBay. Under 18? Ask a parent before you buy.';

const SPRING = { type: 'spring', stiffness: 360, damping: 36, mass: 0.9 } as const;
const BY_VALUE = sortFigures(FIGURES, 'value-desc');

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** A figure's details, from the side on wide screens and from the bottom on phones. */
export function FigureSheet({ figure, onClose, onOpen }: { figure: Figure | null; onClose: () => void; onOpen: (id: string) => void }) {
  const wide = useMediaQuery('(min-width: 768px)');
  const from = wide ? { x: '100%', y: 0 } : { x: 0, y: '100%' };
  // Moving between figures inside the panel slides the content; opening from a tile flies the picture in.
  const [nav, setNav] = useState<{ dir: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!figure) setNav(null);
  }, [figure]);

  const go = (id: string, dir: number) => {
    setNav({ dir });
    onOpen(id);
    scroller.current?.scrollTo({ top: 0 });
  };

  const index = figure ? BY_VALUE.findIndex((f) => f.id === figure.id) : -1;
  const prev = index > 0 ? BY_VALUE[index - 1] : null;
  const next = index >= 0 && index < BY_VALUE.length - 1 ? BY_VALUE[index + 1] : null;

  // ← and → step through the figures, from most to least valuable.
  useEffect(() => {
    if (!figure) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft' && prev) go(prev.id, -1);
      if (e.key === 'ArrowRight' && next) go(next.id, 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <DialogPrimitive.Root open={figure !== null} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {figure ? (
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
            <DialogPrimitive.Content
              asChild
              forceMount
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement | null)?.focus();
              }}
            >
              <motion.div
                ref={scroller}
                tabIndex={-1}
                data-lenis-prevent
                className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-2xl bg-background text-foreground outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[500px] md:rounded-none md:border-l md:border-border"
                initial={from}
                animate={{ x: 0, y: 0 }}
                exit={from}
                transition={SPRING}
              >
                <AnimatePresence mode="popLayout" initial={false} custom={nav?.dir ?? 0}>
                  <motion.div
                    key={figure.id}
                    custom={nav?.dir ?? 0}
                    variants={{
                      enter: (dir: number) => ({ opacity: 0, x: dir * 60 }),
                      center: { opacity: 1, x: 0 },
                      leave: (dir: number) => ({ opacity: 0, x: dir * -60 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="leave"
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                  >
                    <FigureDetails figure={figure} flyIn={!nav} rank={index + 1} onPick={(id) => go(id, 1)} />
                    <nav aria-label="More figures" className="grid grid-cols-2 gap-2 border-t border-border px-5 py-5 md:px-8">
                      {prev ? <StepButton figure={prev} dir={-1} onClick={() => go(prev.id, -1)} /> : <span />}
                      {next ? <StepButton figure={next} dir={1} onClick={() => go(next.id, 1)} /> : <span />}
                    </nav>
                  </motion.div>
                </AnimatePresence>
                <DialogPrimitive.Close
                  className="absolute top-3 right-3 z-10 inline-flex size-10 items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:bg-surface hover:text-foreground"
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

function StepButton({ figure, dir, onClick }: { figure: Figure; dir: -1 | 1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-w-0 items-center gap-2 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-foreground/40',
        dir === 1 && 'flex-row-reverse text-right',
      )}
    >
      {dir === -1 ? (
        <ChevronLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
      ) : (
        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      )}
      <span className="min-w-0">
        <span className="block text-[13px] text-muted-foreground">{dir === -1 ? 'More valuable' : 'Less valuable'}</span>
        <span className="block truncate text-[15px] font-semibold">{figure.name}</span>
      </span>
    </button>
  );
}

/** The price counting up from zero, the first time the figure opens. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    const controls = animate(value * 0.55, value, {
      duration: 0.9,
      ease: EASE_OUT,
      onUpdate: (v) => {
        el.textContent = formatPrice(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, still]);
  return (
    <span ref={ref} className="tabular-nums">
      {formatPrice(value)}
    </span>
  );
}

const item = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

function FigureDetails({ figure, flyIn, rank, onPick }: { figure: Figure; flyIn: boolean; rank: number; onPick: (id: string) => void }) {
  const shelf = useShelf();
  const have = shelf.have.includes(figure.id);
  const want = shelf.want.includes(figure.id);
  const sameTheme = FIGURES.filter((f) => f.theme === figure.theme && f.id !== figure.id).slice(0, 4);

  return (
    <motion.div className="px-5 pt-14 pb-8 md:px-8 md:pt-16" initial="hidden" animate="shown" transition={{ staggerChildren: 0.045, delayChildren: 0.12 }}>
      <motion.div layoutId={flyIn ? `art-${figure.id}` : undefined} transition={{ duration: 0.5, ease: EASE_OUT }}>
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

      <motion.div variants={item}>
        <DialogTitle className="mt-7 text-[34px] leading-[1.02] font-[860] tracking-[-0.02em] [font-stretch:112%]">{figure.name}</DialogTitle>
        <DialogDescription className="mt-2 text-[16px]">
          {figure.theme}, first released {figure.year}
        </DialogDescription>
        <RarityMark rarity={figure.rarity} className="mt-3" />
      </motion.div>

      <motion.div variants={item} className="mt-6 flex flex-wrap gap-2">
        <ToggleChip on={have} onClick={() => toggleShelf('have', figure.id)} icon={<Check className="size-4" />}>
          {have ? 'On my shelf' : 'I have it'}
        </ToggleChip>
        <ToggleChip on={want} onClick={() => toggleShelf('want', figure.id)} icon={<Heart className={cn('size-4', want && 'fill-current')} />}>
          {want ? 'On my wishlist' : 'I want it'}
        </ToggleChip>
        <ShareButton figure={figure} />
      </motion.div>

      <motion.div variants={item} className="mt-7">
        <p className="text-[14px] font-semibold text-muted-foreground">Typical used price</p>
        <PriceBrick size="lg" className="mt-2">
          <CountUp value={figure.priceUsed} />
        </PriceBrick>
        <RankMeter rank={rank} />
        <p className="mt-3 text-[14px] leading-[1.5] text-muted-foreground">
          A rough estimate ({PRICES_CHECKED}) of what a complete, used one has sold for on eBay and BrickLink. It isn’t a live
          price or an offer to sell.
        </p>
      </motion.div>

      <motion.p variants={item} className="mt-6 text-[17px] leading-[1.55]">
        {figure.note}
      </motion.p>

      <motion.div variants={item} className="mt-8 grid gap-2.5 sm:grid-cols-2">
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
      </motion.div>
      <motion.a
        variants={item}
        href={ebaySoldUrl(figure.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-[15px] font-medium text-link underline-offset-4 hover:underline"
      >
        <TrendingUp className="size-4" aria-hidden="true" />
        See what it recently sold for on eBay
      </motion.a>
      <motion.p variants={item} className="mt-7 rounded-md bg-surface p-4 text-[14px] leading-[1.55] text-muted-foreground">
        {BUYING_NOTE}
      </motion.p>

      {sameTheme.length ? (
        <motion.section variants={item} aria-labelledby="same-theme" className="mt-9">
          <h3 id="same-theme" className="text-[18px] font-[760] [font-stretch:110%]">
            More from {figure.theme}
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {sameTheme.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onPick(f.id)}
                  className="group flex w-full flex-col rounded-md border border-border p-2 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-foreground/35"
                >
                  <FigureArt figure={f} cols={13} className="p-1.5" />
                  <span className="mt-2 line-clamp-1 text-[14px] font-semibold">{f.name}</span>
                  <span className="text-[13px] text-muted-foreground tabular-nums">{formatPrice(f.priceUsed)}</span>
                </button>
              </li>
            ))}
          </ul>
        </motion.section>
      ) : null}
    </motion.div>
  );
}

/** Where this figure sits among all of them, from cheapest (left) to most valuable (right). */
function RankMeter({ rank }: { rank: number }) {
  const total = BY_VALUE.length;
  const label = rank === 1 ? `The most valuable of the ${total} figures here` : `${ordinal(rank)} most valuable of the ${total} figures here`;
  return (
    <div className="mt-4">
      <p className="text-[14px] font-semibold">{label}</p>
      <div className="mt-2 flex h-2.5 gap-[2px]" aria-hidden="true">
        {BY_VALUE.map((f, i) => {
          const on = i === rank - 1;
          return (
            <motion.span
              key={f.id}
              className={cn('flex-1 rounded-[2px]', on ? 'bg-brick-yellow' : 'bg-stud')}
              initial={{ scaleY: 0.3, opacity: 0 }}
              animate={{ scaleY: on ? 1.5 : 1, opacity: 1 }}
              transition={{ delay: 0.25 + (total - 1 - i) * 0.012, duration: 0.4, ease: EASE_OUT }}
              style={{ order: total - i }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] text-muted-foreground" aria-hidden="true">
        <span>Cheapest</span>
        <span>Most valuable</span>
      </div>
    </div>
  );
}

function ToggleChip({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors duration-200',
        on ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40',
      )}
    >
      <motion.span key={String(on)} initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 16 }}>
        {icon}
      </motion.span>
      {children}
    </motion.button>
  );
}

/** Shares the figure's link: the phone's share menu where there is one, otherwise copies it. */
function ShareButton({ figure }: { figure: Figure }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = `?figure=${encodeURIComponent(figure.id)}`;
    url.hash = '';
    const link = url.toString();
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse && navigator.share) {
      try {
        await navigator.share({ title: `${figure.name} on Legará`, text: `${figure.name}: about ${formatPrice(figure.priceUsed)} used`, url: link });
        return;
      } catch {
        // Closed the share menu, or sharing isn't allowed: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={share}
      whileTap={{ scale: 0.95 }}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[14px] font-semibold transition-colors hover:border-foreground/40"
    >
      {copied ? <Link2 className="size-4" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Link copied' : 'Share'}</span>
    </motion.button>
  );
}
