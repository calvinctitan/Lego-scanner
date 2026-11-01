import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A row of studs to sit on top of a brick, `count` of them, evenly spaced. */
export function StudRow({ count, color, className }: { count: number; color: string; className?: string }) {
  return (
    <div className={cn('flex h-[7px] justify-around px-[6%]', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="block h-[7px] w-[14px] rounded-t-[3px]"
          style={{ background: color, boxShadow: 'inset 0 1.5px 0 rgb(255 255 255 / 0.35)' }}
        />
      ))}
    </div>
  );
}

/** A price shown the way Legará shows every price: on a yellow brick. */
export function PriceBrick({ children, size = 'md', className }: { children: ReactNode; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const studs = size === 'lg' ? 4 : size === 'md' ? 2 : 0;
  return (
    <span className={cn('inline-flex flex-col', className)}>
      {studs ? <StudRow count={studs} color="var(--brick-yellow)" /> : null}
      <span
        className={cn(
          'inline-flex items-center rounded-[5px] bg-brick-yellow font-[750] tabular-nums text-on-yellow shadow-[inset_0_-3px_0_rgb(0_0_0/0.16)]',
          size === 'lg' && 'px-5 pt-2 pb-3 text-[44px] leading-none [font-stretch:112%]',
          size === 'md' && 'px-3 pt-1 pb-1.5 text-[22px] leading-none [font-stretch:112%]',
          size === 'sm' && 'px-2 pt-0.5 pb-1 text-[15px] leading-tight',
        )}
      >
        {children}
      </span>
    </span>
  );
}

/** How rare a figure is, shown only when it's worth pointing out (`quiet` also hides "Uncommon"). */
export function RarityMark({ rarity, quiet = false, className }: { rarity: string; quiet?: boolean; className?: string }) {
  if (rarity === 'Common' || (quiet && rarity === 'Uncommon')) return null;
  const color = rarity === 'Very rare' ? 'var(--brick-red)' : rarity === 'Rare' ? 'var(--link)' : 'var(--muted-foreground)';
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold', className)} style={{ color }}>
      <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {rarity}
    </span>
  );
}
