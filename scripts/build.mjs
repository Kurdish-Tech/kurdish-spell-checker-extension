// Builds store-ready packages: dist/chromium (Chrome + Edge) and dist/firefox.
// Usage: node scripts/build.mjs   (then `npx web-ext build -s dist/<target>`)
import { cpSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const FILES = ['background.js', 'content.js', 'popup.html', 'popup.js', 'styles.css'];
const DIRS = ['lib', 'icons'];
const DICT = ['ku_TR.aff', 'ku_TR.dic'];

rmSync('dist', { recursive: true, force: true });

for (const [target, manifest] of [['chromium', 'manifest.json'], ['firefox', 'manifest.firefox.json']]) {
  const out = join('dist', target);
  mkdirSync(join(out, 'dictionary'), { recursive: true });
  copyFileSync(manifest, join(out, 'manifest.json'));
  for (const f of FILES) copyFileSync(f, join(out, f));
  for (const d of DIRS) cpSync(d, join(out, d), { recursive: true });
  for (const f of DICT) copyFileSync(join('dictionary', f), join(out, 'dictionary', f));
  console.log(`built ${out}`);
}
