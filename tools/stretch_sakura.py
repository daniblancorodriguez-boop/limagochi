# Alarga la carcasa Sakura (800x1130 -> 800x1320): estira la zona de la pantalla y baja los botones.
# Uso: python3 tools/stretch_sakura.py ORIGINAL.webp SALIDA.webp   (después: tools/cutout.py para la transparencia)
import sys
from PIL import Image
src = Image.open(sys.argv[1]).convert('RGB'); W, H = src.size
D, d1 = 190, 40
partes = [src.crop((0, 0, W, 200)), src.crop((0, 200, W, 240)).resize((W, 40 + d1), Image.BICUBIC),
          src.crop((0, 240, W, 700)).resize((W, 460 + D - d1), Image.BICUBIC), src.crop((0, 700, W, H))]
out = Image.new('RGB', (W, H + D)); y = 0
for p in partes: out.paste(p, (0, y)); y += p.height
out.save(sys.argv[2], 'WEBP', quality=88, method=6); print(out.size)
