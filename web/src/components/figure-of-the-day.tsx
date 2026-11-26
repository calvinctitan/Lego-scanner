import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PriceBrick, RarityMark } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { EASE_OUT } from '@/components/reveal';
import { FIGURES, formatPrice, themeColor } from '@/lib/figures';
import { recordDailyVisit, today } from '@/lib/progress';

/** The same figure for everyone on the same day, a different one tomorrow. */
function figureFor(day: string) {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return FIGURES[(h >>> 0) % FIGURES.length];
}

function untilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(1, Math.round((midnight.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h ? `${h} h ${mins % 60} min` : `${mins} min`;
}

/** A new figure to look at every day, at the top of the market. */
export function FigureOfTheDay({ onOpen }: { onOpen: (id: string) => void }) {
  const [day, setDay] = useState(today);
  const [left, setLeft] = useState(untilMidnight);
  // Keep the countdown (and the figure, after midnight) up to date while the page is open.
  useEffect(() => {
    const t = window.setInterval(() => {
      setLeft(untilMidnight());
      setDay(today());
    }, 30_000);
    return () => window.clearInterval(t);
  }, []);
  const figure = figureFor(day);
  const date = new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="relative mt-10 overflow-hidden rounded-[var(--radius)] border border-border bg-background"
    >
      {/* A stripe in the figure's theme colour along the left, like the edge of a brick. */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: themeColor(figure.theme) }} />
      <div className="grid items-center gap-5 p-4 pl-6 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-7 sm:p-5 sm:pl-7">
        <button type="button" onClick={() => (recordDailyVisit(day), onOpen(figure.id))} className="block w-full max-w-[150px] rounded-md sm:max-w-[220px]" aria-label={`Open ${figure.name}`} tabIndex={-1}>
          <FigureArt figure={figure} cols={17} className="p-2.5" />
        </button>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            Figure of the day, {date}
          </p>
          <h3 className="mt-1.5 text-[26px] leading-[1.05] font-[820] tracking-[-0.01em] [font-stretch:112%]">{figure.name}</h3>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {figure.theme}, {figure.year}
          </p>
          <p className="mt-2 line-clamp-2 max-w-[52ch] text-[15px] leading-[1.5]">{figure.note}</p>
          <RarityMark rarity={figure.rarity} className="mt-2" />
        </div>
        <div className="flex flex-row items-end justify-between gap-4 sm:flex-col sm:items-end">
          <PriceBrick size="md">
            {formatPrice(figure.priceUsed)}
          </PriceBrick>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => (recordDailyVisit(day), onOpen(figure.id))}
              className="group inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[15px] font-semibold text-background"
            >
              Take a look
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <p className="text-[13px] text-muted-foreground">New figure in {left}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
