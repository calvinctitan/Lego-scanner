import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ImageUp, KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';

import { PriceBrick, RarityMark, StudRow } from '@/components/brick';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ebaySearchUrl, findFigureForScan, formatRange } from '@/lib/figures';
import { preparePhoto, type PreparedPhoto } from '@/lib/photo';
import { ScanError, checkAccessCode, scanPhoto, scanningIsOpen, type ScanResult } from '@/lib/scan';
import { recordScan, saveAccessCode, savedAccessCode } from '@/lib/storage';
import { cn } from '@/lib/utils';

type State =
  | { kind: 'closed' }
  | { kind: 'code'; error?: string; checking?: boolean }
  | { kind: 'ready'; error?: string }
  | { kind: 'scanning'; photo: PreparedPhoto }
  | { kind: 'result'; photo: PreparedPhoto; result: ScanResult }
  | { kind: 'failed'; photo: PreparedPhoto; message: string };

function startState(): State {
  if (!scanningIsOpen()) return { kind: 'closed' };
  return savedAccessCode() ? { kind: 'ready' } : { kind: 'code' };
}

const STEPS = ['Get an access code', 'Photograph your figure', 'Read the estimate'];

function stepOf(state: State): number {
  if (state.kind === 'code' || state.kind === 'closed') return 0;
  if (state.kind === 'ready' || state.kind === 'scanning' || state.kind === 'failed') return 1;
  return 2;
}

export function ScanSection({ onOpen }: { onOpen: (id: string) => void }) {
  const [state, setState] = useState<State>(startState);
  const scan = useRef<AbortController | null>(null);

  useEffect(() => () => scan.current?.abort(), []);

  const run = async (photo: PreparedPhoto) => {
    scan.current?.abort();
    const controller = new AbortController();
    scan.current = controller;
    setState({ kind: 'scanning', photo });
    try {
      const result = await scanPhoto(photo.base64, savedAccessCode(), controller.signal);
      recordScan();
      setState({ kind: 'result', photo, result });
    } catch (error) {
      if (controller.signal.aborted) return setState({ kind: 'ready' });
      if (error instanceof ScanError && error.kind === 'access-code') {
        saveAccessCode(null);
        return setState({ kind: 'code', error: error.message });
      }
      setState({ kind: 'failed', photo, message: error instanceof Error ? error.message : 'Something went wrong. Please try again.' });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await run(await preparePhoto(file));
    } catch (error) {
      setState({ kind: 'ready', error: error instanceof Error ? error.message : 'Couldn’t open that photo.' });
    }
  };

  return (
    <section id="scan" aria-labelledby="scan-title" className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:py-24">
        <div>
          <h2 id="scan-title" className="text-[clamp(38px,5.4vw,68px)] leading-[0.95] font-[860] tracking-[-0.03em] [font-stretch:116%]">
            Scan a figure
          </h2>
          <p className="mt-4 max-w-[30rem] text-[17px] leading-[1.5] text-muted-foreground">
            Photograph a minifigure and an AI names it and estimates what it’s worth. Scanning is invite-only: ask the person
            who shared this site for an access code.
          </p>
          <ol className="mt-9 space-y-4">
            {STEPS.map((label, i) => {
              const current = stepOf(state);
              const done = i < current || state.kind === 'result';
              const active = i === current && state.kind !== 'result' && state.kind !== 'closed';
              return (
                <li key={label} className="flex items-center gap-4">
                  {/* Step 1 is a one-stud brick, step 2 two studs, step 3 three. */}
                  <span className="inline-flex w-[52px] flex-col" aria-hidden="true">
                    <StudRow count={i + 1} color={active ? 'var(--brick-yellow)' : done ? 'var(--foreground)' : 'var(--stud)'} />
                    <span
                      className="block h-5 rounded-[4px]"
                      style={{ background: active ? 'var(--brick-yellow)' : done ? 'var(--foreground)' : 'var(--stud)' }}
                    />
                  </span>
                  <span className={cn('text-[17px]', active ? 'font-semibold' : done ? 'text-foreground' : 'text-muted-foreground')}>
                    <span className="sr-only">Step {i + 1}: </span>
                    {label}
                    {done ? <span className="sr-only"> (done)</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="self-start rounded-xl border border-border bg-background p-5 sm:p-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={state.kind}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {state.kind === 'closed' ? <Closed /> : null}
              {state.kind === 'code' ? <CodeForm state={state} setState={setState} /> : null}
              {state.kind === 'ready' ? (
                <PhotoPicker error={state.error} onFile={onFile} onForget={() => (saveAccessCode(null), setState({ kind: 'code' }))} />
              ) : null}
              {state.kind === 'scanning' ? <Scanning photo={state.photo} onStop={() => scan.current?.abort()} /> : null}
              {state.kind === 'result' ? (
                <Result photo={state.photo} result={state.result} onOpen={onOpen} onAgain={() => setState({ kind: 'ready' })} />
              ) : null}
              {state.kind === 'failed' ? (
                <div>
                  <img src={state.photo.previewUrl} alt="Your photo" className="max-h-56 rounded-md object-contain" />
                  <p role="alert" className="mt-5 text-[17px] font-semibold">
                    {state.message}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Button variant="brick" onClick={() => run(state.photo)}>
                      Try again
                    </Button>
                    <Button variant="outline" onClick={() => setState({ kind: 'ready' })}>
                      Use a different photo
                    </Button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Closed() {
  return (
    <div>
      <p className="text-[20px] font-semibold">Scanning isn’t open yet.</p>
      <p className="mt-2 max-w-[34rem] text-[16px] leading-[1.55] text-muted-foreground">
        The scanner needs a Legará server, which isn’t switched on for this site yet. Everything in the market works without
        it.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <a href="#market">Browse the market</a>
      </Button>
    </div>
  );
}

function CodeForm({ state, setState }: { state: Extract<State, { kind: 'code' }>; setState: (s: State) => void }) {
  const [code, setCode] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setState({ kind: 'code', error: 'Type the access code you were given.' });
    setState({ kind: 'code', checking: true });
    try {
      await checkAccessCode(code);
      saveAccessCode(code.trim());
      setState({ kind: 'ready' });
    } catch (error) {
      setState({ kind: 'code', error: error instanceof Error ? error.message : 'Couldn’t check that code. Please try again.' });
    }
  };
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="access-code" className="flex items-center gap-2 text-[17px] font-semibold">
        <KeyRound className="size-[18px]" aria-hidden="true" />
        Access code
      </label>
      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <Input
          id="access-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? 'access-code-error' : 'access-code-help'}
          className="sm:max-w-xs"
        />
        <Button type="submit" variant="brick" disabled={state.checking}>
          {state.checking ? <Loader2 className="animate-spin" /> : null}
          {state.checking ? 'Checking' : 'Unlock scanning'}
        </Button>
      </div>
      {state.error ? (
        <p id="access-code-error" role="alert" className="mt-3 text-[15px] font-medium text-brick-red">
          {state.error}
        </p>
      ) : null}
      <p id="access-code-help" className="mt-4 max-w-[34rem] text-[15px] leading-[1.55] text-muted-foreground">
        Don’t have one? Ask the person who shared this site with you. Codes are free; they keep the scanner from being
        overloaded. This browser remembers your code.
      </p>
    </form>
  );
}

function PhotoPicker({ error, onFile, onForget }: { error?: string; onFile: (f: File | undefined) => void; onForget: () => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const touch = useMediaQuery('(pointer: coarse)');

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cn(
          'rounded-lg border-2 border-dashed px-5 py-9 text-center transition-colors',
          over ? 'border-brick-blue bg-brick-blue/5' : 'border-border',
        )}
      >
        <p className="text-[19px] font-semibold">{touch ? 'Photograph your minifigure' : 'Drop a photo of your minifigure here'}</p>
        <p className="mx-auto mt-2 max-w-[28rem] text-[15px] leading-[1.5] text-muted-foreground">
          Stand it up on a plain background, in good light, and fill the frame.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {touch ? (
            <Button variant="brick" onClick={() => camera.current?.click()}>
              <Camera />
              Take a photo
            </Button>
          ) : null}
          <Button variant={touch ? 'outline' : 'brick'} onClick={() => library.current?.click()}>
            <ImageUp />
            Choose a photo
          </Button>
        </div>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ''))}
        />
        <input ref={library} type="file" accept="image/*" className="hidden" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ''))} />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[15px] font-medium text-brick-red">
          {error}
        </p>
      ) : null}
      <button type="button" onClick={onForget} className="mt-4 text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Use a different access code
      </button>
    </div>
  );
}

function Scanning({ photo, onStop }: { photo: PreparedPhoto; onStop: () => void }) {
  return (
    <div className="flex flex-col items-center text-center" aria-live="polite">
      <img src={photo.previewUrl} alt="Your photo" className="max-h-56 rounded-md object-contain" />
      <BrickLoader />
      <p className="mt-4 text-[18px] font-semibold">Looking closely at your figure</p>
      <p className="mt-1 text-[15px] text-muted-foreground">This usually takes 10 to 30 seconds.</p>
      <Button variant="outline" className="mt-5" onClick={onStop}>
        Stop
      </Button>
    </div>
  );
}

/** Three bricks stacking, over and over, while the AI works. */
function BrickLoader() {
  const colors = ['var(--brick-red)', 'var(--brick-yellow)', 'var(--brick-blue)'];
  return (
    <div className="mt-6 flex h-[66px] w-[64px] flex-col-reverse" aria-hidden="true">
      {colors.map((color, i) => (
        <motion.span
          key={color}
          className="block"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: [-30, 0, 0, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.4, times: [0, 0.18, 0.85, 1], repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
        >
          <StudRow count={2} color={color} />
          <span className="block h-4 rounded-[3px]" style={{ background: color }} />
        </motion.span>
      ))}
    </div>
  );
}

function Result({ photo, result, onOpen, onAgain }: { photo: PreparedPhoto; result: ScanResult; onOpen: (id: string) => void; onAgain: () => void }) {
  const match = result.isMinifigure ? findFigureForScan(result.name, result.theme) : undefined;
  return (
    <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
      <img src={photo.previewUrl} alt="Your photo" className="max-h-60 w-full rounded-md bg-surface object-contain" />
      <div aria-live="polite">
        {!result.isMinifigure ? (
          <>
            <p className="text-[24px] leading-tight font-[800] [font-stretch:110%]">That doesn’t look like a minifigure</p>
            <p className="mt-2 text-[16px] leading-[1.5] text-muted-foreground">
              It looks like {result.name.toLowerCase()}. Try a photo of one minifigure on a plain background.
            </p>
          </>
        ) : (
          <>
            <p className="text-[28px] leading-[1.05] font-[860] tracking-[-0.01em] [font-stretch:112%]">{result.name}</p>
            <p className="mt-1.5 text-[16px] text-muted-foreground">
              {[result.theme, result.year ? `around ${result.year}` : ''].filter(Boolean).join(', ')}
            </p>
            {result.confidence !== 'high' ? (
              <p className="mt-2 text-[15px] text-muted-foreground">
                {result.confidence === 'low' ? 'Not sure this is the right figure, so the prices are a rough guess.' : 'Not sure of the exact version, so the prices are wider.'}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-6">
              <div>
                <p className="text-[14px] font-semibold text-muted-foreground">Used</p>
                <PriceBrick size="md" className="mt-1.5">
                  {formatRange(result.valueUsed)}
                </PriceBrick>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-muted-foreground">New</p>
                <p className="mt-[13px] text-[22px] leading-none font-[750] tabular-nums [font-stretch:112%]">{formatRange(result.valueNew)}</p>
              </div>
            </div>
            <RarityMark rarity={result.rarity} className="mt-4" />
            {result.note ? <p className="mt-4 text-[16px] leading-[1.55]">{result.note}</p> : null}
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button variant="brick" onClick={onAgain}>
            <Camera />
            Scan another
          </Button>
          {match ? (
            <Button variant="outline" onClick={() => onOpen(match.id)}>
              See {match.name} in the market
            </Button>
          ) : result.isMinifigure ? (
            <Button asChild variant="outline">
              <a href={ebaySearchUrl(result.name)} target="_blank" rel="noopener noreferrer">
                Find it on eBay
              </a>
            </Button>
          ) : null}
        </div>
        <p className="mt-5 text-[13px] leading-[1.5] text-muted-foreground">
          An AI estimate based on past sales it has learned about, not a live price. It can be wrong, so check recent sold
          listings before you buy or sell.
        </p>
      </div>
    </div>
  );
}
