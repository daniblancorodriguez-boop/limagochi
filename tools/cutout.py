# Quita el fondo oscuro de las fotos de las carcasas (docs/skins/*.webp) y las guarda con transparencia.
# Uso: python3 tools/cutout.py ORIGEN_DIR DESTINO_DIR   (ORIGEN con los .webp de docs/skins)
import sys, os, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
def cut(im, mxmax=78, sat=32):
    a = np.asarray(im.convert('RGB')).astype(int)
    mx = a.max(2); mn = a.min(2)
    bg = (mx < mxmax) & ((mx - mn) < sat)
    lab, n = ndi.label(bg)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    mask = np.isin(lab, list(edge))
    keep = ~mask
    keep = ndi.binary_opening(keep, iterations=2)
    lab2, n2 = ndi.label(keep)
    if n2 > 1:
        sizes = ndi.sum(keep, lab2, range(1, n2 + 1)); keep = lab2 == (1 + int(np.argmax(sizes)))
    keep = ndi.binary_fill_holes(keep)
    al = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
    out = im.convert('RGB'); out.putalpha(al)
    return out, keep.mean()
PARAMS = {'sakura.webp': (50, 9), 'naruto.webp': (66, 30)}      # la ovalada es azul marino oscuro: el fondo es gris puro
for f in sorted(os.listdir(src)):
    if not f.endswith('.webp'): continue
    out, frac = cut(Image.open(os.path.join(src, f)), *PARAMS.get(f, (78, 32)))
    out.save(os.path.join(dst, f), 'WEBP', quality=85, method=6)
    print(f, round(frac, 3), os.path.getsize(os.path.join(dst, f)) // 1024, 'KB')
