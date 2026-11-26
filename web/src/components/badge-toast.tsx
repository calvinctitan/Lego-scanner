import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { StudRow } from '@/components/brick';
import { useBadges, type Badge } from '@/lib/badges';
import { markBadgesSeen, useProgress } from '@/lib/progress';

/** A little pop-up when you earn a badge. It doesn't block anything and goes away by itself. */
export function BadgeToast({ paused }: { paused: boolean }) {
  const badges = useBadges();
  const { seenBadges } = useProgress();
  const [shown, setShown] = useState<Badge[] | null>(null);

  useEffect(() => {
    if (paused) return;
    const fresh = badges.filter((b) => b.earned && !seenBadges.includes(b.badge.id)).map((b) => b.badge);
    if (!fresh.length) return;
    markBadgesSeen(fresh.map((b) => b.id));
    setShown(fresh);
  }, [badges, seenBadges, paused]);

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setShown(null), 4800);
    return () => window.clearTimeout(t);
  }, [shown]);

  const first = shown?.[0];
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-[max(80px,calc(env(safe-area-inset-bottom)+80px))] z-[55] flex justify-center sm:inset-x-auto sm:top-[76px] sm:right-6 sm:bottom-auto">
      <AnimatePresence>
        {first ? (
          <motion.div
            key={first.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="flex items-center gap-3 rounded-xl border border-border bg-background py-3 pr-5 pl-3 shadow-[0_18px_40px_-14px_rgb(5_19_29/0.5)]"
          >
            <span className="block w-12 shrink-0" aria-hidden="true">
              <StudRow count={2} color={first.color} />
              <span className="block h-7 rounded-[4px]" style={{ background: first.color, boxShadow: 'inset 0 -3px 0 rgb(0 0 0 / 0.18)' }} />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-muted-foreground">{shown && shown.length > 1 ? `${shown.length} badges earned` : 'Badge earned'}</span>
              <span className="block text-[16px] font-[760]">{shown && shown.length > 1 ? shown.map((b) => b.name).join(', ') : first.name}</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
