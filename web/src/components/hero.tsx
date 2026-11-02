import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useRef } from 'react';

import { StudRow } from '@/components/brick';
import { EASE_OUT, RevealHeading } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { FIGURES, formatPrice, sortFigures, themeColor } from '@/lib/figures';

export const FAN_NOTICE =
  'Unofficial fan project. LEGO® is a trademark of the LEGO Group of companies, which does not sponsor, authorize or endorse Legará.';

const BY_VALUE = sortFigures(FIGURES, 'value-desc');
const TOP = BY_VALUE.slice(0, 5);
const CHEAPEST = BY_VALUE[BY_VALUE.length - 1];
const MAX = TOP[0].priceUsed;
const MAX_STUDS = 12;

export function Hero({ onOpen, ready }: { onOpen: (id: string) => void; ready: boolean }) {
  // With "reduce motion" on, everything is simply there: no entrance at all.
  const still = useReducedMotion() ?? false;
  const play = still || ready;
  const ref = useRef<HTMLElement>(null);
  // As you scroll past, the brick stack drifts up a little slower than the page, for depth.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const stackY = useTransform(scrollYProgress, [0, 1], [0, still ? 0 : -90]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, still ? 0 : 40]);
  const rise = (delay: number) => ({
    initial: still ? false : { opacity: 0, y: 20 },
    animate: play ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { duration: 0.9, ease: EASE_OUT, delay },
  });
  return (
    <section id="top" ref={ref} aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1320px] gap-14 px-4 pt-12 pb-16 sm:px-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-end md:gap-10 md:pt-20 md:pb-24">
        <motion.div style={{ y: textY }}>
          {still ? (
            <h1 id="hero-title" className={HEADLINE}>
              What’s your minifigure worth?
            </h1>
          ) : (
            <RevealHeading as="h1" id="hero-title" className={HEADLINE} play={play} delay={0.15}>
              What’s your minifigure worth?
            </RevealHeading>
          )}
          <motion.p {...rise(0.55)} className="mt-7 max-w-[34rem] text-[19px] leading-[1.5] text-muted-foreground">
            Typical used prices for {FIGURES.length} collectible minifigures, from a {formatPrice(CHEAPEST.priceUsed)}{' '}
            {CHEAPEST.name} to a {formatPrice(TOP[0].priceUsed)} {TOP[0].name}. Found one you want? Buy it on BrickLink or
            eBay.
          </motion.p>
          <motion.div {...rise(0.68)} className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#scan">
                <Camera />
                Scan a figure
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#market">Browse the market</a>
            </Button>
          </motion.div>
          <motion.p {...rise(0.8)} className="mt-8 max-w-[34rem] text-[13px] leading-[1.55] text-muted-foreground">
            {FAN_NOTICE}
          </motion.p>
        </motion.div>

        <motion.div style={{ y: stackY }}>
          <PriceStack onOpen={onOpen} still={still} play={play} />
        </motion.div>
      </div>
    </section>
  );
}

const HEADLINE = 'text-[clamp(46px,8.6vw,116px)] leading-[0.88] font-[880] tracking-[-0.04em] text-balance [font-stretch:116%]';

/**
 * The five most valuable figures as a stack of bricks: each brick's length is its price
 * (one stud ≈ $150), so the chart is honest about how far ahead the top figure is.
 */
function PriceStack({ onOpen, still, play }: { onOpen: (id: string) => void; still: boolean; play: boolean }) {
  return (
    <figure className="w-full">
      {/* Listed most valuable first, drawn at the bottom of the stack, like the base of a tower. */}
      <ol className="flex flex-col-reverse">
        {TOP.map((figure, i) => {
          const studs = Math.max(2, Math.round((MAX_STUDS * figure.priceUsed) / MAX));
          const color = themeColor(figure.theme);
          return (
            <motion.li
              key={figure.id}
              initial={still ? false : { opacity: 0, y: -90, rotate: i % 2 ? 3 : -3 }}
              animate={play ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: -90 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.9, delay: 0.45 + i * 0.11 }}
            >
              <button
                type="button"
                onClick={() => onOpen(figure.id)}
                className="group flex w-full items-end gap-4 rounded-md text-left"
                aria-label={`${figure.name}, about ${formatPrice(figure.priceUsed)} used`}
              >
                <span className="block shrink-0 transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1.5" style={{ width: `${(studs / MAX_STUDS) * 64}%` }}>
                  <StudRow count={studs} color={color} />
                  <span className="block h-11 rounded-[5px] sm:h-12" style={{ background: color, boxShadow: 'inset 0 -5px 0 rgb(0 0 0 / 0.22)' }} />
                </span>
                <span className="min-w-0 pb-1.5">
                  <span className="block text-[22px] leading-tight font-[760] tabular-nums [font-stretch:110%]">{formatPrice(figure.priceUsed)}</span>
                  <span className="block truncate text-[14px] text-muted-foreground group-hover:text-foreground">{figure.name}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
      {/* The green baseplate the stack stands on. */}
      <div aria-hidden="true">
        <StudRow count={22} color="var(--brick-green)" className="mt-0.5" />
        <div className="h-2.5 rounded-[3px] bg-brick-green" />
      </div>
      <figcaption className="mt-3 text-[14px] text-muted-foreground">
        The five most valuable figures in the market. Each stud is about {formatPrice(MAX / MAX_STUDS)} of typical used price.
      </figcaption>
    </figure>
  );
}
