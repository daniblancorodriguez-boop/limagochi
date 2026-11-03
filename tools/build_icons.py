#!/usr/bin/env python3
"""Genera los iconos de la PWA a partir de los sprites (public/sprites.js)."""
import json, re, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, '..', 'public')
src = open(os.path.join(PUB, 'sprites.js'), encoding='utf-8').read()
PAL = json.loads(re.search(r'LIMA\.PAL = (\{.*?\});', src, re.S).group(1))
SPR = json.loads(re.search(r'LIMA\.SPR = (\{.*?\});\nLIMA\.META', src, re.S).group(1))


def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def sprite_image(rows):
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.':
                im.putpixel((x, y), rgb(PAL[c]) + (255,))
    return im


def make(size, scale_frac, rounded, path):
    bg = Image.new('RGBA', (size, size), rgb('#d4e5a4') + (255,))
    d = ImageDraw.Draw(bg)
    # anillo de pantalla LCD
    m = int(size * 0.0)
    d.rectangle([m, m, size - 1 - m, size - 1 - m], fill=rgb('#d4e5a4'))
    for i in range(0, size, max(2, size // 32)):                      # rejilla LCD sutil
        d.line([(i, 0), (i, size)], fill=rgb('#cde0a0'), width=1)
    spr = sprite_image(SPR['child_good']['happy'])
    px = max(1, int(size * scale_frac / 24))
    big = spr.resize((24 * px, 24 * px), Image.NEAREST)
    bg.alpha_composite(big, ((size - big.width) // 2, (size - big.height) // 2 + int(size * 0.02)))
    if rounded:
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        bg.putalpha(mask)
    bg.save(path)


os.makedirs(os.path.join(PUB, 'icons'), exist_ok=True)
I = lambda n: os.path.join(PUB, 'icons', n)
make(192, 0.80, True, I('icon-192.png'))
make(512, 0.80, True, I('icon-512.png'))
make(512, 0.58, False, I('icon-maskable-512.png'))      # zona segura (80 %) para iconos adaptativos
make(180, 0.74, False, I('apple-touch-icon.png'))
make(32, 0.86, True, I('favicon-32.png'))
print('iconos ok')
