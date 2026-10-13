"""Trace the kit's logo PNG (01-identidade/lovinspoon-preta-transparente.png,
2172x724 RGBA) into an SVG path so the header and footer stay crisp at any
size and weigh a few KB instead of a 50 KB bitmap.

Contours come from the alpha channel at 4x supersampling, are simplified with
Douglas-Peucker and filled with even-odd, so counters (O, P) stay open. A
side-by-side diff against the PNG is written to assets-src/verify/.

Run: ~/anaconda3/bin/python3 scripts/trace-logo.py
"""
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
SRC = P('01-identidade', 'lovinspoon-preta-transparente.png')
BOX = (31, 171, 2108, 382)  # crop: alpha bbox + 12 px, same as build-images.mjs
UP = 4

im = cv2.imread(SRC, cv2.IMREAD_UNCHANGED)
x, y, w, h = BOX
a = im[y:y + h, x:x + w, 3]
big = cv2.resize(a, (w * UP, h * UP), interpolation=cv2.INTER_CUBIC)
big = cv2.GaussianBlur(big, (0, 0), 1.2)
_, bw = cv2.threshold(big, 127, 255, cv2.THRESH_BINARY)
contours, _ = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)

parts = []
for c in contours:
    if cv2.contourArea(c) < 20 * UP * UP:
        continue
    c = cv2.approxPolyDP(c, 0.55 * UP / 2, True)
    pts = c[:, 0, :] / UP
    d = 'M' + ' '.join(f'{px:.1f} {py:.1f}' for px, py in pts) + 'Z'
    parts.append(d)
path = ''.join(parts)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">'
       f'<path fill="currentColor" fill-rule="evenodd" d="{path}"/></svg>\n')
os.makedirs(P('src', 'assets'), exist_ok=True)
with open(P('src', 'assets', 'logo.svg'), 'w') as f:
    f.write(svg)
print(f'logo.svg: {len(svg) / 1024:.1f} KB, {len(parts)} contours')

# verification: rasterise the polygons and compare with the PNG alpha
canvas = np.zeros((h * UP, w * UP), np.uint8)
polys = []
for c in contours:
    if cv2.contourArea(c) < 20 * UP * UP:
        continue
    polys.append(cv2.approxPolyDP(c, 0.55 * UP / 2, True))
mask = np.zeros_like(canvas)
for c in polys:
    tmp = np.zeros_like(canvas)
    cv2.fillPoly(tmp, [c], 255)
    mask ^= tmp
mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_AREA)
diff = np.abs(mask.astype(int) - a.astype(int))
print(f'mean abs diff vs PNG alpha: {diff.mean():.2f} / 255, >128 px: {(diff > 128).sum()}')
os.makedirs(P('assets-src', 'verify'), exist_ok=True)
cv2.imwrite(P('assets-src', 'verify', 'logo-trace.png'), np.vstack([255 - a, 255 - mask, 255 - diff.astype(np.uint8)]))
