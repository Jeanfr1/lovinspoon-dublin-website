// Lovinspoon · page behaviour.
// - hero entrance: CSS only (.hero.playing, added inline); here: replay / pause
// - mobile navigation
// - reveal of the section copy (this module owns the hidden state: .reveal-on)
// - "Lunch comes together": one progress value 0 (open) → 1 (together) fed by
//   the section's scroll position, the slider or the two extreme buttons.
//   No pinning, no scroll lock (06-roteiros/MOTION.md).

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x) => Math.min(1, Math.max(0, x));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 901px) and (hover: hover)');

root.classList.add('js');

/* ---------- hero: replay / pause ---------- */
const hero = $('.hero');
const heroPhoto = $('.hero-photo');
const replay = $('#replay');
const pause = $('#pause');
let paused = false;

function setPaused(value) {
  paused = value;
  root.classList.toggle('motion-paused', paused);
  pause.setAttribute('aria-pressed', String(paused));
  pause.querySelector('span').textContent = paused ? 'Resume motion' : 'Pause motion';
  if (!paused) requestFrame();
}

replay.addEventListener('click', () => {
  if (reduced.matches) return;
  setPaused(false);
  hero.classList.remove('playing');
  void hero.offsetWidth; // restart the CSS animations
  hero.classList.add('playing');
});
pause.addEventListener('click', () => setPaused(!paused));

/* ---------- mobile navigation ---------- */
const toggle = $('.menu-toggle');
const nav = $('#mobile-nav');
const toggleLabel = toggle.querySelector('.sr-only');

function setNav(open) {
  nav.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggleLabel.textContent = open ? 'Close navigation' : 'Open navigation';
}
toggle.addEventListener('click', () => setNav(nav.hidden));
$$('a', nav).forEach((a) => a.addEventListener('click', () => setNav(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !nav.hidden) { setNav(false); toggle.focus(); }
});
document.addEventListener('click', (e) => {
  if (!nav.hidden && !nav.contains(e.target) && !toggle.contains(e.target)) setNav(false);
});

/* ---------- reveal ---------- */
const reveals = $$('.reveal');
if ('IntersectionObserver' in window && !reduced.matches) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  // anything already on screen (deep link, reload mid-page) shows at once
  reveals.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 0.9) el.classList.add('visible'); });
  root.classList.add('reveal-on');
  reveals.forEach((el) => io.observe(el));
}

/* ---------- lunch comes together ---------- */
const figure = $('.sandwich-figure');
const stage = $('.sandwich-stage');
const layers = $$('.layer', stage).map((el) => {
  const css = getComputedStyle(el);
  return { el, k: parseFloat(css.getPropertyValue('--k')), tilt: parseFloat(css.getPropertyValue('--tilt')) };
});
const slider = $('#layer-progress');
const output = $('#layer-output');
const openBtn = $('#open-layers');
const togetherBtn = $('#assemble-layers');
const followBtn = $('#follow-scroll');
const status = $('#reduced-status');

// Each part starts a little later than the one above it, so the stack
// settles top-down instead of moving as one block.
const DELAY = [0, 0.1, 0.2, 0.12];
const ease = (t) => t * t * (3 - 2 * t);
let progress = 0;
let manual = false;
let tween = 0;

function render(p) {
  progress = clamp(p);
  layers.forEach((l, i) => {
    const d = DELAY[i];
    const e = ease(clamp((progress - d) / (1 - d)));
    l.el.style.transform = `translate3d(0, ${(l.k * e * 100).toFixed(2)}%, 0) rotate(${(l.tilt * (1 - e)).toFixed(2)}deg)`;
  });
  const pct = Math.round(progress * 100);
  stage.dataset.progress = String(pct);
  slider.value = String(pct);
  slider.setAttribute('aria-valuetext', `${pct} percent together`);
  output.value = `${pct}%`;
  output.textContent = `${pct}%`;
  openBtn.setAttribute('aria-pressed', String(manual && pct === 0));
  togetherBtn.setAttribute('aria-pressed', String(manual && pct === 100));
  followBtn.setAttribute('aria-pressed', String(!manual));
}

// 0 when the figure's top enters the lower tenth of the screen, 1 when its
// middle reaches the middle of the screen: the whole move is visible.
function fromScroll() {
  const r = figure.getBoundingClientRect();
  const start = innerHeight * 0.9;
  const end = innerHeight * 0.5 - r.height / 2;
  return (start - r.top) / (start - end);
}

function animateTo(target) {
  cancelAnimationFrame(tween);
  if (reduced.matches) { render(target); return; }
  const from = progress;
  const t0 = performance.now();
  const step = (now) => {
    const t = clamp((now - t0) / 650);
    render(from + (target - from) * (1 - (1 - t) ** 3));
    tween = t < 1 ? requestAnimationFrame(step) : 0; // 0 hands control back to scroll
  };
  tween = requestAnimationFrame(step);
}

slider.addEventListener('input', () => { manual = true; cancelAnimationFrame(tween); render(Number(slider.value) / 100); });
openBtn.addEventListener('click', () => { manual = true; animateTo(0); });
togetherBtn.addEventListener('click', () => { manual = true; animateTo(1); });
followBtn.addEventListener('click', () => { manual = false; animateTo(clamp(fromScroll())); });

/* ---------- frame loop (scroll + desktop parallax) ---------- */
let frame = 0;
function update() {
  frame = 0;
  if (paused || reduced.matches) return;
  if (!manual && !tween) render(fromScroll());
  if (desktop.matches) {
    const y = Math.min(scrollY, hero.offsetHeight);
    heroPhoto.style.transform = `translate3d(0, ${(y * 0.18).toFixed(1)}px, 0)`;
  } else if (heroPhoto.style.transform) {
    heroPhoto.style.transform = '';
  }
}
function requestFrame() { if (!frame) frame = requestAnimationFrame(update); }

function syncMotion() {
  const r = reduced.matches;
  root.classList.toggle('reduced-motion', r);
  [replay, pause, slider, openBtn, togetherBtn, followBtn].forEach((el) => { el.disabled = r; });
  status.hidden = !r;
  if (r) {
    cancelAnimationFrame(tween); tween = 0;
    hero.classList.remove('playing');
    heroPhoto.style.transform = '';
    render(0);
  } else {
    hero.classList.add('playing');
    render(manual ? progress : fromScroll());
  }
}

addEventListener('scroll', requestFrame, { passive: true });
addEventListener('resize', requestFrame);
reduced.addEventListener('change', syncMotion);
desktop.addEventListener('change', requestFrame);
syncMotion();
requestFrame();

// small hook for automated checks: window.lovinspoon.setProgress(0..1)
window.lovinspoon = { setProgress: (p) => { manual = true; render(p); }, get progress() { return progress; } };
