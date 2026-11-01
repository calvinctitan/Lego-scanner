import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { StudRow } from '@/components/brick';
import { EASE_OUT } from '@/components/reveal';
import { FIGURES } from '@/lib/figures';

import type { BrickScene } from './brick-scene';

/**
 * The welcome screen: "LEGARÁ" built from 3D bricks. Click anywhere (or press Enter) and the bricks
 * fly apart as the camera dives through them into the site.
 * The 3D part loads on its own; until then (or if the device can't draw 3D) a flat version shows.
 */
export function Intro({ onEnter }: { onEnter: () => void }) {
  const still = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BrickScene | null>(null);
  const [sceneState, setSceneState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    import('./brick-scene')
      .then(({ createBrickScene }) => {
        if (cancelled || leavingRef.current || !canvasRef.current) return; // entered before the 3D was ready: skip it
        sceneRef.current = createBrickScene(canvasRef.current, { still, onReady: () => !cancelled && setSceneState('ready') });
      })
      .catch(() => !cancelled && setSceneState('failed'));
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [still]);

  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, []);

  const enter = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    sceneRef.current?.enter();
    // Let the bricks start flying, then reveal the site under them.
    window.setTimeout(onEnter, still || sceneState !== 'ready' ? 0 : 420);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // The button leans toward the pointer a little, like it's being pulled.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 20 });
  const y = useSpring(my, { stiffness: 260, damping: 20 });

  const textIn = (delay: number) => ({
    initial: still ? false : { opacity: 0, y: 22 },
    animate: leaving ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 },
    transition: leaving ? { duration: 0.35, ease: EASE_OUT } : { duration: 0.9, ease: EASE_OUT, delay },
  });

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      className="fixed inset-0 z-[60] cursor-pointer overflow-hidden bg-[#05131d] text-[#eef0f2] select-none"
      onClick={enter}
      exit={{ opacity: 0 }}
      transition={{ duration: still ? 0.3 : 0.9, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Flat studs while the 3D loads, and the fallback if it can't. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #13293a 0 34%, transparent 36%)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 45%, black 20%, transparent 75%)',
        }}
      />
      <motion.canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block size-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: sceneState === 'ready' ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      />
      {sceneState === 'failed' ? (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="text-[clamp(72px,18vw,240px)] leading-none font-[900] tracking-[-0.03em] text-[#f2cd37] [font-stretch:125%]">
            legará
          </span>
        </div>
      ) : null}

      {/* Shading so the words at the bottom stay readable over the bricks. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-[#05131d] via-[#05131d]/70 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#05131d]/80 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex max-w-[1320px] items-center justify-between px-4 pt-5 sm:px-6">
        <motion.p {...textIn(0.2)} className="text-[14px] text-[#a0a5a9]">
          An unofficial fan project
        </motion.p>
        <motion.p {...textIn(0.3)} className="text-[14px] text-[#a0a5a9] tabular-nums">
          {FIGURES.length} figures, priced
        </motion.p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto flex max-w-[1320px] flex-col gap-7 px-4 pb-[max(28px,env(safe-area-inset-bottom))] sm:px-6 md:flex-row md:items-end md:justify-between md:pb-12">
        <div>
          <motion.h2
            id="intro-title"
            {...textIn(1.1)}
            className="max-w-[16ch] text-[clamp(30px,4.4vw,56px)] leading-[0.98] font-[860] tracking-[-0.025em] text-balance [font-stretch:114%]"
          >
            Know what every minifigure is worth.
          </motion.h2>
          <motion.p {...textIn(1.25)} className="mt-3 max-w-[38ch] text-[16px] leading-[1.5] text-[#a0a5a9]">
            Typical prices, pictures and places to buy, for collectors of every age.
          </motion.p>
        </div>

        <motion.div {...textIn(1.4)} className="flex flex-col items-start gap-3 md:items-end">
          <motion.button
            ref={button}
            type="button"
            style={{ x, y }}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              mx.set((e.clientX - r.left - r.width / 2) * 0.25);
              my.set((e.clientY - r.top - r.height / 2) * 0.35);
            }}
            onPointerLeave={() => {
              mx.set(0);
              my.set(0);
            }}
            onClick={(e) => {
              e.stopPropagation();
              enter();
            }}
            whileTap={{ y: 3 }}
            className="pointer-events-auto group flex flex-col rounded-[8px] focus-visible:outline-offset-4"
          >
            <StudRow count={4} color="#f2cd37" className="px-[10%]" />
            <span className="flex h-16 items-center gap-3 rounded-[6px] bg-[#f2cd37] px-8 text-[20px] font-[800] text-[#05131d] shadow-[inset_0_-6px_0_rgb(0_0_0/0.2)] transition-shadow group-active:shadow-[inset_0_-2px_0_rgb(0_0_0/0.2)] [font-stretch:112%]">
              Enter Legará
              <ArrowDown className="size-5 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" />
            </span>
          </motion.button>
          <p className="text-[13px] text-[#a0a5a9]">Or click anywhere, or press Enter</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
