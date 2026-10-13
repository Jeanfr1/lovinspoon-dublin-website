// Build-time HTML helpers (Vite transformIndexHtml). Keeps the generated
// data as the single source for markup that is tedious to write by hand:
//   <!--@logo-symbol-->   the traced logo (src/assets/logo.svg) as an inline <symbol>
//   {{LOGO_VIEWBOX}}      its viewBox
//   <!--@pic:key-->       a <picture> for one of the PICTURES below
//   <!--@layers-->        the four sandwich parts, positioned from src/data/layers.json
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const srcset = (key, version, widths, ext) =>
  widths.map((w) => `/img/${key}-${version}-${w}.${ext} ${w}w`).join(', ');

const PICTURES = {
  hero: {
    alt: 'A toasted sandwich with bacon, melted cheese, tomato and leaves, held out towards you',
    cls: 'photo-img',
    priority: true,
    sources: [{ key: 'hero-tall', media: '(max-aspect-ratio: 4/5)' }],
    key: 'hero-wide',
    sizes: '100vw',
  },
  breakfast: {
    alt: 'A full Irish breakfast: bacon, fried egg, sausage, beans, white and black pudding, mushrooms, tomato, toast and a pancake, with a latte',
    cls: 'photo-img',
    sources: [{ key: 'breakfast-tall', media: '(max-width: 700px)' }],
    key: 'breakfast',
    sizes: '100vw',
  },
  interior: { alt: '', cls: 'photo-img', key: 'interior-soft', sizes: '100vw' },
  facade: {
    alt: 'The Lovinspoon shopfront on Frederick Street North, with tables and chairs outside',
    cls: 'postcard-img',
    key: 'facade',
    sizes: '(max-width: 700px) 46vw, 300px',
  },
};

function picture(name, images) {
  const cfg = PICTURES[name];
  if (!cfg) throw new Error(`unknown picture ${name}`);
  const { version } = images;
  const main = images.images[cfg.key];
  const out = ['<picture>'];
  for (const s of cfg.sources || []) {
    const im = images.images[s.key];
    for (const [ext, type] of [['avif', 'image/avif'], ['webp', 'image/webp']]) {
      out.push(`<source media="${s.media}" type="${type}" srcset="${srcset(s.key, version, im.widths, ext)}" sizes="${s.sizes || cfg.sizes}">`);
    }
  }
  out.push(`<source type="image/avif" srcset="${srcset(cfg.key, version, main.widths, 'avif')}" sizes="${cfg.sizes}">`);
  out.push(`<source type="image/webp" srcset="${srcset(cfg.key, version, main.widths, 'webp')}" sizes="${cfg.sizes}">`);
  const mid = main.widths[Math.min(1, main.widths.length - 1)];
  const loading = cfg.priority ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  out.push(`<img class="${cfg.cls}" src="/img/${cfg.key}-${version}-${mid}.webp" alt="${cfg.alt}" width="${main.w}" height="${main.h}" ${loading}>`);
  out.push('</picture>');
  return out.join('');
}

const pct = (v) => `${(v * 100).toFixed(2)}%`;

// Tilt of each part while the layers are open; it straightens as they come together.
const TILT = { 'toast-top': -4, salad: 2.5, filling: -2, 'toast-base': 2.5 };

// Handwritten notes ride on the bread, so they stay beside it open or closed.
const NOTES = {
  'toast-top': '<span class="layer-note layer-note-top" aria-hidden="true">A little crunch.<svg viewBox="0 0 90 80"><path d="M80 6C40 4 66 34 34 40S8 56 12 72m0 0-7-10m7 10 9-8"/></svg></span>',
  'toast-base': '<span class="layer-note layer-note-bottom" aria-hidden="true"><svg viewBox="0 0 90 80"><path d="M82 74C44 78 66 46 36 40S8 24 12 8m0 0-7 10m7-10 9 8"/></svg>A lot of lovin\'.</span>',
};

function layers(images) {
  const data = JSON.parse(read('src/data/layers.json'));
  const { version } = images;
  return data.layers
    .map((l, i) => {
      const key = `layer-${l.name}`;
      const im = images.images[key];
      const d = l.draw;
      // travel from open to together, in units of the part's own height
      const k = (d.together - d.open) / d.h;
      const style = `--x:${pct(d.x)};--w:${pct(d.w)};--h:${pct(d.h)};--top:${pct(d.open)};--k:${k.toFixed(4)};--tilt:${TILT[l.name]}deg;z-index:${4 - i}`;
      const sizes = '(max-width: 700px) 64vw, 400px';
      return `<div class="layer layer-${l.name}" style="${style}"><picture>`
        + `<source type="image/avif" srcset="${srcset(key, version, im.widths, 'avif')}" sizes="${sizes}">`
        + `<source type="image/webp" srcset="${srcset(key, version, im.widths, 'webp')}" sizes="${sizes}">`
        + `<img src="/img/${key}-${version}-${im.widths[1]}.webp" alt="" width="${im.w}" height="${im.h}" loading="lazy" decoding="async">`
        + `</picture>${NOTES[l.name] || ''}</div>`;
    })
    .join('\n');
}

export function lovinspoonHtml() {
  return {
    name: 'lovinspoon-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const images = JSON.parse(read('src/data/images.json'));
        const svg = read('src/assets/logo.svg');
        const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
        const path = svg.match(/<path[^>]*\/>/)[0];
        return html
          .replace('<!--@logo-symbol-->', `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="lovinspoon-logo" viewBox="${viewBox}">${path}</symbol></svg>`)
          .replaceAll('{{LOGO_VIEWBOX}}', viewBox)
          .replace(/<!--@pic:([a-z-]+)-->/g, (_, name) => picture(name, images))
          .replace('<!--@layers-->', layers(images));
      },
    },
  };
}
