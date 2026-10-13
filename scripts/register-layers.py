"""Register the four sandwich cut-outs (05-assets-web/*.png, 1774x887 each)
against the kit's assembled still (05-assets-web/sanduiche-camadas-transparente.png,
1024x1536) with masked template matching over a scale sweep, then derive the
"brought together" offsets from the measured alpha bounds.

Writes src/data/layers.json (fractions of the 2:3 stage) and an overlay for
visual verification at assets-src/verify/layers-overlay.png.

Run: ~/anaconda3/bin/python3 scripts/register-layers.py
"""
import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
NAMES = ['toast-top', 'salad', 'filling', 'toast-base']

comp = cv2.imread(P('05-assets-web', 'sanduiche-camadas-transparente.png'), cv2.IMREAD_UNCHANGED)
CH, CW = comp.shape[:2]
comp_bgr = comp[:, :, :3].astype(np.float32)
comp_a = comp[:, :, 3]

def alpha_bbox(a, thr=24):
    ys, xs = np.where(a > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

result = {'stage': {'w': CW, 'h': CH}, 'layers': []}
overlay = cv2.cvtColor(comp[:, :, :3], cv2.COLOR_BGR2GRAY)
overlay = cv2.cvtColor((overlay * 0.5).astype(np.uint8), cv2.COLOR_GRAY2BGR)
colors = [(80, 200, 255), (90, 255, 120), (120, 120, 255), (255, 200, 90)]

for i, name in enumerate(NAMES):
    lay = cv2.imread(P('05-assets-web', f'{name}.png'), cv2.IMREAD_UNCHANGED)
    lx0, ly0, lx1, ly1 = alpha_bbox(lay[:, :, 3])
    crop = lay[ly0:ly1, lx0:lx1]
    best = None
    for s in np.linspace(0.40, 0.70, 31):
        w, h = int(round(crop.shape[1] * s)), int(round(crop.shape[0] * s))
        if w >= CW or h >= CH:
            continue
        t = cv2.resize(crop, (w, h), interpolation=cv2.INTER_AREA)
        tb = t[:, :, :3].astype(np.float32)
        m = (t[:, :, 3] > 200).astype(np.float32)
        m3 = cv2.merge([m, m, m])
        r = cv2.matchTemplate(comp_bgr, tb, cv2.TM_SQDIFF, mask=m3)
        r = r / max(m.sum(), 1)
        mn, _, loc, _ = cv2.minMaxLoc(r)
        if best is None or mn < best[0]:
            best = (mn, s, loc, w, h)
    err, s, (x, y), w, h = best
    # full 1774x887 frame placement in stage pixels
    fx, fy = x - lx0 * s, y - ly0 * s
    entry = {
        'name': name,
        'scale': round(float(s), 4),
        'err': round(float(err), 1),
        # frame box (the whole 1774x887 PNG) as fractions of the stage
        'frame': {'x': fx / CW, 'y': fy / CH, 'w': lay.shape[1] * s / CW, 'h': lay.shape[0] * s / CH},
        # visible food bounds as fractions of the stage
        'food': {'x': x / CW, 'y': y / CH, 'w': w / CW, 'h': h / CH},
    }
    result['layers'].append(entry)
    cv2.rectangle(overlay, (int(x), int(y)), (int(x + w), int(y + h)), colors[i], 3)
    t = cv2.resize(crop, (w, h), interpolation=cv2.INTER_AREA)
    a = (t[:, :, 3:] / 255.0)
    roi = overlay[y:y + h, x:x + w].astype(np.float32)
    overlay[y:y + h, x:x + w] = (roi * (1 - a * 0.5) + t[:, :, :3] * a * 0.5).astype(np.uint8)
    print(f"{name}: scale {s:.3f} at ({x},{y}) {w}x{h} err {err:.1f}")

# Layout for the page. The kit still packs the four parts edge to edge; the
# storyboard (06-roteiros/storyboard.png, 0 %) spreads them with clear gaps, so
# every part is drawn at one common factor K of its registered size (relative
# scales preserved) and the two states are computed in the 2:3 stage:
#   open     parts spread top to bottom with equal gaps (storyboard 0 %)
#   together stacked from the base up, each part tucked OVERLAP of its height
#            into the one below, the stack centred a touch low (storyboard 100 %)
WIDEST = 0.72          # widest part = 72 % of the stage width
MARGIN = 0.012         # top/bottom margin, fraction of stage height
OVERLAP = {'filling': 0.40, 'salad': 0.46, 'toast-top': 0.36}
L = {e['name']: e for e in result['layers']}
K = WIDEST / max(e['food']['w'] for e in result['layers'])
for e in result['layers']:
    f = e['food']
    e['box'] = {
        'w': f['w'] * K,
        'h': f['h'] * K,
        # keep the registered horizontal centre offset (fraction of stage width)
        'cx': 0.5 + (f['x'] + f['w'] / 2 - 0.5) * K,
    }
order = ['toast-top', 'salad', 'filling', 'toast-base']
total = sum(L[n]['box']['h'] for n in order)
gap = (1 - total - 2 * MARGIN) / 3
y = MARGIN
for n in order:
    L[n]['open'] = y
    y += L[n]['box']['h'] + gap
# together, built bottom-up from y = 0 then centred
pos = {'toast-base': 0.0}
top = 0.0
for n in ['filling', 'salad', 'toast-top']:
    h = L[n]['box']['h']
    pos[n] = top + OVERLAP[n] * h - h
    top = pos[n]
stack_top, stack_bottom = top, L['toast-base']['box']['h']
offset = 0.56 - (stack_top + stack_bottom) / 2  # a touch low: the controls sit under the figure
for n in order:
    L[n]['together'] = pos[n] + offset

for e in result['layers']:
    lay = cv2.imread(P('05-assets-web', f"{e['name']}.png"), cv2.IMREAD_UNCHANGED)
    x0, y0, x1, y1 = alpha_bbox(lay[:, :, 3], thr=4)
    x0, y0 = max(x0 - 2, 0), max(y0 - 2, 0)
    x1, y1 = min(x1 + 2, lay.shape[1]), min(y1 + 2, lay.shape[0])
    e['crop'] = [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]
    # the page draws the crop, so its box is the crop scaled like the food box
    lx0, ly0, lx1, ly1 = alpha_bbox(lay[:, :, 3])
    fw, fh = lx1 - lx0, ly1 - ly0
    sx, sy = e['box']['w'] / fw, e['box']['h'] / fh
    e['draw'] = {
        'x': round(e['box']['cx'] - e['box']['w'] / 2 - (lx0 - x0) * sx, 4),
        'w': round((x1 - x0) * sx, 4),
        'h': round((y1 - y0) * sy, 4),
        'open': round(e['open'] - (ly0 - y0) * sy, 4),
        'together': round(e['together'] - (ly0 - y0) * sy, 4),
    }
    for k in ('open', 'together'):
        e[k] = round(e[k], 4)
    e['box'] = {k: round(v, 4) for k, v in e['box'].items()}
result['note'] = ('x/w are fractions of the stage width, y/h of the stage height '
                  '(2:3 stage). draw.* positions the trimmed image; open/together '
                  'are the two states fed to the scroll progress.')

os.makedirs(P('src', 'data'), exist_ok=True)
os.makedirs(P('assets-src', 'verify'), exist_ok=True)
with open(P('src', 'data', 'layers.json'), 'w') as f:
    json.dump(result, f, indent=2)
cv2.imwrite(P('assets-src', 'verify', 'layers-overlay.png'), overlay)

# render both states for a visual check
SW, SH = 600, 900
sheet = np.zeros((SH, SW * 2 + 20, 3), np.uint8); sheet[:] = (25, 37, 56)
for col, state in enumerate(['open', 'together']):
    for name in ['toast-base', 'filling', 'salad', 'toast-top']:
        e = L[name]; d = e['draw']
        lay = cv2.imread(P('05-assets-web', f'{name}.png'), cv2.IMREAD_UNCHANGED)
        x, y, w, h = e['crop']
        t = cv2.resize(lay[y:y + h, x:x + w], (round(d['w'] * SW), round(d['h'] * SH)), interpolation=cv2.INTER_AREA)
        px, py = round(d['x'] * SW) + col * (SW + 20), round(d[state] * SH)
        h, w = t.shape[:2]
        a = t[:, :, 3:] / 255.0
        roi = sheet[py:py + h, px:px + w]
        sheet[py:py + h, px:px + w] = (roi * (1 - a[:roi.shape[0], :roi.shape[1]]) + t[:roi.shape[0], :roi.shape[1], :3] * a[:roi.shape[0], :roi.shape[1]]).astype(np.uint8)
cv2.imwrite(P('assets-src', 'verify', 'layers-states.png'), sheet)
print(json.dumps({e['name']: e['draw'] for e in result['layers']}, indent=1))
