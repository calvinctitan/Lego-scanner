import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { PriceBrick, StudRow } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { EASE_OUT, Reveal, RevealHeading } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { FIGURES, formatPrice, type Figure } from '@/lib/figures';
import { recordQuizStreak, useProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';

/** Two different figures with different prices, not the same pair as last time. */
function newPair(last?: [Figure, Figure]): [Figure, Figure] {
  for (let tries = 0; tries < 50; tries++) {
    const a = FIGURES[Math.floor(Math.random() * FIGURES.length)];
    const b = FIGURES[Math.floor(Math.random() * FIGURES.length)];
    if (a.id === b.id || a.priceUsed === b.priceUsed) continue;
    if (last && [a.id, b.id].some((id) => id === last[0].id || id === last[1].id)) continue;
    return [a, b];
  }
  return [FIGURES[0], FIGURES[1]];
}

type Answer = { picked: string; right: boolean } | null;

/**
 * "Higher or lower?": two figures, pick the one that sells for more. Each right answer adds a brick
 * to your streak; a wrong one ends it. Your best streak is remembered in this browser (and earns badges).
 */
export function PriceQuiz({ onOpen }: { onOpen: (id: string) => void }) {
  const [pair, setPair] = useState<[Figure, Figure]>(() => newPair());
  const [answer, setAnswer] = useState<Answer>(null);
  const [streak, setStreak] = useState(0);
  const { quizBest } = useProgress();
  const still = useReducedMotion();
  const next = useRef<HTMLButtonElement>(null);

  const pick = (id: string) => {
    if (answer) return;
    const winner = pair[0].priceUsed > pair[1].priceUsed ? pair[0] : pair[1];
    const right = id === winner.id;
    setAnswer({ picked: id, right });
    const now = right ? streak + 1 : streak;
    if (right) setStreak(now);
    recordQuizStreak(now);
  };

  const again = () => {
    if (answer && !answer.right) setStreak(0);
    setAnswer(null);
    setPair((p) => newPair(p));
  };

  // After answering, the next button gets focus, so keyboard players can keep going with Enter.
  useEffect(() => {
    if (answer) next.current?.focus({ preventScroll: true });
  }, [answer]);

  const winner = pair[0].priceUsed > pair[1].priceUsed ? pair[0] : pair[1];

  return (
    <section id="play" aria-labelledby="play-title" className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <RevealHeading id="play-title" className="text-[clamp(38px,5.4vw,68px)] leading-[0.95] font-[860] tracking-[-0.03em] [font-stretch:116%]">
              Higher or lower?
            </RevealHeading>
            <Reveal delay={0.15}>
              <p className="mt-4 max-w-[34rem] text-[17px] leading-[1.5] text-muted-foreground">
                Which one sells for more? Pick one. Every right answer adds a brick to your streak.
              </p>
            </Reveal>
          </div>
          <Streak streak={streak} best={quizBest} />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6">
          {pair.map((figure, i) => {
            const isWinner = figure.id === winner.id;
            const picked = answer?.picked === figure.id;
            return (
              <motion.button
                key={`${figure.id}-${i}`}
                type="button"
                onClick={() => pick(figure.id)}
                disabled={!!answer}
                aria-label={answer ? `${figure.name}, ${formatPrice(figure.priceUsed)}` : `${figure.name}: pick this one if you think it’s worth more`}
                initial={still ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: i * 0.08 }}
                whileHover={answer ? undefined : { y: -4 }}
                whileTap={answer ? undefined : { scale: 0.98 }}
                className={cn(
                  'group relative flex flex-col rounded-[var(--radius)] border-2 bg-background p-4 text-left transition-colors disabled:cursor-default sm:p-5',
                  !answer && 'border-border hover:border-foreground/40',
                  answer && isWinner && 'border-[var(--gain)]',
                  answer && !isWinner && 'border-border opacity-80',
                )}
              >
                <span className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
                  <FigureArt figure={figure} cols={13} className="p-2" />
                  <span className="min-w-0">
                    <span className="block text-[20px] leading-tight font-[760] [font-stretch:108%]">{figure.name}</span>
                    <span className="mt-1 block text-[15px] text-muted-foreground">
                      {figure.theme}, {figure.year}
                    </span>
                  </span>
                </span>
                <span className="mt-4 flex min-h-[52px] items-end justify-between gap-3">
                  <AnimatePresence mode="wait" initial={false}>
                    {answer ? (
                      <motion.span key="price" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                        <PriceBrick size="md">{formatPrice(figure.priceUsed)}</PriceBrick>
                      </motion.span>
                    ) : (
                      <motion.span key="hidden" exit={{ opacity: 0 }} className="inline-flex flex-col">
                        <StudRow count={2} color="var(--stud)" />
                        <span className="inline-flex items-center rounded-[5px] bg-stud px-3 pt-1 pb-1.5 text-[22px] leading-none font-[750] text-muted-foreground [font-stretch:112%]">$ ?</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {answer && picked ? (
                    <span className={cn('inline-flex items-center gap-1.5 text-[15px] font-semibold', answer.right ? 'text-[var(--gain)]' : 'text-brick-red')}>
                      {answer.right ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                      {answer.right ? 'Right!' : 'Not this time'}
                    </span>
                  ) : null}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 flex min-h-12 flex-wrap items-center gap-x-5 gap-y-3" aria-live="polite">
          {answer ? (
            <>
              <p className="text-[17px] font-semibold">
                {answer.right
                  ? `${winner.name} sells for ${formatPrice(Math.abs(pair[0].priceUsed - pair[1].priceUsed))} more.`
                  : streak
                    ? `${winner.name} was worth more. Your streak ended at ${streak}.`
                    : `${winner.name} was worth more. Try another pair!`}
              </p>
              <Button ref={next} variant="brick" onClick={again}>
                {answer.right ? 'Next pair' : 'Play again'}
                {answer.right ? <ArrowRight /> : <RotateCcw />}
              </Button>
              <button type="button" onClick={() => onOpen(winner.id)} className="text-[15px] font-medium text-link underline-offset-4 hover:underline">
                See {winner.name}
              </button>
            </>
          ) : (
            <p className="text-[15px] text-muted-foreground">Prices are typical used prices from the market.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Your streak as a little stack of bricks, with your best beside it. */
function Streak({ streak, best }: { streak: number; best: number }) {
  const shown = Math.min(streak, 10);
  const colors = ['#c91a09', '#0055bf', '#f2cd37', '#237841', '#923978'];
  return (
    <div className="flex items-end gap-5" aria-label={`Streak ${streak}, best ${best}`} role="status">
      <div className="flex h-[92px] w-14 flex-col-reverse justify-start" aria-hidden="true">
        <AnimatePresence initial={false}>
          {Array.from({ length: shown }, (_, i) => (
            <motion.span
              key={i}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className="block"
            >
              <span className="block h-[8px] rounded-[2px]" style={{ background: colors[i % colors.length], boxShadow: 'inset 0 -2px 0 rgb(0 0 0 / 0.2)' }} />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div>
        <p className="text-[44px] leading-none font-[860] tabular-nums [font-stretch:112%]">{streak}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">in a row</p>
      </div>
      <div className="border-l border-border pl-5">
        <p className="text-[28px] leading-none font-[760] tabular-nums [font-stretch:110%]">{best}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">your best</p>
      </div>
    </div>
  );
}
