// Real captures of the production preview for the README
// (npm run build && npm run preview, then: node scripts/readme-assets.mjs).
// Frames → assets-src/readme/ ; composites are made by scripts/readme-composite.py.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.QA_BASE || 'http://localhost:4193/';
const OUT = join(ROOT, 'assets-src', 'readme');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'frames'), { recursive: true });
const pad = (n) => String(n).padStart(4, '0');
const raf2 = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const to = (p, y) => p.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// 1. GIF frames: the hero entrance (time) then a scroll down to the sandwich coming together
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  let n = 0;
  // step the CSS entrance deterministically: replay, pause every animation, seek in 1/12 s steps
  await page.click('#replay');
  await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
  for (let t = 0; t <= 1750; t += 83) {
    await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.currentTime = ms; }), t);
    await raf2(page);
    await page.screenshot({ path: join(OUT, 'frames', `f_${pad(n++)}.png`) });
  }
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await raf2(page);
  for (let i = 0; i < 10; i++) await page.screenshot({ path: join(OUT, 'frames', `f_${pad(n++)}.png`) }); // hold
  const m = await page.evaluate(() => {
    const f = document.querySelector('.sandwich-figure');
    const fTop = f.getBoundingClientRect().top + scrollY;
    return { end: fTop + f.offsetHeight / 2 - innerHeight / 2 + 40 };
  });
  const steps = 36;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await to(page, Math.round(m.end * e));
    await page.waitForTimeout(160); await raf2(page);
    await page.screenshot({ path: join(OUT, 'frames', `f_${pad(n++)}.png`) });
  }
  for (let i = 0; i < 12; i++) await page.screenshot({ path: join(OUT, 'frames', `f_${pad(n++)}.png`) }); // hold
  writeFileSync(join(OUT, 'frames.json'), JSON.stringify({ count: n }));
  await page.context().close();
}

// 2. desktop section shots (1440 × 900)
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, 'd-hero.png') });
  const y = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
  await to(page, await y('#breakfast')); await page.waitForTimeout(900);
  await page.click('.menu-paper summary'); await page.waitForTimeout(400);
  await to(page, (await y('#breakfast')) + 120); await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'd-breakfast.png') });
  await to(page, await y('#sandwiches')); await page.waitForTimeout(900);
  await page.evaluate(() => window.lovinspoon.setProgress(0)); await raf2(page);
  await page.screenshot({ path: join(OUT, 'd-lunch-open.png') });
  await page.evaluate(() => window.lovinspoon.setProgress(1)); await raf2(page);
  const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await to(page, end); await page.waitForTimeout(500);
  await page.evaluate(() => window.lovinspoon.setProgress(1)); await raf2(page);
  await page.screenshot({ path: join(OUT, 'd-lunch-together.png') });
  await page.context().close();
}

// 3. phone shots (390 × 844 @2x)
{
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, 'm-hero.png') });
  const y = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
  await to(page, await y('#breakfast')); await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, 'm-breakfast.png') });
  await to(page, (await y('#lunch-title')) - 40); await page.waitForTimeout(900);
  await page.evaluate(() => window.lovinspoon.setProgress(0.55)); await raf2(page);
  await page.screenshot({ path: join(OUT, 'm-lunch.png') });
  await to(page, await y('#visit') - 120); await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, 'm-visit.png') });
  await page.context().close();
}

// 4. banner, rendered with the site's own fonts and logo
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 400 }, deviceScaleFactor: 2 })).newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const sym = document.querySelector('#lovinspoon-logo');
    const logo = `<svg viewBox="${sym.getAttribute('viewBox')}">${sym.innerHTML}</svg>`;
    const layer = (n) => `/img/layer-${n}-v1-720.webp`;
    document.body.innerHTML = `
      <div class="bn">
        <div class="bn-copy">
          ${logo}
          <h1>Love at first bite.</h1>
          <svg class="sw" viewBox="0 0 300 26" preserveAspectRatio="none"><path d="M3 19C58 8 150 2 297 9c-2 3-5 5-9 5C190 9 96 15 8 25c-4 0-6-3-5-6Z"/></svg>
          <p>Breakfast, sandwiches and good coffee · 13 Frederick Street North, Dublin 1</p>
        </div>
        <div class="bn-stack">
          <img src="${layer('toast-top')}" style="top:4%;transform:rotate(-4deg)"><img src="${layer('salad')}" style="top:29%;transform:rotate(2deg)"><img src="${layer('filling')}" style="top:51%;transform:rotate(-2deg)"><img src="${layer('toast-base')}" style="top:68%;transform:rotate(2deg)">
        </div>
      </div>`;
    const st = document.createElement('style');
    st.textContent = `
      html,body{margin:0;background:#24231F}
      .bn{position:relative;width:1280px;height:400px;overflow:hidden;background:radial-gradient(90% 120% at 78% 50%,#5a3a22 0%,#2e241b 55%,#24231F 100%);color:#FFFCF5;font-family:'Nimbus Sans',Arial,sans-serif}
      .bn-copy{position:absolute;left:72px;top:64px;width:700px}
      .bn-copy svg:first-child{width:300px;height:auto;aspect-ratio:2108/382;fill:#FFFCF5;display:block}
      .bn h1{margin:34px 0 0;font:400 92px/1 'Lilita One',sans-serif;letter-spacing:-.01em}
      .sw{display:block;width:230px;height:15px;margin:18px 0 0;fill:#E5AF35}
      .bn p{margin:22px 0 0;font:26px/1.2 'Caveat',cursive;opacity:.92}
      .bn-stack{position:absolute;right:90px;top:0;width:300px;height:400px}
      .bn-stack img{position:absolute;left:0;width:100%;height:auto;filter:drop-shadow(0 14px 18px rgba(0,0,0,.45))}`;
    document.head.appendChild(st);
  });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(ROOT, '.github', 'assets', 'banner.png') });
  await page.context().close();
}

await browser.close();
console.log('captured →', OUT);
