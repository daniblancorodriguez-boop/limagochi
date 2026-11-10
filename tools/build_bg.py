# Genera los fondos de docs/bg/ a partir de las imágenes de Nano Banana (1024x765).
# Uso: python3 tools/build_bg.py CARPETA_CON_LOS_PNG   (salon, cuarto, estudio, cocina, jardin, playa)
# Cada fondo se reduce a 96x72 (la pantalla del juego). Los exteriores (jardin, playa) además
# se guardan con el cielo transparente (*_k.png): al atardecer y de noche manda el cielo del juego.
import sys, os
import numpy as np
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'bg')
os.makedirs(OUT, exist_ok=True)
# franjas (origen 0..765 -> destino 0..72) para alinear suelo y valla con los muebles del juego
BANDS = {
    'cuarto':  [(0, 660, 0, 50), (660, 705, 50, 54), (705, 765, 54, 72)],
    'salon':   [(0, 705, 0, 50), (705, 725, 50, 53), (725, 765, 53, 72)],        # suelo más alto (hasta el 70 % de la pantalla)
    'estudio': [(0, 500, 0, 42), (500, 765, 42, 72)],
    'cocina':  [(0, 570, 0, 45), (570, 612, 45, 49), (612, 765, 49, 72)],
    'jardin':  [(0, 345, 0, 29), (345, 525, 29, 38), (525, 765, 38, 72)],
}
def bake(name):
    im = Image.open(os.path.join(SRC, name + '.png')).convert('RGB')
    k = im.height / 765
    out = Image.new('RGB', (96, 72))
    for a, b, c, d in BANDS.get(name, [(0, 765, 0, 72)]):
        part = im.crop((0, round(a * k), im.width, round(b * k))).resize((96, d - c), Image.LANCZOS)
        out.paste(part, (0, c))
    return out
for n in ['salon', 'cuarto', 'estudio', 'cocina', 'jardin', 'playa']:
    im = bake(n); im.save(os.path.join(OUT, n + '.png'), optimize=True)
    if n in ('jardin', 'playa'):
        a = np.array(im).astype(int); al = np.full((72, 96), 255)
        if n == 'jardin':
            al[(a[..., 2] > a[..., 1] - 20) & (a[..., 2] > a[..., 0] + 10)] = 0       # cielo azul -> transparente
        else:
            al[:36] = 0                                                                  # playa: todo lo que está sobre el mar
        rgba = np.dstack([a.astype('uint8'), al.astype('uint8')])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, n + '_k.png'), optimize=True)
    print(n, 'ok')
