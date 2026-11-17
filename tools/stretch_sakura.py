# Alarga la carcasa Sakura: estira la franja de nubes (y 560-700) para bajar los botones. Uso: python3 tools/stretch_sakura.py ORIGINAL.webp SALIDA.webp
import sys
from PIL import Image
src = Image.open(sys.argv[1]).convert('RGB'); W, H = src.size
A, B, D = 560, 700, 80                       # franja que se estira y píxeles que se añaden
top = src.crop((0, 0, W, A)); mid = src.crop((0, A, W, B)).resize((W, B - A + D), Image.BICUBIC); bot = src.crop((0, B, W, H))
out = Image.new('RGB', (W, H + D)); out.paste(top, (0, 0)); out.paste(mid, (0, A)); out.paste(bot, (0, B + D))
out.save(sys.argv[2], 'WEBP', quality=88, method=6); print(out.size)
