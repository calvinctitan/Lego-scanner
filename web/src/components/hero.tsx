import { useReducedMotion } from 'framer-motion';

import pile from '@/assets/hero/brick-pile.webp';
import pileSmall from '@/assets/hero/brick-pile-small.webp';
import SculptureHero from '@/components/ui/liquid-sculpture-hero';
import { useMediaQuery } from '@/hooks/use-media-query';
import { FIGURES, formatPrice, sortFigures } from '@/lib/figures';
import { cn } from '@/lib/utils';

export const FAN_NOTICE =
  'Unofficial fan project. LEGO® is a trademark of the LEGO Group of companies, which does not sponsor, authorize or endorse Legará.';

const BY_VALUE = sortFigures(FIGURES, 'value-desc');
const TOP = BY_VALUE[0];
const CHEAPEST = BY_VALUE[BY_VALUE.length - 1];
const ARCHIVO = '"Archivo Variable", "Archivo", "Helvetica Neue", Arial, system-ui, sans-serif';

/**
 * The first screen: the liquid hero (components/ui/liquid-sculpture-hero.tsx) in Legará's look.
 * Its "sculpture" is Legará's own picture of a pile of bricks with one gold brick on top: somewhere
 * in a pile of old bricks there may be a figure worth a lot. Moving the pointer over the pile turns
 * the bricks into loose studs that flow and settle back; the hint says "Dig through the bricks".
 *
 * The site's own header stays above it, so the hero's built-in navigation is switched off, and the
 * look (Archivo, the yellow brick behind "worth?", brick buttons) is set in index.css under .legara-hero.
 *
 * `ready` is false while the 3D intro is still on screen. When it turns true the pile assembles
 * out of particles, so the intro's flying bricks hand over to it.
 */
export function Hero({ ready }: { ready: boolean }) {
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const still = useReducedMotion() ?? false;
  return (
    <div id="top">
      <SculptureHero
        className={cn('legara-hero', (ready || still) && 'is-live')}
        src={pile}
        darkSrc={pile}
        mobileSrc={pileSmall}
        mobileDarkSrc={pileSmall}
        aspect={2600 / 982}
        imageAlt="A pile of loose toy bricks in many colours, with one gold brick on top"
        showNav={false}
        eyebrow=""
        headline={'What’s your minifigure\nworth?'}
        headlineAccent="worth?"
        body={`Typical used prices for ${FIGURES.length} collectible minifigures, from a ${formatPrice(CHEAPEST.priceUsed)} ${CHEAPEST.name} to a ${formatPrice(TOP.priceUsed)} ${TOP.name}. Found one you want? Buy it on BrickLink or eBay.`}
        primaryCta={{ label: 'Scan a figure', href: '#scan' }}
        secondaryCta={{ label: 'Browse the market', href: '#market' }}
        hint="Dig through the bricks"
        hintTouch="Touch the bricks"
        background="#ffffff"
        darkBackground="#05131d"
        theme={dark ? 'dark' : 'light'}
        themeToggle={false}
        textColor={dark ? '#eef0f2' : '#05131d'}
        accentColor="#05131d"
        headingFont={ARCHIVO}
        accentFont={ARCHIVO}
        bodyFont={ARCHIVO}
        loadFonts={false}
        // No giant word behind the pile (the pile would hide it): index.css draws baseplate studs there instead.
        backdropText=""
        sculptureScale={0.92}
        sculptureY={1}
        // The site's header (64px and a 1px line) sits above, so together they fill the screen exactly.
        height="calc(100svh - 65px)"
        style={{ minHeight: 660 }}
        showCredit={false}
        // Fewer, larger particles with a highlight each: loose material reads as studs, not dust.
        particleDensity={0.5}
        dotSize={1.15}
        studs
        liquid={0.35}
        // When the pointer stops for a moment the pile settles and drawing stops, to save battery.
        idleAfter={2500}
        intro={ready && !still}
      >
        <p className="mt-6 max-w-[34rem] text-[13px] leading-[1.55] text-muted-foreground">{FAN_NOTICE}</p>
      </SculptureHero>
    </div>
  );
}
