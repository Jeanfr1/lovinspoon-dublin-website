// Automated checks against the production preview (npm run build && npm run preview)
// or a live URL (QA_BASE=https://… npm run qa). Uses the installed Chrome.
import { chromium } from 'playwright-core';

const BASE = process.env.QA_BASE || 'http://localhost:4193/';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); };
const PROCESS_WORDS = /\b(conceptual|concept|edited|original photo|generated|illustrative|transcribed|campaign|mock-?up|ai[- ]generated|placeholder|lorem|reconfirm|kit)\b/i;

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function open(opts = {}, path = '') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  const bad = [];
  let bytes = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', async (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    const len = Number(r.headers()['content-length'] || 0);
    if (len) bytes += len; else { try { bytes += (await r.body()).length; } catch {} }
  });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  return { ctx, page, errors, bad, bytes: () => bytes };
}

const scrollTo = (page, y) => page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
const raf2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// 1. widths: no horizontal overflow, hero title fully on screen, logo inside the header
for (const [w, h] of [[320, 640], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1200]]) {
  const { ctx, page, errors, bad } = await open({ viewport: { width: w, height: h } });
  await page.waitForTimeout(1900);
  const m = await page.evaluate(() => {
    const t = document.querySelector('#hero-title').getBoundingClientRect();
    const logo = document.querySelector('.logo').getBoundingClientRect();
    const cta = document.querySelector('.paper-button').getBoundingClientRect();
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const over = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5 && getComputedStyle(e).position !== 'fixed').length;
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, t: [t.left, t.right, t.top, t.bottom], logo: [logo.left, logo.right], cta: [cta.top, cta.bottom], heroH: hero.height, over };
  });
  check(`${w}x${h} no horizontal scroll`, m.sw === m.iw, `scrollWidth ${m.sw} / ${m.iw}`);
  check(`${w}x${h} hero title inside viewport`, m.t[0] >= 0 && m.t[1] <= m.iw, m.t.map(Math.round).join(','));
  check(`${w}x${h} title clear of the CTA`, m.t[3] < m.cta[0], `title bottom ${Math.round(m.t[3])} / CTA top ${Math.round(m.cta[0])}`);
  check(`${w}x${h} CTA inside hero`, m.cta[1] <= m.heroH, `${Math.round(m.cta[1])} / ${Math.round(m.heroH)}`);
  check(`${w}x${h} no console errors / 4xx`, !errors.length && !bad.length, [...errors, ...bad].join(' | '));
  await ctx.close();
}

// 2. images load, alt texts, copy has no production notes, external links safe
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) { await scrollTo(page, y); await page.waitForTimeout(120); }
  await page.waitForLoadState('networkidle');
  const info = await page.evaluate(() => ({
    broken: [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.currentSrc || i.src),
    noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
    alts: [...document.images].map((i) => i.alt).join(' | '),
    text: document.body.innerText,
    ext: [...document.querySelectorAll('a[target=_blank]')].filter((a) => !/noopener/.test(a.rel)).length,
    h1: document.querySelectorAll('h1').length,
    headings: [...document.querySelectorAll('h1,h2,h3')].map((e) => e.tagName).join(''),
  }));
  check('all images decoded after a full scroll', !info.broken.length, info.broken.join(', '));
  check('every <img> has an alt attribute', info.noAlt === 0);
  check('alt texts carry no production notes', !PROCESS_WORDS.test(info.alts), (info.alts.match(PROCESS_WORDS) || [''])[0]);
  check('visible copy carries no production notes', !PROCESS_WORDS.test(info.text), (info.text.match(PROCESS_WORDS) || [''])[0]);
  check('no prices, hours or phone published', !/€|\b\d{1,2}[:.]\d{2}\s?(am|pm)?\b|\+353|\b0\d{2}\s?\d{3}\s?\d{4}\b/i.test(info.text));
  check('external links use rel=noopener', info.ext === 0);
  check('one h1, h2 per section', info.h1 === 1 && info.headings.startsWith('H1H2'), info.headings);
  await ctx.close();
}

// 3. real clicks: CTAs, nav, details, layer controls
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  await page.waitForTimeout(1800);
  await page.click('.paper-button');
  await page.waitForTimeout(1200);
  let top = await page.evaluate(() => Math.round(document.querySelector('#breakfast').getBoundingClientRect().top));
  check('"Explore the menu" lands on Breakfast', Math.abs(top) < 4, `top ${top}`);
  await scrollTo(page, 0); await raf2(page);
  await page.click('.small-link');
  await page.waitForTimeout(1200);
  top = await page.evaluate(() => Math.round(document.querySelector('#sandwiches').getBoundingClientRect().top));
  check('"See lunch come together" lands on Sandwiches', Math.abs(top) < 4, `top ${top}`);
  await scrollTo(page, 0); await raf2(page);
  await page.click('.visit-link');
  await page.waitForTimeout(1200);
  const v = await page.evaluate(() => { const r = document.querySelector('#visit').getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; });
  check('header "Visit" shows the postcard', v[0] >= 0 && v[0] < v[2], v.map(Math.round).join(','));
  await scrollTo(page, 0); await raf2(page);
  await page.click('.desktop-nav a[href="#sandwiches"]');
  await page.waitForTimeout(1200);
  top = await page.evaluate(() => Math.round(document.querySelector('#sandwiches').getBoundingClientRect().top));
  check('nav "Sandwiches" lands on the section', Math.abs(top) < 4, `top ${top}`);

  await page.locator('#breakfast').scrollIntoViewIfNeeded();
  await page.click('.menu-paper summary');
  const open1 = await page.evaluate(() => document.querySelector('.menu-paper').open && document.querySelectorAll('.menu-items article').length);
  check('"Breakfast favourites" opens with 4 dishes', open1 === 4, String(open1));
  const grow = await page.evaluate(() => { const s = document.querySelector('.breakfast-section').getBoundingClientRect(); const p = document.querySelector('.menu-paper').getBoundingClientRect(); return s.bottom >= p.bottom; });
  check('breakfast section grows with the open menu', grow);

  await page.locator('.motion-lab').scrollIntoViewIfNeeded();
  await page.click('.motion-lab summary');
  await page.click('#assemble-layers');
  await page.waitForTimeout(900);
  let p = await page.getAttribute('.sandwich-stage', 'data-progress');
  check('"Bring it together" → 100 %', p === '100', p);
  await page.click('#open-layers');
  await page.waitForTimeout(900);
  p = await page.getAttribute('.sandwich-stage', 'data-progress');
  check('"Open the layers" → 0 %', p === '0', p);
  await page.fill('#layer-progress', '40');
  p = await page.getAttribute('.sandwich-stage', 'data-progress');
  check('slider drives the layers (40 %)', p === '40', p);
  const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.layer-toast-top')).transform);
  check('top bread moved by the slider', tr !== 'none' && tr !== 'matrix(1, 0, 0, 1, 0, 0)', tr);
  await page.click('#follow-scroll');
  await page.waitForTimeout(900);
  const follow = await page.evaluate(() => document.querySelector('#follow-scroll').getAttribute('aria-pressed'));
  check('"Follow scroll" hands control back to scroll', follow === 'true');

  await page.click('#pause');
  const paused = await page.evaluate(() => document.documentElement.classList.contains('motion-paused') && document.querySelector('#pause').getAttribute('aria-pressed'));
  check('"Pause motion" pauses', paused === 'true');
  await page.click('#pause');
  await scrollTo(page, 0); await raf2(page);
  await page.click('#replay');
  await page.waitForTimeout(100);
  const op = await page.evaluate(() => Number(getComputedStyle(document.querySelector('#hero-title')).opacity));
  check('"Replay opening" restarts the entrance', op < 1, `opacity at 100 ms ${op.toFixed(2)}`);
  await page.waitForTimeout(1800);
  const op2 = await page.evaluate(() => Number(getComputedStyle(document.querySelector('#hero-title')).opacity));
  check('entrance ends fully visible', op2 === 1);
  await ctx.close();
}

// 4. natural wheel scroll: progress rises 0 → 100 while the figure is on screen
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const { ctx, page } = await open({ viewport: { width: w, height: h }, hasTouch: w < 700 });
  await page.waitForTimeout(1500);
  await page.mouse.move(w / 2, h / 2);
  const samples = [];
  for (let i = 0; i < 80; i++) {
    await page.mouse.wheel(0, 90);
    await page.waitForTimeout(40);
    const s = await page.evaluate(() => {
      const f = document.querySelector('.sandwich-figure').getBoundingClientRect();
      return { p: Number(document.querySelector('.sandwich-stage').dataset.progress), top: f.top, bottom: f.bottom };
    });
    samples.push(s);
  }
  const ps = samples.map((s) => s.p);
  const monotonic = ps.every((v, i) => i === 0 || v >= ps[i - 1]);
  const at100 = samples.find((s) => s.p === 100);
  const firstMove = samples.find((s) => s.p > 0);
  check(`${w}px wheel scroll: progress only rises`, monotonic);
  check(`${w}px wheel scroll: reaches 100 %`, !!at100, `max ${Math.max(...ps)}`);
  check(`${w}px assembly starts with the figure on screen`, firstMove && firstMove.top < h, firstMove && `top ${Math.round(firstMove.top)}`);
  check(`${w}px assembly completes with the figure on screen`, at100 && at100.top < h * 0.5 && at100.bottom > h * 0.5, at100 && `${Math.round(at100.top)}..${Math.round(at100.bottom)}`);
  await ctx.close();
}

// 5. phone: navigation menu, Escape, touch targets
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  await page.waitForTimeout(1600);
  await page.click('.menu-toggle');
  let st = await page.evaluate(() => [document.querySelector('#mobile-nav').hidden, document.querySelector('.menu-toggle').getAttribute('aria-expanded')]);
  check('phone menu opens', st[0] === false && st[1] === 'true');
  await page.keyboard.press('Escape');
  st = await page.evaluate(() => [document.querySelector('#mobile-nav').hidden, document.activeElement.classList.contains('menu-toggle')]);
  check('Escape closes the menu and returns focus', st[0] === true && st[1]);
  await page.click('.menu-toggle');
  await page.click('#mobile-nav a[href="#visit"]');
  await page.waitForTimeout(1200);
  st = await page.evaluate(() => [document.querySelector('#mobile-nav').hidden, Math.round(document.querySelector('#visit').getBoundingClientRect().top)]);
  check('menu link closes the menu and reaches Visit', st[0] === true && st[1] >= 0 && st[1] < 844, `top ${st[1]}`);
  const small = await page.evaluate(() => [...document.querySelectorAll('a, button, summary, input')].filter((e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width && r.height && cs.visibility !== 'hidden' && e.offsetParent && (r.height < 44 && !e.classList.contains('skip'));
  }).map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().height)}`));
  check('touch targets ≥ 44 px tall', !small.length, small.join(', '));
  const order = await page.evaluate(() => {
    const y = (s) => document.querySelector(s).getBoundingClientRect().top;
    return [y('.lunch-copy'), y('.sandwich-figure'), y('.visit-scrap')];
  });
  check('phone lunch order: title → layers → postcard (SECTIONS.md)', order[0] < order[1] && order[1] < order[2]);
  await ctx.close();
}

// 6. first-load bytes per viewport
for (const [label, opts] of [['phone 390 @3x', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['desktop 1440 @2x', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }]]) {
  const { ctx, page, bytes } = await open(opts);
  await page.waitForTimeout(800);
  const kb = Math.round(bytes() / 1024);
  check(`first load ${label} under 900 KB`, kb < 900, `${kb} KB`);
  await ctx.close();
}

// 7. no JavaScript: everything readable, controls hidden, layers shown open
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const nj = await page.evaluate(() => ({
    title: getComputedStyle(document.querySelector('#hero-title')).opacity,
    copy: getComputedStyle(document.querySelector('.breakfast-copy')).opacity,
    lab: getComputedStyle(document.querySelector('.motion-lab')).display,
    ctrl: getComputedStyle(document.querySelector('.motion-controls')).display,
    layers: [...document.querySelectorAll('.layer')].length,
    address: document.body.innerText.includes('13 Frederick Street North'),
  }));
  check('no-JS: hero title visible', nj.title === '1');
  check('no-JS: section copy visible', nj.copy === '1');
  check('no-JS: motion controls hidden', nj.lab === 'none' && nj.ctrl === 'none');
  check('no-JS: four layers + address present', nj.layers === 4 && nj.address);
  await ctx.close();
}

// 8. reduced motion
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const rm = await page.evaluate(() => ({
    title: getComputedStyle(document.querySelector('#hero-title')).opacity,
    anim: getComputedStyle(document.querySelector('#hero-title')).animationName,
    slider: document.querySelector('#layer-progress').disabled,
    status: !document.querySelector('#reduced-status').hidden,
  }));
  await scrollTo(page, 2000); await raf2(page);
  const p = await page.getAttribute('.sandwich-stage', 'data-progress');
  check('reduced motion: hero visible at once, no animation', rm.title === '1' && rm.anim === 'none', `${rm.title} ${rm.anim}`);
  check('reduced motion: slider disabled + status shown', rm.slider && rm.status);
  check('reduced motion: layers stay open on scroll', p === '0', p);
  await ctx.close();
}

// 9. keyboard: skip link and visible focus
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  await page.keyboard.press('Tab');
  const skip = await page.evaluate(() => document.activeElement.classList.contains('skip') && document.activeElement.getBoundingClientRect().top >= 0);
  check('first Tab reaches a visible skip link', skip);
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check('focus ring visible on the next control', ring !== 'none', ring);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed on ${BASE}`);
process.exit(failed.length ? 1 : 0);
