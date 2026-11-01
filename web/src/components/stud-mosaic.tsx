import { memo } from 'react';

import { initials, themeColor } from '@/lib/figures';

// A figure's "picture": its initials built as a mosaic of studs in its theme's colour, like a
// LEGO mosaic. Original artwork drawn from a tiny 5×7 letter grid, so no photos or LEGO designs
// are copied (see README, "Adding figure pictures", for why the site doesn't show photos).

const GLYPHS: Record<string, string[]> = {
  A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
  C: [' ####', '#    ', '#    ', '#    ', '#    ', '#    ', ' ####'],
  D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
  G: [' ####', '#    ', '#    ', '#  ##', '#   #', '#   #', ' ####'],
  H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  I: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '#####'],
  J: ['  ###', '   # ', '   # ', '   # ', '#  # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #', '#   #', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #'],
  X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  '3': ['#### ', '    #', '    #', ' ### ', '    #', '    #', '#### '],
  '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  '5': ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  '6': [' ### ', '#    ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '],
  '?': [' ### ', '#   #', '    #', '   # ', '  #  ', '     ', '  #  '],
};

const ROWS = 9; // 7 rows of letter plus a stud of border above and below

function glyphFor(char: string): string[] {
  let c = char.toUpperCase();
  try {
    c = c.normalize('NFD').replace(/[̀-ͯ]/g, ''); // "É" → "E"
  } catch {
    // Old browsers: use the letter as it is.
  }
  return GLYPHS[c] ?? GLYPHS['?'];
}

/** Which studs are "on", for the figure's initials centred in a `cols` × 9 grid. */
function litStuds(text: string, cols: number): Set<string> {
  const letters = text.slice(0, 2).split('');
  const width = letters.length * 5 + (letters.length - 1);
  const left = Math.floor((cols - width) / 2);
  const lit = new Set<string>();
  letters.forEach((letter, i) => {
    glyphFor(letter).forEach((row, y) => {
      for (let x = 0; x < 5; x++) if (row[x] === '#') lit.add(`${left + i * 6 + x},${y + 1}`);
    });
  });
  return lit;
}

type Props = {
  name: string;
  theme: string;
  /** Studs across; 13 fits two letters with a border. Wider tiles use more. */
  cols?: number;
  className?: string;
};

export const StudMosaic = memo(function StudMosaic({ name, theme, cols = 13, className }: Props) {
  const lit = litStuds(initials(name), Math.max(13, cols));
  const color = themeColor(theme);
  const width = Math.max(13, cols);
  const studs = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < width; x++) {
      const on = lit.has(`${x},${y}`);
      studs.push(
        <circle
          key={`${x},${y}`}
          cx={x + 0.5}
          cy={y + 0.5}
          r={0.38}
          fill={on ? color : 'var(--stud)'}
          // In dark mode the lit studs are mixed a little toward white (see --lit-boost in index.css).
          style={on ? { fill: `color-mix(in oklab, ${color}, white var(--lit-boost))` } : undefined}
        />,
      );
      // The highlight that makes a coloured dot read as a stud (only on the lit ones, to keep it light).
      if (on) studs.push(<circle key={`h${x},${y}`} cx={x + 0.4} cy={y + 0.4} r={0.15} fill="#fff" opacity={0.3} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${width} ${ROWS}`} className={className} role="img" aria-label={`${name}, shown as a mosaic of its initials`}>
      {studs}
    </svg>
  );
});
