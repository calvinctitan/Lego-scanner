import { motion, useReducedMotion } from 'framer-motion';

import { StudRow } from '@/components/brick';
import { FIGURES, formatPrice, sortFigures, themeColor } from '@/lib/figures';

const TOP = sortFigures(FIGURES, 'value-desc').slice(0, 5);
const MAX = TOP[0].priceUsed;
const MAX_STUDS = 12;

/**
 * The five most valuable figures as a stack of bricks: each brick's length is its price
 * (one stud ≈ $150), so the chart is honest about how far ahead the top figure is.
 * The bricks drop into place the first time the stack scrolls into view.
 */
export function PriceStack({ onOpen, className }: { onOpen: (id: string) => void; className?: string }) {
  // With "reduce motion" on, the stack is simply there.
  const still = useReducedMotion() ?? false;
  return (
    <figure className={className}>
      {/* Listed most valuable first, drawn at the bottom of the stack, like the base of a tower. */}
      <motion.ol className="flex flex-col-reverse" initial={still ? false : 'up'} whileInView="down" viewport={{ once: true, amount: 0.45 }}>
        {TOP.map((figure, i) => {
          const studs = Math.max(2, Math.round((MAX_STUDS * figure.priceUsed) / MAX));
          const color = themeColor(figure.theme);
          return (
            <motion.li
              key={figure.id}
              variants={{
                up: { opacity: 0, y: -90, rotate: i % 2 ? 3 : -3 },
                down: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 420, damping: 30, mass: 0.9, delay: 0.1 + i * 0.11 } },
              }}
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
      </motion.ol>
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
