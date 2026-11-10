# Regenera el objeto «tv» de docs/items.js a partir de las dos imágenes (apagada y encendida, fondo magenta).
# Uso: python3 tools/build_tv.py tv_off.png tv_on.png
import sys, json
import numpy as np
from PIL import Image, ImageFilter
OFF, ON = sys.argv[1], sys.argv[2]
def load(p):
    return Image.open(p).convert('RGB')
def mask(im):
    a = np.array(im).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (r > 150) & (b > 150) & (g < 120) & (abs(r - b) < 90)
    m = Image.fromarray((~bg * 255).astype('uint8')).filter(ImageFilter.MinFilter(5))   # quita el borde mezclado con magenta
    return np.array(m) > 127
ims = [load(OFF), load(ON)]; ms = [mask(i) for i in ims]
union = ms[0] | ms[1]; ys, xs = np.where(union); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
wd = union.sum(1)
while wd[y1 - 1] < 0.9 * wd.max(): y1 -= 1          # sin peana: solo el marco de la tele
print('alto recortado', y1 - y0)
def sprite(cols, ncol):
    rows = round(cols * (y1 - y0) / (x1 - x0))
    out = []
    for im, m in zip(ims, ms):
        a = np.array(im).astype(float)[y0:y1, x0:x1]; mm = m[y0:y1, x0:x1].astype(float)
        # media ponderada por la máscara para que el magenta no se mezcle
        prem = Image.fromarray((a * mm[..., None]).astype('uint8')).resize((cols, rows), Image.LANCZOS)
        al = Image.fromarray((mm * 255).astype('uint8')).resize((cols, rows), Image.LANCZOS)
        pa = np.array(prem).astype(float); aa = np.array(al).astype(float) / 255
        rgb = np.where(aa[..., None] > 0.01, pa / np.maximum(aa[..., None], 0.01), 0).clip(0, 255).astype('uint8')
        out.append((rgb, aa > 0.5))
    both = np.concatenate([o[0] for o in out], 0)
    pimg = Image.fromarray(both).quantize(ncol, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = pimg.getpalette()[:ncol * 3]; idx = np.array(pimg)
    used = sorted({int(i) for k, o in enumerate(out) for i in idx[k * rows:(k + 1) * rows][o[1]]})
    remap = {c: i for i, c in enumerate(used)}
    colors = ['#%02x%02x%02x' % tuple(pal[c * 3:c * 3 + 3]) for c in used]
    vr = []
    for k, o in enumerate(out):
        blk = idx[k * rows:(k + 1) * rows]
        vr.append([''.join(chr(97 + remap[int(blk[j, i])]) if o[1][j, i] else '.' for i in range(cols)) for j in range(rows)])
    return {'pal': colors, 'rows': vr}
tv = {'sm': sprite(14, 20), 'lg': sprite(36, 26), 'hd': sprite(42, 32)}
s = open('docs/items.js').read(); i = s.index('LIMA.ITEMS = ') + len('LIMA.ITEMS = ')
d, end = json.JSONDecoder().raw_decode(s[i:]); d['tv'] = tv
open('docs/items.js', 'w').write(s[:i] + json.dumps(d, separators=(',', ':')) + s[i + end:])
print({k: (len(v['rows'][0]), len(v['rows'][0][0]), len(v['pal'])) for k, v in tv.items()})
