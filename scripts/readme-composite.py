"""README composites from the captures in assets-src/readme/
(run scripts/readme-assets.mjs first):
  .github/assets/hero-scroll.gif       entrance + scroll to the sandwich coming together
  .github/assets/desktop-sections.jpg  browser-framed desktop shots
  .github/assets/mobile-screens.jpg    phone-framed 390 px shots

Run: ~/anaconda3/bin/python3 scripts/readme-composite.py
"""
import os
import subprocess

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
SRC = P('assets-src', 'readme')
OUT = P('.github', 'assets')
PAPER = (247, 240, 226)
CHARCOAL = (36, 35, 31)


def gif():
    """Variable frame timing through ffmpeg's concat demuxer: the entrance plays
    at 12 fps, holds become single long frames, and the scroll part keeps two
    frames in three, which keeps the GIF under 4 MB."""
    import json
    count = json.load(open(os.path.join(SRC, 'frames.json')))['count']
    entrance, hold1, scroll = 22, 10, 36   # same split as scripts/readme-assets.mjs
    plan = []
    for i in range(entrance):
        plan.append((i, 1 / 12))
    plan.append((entrance + hold1 - 1, 1.2))
    s0 = entrance + hold1
    for k in range(scroll):
        if k % 3 != 2 or k == scroll - 1:
            plan.append((s0 + k, 0.125))
    plan.append((count - 1, 2.0))
    lst = os.path.join(SRC, 'gif-frames.txt')
    with open(lst, 'w') as f:
        for idx, dur in plan:
            f.write(f"file 'frames/f_{idx:04d}.png'\nduration {dur:.3f}\n")
        f.write(f"file 'frames/f_{plan[-1][0]:04d}.png'\n")
    out = os.path.join(OUT, 'hero-scroll.gif')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
           '-vf', 'scale=760:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=88:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
           '-fps_mode', 'vfr', '-loop', '0', out]
    subprocess.run(cmd, check=True)
    print(f'hero-scroll.gif {len(plan)} frames, {os.path.getsize(out) / 1e6:.2f} MB')


def shadow(card, radius, blur=24, offset=14, alpha=110):
    w, h = card.size
    pad = blur * 3
    sh = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=alpha)
    sh.paste((0, 0, 0, 255), (pad, pad + offset), m)
    return sh.filter(ImageFilter.GaussianBlur(blur)), pad


def browser(shot, width=1200):
    im = Image.open(shot).convert('RGB')
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    bar = 38
    card = Image.new('RGB', (width, im.height + bar), (236, 231, 222))
    d = ImageDraw.Draw(card)
    for i, c in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]):
        d.ellipse((16 + i * 22, 13, 28 + i * 22, 25), fill=c)
    d.rounded_rectangle((width * 0.3, 8, width * 0.7, 30), 8, fill=(250, 248, 243))
    card.paste(im, (0, bar))
    mask = Image.new('L', card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, card.width - 1, card.height - 1), 12, fill=255)
    rgba = card.convert('RGBA'); rgba.putalpha(mask)
    return rgba


def phone(shot, width=330, status=34):
    """Phone frame with a status bar above the page, so the camera island
    never covers the header of the capture."""
    im = Image.open(shot).convert('RGB')
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    screen = Image.new('RGB', (im.width, im.height + status), (14, 13, 12))
    screen.paste(im.crop((0, 0, im.width, im.height)), (0, status))
    bez = 12
    w, h = screen.width + bez * 2, screen.height + bez * 2
    card = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 46, fill=(20, 20, 20, 255))
    m = Image.new('L', screen.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, screen.width - 1, screen.height - 1), 36, fill=255)
    card.paste(screen, (bez, bez), m)
    d.rounded_rectangle((w / 2 - 44, bez + 7, w / 2 + 44, bez + 29), 11, fill=(0, 0, 0, 255))
    return card


def place(canvas, card, x, y):
    sh, pad = shadow(card, 14)
    canvas.alpha_composite(sh, (x - pad, y - pad))
    canvas.alpha_composite(card, (x, y))


def desktop():
    shots = ['d-breakfast.png', 'd-lunch-open.png', 'd-lunch-together.png']
    cards = [browser(os.path.join(SRC, s), 1000) for s in shots]
    gap, margin = 48, 64
    W = cards[0].width * 2 + gap + margin * 2
    H = margin * 2 + cards[0].height * 2 + gap
    canvas = Image.new('RGBA', (W, H), PAPER + (255,))
    place(canvas, cards[0], margin, margin)
    place(canvas, cards[1], margin + cards[0].width + gap, margin)
    place(canvas, cards[2], margin + (cards[0].width + gap) // 2, margin + cards[0].height + gap)
    canvas.convert('RGB').save(os.path.join(OUT, 'desktop-sections.jpg'), quality=84, optimize=True, progressive=True)
    print('desktop-sections.jpg', canvas.size, f"{os.path.getsize(os.path.join(OUT, 'desktop-sections.jpg')) / 1e6:.2f} MB")


def mobile():
    shots = ['m-hero.png', 'm-breakfast.png', 'm-lunch.png', 'm-visit.png']
    cards = [phone(os.path.join(SRC, s)) for s in shots]
    gap, margin = 44, 60
    W = sum(c.width for c in cards) + gap * (len(cards) - 1) + margin * 2
    H = cards[0].height + margin * 2
    canvas = Image.new('RGBA', (W, H), CHARCOAL + (255,))
    x = margin
    for c in cards:
        place(canvas, c, x, margin)
        x += c.width + gap
    canvas.convert('RGB').save(os.path.join(OUT, 'mobile-screens.jpg'), quality=84, optimize=True, progressive=True)
    print('mobile-screens.jpg', canvas.size, f"{os.path.getsize(os.path.join(OUT, 'mobile-screens.jpg')) / 1e6:.2f} MB")


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    gif()
    desktop()
    mobile()
