"""Subset the kit's three fonts (08-estudo/fonts/*.woff) to Latin + the
punctuation the copy uses, and write WOFF2 files to public/fonts/.

Lilita One and Caveat are OFL; Nimbus Sans is URW base35 (AGPL-3 with the font
exception). Their licence files are copied next to the fonts.

Run: npm run fonts
"""
import os
import shutil

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '08-estudo', 'fonts')
OUT = os.path.join(ROOT, 'public', 'fonts')

# Basic Latin, Latin-1, Latin Extended-A (Irish names), general punctuation,
# euro, arrows used in the UI.
UNICODES = 'U+0020-007E,U+00A0-00FF,U+0100-017F,U+2010-2027,U+2030-203A,U+20AC,U+2190-2199'

FONTS = {
    'LilitaOne.woff': 'lilita-one.woff2',
    'Caveat.woff': 'caveat.woff2',
    'NimbusSans.woff': 'nimbus-sans.woff2',
}

os.makedirs(OUT, exist_ok=True)
for src, dest in FONTS.items():
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'locl', 'mark', 'mkmk']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    font = subset.load_font(os.path.join(SRC, src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    path = os.path.join(OUT, dest)
    subset.save_font(font, path, opts)
    print(f'{dest}: {os.path.getsize(path) / 1024:.1f} KB')

for lic in ('LilitaOne-OFL.txt', 'Caveat-OFL.txt', 'Nimbus-LICENSE.txt'):
    shutil.copy(os.path.join(SRC, lic), os.path.join(OUT, lic))
