// Makes the hero artwork (web/src/assets/hero/): an original picture of a pile of toy bricks with one
// gold brick on top, on a see-through background. The website's hero turns this picture into particles.
//
// It is original artwork made by this script: simulate.mjs settles plain studded boxes into a pile with
// a physics engine, and render-scene.js draws them with three.js. No photos, LEGO models or logos.
//
// To make it again (only needed if you want a different pile):
//   cd web
//   npm install --no-save @dimforge/rapier3d-compat esbuild playwright
//   npx playwright install chromium          (the browser that does the drawing)
//   node scripts/hero-art/make.mjs            (add --draft for a quick, small test picture)
// For a different pile add --seed=12 (any number), and --count=800 sets how many bricks are poured.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};
const draft = args.includes('--draft');
const work = flag('work', path.join(here, '.work'));
const outDir = flag('out', path.resolve(here, '../../src/assets/hero'));
const seed = flag('seed', '11');
const count = flag('count', '800');
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const pileFile = path.join(work, `pile-${seed}-${count}.json`);
if (!fs.existsSync(pileFile) || args.includes('--again')) {
  console.log(execFileSync(process.execPath, [path.join(here, 'simulate.mjs'), pileFile, seed, count], { encoding: 'utf8' }).trim());
}
const pile = JSON.parse(fs.readFileSync(pileFile, 'utf8'));

const esbuild = require('esbuild');
const bundle = esbuild.buildSync({ entryPoints: [path.join(here, 'render-scene.js')], bundle: true, format: 'iife', write: false, minify: true, logLevel: 'error' });
const script = bundle.outputFiles[0].text;

const { chromium } = require('playwright');
// Software 3D, so this works on a computer with no graphics card (slow, but it only runs once).
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (msg) => msg.type() === 'error' && console.log('page:', msg.text()));
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.setContent('<!doctype html><title>hero art</title>');
await page.addScriptTag({ content: script });

const size = draft ? { width: 2400, height: 1000 } : { width: 5200, height: 2200 };
const options = {
  ...size,
  elevation: Number(flag('elevation', '19')),
  azimuth: Number(flag('azimuth', '-7')),
  fov: Number(flag('fov', '22')),
  shadowMap: draft ? 2048 : 4096,
  // Kept under 12% so the hero never turns the table shadow into dark particles.
  tableShadow: 0.085,
  outputs: draft ? [] : [
    { name: 'brick-pile.webp', width: 2600, quality: 0.84 },
    { name: 'brick-pile-small.webp', width: 1500, quality: 0.82 },
  ],
  previews: [
    { name: 'preview-light.png', width: 1300, background: '#ffffff' },
    { name: 'preview-dark.png', width: 1300, background: '#05131d' },
    { name: 'preview-middle.png', width: 1300, background: '#ffffff', part: [0.38, 0, 0.64, 0.5] },
  ],
  key: Number(flag('key', '3.1')),
  dome: Number(flag('dome', '0.2')),
  sky: Number(flag('sky', '0.26')),
  environment: Number(flag('environment', '0.3')),
};
const started = Date.now();
const result = await page.evaluate(([p, o]) => window.renderPile(p, o), [pile, options]);
await browser.close();

for (const [name, file] of Object.entries(result.files)) {
  const target = path.join(name.startsWith('preview') ? work : outDir, name);
  fs.writeFileSync(target, Buffer.from(file.data.split(',')[1], 'base64'));
  console.log(`${name}: ${file.width}×${file.height}, ${Math.round(fs.statSync(target).size / 1024)} kB → ${target}`);
}
console.log(`drawn at ${result.drawn.join('×')}, picture ${result.crop[2]}×${result.crop[3]} (shape ${result.aspect.toFixed(2)}:1), darkest table shadow ${(result.maxShadowAlpha / 255).toFixed(3)}, ${Math.round((Date.now() - started) / 1000)} s`);
