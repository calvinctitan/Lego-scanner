import { useState } from 'react';

import { StudMosaic } from '@/components/stud-mosaic';
import type { Figure } from '@/lib/figures';
import { cn } from '@/lib/utils';

/**
 * A figure's picture when it has an allowed one (only 8 LEGO-only figures can; see
 * mobile/src/data/figures.ts → "Figure pictures"), otherwise its stud mosaic.
 * The picture loads from Rebrickable and is never copied; if it can't load, the mosaic shows.
 */
export function FigureArt({ figure, cols, className }: { figure: Figure; cols: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (figure.photo && !failed) {
    return (
      <span className={cn('block rounded-md bg-white p-2', className)} style={{ aspectRatio: `${cols} / 9` }}>
        <img
          src={figure.photo.url}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span className={cn('block rounded-md bg-surface p-2.5', className)}>
      <StudMosaic name={figure.name} theme={figure.theme} cols={cols} className="block h-auto w-full" />
    </span>
  );
}
