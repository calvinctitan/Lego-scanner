import { AnimatePresence, LayoutGroup, MotionConfig } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { AboutSection } from '@/components/about-section';
import { Catalog } from '@/components/catalog';
import { FigureSheet } from '@/components/figure-sheet';
import { Hero } from '@/components/hero';
import { Intro } from '@/components/intro/intro';
import { Market } from '@/components/market';
import { ScanSection } from '@/components/scan-section';
import { ShelfDrawer } from '@/components/shelf-drawer';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { useSmoothScroll } from '@/hooks/use-smooth-scroll';
import { getFigure } from '@/lib/figures';
import { rememberViewed } from '@/lib/shelf';

/** The open figure lives in the address (?figure=mr-gold), so a figure can be shared and Back closes it. */
function figureFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('figure');
  return id && getFigure(id) ? id : null;
}

const INTRO_SEEN = 'legara.introSeen.v1';

/**
 * The intro plays once per visit (per browser tab). It's skipped for links straight to a figure or a
 * section, and `?intro=1` plays it again.
 */
function introWanted(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.has('intro')) return params.get('intro') !== '0';
  if (params.get('figure') || window.location.hash) return false;
  try {
    return window.sessionStorage.getItem(INTRO_SEEN) !== '1';
  } catch {
    return true;
  }
}

export default function App() {
  const [openId, setOpenId] = useState<string | null>(figureFromUrl);
  const [intro, setIntro] = useState(introWanted);
  const [shelfOpen, setShelfOpen] = useState(false);

  const lenis = useSmoothScroll(intro || openId !== null || shelfOpen);

  // A link to a section (like …/#scan in a code email) jumps there once the page has drawn.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || intro) return;
    const el = document.getElementById(id);
    if (!el) return;
    const t = window.setTimeout(() => {
      if (lenis) lenis.scrollTo(el, { offset: -64, immediate: true, force: true });
      else el.scrollIntoView();
    }, 60);
    return () => window.clearTimeout(t);
    // Only on the first load (and once smooth scrolling is ready).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenis]);

  useEffect(() => {
    const onPop = () => setOpenId(figureFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (openId) rememberViewed(openId);
  }, [openId]);

  const enter = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SEEN, '1');
    } catch {
      // Private mode: the intro may just play again next time.
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has('intro')) {
      url.searchParams.delete('intro');
      window.history.replaceState(window.history.state, '', url);
    }
    window.scrollTo(0, 0);
    setIntro(false);
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

  const openFromShelf = useCallback(
    (id: string) => {
      setShelfOpen(false);
      open(id);
    },
    [open],
  );

  const figure = openId ? (getFigure(openId) ?? null) : null;

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        {/* While the intro is up, the site under it can't be reached by keyboard or screen reader. */}
        <div inert={intro}>
          <SiteHeader onOpenShelf={() => setShelfOpen(true)} />
          <main>
            <Hero onOpen={open} ready={!intro} />
            <ScanSection onOpen={open} />
            <Market onOpen={open} />
            <Catalog />
            <AboutSection />
          </main>
          <SiteFooter />
        </div>
        <FigureSheet figure={figure} onClose={close} onOpen={open} />
        <ShelfDrawer open={shelfOpen} onOpenChange={setShelfOpen} onOpenFigure={openFromShelf} />
        <AnimatePresence>{intro ? <Intro key="intro" onEnter={enter} /> : null}</AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
  );
}
