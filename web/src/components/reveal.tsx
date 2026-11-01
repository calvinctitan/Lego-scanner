import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * A heading whose words rise into place, one after another, the first time it scrolls into view.
 * Screen readers still read it as one heading.
 */
export function RevealHeading({
  as = 'h2',
  id,
  className,
  children,
  delay = 0,
  play,
}: {
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
  children: string;
  delay?: number;
  /** Set to control when it plays (the hero waits for the intro); otherwise it plays when scrolled into view. */
  play?: boolean;
}) {
  const Tag = as === 'h1' ? motion.h1 : motion.h2;
  const words = children.split(' ');
  const trigger =
    play === undefined
      ? { initial: 'hidden', whileInView: 'shown', viewport: { once: true, amount: 0.6 } }
      : { initial: 'hidden', animate: play ? 'shown' : 'hidden' };
  return (
    <Tag id={id} className={className} {...trigger} transition={{ staggerChildren: 0.07, delayChildren: delay }}>
      {words.map((word, i) => (
        <span key={i}>
          <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className="inline-block will-change-transform"
              variants={{ hidden: { y: '108%', rotate: 4 }, shown: { y: '0%', rotate: 0 } }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}

/** Content that fades and rises in the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  ...rest
}: { children: ReactNode; className?: string; delay?: number; y?: number } & Omit<HTMLMotionProps<'div'>, 'children'>) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
