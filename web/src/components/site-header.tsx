import { motion, useScroll, useSpring } from 'framer-motion';
import { Library } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useShelf } from '@/lib/shelf';

const LINKS = [
  { href: '#scan', label: 'Scan' },
  { href: '#market', label: 'Market' },
  { href: '#about', label: 'About' },
];

/** Which section is in the middle of the screen right now. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        setActive(ids.find((id) => seen.get(id)) ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const SECTION_IDS = LINKS.map((l) => l.href.slice(1));

export function SiteHeader({ onOpenShelf }: { onOpenShelf: () => void }) {
  const active = useActiveSection(SECTION_IDS);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const shelf = useShelf();
  const count = shelf.have.length + shelf.want.length;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <a
        href="#market"
        className="absolute top-2 left-2 -translate-y-16 rounded-md bg-foreground px-3 py-2 text-sm text-background focus-visible:translate-y-0"
      >
        Skip to the market
      </a>
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-2 px-4 sm:px-6">
        <a href="#top" className="text-[24px] leading-none font-[900] tracking-[-0.02em] [font-stretch:125%]" aria-label="Legará, back to the top">
          legará
        </a>
        <div className="flex items-center gap-1">
          <nav aria-label="Sections">
            <ul className="flex items-center gap-0.5 text-[15px] font-medium sm:gap-1">
              {LINKS.map((link) => {
                const on = active === link.href.slice(1);
                return (
                  <li key={link.href} className="relative">
                    {on ? (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-md bg-surface-strong"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <a
                      href={link.href}
                      aria-current={on ? 'location' : undefined}
                      className={`relative block rounded-md px-2.5 py-2 sm:px-3 transition-colors duration-200 hover:text-foreground ${on ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          <button
            type="button"
            onClick={onOpenShelf}
            aria-label={count ? `My shelf, ${count} ${count === 1 ? 'figure' : 'figures'}` : 'My shelf'}
            className="relative inline-flex h-10 items-center gap-2 rounded-md px-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <Library className="size-[18px]" aria-hidden="true" />
            <span className="hidden sm:inline">My shelf</span>
            {count ? (
              <motion.span
                key={count}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-brick-yellow px-1.5 text-[12px] leading-5 font-bold text-on-yellow tabular-nums"
              >
                {count}
              </motion.span>
            ) : null}
          </button>
        </div>
      </div>
      {/* How far down the page you are, as a thin yellow brick along the bottom of the header. */}
      <motion.div aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[3px] origin-left bg-brick-yellow" style={{ scaleX: progress }} />
    </header>
  );
}
