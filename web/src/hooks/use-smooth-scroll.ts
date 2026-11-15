import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect, useState } from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';

/** Where a section should stop: its top, less the room its CSS leaves for the sticky header (scroll-margin-top). */
function restingPlace(el: Element): number {
  const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return Math.max(0, el.getBoundingClientRect().top + window.scrollY - margin);
}

/** Scrolls smoothly (or at once) to a section, measured from where the page really is right now. */
export function scrollToSection(lenis: Lenis, el: Element, immediate = false): void {
  // First tell Lenis where the page actually is: the browser may have moved it a moment ago.
  lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  lenis.scrollTo(restingPlace(el), { immediate, force: true });
}

/**
 * Smooth, eased scrolling for the whole page (Lenis), including the jumps to #market, #scan and #about.
 * Off when "reduce motion" is on. `paused` stops the page scrolling, for while the intro or a panel is open.
 */
export function useSmoothScroll(paused: boolean): Lenis | null {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (reduce) return;
    const instance = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      allowNestedScroll: true,
    });
    setLenis(instance);

    // Links to a section of this page (like "Browse the market"). The browser would jump there at once
    // while Lenis also scrolls there, and the two could disagree about where to stop. So for a mouse
    // or touch click we do it ourselves: one smooth scroll, and the address still gets its #section.
    // Keyboard users keep the browser's own jump, which also moves keyboard focus to the section.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.detail === 0 || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      const here = window.location;
      if (url.origin !== here.origin || url.pathname !== here.pathname || url.search !== here.search || url.hash.length < 2) return;
      const section = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!section) return;
      e.preventDefault();
      if (here.hash !== url.hash) window.history.pushState(window.history.state, '', url.hash);
      scrollToSection(instance, section);
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      instance.destroy();
      setLenis(null);
    };
  }, [reduce]);

  useEffect(() => {
    if (!lenis) return;
    if (paused) lenis.stop();
    else lenis.start();
  }, [lenis, paused]);

  // Without Lenis (reduce motion), still stop the page scrolling behind the intro.
  useEffect(() => {
    if (lenis || !paused) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = before;
    };
  }, [lenis, paused]);

  return lenis;
}
