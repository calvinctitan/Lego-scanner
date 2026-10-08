// Finishes the test-version website after `npx expo export --platform web`.
// The GitHub Action (.github/workflows/publish-test-version.yml) runs it from the mobile folder:
//   node scripts/finish-website.mjs dist /Lego-scanner
// 1. Adds the home-screen icon, app name, colors and description, so "Add to Home Screen" looks like an app.
// 2. Fixes the address if someone typed it in different capitals (/lego-scanner/) or added index.html,
//    so the app still opens the right screen instead of "Unmatched Route".
// 3. Copies the page to 404.html. GitHub Pages shows 404.html for any address it has no file for
//    (like /Lego-scanner/marketplace/mr-gold), and the app then opens the right screen itself.
import fs from 'node:fs';
import path from 'node:path';

const [outDir = 'dist', basePath = ''] = process.argv.slice(2);
const base = basePath.trim().replace(/\/+$/, '');
const indexFile = path.join(outDir, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

const description = 'Unofficial fan-made test version: look up what LEGO® minifigures are worth. Not made or endorsed by the LEGO Group.';
const fixAddress = `<script>(function(b){var p=location.pathname,f=p;if(b&&p.toLowerCase().indexOf(b.toLowerCase())===0&&p.indexOf(b)!==0)f=b+p.slice(b.length);f=f.replace(/\\/index\\.html$/,'/');if(f!==p)history.replaceState(null,'',f+location.search+location.hash);})(${JSON.stringify(base)});</script>`;
const tags = [
  `<meta name="description" content="${description}">`,
  `<meta name="theme-color" content="#0055BF">`,
  `<meta name="apple-mobile-web-app-title" content="Legará">`,
  `<meta name="mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png">`,
  `<link rel="manifest" href="${base}/manifest.json">`,
  fixAddress,
];
if (!html.includes('rel="apple-touch-icon"')) {
  html = html.replace('</head>', `${tags.join('\n')}\n</head>`);
}
fs.writeFileSync(indexFile, html);
fs.writeFileSync(path.join(outDir, '404.html'), html);
console.log(`Finished ${indexFile} and wrote 404.html (base path "${base || '/'}")`);
