import { formatPrice, getFigure, themeColor, type Figure } from '@/lib/figures';

// "A picture of my shelf": a shareable image of what's on your shelf and what it's worth, drawn
// in the browser (nothing is uploaded). LEGO colours, studs and Archivo, like the site.

const W = 1080;
const H = 1350;
const FONT = '"Archivo Variable", "Archivo", "Helvetica Neue", Arial, sans-serif';
const BLACK = '#05131d';
const YELLOW = '#f2cd37';

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A brick: a box with a row of studs on top and a darker strip along the bottom. */
function brick(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, studs: number, stud = 30) {
  ctx.fillStyle = color;
  const gap = w / studs;
  for (let i = 0; i < studs; i++) {
    rounded(ctx, x + gap * i + (gap - stud) / 2, y - stud * 0.3, stud, stud * 0.42, [stud * 0.18, stud * 0.18, 0, 0]);
    ctx.fill();
  }
  rounded(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  rounded(ctx, x, y + h - h * 0.12, w, h * 0.12, [0, 0, 10, 10]);
  ctx.fill();
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export async function drawCollectionCard(haveIds: string[], siteUrl: string): Promise<Blob> {
  // Make sure the site's font is ready, or the canvas would fall back to another one.
  try {
    await Promise.all([document.fonts.load(`900 80px ${FONT}`), document.fonts.load(`600 30px ${FONT}`)]);
  } catch {
    // Use whatever font is there.
  }
  const figures = haveIds.map(getFigure).filter((f): f is Figure => !!f).sort((a, b) => b.priceUsed - a.priceUsed);
  const total = figures.reduce((s, f) => s + f.priceUsed, 0);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Drawing isn’t available in this browser.');

  // Background: LEGO Black with a faint baseplate of studs.
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let y = 24; y < H; y += 48) for (let x = 24; x < W; x += 48) {
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#eef0f2';
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText('legará', 80, 140);
  ctx.font = `500 30px ${FONT}`;
  ctx.fillStyle = '#a0a5a9';
  ctx.fillText('My minifigure shelf', 80, 192);

  // The total, on a yellow price brick.
  ctx.font = `900 120px ${FONT}`;
  const value = formatPrice(total);
  const vw = Math.max(320, ctx.measureText(value).width + 90);
  brick(ctx, 80, 270, vw, 170, YELLOW, Math.max(3, Math.round(vw / 90)), 44);
  ctx.fillStyle = BLACK;
  ctx.fillText(value, 125, 397);
  ctx.font = `600 32px ${FONT}`;
  ctx.fillStyle = '#eef0f2';
  ctx.fillText(`${figures.length} ${figures.length === 1 ? 'figure' : 'figures'}, worth about this used`, 80, 500);

  // The most valuable ones, each as a brick in its theme's colour, as long as its price.
  const shown = figures.slice(0, 6);
  const max = Math.max(1, ...shown.map((f) => f.priceUsed));
  let y = 600;
  for (const f of shown) {
    const w = Math.max(70, (f.priceUsed / max) * 360);
    brick(ctx, 80, y, w, 66, themeColor(f.theme), Math.max(1, Math.round(w / 60)), 26);
    ctx.fillStyle = '#eef0f2';
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(formatPrice(f.priceUsed), 80 + w + 28, y + 30);
    ctx.font = `500 26px ${FONT}`;
    ctx.fillStyle = '#a0a5a9';
    ctx.fillText(fit(ctx, f.name, W - (80 + w + 28) - 70), 80 + w + 28, y + 64);
    y += 104;
  }
  if (figures.length > shown.length) {
    ctx.font = `500 28px ${FONT}`;
    ctx.fillStyle = '#a0a5a9';
    ctx.fillText(`and ${figures.length - shown.length} more`, 80, y + 20);
  }

  // Footer: where it's from, and the fan-project notice.
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, H - 150, W, 6);
  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = '#eef0f2';
  ctx.fillText(fit(ctx, siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''), W - 160), 80, H - 88);
  ctx.font = `500 22px ${FONT}`;
  ctx.fillStyle = '#a0a5a9';
  ctx.fillText('Typical used prices, not offers. Unofficial fan project, not made or endorsed by the LEGO Group.', 80, H - 50);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t make the picture.'))), 'image/png'));
}
