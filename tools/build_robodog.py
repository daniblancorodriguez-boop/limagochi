# Genera docs/robodog_frames.js: el galgo de peluche robot (11 fotogramas del mismo tamaño) como L.ITEMS.robodog.
# Uso: python3 tools/build_robodog.py [salida.js]
import json, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/robodog_frames.js'
W, H, OX, OY = 40, 30, 3, 9
COLS = {'k': '#2b1a10', 'g': '#a0693a', 'd': '#6e4424', 'w': '#e6c999', 'f': '#5b361b', 'n': '#16161c', 'c': '#5ce6ff', 'o': '#2f5a63',
        'm': '#a8b2be', 'l': '#5ce6ff', 'a': '#8a94a0', 'q': '#3a2412', 'h': '#ffffff', 'r': '#e3c27f'}
LET = list(COLS)

def frame(hx=0, hy=0, eyes=True, tail=0, mouth=0, rope=False, up=0, legs=None):
    g = [['.'] * W for _ in range(H)]
    U = up
    def ell(cx, cy, rx, ry, c, only=None):
        for j in range(H):
            for i in range(W):
                if ((i + .5 - cx - OX) / rx) ** 2 + ((j + .5 - cy - OY + U) / ry) ** 2 <= 1 and (only is None or g[j][i] in only): g[j][i] = c
    def put(i, j, c, w=1, h=1):
        for y in range(j + OY - U, j + OY - U + h):
            for x in range(i + OX, i + OX + w):
                if 0 <= y < H and 0 <= x < W: g[y][x] = c
    def ground(i, j, c, w=1, h=1):                                           # sin desplazar: patas que tocan el suelo
        for y in range(j + OY, j + OY + h):
            for x in range(i + OX, i + OX + w):
                if 0 <= y < H and 0 <= x < W: g[y][x] = c
    def line(x0, y0, x1, y1, c):
        n = max(abs(x1 - x0), abs(y1 - y0)) + 1
        for k in range(n):
            t = k / max(1, n - 1); ground(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c, 2, 1)
    LEGS = {'stand': [(9, 10, 9, 15, 'g'), (12, 10, 12, 15, 'd'), (24, 9, 24, 15, 'g'), (21, 9, 21, 15, 'd')],
            'run_a': [(9, 10, 4, 15, 'g'), (11, 10, 7, 15, 'd'), (25, 9, 30, 15, 'g'), (22, 9, 27, 15, 'd')],
            'run_b': [(10, 10, 10, 15, 'g'), (12, 10, 13, 15, 'd'), (24, 9, 22, 15, 'g'), (21, 9, 20, 15, 'd')],
            'pull': [(9, 10, 7, 15, 'g'), (12, 10, 10, 15, 'd'), (25, 9, 28, 15, 'g'), (22, 9, 25, 15, 'd')]}
    tails = [[(30, 8), (31, 8), (32, 9), (32, 10), (31, 11), (30, 11)], [(30, 8), (31, 7), (32, 6), (33, 6)], [(30, 9), (31, 10), (32, 11), (32, 12)]]
    for (x, y) in tails[tail]: put(x, y, 'g')
    ell(17, 10.4, 9, 4.2, 'g'); ell(23.5, 9.2, 5.2, 4.4, 'g')            # cuerpo con lomo arqueado
    if legs is None: ell(24, 13.4, 4, 1.8, 'g'); ell(9.2, 14.2, 6, 1.5, 'g')               # patas
    else:
        for (a, b, c2, d, col) in LEGS[legs]: line(a, b, c2, d, col)
    ell(11.2 + hx * .5, 7.6 + hy * .5, 2.6, 5.2, 'g')                       # cuello
    ell(8.4 + hx, 3.6 + hy, 3.0, 2.3, 'g'); ell(4.2 + hx, 5.2 + hy, 4.2, 1.4, 'g')   # cabeza y hocico
    ell(11.5, 11.6, 2.8, 2.4, 'w', 'g'); ell(17, 12.8, 6.5, 1.2, 'w', 'g')  # pecho y barriga claros
    ell(10.6 + hx, 3.4 + hy, 1.9, 1.4, 'f')                                  # oreja
    put(7 + hx, 3 + hy, 'c' if eyes else 'o')                                # ojo LED
    put(0 + hx, 4 + hy, 'n', 2, 2)                                           # nariz
    put(8 + hx, 5 + hy, 'm')                                                 # tornillo de la mejilla
    if mouth: put(2 + hx, 6 + hy, 'q', 4, 2); put(2 + hx, 6 + hy, 'h', 1, 1); put(5 + hx, 6 + hy, 'h', 1, 1)
    else: put(2 + hx, 6 + hy, 'q', 4, 1)
    if rope: put(0 + hx, 6 + hy, 'r', 3, 1)
    put(8 + hx, 0 + hy, 'a', 1, 1); put(8 + hx, 1 + hy, 'a', 1, 1)          # antena (la bombilla la pinta el código)
    put(10, 7, 'm', 3, 1); put(11, 8, 'l' if eyes else 'o', 1, 1)           # collar metálico con LED
    for x in range(15, 22): put(x, 8, 'd'); put(x, 11, 'd')                 # panel del costado con tornillos
    for y in range(8, 12): put(15, y, 'd'); put(21, y, 'd')
    put(16, 9, 'm'); put(20, 10, 'm')
    for j in range(H):
        for i in range(W):
            if g[j][i] == 'g' and (j - OY + U >= 14 or (i - OX >= 27 and j - OY + U >= 10)) and legs is None: g[j][i] = 'd'
    if legs is None: put(13, 14, 'w', 2, 1); put(7, 15, 'w', 2, 1)
    else:
        for (a, b, c2, d, col) in LEGS[legs]: ground(c2, d, 'w', 2, 1)
    out = [r[:] for r in g]
    for j in range(H):
        for i in range(W):
            if g[j][i] == '.':
                for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    y, x = j + dj, i + di
                    if 0 <= y < H and 0 <= x < W and g[y][x] != '.': out[j][i] = 'k'; break
    return [''.join(r) for r in out], (hx, hy, up)

FR = [dict(), dict(tail=1), dict(tail=2), dict(eyes=False),
      dict(hy=-2, hx=-1, mouth=1, tail=1),                                   # 4 lanza la bola
      dict(hy=3, hx=1, eyes=False),                                          # 5 dormido
      dict(up=5, legs='stand', hy=-1, tail=1),                               # 6 de pie
      dict(up=5, legs='run_a', hy=-1, hx=-1, mouth=1, tail=1),               # 7 corre (patas estiradas)
      dict(up=5, legs='run_b', hy=-1, hx=-1, mouth=1, tail=1),               # 8 corre (patas recogidas)
      dict(up=5, legs='pull', hx=2, hy=1, rope=True, mouth=1),               # 9 tira de la cuerda hacia atrás
      dict(up=5, legs='pull', hx=-1, hy=1, rope=True, mouth=1, tail=1)]      # 10 se lanza hacia delante
imgs = [frame(**f) for f in FR]
ys = [j for r, _ in imgs for j, row in enumerate(r) if row.strip('.')]; xs = [i for r, _ in imgs for row in r for i, c in enumerate(row) if c != '.']
y0, y1, x0, x1 = min(ys), max(ys) + 1, min(xs), max(xs) + 1
mp = {c: chr(97 + i) for i, c in enumerate(LET)}; mp['.'] = '.'
rows = [[''.join(mp[c] for c in row[x0:x1]) for row in r[y0:y1]] for r, _ in imgs]
meta = [dict(bulb=[8 + OX + hx - x0, OY + hy - up - y0 - 1], mouth=[OX + hx - x0, 6 + OY + hy - up - y0]) for _, (hx, hy, up) in imgs]
data = {'hd': {'pal': [COLS[c] for c in LET], 'rows': rows}, 'meta': meta}
open(OUT, 'w').write('/* generado por tools/build_robodog.py */\n(() => { window.LIMA = window.LIMA || {}; LIMA.ITEMS.robodog = ' + json.dumps(data, separators=(',', ':')) + '; })();\n')
print(len(rows[0][0]), 'x', len(rows[0]), 'hd =', len(rows[0][0]) / 2, 'x', len(rows[0]) / 2, 'lógicos; fotogramas', len(rows))
