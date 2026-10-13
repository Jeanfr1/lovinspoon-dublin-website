// Export every web image from the kit masters (and the derived plates in
// assets-src/) to public/img/ as AVIF + WebP at fixed widths.
// File names carry a version (-v1-) because /img/ is served immutable:
// bump VERSION when an image changes.
//
// Prerequisites: npm run upscale, then the two Python scripts
// (compose-hero.py, register-layers.py). Run: npm run images
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'img');
const VERSION = 'v1';
mkdirSync(OUT, { recursive: true });

const upscaled = (name, fallback) => {
  const p = join(ROOT, 'assets-src', 'upscaled', `${name}.png`);
  return existsSync(p) ? `assets-src/upscaled/${name}.png` : fallback;
};

const jobs = [
  { key: 'hero-wide', src: 'assets-src/composed/hero-wide.png', widths: [1280, 1920, 2560, 3200], q: [48, 70] },
  { key: 'hero-tall', src: 'assets-src/composed/hero-tall.png', widths: [600, 900, 1200], q: [50, 72] },
  { key: 'breakfast', src: upscaled('breakfast', '03-hero/breakfast-sem-texto.png'), widths: [1280, 1920, 2560, 3200], q: [48, 70] },
  // phones: portrait window on the plate (sausage, tomato, pudding), as on the mobile mock-up
  { key: 'breakfast-tall', src: upscaled('breakfast', '03-hero/breakfast-sem-texto.png'), crop: { cx: 0.7, w: 0.42 }, widths: [600, 790], q: [50, 72] },
  // real interior, blurred at build time instead of a live CSS filter
  { key: 'interior-soft', src: '04-fotos-do-local/interior.jpg', blur: 5, widths: [800, 1200], q: [45, 62] },
  { key: 'facade', src: '04-fotos-do-local/facade.jpg', widths: [480, 720, 960], q: [55, 76] },
];

const layers = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'layers.json'), 'utf8'));
for (const l of layers.layers) {
  jobs.push({ key: `layer-${l.name}`, src: `05-assets-web/${l.name}.png`, trim: l.crop, widths: [480, 720, 1000], q: [55, 80], alpha: true });
}

const made = {};
for (const job of jobs) {
  const base = sharp(join(ROOT, job.src)).rotate();
  const meta = await base.metadata();
  let img = base;
  if (job.trim) {
    const [x, y, w, h] = job.trim;
    img = img.extract({ left: x, top: y, width: w, height: h });
  } else if (job.crop) {
    const w = Math.round(meta.height * job.crop.w);
    const left = Math.min(meta.width - w, Math.max(0, Math.round(meta.width * job.crop.cx - w / 2)));
    img = img.extract({ left, top: 0, width: w, height: meta.height });
  }
  if (job.blur) img = img.blur(job.blur);
  const buf = await img.toBuffer();
  const info = await sharp(buf).metadata();
  made[job.key] = { w: info.width, h: info.height, widths: [] };
  for (const width of job.widths) {
    const w = Math.min(width, info.width);
    const r = sharp(buf).resize({ width: w, withoutEnlargement: true });
    const name = `${job.key}-${VERSION}-${w}`;
    await r.clone().avif({ quality: job.q[0], effort: 6 }).toFile(join(OUT, `${name}.avif`));
    await r.clone().webp({ quality: job.q[1], effort: 6, alphaQuality: job.alpha ? 90 : 100 }).toFile(join(OUT, `${name}.webp`));
    made[job.key].widths.push(w);
  }
  console.log(job.key, `${info.width}x${info.height}`, made[job.key].widths.join(','));
}

// Logo: charcoal master (alpha) cropped to its frame, plus a chalk version for photos.
const logoSrc = join(ROOT, '01-identidade', 'lovinspoon-preta-transparente.png');
const [lx, ly, lw, lh] = [31, 171, 2108, 382]; // alpha bbox (43,183)-(2127,540) + 12 px
const logoBuf = await sharp(logoSrc).extract({ left: lx, top: ly, width: lw, height: lh }).toBuffer();
for (const [tone, rgb] of [['charcoal', [36, 35, 31]], ['chalk', [255, 252, 245]]]) {
  const alpha = await sharp(logoBuf).extractChannel('alpha').toBuffer();
  const colored = await sharp({ create: { width: lw, height: lh, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } })
    .joinChannel(alpha).png().toBuffer();
  for (const w of [480, 960]) {
    await sharp(colored).resize({ width: w }).webp({ quality: 90, alphaQuality: 100 }).toFile(join(OUT, `logo-${tone}-${VERSION}-${w}.webp`));
  }
  await sharp(colored).resize({ width: 960 }).png({ compressionLevel: 9 }).toFile(join(OUT, `logo-${tone}-${VERSION}-960.png`));
}
made.logo = { w: lw, h: lh };

// Favicon: the logo's own "L" (first letter inside the frame) in chalk on charcoal.
const L = await sharp(logoSrc).extract({ left: 118, top: 205, width: 214, height: 312 }).toBuffer();
const Lalpha = await sharp(L).extractChannel('alpha').toBuffer();
const Lchalk = await sharp({ create: { width: 214, height: 312, channels: 3, background: '#FFFCF5' } }).joinChannel(Lalpha).png().toBuffer();
for (const size of [32, 180, 512]) {
  const glyph = await sharp(Lchalk).resize({ height: Math.round(size * 0.62) }).toBuffer();
  const r = Math.round(size * 0.18);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#24231F"/><rect x="${size * 0.09}" y="${size * 0.09}" width="${size * 0.82}" height="${size * 0.82}" rx="${r * 0.75}" fill="none" stroke="#FFFCF5" stroke-width="${Math.max(1, size * 0.03)}"/></svg>`);
  const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}.png`;
  await sharp(bg).composite([{ input: glyph, gravity: 'center' }]).png().toFile(join(ROOT, 'public', name));
}

writeFileSync(join(ROOT, 'src', 'data', 'images.json'), JSON.stringify({ version: VERSION, images: made }, null, 2));
console.log('done');
