# Genera docs/<dst>/bg/nav_*.png: fondos de las salas en versión navideña (pared verde, jardín nevado + decorado).
# Uso: python3 tools/make_navidad_bgs.py docs/prueba-fondos/bg
import os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
DST = sys.argv[1]; SRC = 'docs/bg'
tmp = tempfile.mkdtemp()
subprocess.run(['node', 'tools/make_navidad_bgs.js', tmp], check=True)
def load(n): return np.asarray(Image.open(f'{SRC}/{n}.png').convert('RGBA')).astype(float)
def save(a, dec, name):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')
    im.alpha_composite(Image.open(f'{tmp}/decor_{dec}.png').convert('RGBA')); im.save(f'{DST}/nav_{name}.png')
def interior(n, rows, fk, fg=None):
    a = load(n); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    wall = np.zeros(r.shape, bool)
    if rows: wall[:rows] = True
    else: wall = b > r + 6
    k = np.clip((0.3 * r + 0.59 * g + 0.11 * b) / (200 if not rows else 215), 0, 1.1); o = a.copy()
    for c, (wv, wo, fm) in enumerate([(45, 12, fk[0]), (108, 10, fk[1]), (78, 8, fk[2])]):
        o[..., c] = np.where(wall, wv * k + wo, a[..., c] * fm)
    save(o, n, n)
interior('cuarto', 0, (.50, .40, .34)); interior('salon', 50, (.50, .40, .34))
interior('estudio', 43, (.62, .50, .42)); interior('cocina', 45, (.85, .85, .85))
def garden(n):
    a = load(n); r, g, b = a[..., 0], a[..., 1], a[..., 2]; Y = .3 * r + .59 * g + .11 * b
    yy = np.arange(72)[:, None] * np.ones((1, 96)); t = np.clip(yy / 30, 0, 1)
    sky = (b > g + 8) & (yy < 30); ground = (g > b + 10) & (g >= r); o = a.copy()
    for c, (top, bot) in enumerate([(24, 70), (40, 110), (84, 160)]): o[..., c] = np.where(sky, top + (bot - top) * t, o[..., c])
    for c, v in enumerate([232, 240, 252]): o[..., c] = np.where(ground, np.clip(v * (.80 + .25 * (Y / 200)), 0, 255) * (1 if c == 2 else .97), o[..., c])
    save(o, 'jardin', n)
garden('jardin')
if os.path.exists(f'{SRC}/jardin_k.png'): garden('jardin_k')
print('fondos navideños en', DST)
