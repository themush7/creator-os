// Renders scripts/icon.svg to the PNG sizes the PWA manifest and iOS need.
// Usage: node scripts/make-icons.mjs   (needs `npx playwright install chromium` once)
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const svg = await readFile(`${root}scripts/icon.svg`, 'utf8');
const targets = [
  ['public/pwa-512.png', 512],
  ['public/pwa-192.png', 192],
  ['public/apple-touch-icon.png', 180],
  ['public/favicon-32.png', 32],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: `${root}${file}`, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
