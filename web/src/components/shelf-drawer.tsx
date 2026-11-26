import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Award, Check, Download, Heart, ImageDown, Lock, Share2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { PriceBrick, StudRow } from '@/components/brick';
import { FigureArt } from '@/components/figure-art';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useBadges } from '@/lib/badges';
import { drawCollectionCard } from '@/lib/collection-card';
import { FIGURES, THEMES, formatPrice, getFigure, themeColor, type Figure } from '@/lib/figures';
import { backupText, restoreBackup, toggleShelf, useShelf, type ShelfList } from '@/lib/shelf';
import { cn } from '@/lib/utils';

const SPRING = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const;
type Tab = ShelfList | 'badges';

/** Saves text or a picture as a file on the visitor's device. */
function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** "My shelf": the figures you have (what they're worth, what you paid, which sets you're completing),
 *  the ones you want, and the badges you've earned. */
export function ShelfDrawer({
  open,
  onOpenChange,
  onOpenFigure,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFigure: (id: string) => void;
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  const from = wide ? { x: '100%', y: 0 } : { x: 0, y: '100%' };
  const shelf = useShelf();
  const badges = useBadges();
  const earned = badges.filter((b) => b.earned).length;
  const [tab, setTab] = useState<Tab>('have');
  const [picture, setPicture] = useState(false);
  const list: ShelfList = tab === 'want' ? 'want' : 'have';
  const figures = shelf[list].map(getFigure).filter((f): f is Figure => !!f);
  const total = figures.reduce((sum, f) => sum + f.priceUsed, 0);

  useEffect(() => {
    if (!open) setPicture(false);
  }, [open]);

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'have', label: `I have (${shelf.have.length})`, icon: <Check className="size-4" aria-hidden="true" /> },
    { id: 'want', label: `I want (${shelf.want.length})`, icon: <Heart className="size-4" aria-hidden="true" /> },
    { id: 'badges', label: `Badges (${earned})`, icon: <Award className="size-4" aria-hidden="true" /> },
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[#05131d]/45 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                data-lenis-prevent
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl bg-background text-foreground outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[460px] md:rounded-none md:border-l md:border-border"
                initial={from}
                animate={{ x: 0, y: 0 }}
                exit={from}
                transition={SPRING}
              >
                {picture ? (
                  <ShelfPicture have={shelf.have} onBack={() => setPicture(false)} />
                ) : (
                  <>
                    <div className="px-5 pt-6 md:px-7 md:pt-8">
                      <DialogTitle className="text-[30px] leading-none font-[860] tracking-[-0.02em] [font-stretch:114%]">My shelf</DialogTitle>
                      <DialogDescription className="mt-2 text-[15px]">
                        Saved in this browser only. Add figures from their page with “I have it” or “I want it”.
                      </DialogDescription>
                      <div role="tablist" aria-label="Shelf" className="mt-5 grid grid-cols-3 rounded-lg bg-surface p-1">
                        {tabs.map((t) => {
                          const on = tab === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              role="tab"
                              aria-selected={on}
                              onClick={() => setTab(t.id)}
                              className={cn('relative h-10 rounded-md text-[14px] font-semibold transition-colors', on ? 'text-foreground' : 'text-muted-foreground')}
                            >
                              {on ? <motion.span layoutId="shelf-tab" className="absolute inset-0 rounded-md bg-background shadow-sm" transition={SPRING} aria-hidden="true" /> : null}
                              <span className="relative inline-flex items-center gap-1.5">
                                {t.icon}
                                {t.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-8 md:px-7">
                      {tab === 'badges' ? (
                        <BadgeWall />
                      ) : (
                        <>
                          <div className="flex items-end justify-between gap-3 border-b border-border pb-5" aria-live="polite">
                            <p className="max-w-[20ch] text-[15px] leading-snug text-muted-foreground">
                              {tab === 'have' ? 'Your collection is worth about' : 'Buying them all would cost about'}
                            </p>
                            <PriceBrick size="md">{formatPrice(total)}</PriceBrick>
                          </div>
                          {tab === 'have' ? <PaidSummary /> : null}
                          <FigureList figures={figures} list={list} onOpenFigure={onOpenFigure} />
                          {tab === 'have' ? (
                            <>
                              <ThemeProgress />
                              {shelf.have.length ? (
                                <Button variant="brick" className="mt-8 w-full" onClick={() => setPicture(true)}>
                                  <ImageDown />
                                  Make a picture of my shelf
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                          <Backup />
                        </>
                      )}
                    </div>
                  </>
                )}
                <DialogPrimitive.Close
                  className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function FigureList({ figures, list, onOpenFigure }: { figures: Figure[]; list: ShelfList; onOpenFigure: (id: string) => void }) {
  const shelf = useShelf();
  if (!figures.length) {
    return (
      <p className="mt-6 rounded-md border border-dashed border-border px-5 py-8 text-center text-[15px] leading-relaxed text-muted-foreground">
        {list === 'have'
          ? 'Nothing here yet. Open a figure in the market and choose “I have it” to add up what your collection is worth.'
          : 'Nothing here yet. Open a figure in the market and choose “I want it” to keep a wishlist.'}
      </p>
    );
  }
  return (
    <ul className="mt-2">
      <AnimatePresence initial={false}>
        {figures.map((figure) => {
          const paid = list === 'have' ? shelf.paid[figure.id] : undefined;
          return (
            <motion.li
              key={figure.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 py-2">
                <button type="button" onClick={() => onOpenFigure(figure.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-surface">
                  <span className="w-20 shrink-0">
                    <FigureArt figure={figure} cols={13} className="p-1.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-semibold">{figure.name}</span>
                    <span className="block text-[14px] text-muted-foreground tabular-nums">
                      {formatPrice(figure.priceUsed)}
                      {typeof paid === 'number' ? (
                        <>
                          , paid {formatPrice(paid)} <Gain value={figure.priceUsed - paid} />
                        </>
                      ) : null}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleShelf(list, figure.id)}
                  aria-label={`Remove ${figure.name}`}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

/** "+$40" in green or "−$12" in red. */
export function Gain({ value }: { value: number }) {
  if (Math.round(value) === 0) return <span className="font-semibold">(even)</span>;
  const up = value > 0;
  return (
    <span className={cn('font-semibold', up ? 'text-[var(--gain)]' : 'text-brick-red')}>
      ({up ? '+' : '−'}
      {formatPrice(Math.abs(value))})
    </span>
  );
}

/** What you paid for the figures where you noted it, against what they're worth now. */
function PaidSummary() {
  const shelf = useShelf();
  const noted = shelf.have.filter((id) => typeof shelf.paid[id] === 'number');
  if (!noted.length) {
    return shelf.have.length ? (
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">Tip: open a figure you have and note what you paid, to see if it was a good deal.</p>
    ) : null;
  }
  const paid = noted.reduce((s, id) => s + shelf.paid[id], 0);
  const worth = noted.reduce((s, id) => s + (getFigure(id)?.priceUsed ?? 0), 0);
  const diff = worth - paid;
  return (
    <p className="mt-3 rounded-md bg-surface px-4 py-3 text-[15px] leading-relaxed">
      You paid {formatPrice(paid)} for {noted.length === shelf.have.length ? 'them' : `${noted.length} of them`}. They’re worth about{' '}
      {formatPrice(worth)} now, {diff >= 0 ? 'up' : 'down'} <Gain value={diff} />.
    </p>
  );
}

/** How much of each theme you have, as a row of bricks: one per figure, filled in when it's yours. */
function ThemeProgress() {
  const shelf = useShelf();
  const rows = THEMES.map((theme) => {
    const all = FIGURES.filter((f) => f.theme === theme);
    return { theme, all, have: all.filter((f) => shelf.have.includes(f.id)).length };
  }).filter((r) => r.all.length);
  return (
    <section aria-labelledby="sets-title" className="mt-8">
      <h3 id="sets-title" className="text-[17px] font-[760] [font-stretch:110%]">
        Your sets
      </h3>
      <p className="mt-1 text-[14px] text-muted-foreground">Collect every figure in a theme to earn the Full set badge.</p>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r.theme} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <span className="truncate text-[14px] font-medium">{r.theme}</span>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {r.have} of {r.all.length}
              {r.have === r.all.length ? ', complete' : ''}
            </span>
            <span className="col-span-2 flex gap-[3px]" aria-hidden="true">
              {r.all.map((f) => (
                <span
                  key={f.id}
                  className="h-2.5 flex-1 rounded-[2px] transition-colors duration-500"
                  style={{ background: shelf.have.includes(f.id) ? themeColor(r.theme) : 'var(--stud)', opacity: shelf.have.includes(f.id) ? 1 : 0.6 }}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BadgeWall() {
  const badges = useBadges();
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div>
      <p className="text-[15px] text-muted-foreground" aria-live="polite">
        {earned} of {badges.length} earned. Badges are saved in this browser.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {badges.map(({ badge, earned: on }) => (
          <li key={badge.id} className={cn('rounded-[var(--radius)] border p-3', on ? 'border-border' : 'border-dashed border-border')}>
            <span className="block w-14" aria-hidden="true">
              <StudRow count={2} color={on ? badge.color : 'var(--stud)'} />
              <span className="flex h-8 items-center justify-center rounded-[4px]" style={{ background: on ? badge.color : 'var(--stud)', boxShadow: 'inset 0 -3px 0 rgb(0 0 0 / 0.18)' }}>
                {on ? null : <Lock className="size-3.5 text-muted-foreground" />}
              </span>
            </span>
            <p className={cn('mt-2.5 text-[15px] leading-tight font-semibold', !on && 'text-muted-foreground')}>{badge.name}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              <span className="sr-only">{on ? 'Earned. ' : 'Not earned yet. '}</span>
              {badge.how}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Back up the shelf to a file, and put it back from one (for another device or browser). */
function Backup() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const restore = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 200_000) return setMessage({ ok: false, text: 'That file is too big to be a Legará backup.' });
    const result = restoreBackup(await file.text());
    setMessage(
      result.ok
        ? { ok: true, text: `Restored: ${result.have} on your shelf, ${result.want} on your wishlist.` }
        : { ok: false, text: result.error },
    );
  };
  return (
    <section aria-labelledby="backup-title" className="mt-8 border-t border-border pt-5">
      <h3 id="backup-title" className="text-[15px] font-semibold">
        Keep your shelf safe
      </h3>
      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
        Your shelf lives in this browser. Save a backup file to move it to another device, or in case this browser is cleared.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => saveFile(new Blob([backupText()], { type: 'application/json' }), 'legara-shelf-backup.json')}>
          <Download />
          Save a backup
        </Button>
        <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
          <Upload />
          Restore a backup
        </Button>
        <input ref={input} type="file" accept="application/json,.json" className="hidden" aria-label="Backup file" onChange={(e) => (restore(e.target.files?.[0]), (e.target.value = ''))} />
      </div>
      {message ? (
        <p role="status" className={cn('mt-3 text-[14px] font-medium', message.ok ? 'text-foreground' : 'text-brick-red')}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}

/** A picture of the shelf to save or share. It's drawn here in the browser; nothing is uploaded. */
function ShelfPicture({ have, onBack }: { have: string[]; onBack: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let gone = false;
    const site = window.location.origin + import.meta.env.BASE_URL;
    drawCollectionCard(have, site).then(
      (b) => {
        if (gone) return;
        setBlob(b);
        setUrl(URL.createObjectURL(b));
      },
      (e: unknown) => !gone && setError(e instanceof Error ? e.message : 'Couldn’t make the picture.'),
    );
    return () => {
      gone = true;
    };
  }, [have]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const file = blob ? new File([blob], 'legara-shelf.png', { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-6 pb-8 md:px-7 md:pt-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 self-start text-[15px] font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to my shelf
      </button>
      <DialogTitle className="mt-4 text-[26px] leading-none font-[860] [font-stretch:114%]">A picture of my shelf</DialogTitle>
      <DialogDescription className="mt-2 text-[15px]">Made in your browser. Save it or share it; nothing is uploaded.</DialogDescription>
      <div className="mt-5 overflow-hidden rounded-md bg-surface" style={{ aspectRatio: '1080 / 1350' }}>
        {url ? <img src={url} alt="Your shelf: how many figures, what they’re worth, and the most valuable ones" className="size-full object-contain" /> : null}
        {error ? <p className="p-5 text-[15px] text-brick-red">{error}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="brick" disabled={!blob} onClick={() => blob && saveFile(blob, 'legara-shelf.png')}>
          <Download />
          Save picture
        </Button>
        {canShare ? (
          <Button variant="outline" onClick={() => file && navigator.share({ files: [file], title: 'My Legará shelf' }).catch(() => {})}>
            <Share2 />
            Share
          </Button>
        ) : null}
      </div>
    </div>
  );
}
