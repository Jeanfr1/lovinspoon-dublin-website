// Contact-sheet captures of the production preview (npm run build && npm run preview).
// Usage: node scripts/shots.mjs [width height] [outdir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QA_BASE || 'http://localhost:4193/';
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900);
const OUT = process.argv[4] || 'qa/out';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
const ms = await page.evaluate(() => new Promise((res) => { const t = []; let last = performance.now(); let n = 0; const f = (now) => { t.push(now - last); last = now; if (++n < 60) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res(t[30]); } }; requestAnimationFrame(f); }));
console.log('rAF median ms', ms.toFixed(1));
await page.waitForTimeout(1800);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('scrollHeight', total, 'scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), 'innerWidth', W);
let i = 0;
for (let y = 0; y < total; y += Math.round(H * 0.8)) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${W}-${String(i++).padStart(2, '0')}.png` });
}
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.screenshot({ path: `${OUT}/${W}-full.png`, fullPage: true });
await browser.close();
