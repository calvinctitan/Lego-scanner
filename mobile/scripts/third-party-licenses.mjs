// Writes third-party-licenses.txt for the test-version website: the license of every open-source
// package whose code is inside the website's JavaScript. (Most of these licenses, like MIT, ask that
// their notice travels with every copy, and the website is a copy.)
// The GitHub Action runs it after `npx expo export --platform web --source-maps`, from the mobile folder:
//   node scripts/third-party-licenses.mjs dist
// It reads the source maps to find exactly which packages were bundled, then deletes the .map files.
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || 'dist';
const root = process.cwd();

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

// "…/node_modules/expo/node_modules/@expo/vector-icons/build/Icons.js" → "node_modules/expo/node_modules/@expo/vector-icons"
function packageDirOf(source) {
  const s = source.replace(/\\/g, '/');
  const i = s.lastIndexOf('node_modules/');
  if (i < 0) return null;
  const rest = s.slice(i + 'node_modules/'.length).split('/');
  const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  const start = s.indexOf('node_modules/');
  return `${s.slice(start, i)}node_modules/${name}`;
}

function mitText(pkg) {
  const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
  return `MIT License

Copyright (c) ${author || `the ${pkg.name} authors`}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
}

const maps = walk(outDir).filter((f) => f.endsWith('.map'));
if (!maps.length) throw new Error(`No source maps in ${outDir}. Export with --source-maps.`);
const dirs = new Set();
for (const m of maps) {
  for (const src of JSON.parse(fs.readFileSync(m, 'utf8')).sources || []) {
    const dir = packageDirOf(src);
    if (dir) dirs.add(dir);
  }
}

const entries = [];
for (const dir of dirs) {
  const abs = path.join(root, dir);
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(abs, 'package.json'), 'utf8'));
  } catch {
    continue;
  }
  const licenseFiles = fs.readdirSync(abs).filter((f) => /^(licen[sc]e|copying|notice)/i.test(f)).sort();
  const texts = licenseFiles.map((f) => fs.readFileSync(path.join(abs, f), 'utf8').trim());
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type || 'see package';
  // A few MIT packages ship no license file; use the standard MIT text with the author they list.
  if (!texts.length && license === 'MIT') texts.push(mitText(pkg));
  entries.push({ id: `${pkg.name}@${pkg.version}`, license, texts });
}
entries.sort((a, b) => a.id.localeCompare(b.id));

const lines = [
  'Legará test version: open-source software included in this website',
  '',
  'This website contains code from the open-source packages below. Each is used under its license, reproduced here.',
  'Legará’s own code, artwork and app icon are original. The fonts (Lilita One and Nunito) are under the SIL Open',
  'Font License 1.1, included below with their packages.',
  '',
  ...entries.map((e) => `- ${e.id} (${e.license})`),
  '',
];
for (const e of entries) {
  lines.push('='.repeat(78), `${e.id} (${e.license})`, '='.repeat(78), ...(e.texts.length ? e.texts : ['(No license text is included in this package; its license is listed above.)']), '');
}
fs.writeFileSync(path.join(outDir, 'third-party-licenses.txt'), lines.join('\n'));
for (const m of maps) fs.rmSync(m);
console.log(`Wrote ${path.join(outDir, 'third-party-licenses.txt')} for ${entries.length} packages and removed ${maps.length} source map(s).`);
