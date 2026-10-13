"""Derive the hero plates from the kit's campaign still so the sandwich sits
centred under the title, as on the approved board (02-direcao/combinacao-final-02-03.png).

The still (03-hero/hero-sanduiche-sem-texto.png) has the sandwich at 70 % of its
width. Instead of cropping, the frame is widened with "defocus extensions": the
edge rows/columns are stretched outward and blurred hard, so they read as
out-of-focus room and sweater (mirroring was tried and produced a ghost person).

Outputs (gitignored, fed to scripts/build-images.mjs):
  assets-src/composed/hero-wide.png   4000x2250, sandwich centre at x 50 %
  assets-src/composed/hero-tall.png   1200x2400, phones and portrait tablets

Run: ~/anaconda3/bin/python3 scripts/compose-hero.py
"""
import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
UP = P('assets-src', 'upscaled', 'hero.png')
SRC = UP if os.path.exists(UP) else P('03-hero', 'hero-sanduiche-sem-texto.png')
OUT = P('assets-src', 'composed')

# Sandwich bounds measured on the 1672x941 kit still (fractions).
SANDWICH = {'x0': 0.44, 'x1': 0.96, 'y0': 0.324, 'y1': 0.818}


def extend_right(img, cols, edge=120):
    h = img.shape[0]
    strip = img[:, -edge:]
    smear = cv2.resize(strip, (cols + edge, h), interpolation=cv2.INTER_LINEAR)
    smear = cv2.GaussianBlur(smear, (0, 0), sigmaX=60, sigmaY=40)[:, edge:]
    out = np.concatenate([img, smear], axis=1)
    return feather_seam(out, img.shape[1], axis=1, cols=cols)


def extend_left(img, cols, edge=120):
    return extend_right(img[:, ::-1], cols, edge)[:, ::-1]


def extend_bottom(img, rows, edge=90):
    return np.ascontiguousarray(extend_right(img.transpose(1, 0, 2), rows, edge).transpose(1, 0, 2))


def extend_top(img, rows, edge=90):
    return extend_bottom(img[::-1], rows, edge)[::-1]


def feather_seam(out, at, axis, cols, seam=220):
    """Blend a blurred copy around the seam and darken the extension slightly."""
    n = out.shape[axis]
    pos = np.arange(n, dtype=np.float32)
    mix = cv2.GaussianBlur(out, (0, 0), sigmaX=40 if axis == 1 else 10, sigmaY=10 if axis == 1 else 40)
    ramp = np.clip((pos - (at - seam)) / seam, 0, 1) * np.clip(1 - (pos - at) / 400, 0, 1)
    dark = 1 - 0.3 * np.clip((pos - at) / max(cols, 1), 0, 1)
    shape = (1, n, 1) if axis == 1 else (n, 1, 1)
    ramp, dark = ramp.reshape(shape), dark.reshape(shape)
    return (out * (1 - ramp) + mix * ramp) * dark


def place(img, cw, ch, cx_frac, cy_frac, sandwich_w_frac):
    """Scale img so the sandwich spans sandwich_w_frac of cw, centre it at
    (cx_frac, cy_frac) of the canvas, extending whatever edge falls short."""
    h, w = img.shape[:2]
    sw = (SANDWICH['x1'] - SANDWICH['x0']) * w
    s = sandwich_w_frac * cw / sw
    im = cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    h, w = im.shape[:2]
    scx = (SANDWICH['x0'] + SANDWICH['x1']) / 2 * w
    scy = (SANDWICH['y0'] + SANDWICH['y1']) / 2 * h
    left = round(cx_frac * cw - scx)
    top = round(cy_frac * ch - scy)
    if left > 0:
        im = extend_left(im, left); left = 0
    if top > 0:
        im = extend_top(im, top); top = 0
    im = im[-top:, -left:]
    h, w = im.shape[:2]
    if w < cw:
        im = extend_right(im, cw - w)
    if h < ch:
        im = extend_bottom(im, ch - h)
    return im[:ch, :cw], s


def main():
    os.makedirs(OUT, exist_ok=True)
    src = cv2.imread(SRC).astype(np.float32)
    meta = {}
    # Desktop: sandwich ~40 % of a 16:9 frame, centred, its middle at 71.5 % height
    # (board: crust at ~45 %, hands at ~88 % of the hero).
    wide, s = place(src, 4000, 2250, 0.5, 0.715, 0.40)
    cv2.imwrite(os.path.join(OUT, 'hero-wide.png'), wide.clip(0, 255).astype(np.uint8))
    meta['wide'] = {'w': 4000, 'h': 2250, 'scale': round(s, 4)}
    # Phones: sandwich a little wider than the screen, middle at 62 % height.
    tall, s = place(src, 1200, 2400, 0.5, 0.62, 0.96)
    cv2.imwrite(os.path.join(OUT, 'hero-tall.png'), tall.clip(0, 255).astype(np.uint8))
    meta['tall'] = {'w': 1200, 'h': 2400, 'scale': round(s, 4)}
    print(json.dumps(meta))
    for k in ('wide', 'tall'):
        im = cv2.imread(os.path.join(OUT, f'hero-{k}.png'))
        cv2.imwrite(P('assets-src', 'verify', f'hero-{k}.jpg'), cv2.resize(im, (im.shape[1] // 4, im.shape[0] // 4), interpolation=cv2.INTER_AREA))


if __name__ == '__main__':
    main()
