#!/usr/bin/env python3
"""Genera sprites 24x24 de Limagochi (cuerpo base + accesorios dibujados pixel a pixel)
y produce: sprites_preview.png (para revisar) y limagochi-sprites.html (muestra jugable)."""
import json
from PIL import Image

W = H = 24
COL = {
    'K': '#1d2a12', 'G': '#3f5a28', 'g': '#7d9f45', 'l': '#b8d474', 'w': '#f7fbe6',
    'p': '#ff8fb1', 'P': '#d95f86', 'r': '#e0523f', 'R': '#a8362b', 'y': '#ffd84d',
    'o': '#f29a3c', 'n': '#6b4a1f', 'c': '#6ec6ff',
    'N': '#c9c06a', 'm': '#a39a4a', 'M': '#6f6a2e',      # familia "marchita"
    'f': '#ffb3d1', 'q': '#ff6fa8', 'Q': '#c23d7a',      # familia "caramelo"
}
LIME, OLIVE, CANDY = ('l', 'g', 'G'), ('N', 'm', 'M'), ('f', 'q', 'Q')

# Siluetas (ancho de cada fila, de arriba a abajo). Se alinean al suelo (fila 21).
BABY  = [4, 8, 10, 10, 10, 10, 8, 4]
CHILD = [6, 10, 12, 14, 14, 14, 14, 12, 10, 6]
ADULT = [6, 10, 12, 14, 14, 16, 16, 16, 16, 14, 14, 12, 10, 6]
WIDE  = [8, 12, 16, 18, 20, 20, 20, 20, 18, 16, 12, 8]


def blank():
    return [['.'] * W for _ in range(H)]


def put(g, x, y, rows):
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c not in '. ' and 0 <= x + i < W and 0 <= y + j < H:
                g[y + j][x + i] = c


def body(profile, fam=LIME):
    L, M, D = fam
    g, n = blank(), len(profile)
    t = 22 - n
    for j, w in enumerate(profile):
        x0 = (W - w) // 2
        for i in range(w):
            edge = i in (0, w - 1) or j in (0, n - 1)
            g[t + j][x0 + i] = 'K' if edge else (D if j >= n - 3 else M)
    for j in range(2, n - 3):                      # sombra lateral derecha
        w = profile[j]; x0 = (W - w) // 2
        g[t + j][x0 + w - 2] = D
    x0 = (W - profile[2]) // 2                     # brillo arriba-izquierda
    put(g, x0 + 2, t + 2, [L + L, L + '.'])
    return g, t, n


FACE = {'idle': (None, None), 'happy': ('happy', 'smile'), 'sad': ('sad', 'frown'),
        'sleep': ('line', 'tiny'), 'eat': (None, 'open')}


def fc(face, e, m):
    fe, fm = FACE[face or 'idle']
    return fe or e, fm or m


def leaf(g, t, small=False):
    if small:
        put(g, 11, t - 1, ["GG"]); put(g, 12, t - 3, ["lll", "lgg"][::1])
    else:
        put(g, 11, t - 2, ["GG", "GG"]); put(g, 12, t - 5, ["..lll", ".lllg", "lllgg"])


EYES = {'round': ["Kw", "KK"], 'big': ["KwK", "KKK", "KKK"], 'happy': [".K.", "K.K"],
        'line': ["KKK"], 'star': [".y.", "yKy", ".y."], 'dizzy': ["KKK", "KwK", "KK."]}


def eyes(g, y, kind, a=2):
    rows = EYES['round' if kind in ('angry', 'sad') else kind]
    ew = len(rows[0]); xl, xr = 12 - a - ew, 12 + a
    put(g, xl, y, rows); put(g, xr, y, rows)
    if kind == 'angry':
        put(g, xl - 1, y - 2, ["KK.", "..K"]); put(g, xr, y - 2, [".KK", "K.."])
    if kind == 'sad':
        put(g, xl - 1, y - 2, ["..K", "KK."]); put(g, xr, y - 2, ["K..", ".KK"])
        put(g, xl, y + 2, ["c"])
    return len(rows)


MOUTH = {'smile': ["K..K", ".KK."], 'grin': ["KwwwwK", ".KKKK."], 'flat': ["KKKK"],
         'frown': [".KK.", "K..K"], 'open': [".KK.", "KPPK", ".KK."], 'fang': ["KKKK", "w..w"],
         'tongue': [".KKKK.", "KPppPK", ".KKKK."], 'wavy': ["K.K.", ".K.K"],
         'smirk': ["K...", ".KKK"], 'tiny': ["KK"]}


def mouth(g, y, kind):
    rows = MOUTH[kind]; put(g, 12 - len(rows[0]) // 2, y, rows)


def cheeks(g, y, dx=5):
    put(g, 12 - dx - 2, y, ["pp"]); put(g, 12 + dx, y, ["pp"])


def outline(g):
    out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.':
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and g[ny][nx] not in '.K':
                        out[y][x] = 'K'; break
    return out


def finish(g):
    return [''.join(r) for r in outline(g)]


# ------------------------------------------------------------------ SPRITES
def baby(face=None):
    g, t, n = body(BABY); leaf(g, t, True)
    ey = t + 2; e, m = fc(face, 'round', 'tiny'); eyes(g, ey, e, 1); mouth(g, ey + 3, m)
    return finish(g)


def child_good(face=None):
    g, t, n = body(CHILD); leaf(g, t)
    ey = t + 3; e, m = fc(face, 'round', 'smile'); eyes(g, ey, e); mouth(g, ey + 3, m); cheeks(g, ey + 2, 4)
    return finish(g)


def child_naughty(face=None):
    g, t, n = body(CHILD)
    put(g, 9, t - 3, ["G.G.G.", "GGGGGG"])
    ey = t + 3; e, m = fc(face, 'angry', 'smirk'); eyes(g, ey, e); mouth(g, ey + 3, m)
    put(g, 7, ey + 2, ["n"]); put(g, 16, ey + 2, ["n"]); put(g, 8, ey + 3, ["n"])
    return finish(g)


def flor(face=None):
    g, t, n = body(ADULT)
    put(g, 9, t - 5, ["..pp..", ".pppp.", "ppyypp", ".pppp.", "..pp.."])
    ey = t + 5; e, m = fc(face, 'happy', 'smile'); eyes(g, ey, e); mouth(g, ey + 3, m); cheeks(g, ey + 2)
    return finish(g)


def brote(face=None):
    g, t, n = body(ADULT)
    put(g, 8, t - 6, ["lg....gl", ".lg..gl.", "..lggl..", "...GG..."])
    put(g, 11, t - 2, ["GG", "GG"])
    ey = t + 5; e, m = fc(face, 'round', 'flat'); eyes(g, ey, e); mouth(g, ey + 3, m)
    return finish(g)


def marchita(face=None):
    g, t, n = body(ADULT, OLIVE)
    put(g, 11, t - 3, ["MM", "MM", "MM"])
    put(g, 13, t - 3, ["MMM.", "mmMM", ".mmM", "..mM"])
    ey = t + 5; e, m = fc(face, 'sad', 'frown'); eyes(g, ey, e); mouth(g, ey + 4, m)
    put(g, 18, t + 2, ["c.", "cc"])
    return finish(g)


def guerrera(face=None):
    g, t, n = body(ADULT); leaf(g, t)
    x0 = (W - ADULT[3]) // 2
    for x in range(x0 + 1, x0 + ADULT[3] - 1):
        g[t + 3][x] = 'r'; g[t + 4][x] = 'R'
    put(g, 18, t + 3, ["rrr", ".rR", "rR."])
    ey = t + 6; e, m = fc(face, 'round', 'grin'); eyes(g, ey, e); mouth(g, ey + 3, m)
    return finish(g)


def grunona(face=None):
    g, t, n = body(ADULT)
    put(g, 7, t - 2, ["o.", "oo", "oo"]); put(g, 15, t - 2, [".o", "oo", "oo"])
    put(g, 18, t, ["r.r", ".r.", "r.r"])
    ey = t + 5; e, m = fc(face, 'angry', 'fang'); eyes(g, ey, e); mouth(g, ey + 3, m)
    return finish(g)


def rebelde(face=None):
    g, t, n = body(ADULT)
    put(g, 9, t - 5, ["..rr..", "r.rr.r", "r.rr.r", "rrrrrr", "RRRRRR"])
    ey = t + 5; e, m = fc(face, 'angry', 'smirk'); eyes(g, ey, e); mouth(g, ey + 3, m)
    put(g, 7, ey - 1, ["w..", ".w.", "..w"])          # cicatriz sobre el ojo izquierdo
    return finish(g)


def piruleta(face=None):
    g, t, n = body(ADULT)
    put(g, 8, t - 8, ["..pppp..", ".pwwwwp.", "pwppppwp", "pwpwwpwp", ".pwwwwp.", "..pppp.."])
    put(g, 11, t - 2, ["ww", "ww"])
    ey = t + 5; e, m = fc(face, 'star', 'tongue'); eyes(g, ey, e); mouth(g, ey + 4, m); cheeks(g, ey + 3)
    return finish(g)


def glotona(face=None):
    g, t, n = body(WIDE); leaf(g, t)
    ey = t + 4; e, m = fc(face, 'happy', 'tongue'); eyes(g, ey, e, 3); mouth(g, ey + 3, m); cheeks(g, ey + 2, 7)
    put(g, 15, ey + 6, ["c", "c"]); put(g, 3, ey + 5, ["n"]); put(g, 19, ey + 4, ["n"])
    return finish(g)


def gominola(face=None):
    g, t, n = body(ADULT, CANDY)
    for (x, y) in ((16, t + 1), (17, t + 1), (17, t + 2)):   # mordisco
        g[y][x] = '.'
    put(g, 7, t + 3, ["w", "w"])
    ey = t + 5; e, m = fc(face, 'dizzy', 'wavy'); eyes(g, ey, e); mouth(g, ey + 3, m)
    put(g, 5, 22, ["qqqqqqqqqqqqqq"]); put(g, 7, 23, ["QQQQQQQQQQ"])
    return finish(g)


def estrella(face=None):
    g, t, n = body(ADULT)
    put(g, 9, t - 5, ["..yy..", "yyyyyy", ".yyyy.", "yy..yy"])
    ey = t + 5; e, m = fc(face, 'star', 'smile'); eyes(g, ey, e); mouth(g, ey + 4, m); cheeks(g, ey + 3)
    rows = finish(g); g2 = [list(r) for r in rows]
    for (sx, sy) in ((2, 6), (20, 9), (3, 15)):
        put(g2, sx, sy, [".y.", "yyy", ".y."])
    return [''.join(r) for r in g2]


EGG = [4, 8, 10, 12, 14, 14, 14, 14, 12, 10, 6]


def egg(face=None):
    g, t, n = body(EGG, ('w', 'w', 'l'))
    put(g, 9, t + 3, ["gg", "gg"]); put(g, 13, t + 6, ["ggg", "ggg"]); put(g, 8, t + 7, ["gg"])
    if face == 'crack':
        put(g, 8, t + 4, ["K.K.K.K", ".K.K.K."])
    return finish(g)


SPRITES = [
    ('baby', 'Limabebé', 'base', baby), ('child_good', 'Limita', 'base', child_good),
    ('child_naughty', 'Limón travieso', 'base', child_naughty),
    ('flor', 'Lima Flor', 'veg', flor), ('brote', 'Lima Brote', 'veg', brote), ('marchita', 'Lima Marchita', 'veg', marchita),
    ('guerrera', 'Lima Guerrera', 'meat', guerrera), ('grunona', 'Lima Gruñona', 'meat', grunona), ('rebelde', 'Lima Rebelde', 'meat', rebelde),
    ('piruleta', 'Lima Piruleta', 'candy', piruleta), ('glotona', 'Lima Glotona', 'candy', glotona), ('gominola', 'Lima Gominola', 'candy', gominola),
    ('estrella', 'Lima Estrella', 'secret', estrella),
]
EXTRA = [('egg', 'Huevo', 'base', egg)]

FACES = ['idle', 'happy', 'sad', 'sleep', 'eat']
data, full = {}, {}
for sid, name, grp, fn in SPRITES:
    full[sid] = {f: fn(f) for f in FACES}
    data[sid] = full[sid]['idle']
    for f in full[sid].values():
        assert len(f) == H and all(len(r) == W for r in f), sid
full['egg'] = {'idle': egg('idle'), 'crack': egg('crack')}
META = {s[0]: {'name': s[1], 'grp': s[2]} for s in SPRITES}
META['egg'] = {'name': 'Huevo', 'grp': 'base'}

import json as _j
open('../docs/sprites.js', 'w', encoding='utf-8').write(
    'window.LIMA = window.LIMA || {};\nLIMA.PAL = ' + _j.dumps(COL) + ';\nLIMA.SPR = ' + _j.dumps(full, separators=(',', ':')) +
    ';\nLIMA.META = ' + _j.dumps(META, ensure_ascii=False) + ';\n')

html = open('sprites_template.html', encoding='utf-8').read()
html = html.replace('__PAL__', _j.dumps(COL)).replace('__SPR__', _j.dumps(data)).replace('__META__', _j.dumps(META, ensure_ascii=False))
open('../limagochi-sprites.html', 'w', encoding='utf-8').write(html)
print('ok', len(full), 'sprites')
