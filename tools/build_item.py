# Añade o sustituye un mueble hd en docs/items.js a partir de una imagen con fondo magenta.
# Uso: python3 tools/build_item.py ID imagen.png COLUMNAS_HD [COLORES] [ITEMS_JS]
import sys, json
import numpy as np
from PIL import Image, ImageFilter
ID, SRC, COLS = sys.argv[1], sys.argv[2], int(sys.argv[3]); NC = int(sys.argv[4]) if len(sys.argv) > 4 else 30
JS = sys.argv[5] if len(sys.argv) > 5 else 'docs/items.js'
im = Image.open(SRC).convert('RGB'); a = np.array(im).astype(int)
bg = (a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 120) & (abs(a[..., 0] - a[..., 2]) < 90)
m = np.array(Image.fromarray((~bg * 255).astype('uint8')).filter(ImageFilter.MinFilter(3))) > 127
ys, xs = np.where(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
rows = round(COLS * (y1 - y0) / (x1 - x0)); mm = m[y0:y1, x0:x1].astype(float)
prem = Image.fromarray((a[y0:y1, x0:x1] * mm[..., None]).astype('uint8')).resize((COLS, rows), Image.LANCZOS)
al = np.array(Image.fromarray((mm * 255).astype('uint8')).resize((COLS, rows), Image.LANCZOS)).astype(float) / 255
rgb = np.where(al[..., None] > 0.01, np.array(prem).astype(float) / np.maximum(al[..., None], 0.01), 0).clip(0, 255).astype('uint8')
q = Image.fromarray(rgb).quantize(NC, method=Image.MEDIANCUT, dither=Image.NONE); pal = q.getpalette()[:NC * 3]; idx = np.array(q)
vis = al > 0.5; used = sorted({int(i) for i in idx[vis]}); rm = {c: i for i, c in enumerate(used)}
colors = ['#%02x%02x%02x' % tuple(pal[c * 3:c * 3 + 3]) for c in used]
grid = [''.join(chr(97 + rm[int(idx[j, i])]) if vis[j, i] else '.' for i in range(COLS)) for j in range(rows)]
s = open(JS).read(); i = s.index('LIMA.ITEMS = ') + len('LIMA.ITEMS = ')
d, end = json.JSONDecoder().raw_decode(s[i:]); d[ID] = {'hd': {'pal': colors, 'rows': [grid]}}
open(JS, 'w').write(s[:i] + json.dumps(d, separators=(',', ':')) + s[i + end:])
print(ID, COLS, 'x', rows, 'hd =', COLS / 2, 'x', rows / 2, 'lógicos;', len(colors), 'colores')
