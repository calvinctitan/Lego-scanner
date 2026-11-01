import { LayoutGroup, MotionConfig } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { AboutSection } from '@/components/about-section';
import { FigureSheet } from '@/components/figure-sheet';
import { Hero } from '@/components/hero';
import { Market } from '@/components/market';
import { ScanSection } from '@/components/scan-section';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getFigure } from '@/lib/figures';

/** The open figure lives in the address (?figure=mr-gold), so a figure can be shared and Back closes it. */
function figureFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('figure');
  return id && getFigure(id) ? id : null;
}

export default function App() {
  const [openId, setOpenId] = useState<string | null>(figureFromUrl);

  useEffect(() => {
    const onPop = () => setOpenId(figureFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('figure', id);
    url.hash = '';
    // Opening one figure from another replaces it, so Back always returns to the page.
    if (figureFromUrl()) window.history.replaceState({ legara: true }, '', url);
    else window.history.pushState({ legara: true }, '', url);
    setOpenId(id);
  }, []);

  const close = useCallback(() => {
    if ((window.history.state as { legara?: boolean } | null)?.legara) {
      window.history.back(); // popstate then clears openId
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('figure');
    window.history.replaceState(null, '', url);
    setOpenId(null);
  }, []);

  const figure = openId ? (getFigure(openId) ?? null) : null;

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <SiteHeader />
        <main>
          <Hero onOpen={open} />
          <Market onOpen={open} />
          <ScanSection onOpen={open} />
          <AboutSection />
        </main>
        <SiteFooter />
        <FigureSheet figure={figure} onClose={close} />
      </LayoutGroup>
    </MotionConfig>
  );
}
