import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect, useState } from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';

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
      anchors: { offset: -64 }, // the sticky header's height
      allowNestedScroll: true,
    });
    setLenis(instance);
    return () => {
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
