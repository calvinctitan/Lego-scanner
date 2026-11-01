// Copies the Marketplace list from the iPhone app into the website before each build or dev run,
// so both always show the same figures. Edit mobile/src/data/figures.json, never the copies in
// web/src/shared/ (they're replaced every time and aren't saved to GitHub).
// (The website can't read them straight from mobile/: building would then need the app's packages.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.resolve(here, '../../mobile/src');
const to = path.resolve(here, '../src/shared');

fs.mkdirSync(to, { recursive: true });
fs.copyFileSync(path.join(from, 'data/figures.json'), path.join(to, 'figures.json'));
fs.copyFileSync(path.join(from, 'lib/types.ts'), path.join(to, 'types.ts'));
const code = fs.readFileSync(path.join(from, 'data/figures.ts'), 'utf8').replace("from '../lib/types'", "from './types'");
if (!code.includes("from './types'")) throw new Error('mobile/src/data/figures.ts changed its imports: update web/scripts/sync-shared.mjs.');
fs.writeFileSync(path.join(to, 'figures.ts'), `// Copied from mobile/src/data/figures.ts by web/scripts/sync-shared.mjs. Don't edit this copy.\n${code}`);
console.log('Copied the Marketplace list from mobile/src into web/src/shared.');
