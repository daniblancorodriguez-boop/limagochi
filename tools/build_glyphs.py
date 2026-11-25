# Genera los iconos propios de docs/ico/g1..g9.png y docs/glyphs.js a partir de las 9 hojas de Nano Banana.
# Uso: python3 tools/build_glyphs.py CARPETA   (hoja1.jpg … hoja9.jpg: 4x4 celdas, negro sobre blanco)
# Cada celda se recorta, el blanco pasa a transparente (el color intenso cuenta como negro) y se centra en 96x96.
import sys, os, json
import numpy as np
from PIL import Image
SRC = sys.argv[1]; ONLY = int(sys.argv[2]) if len(sys.argv) > 2 else 0       # ONLY = N: solo procesa la hoja N y la añade al mapa existente (las hojas antiguas ya no hacen falta)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs')
# orden de cada hoja (id, emoji que sustituye); '' = celda vacía
SHEETS = [
 [('coin','🪙'),('star','⭐🌟'),('gift','🎁'),('medal','🏅'),('crown','👑'),('check','✅'),('lock','🔒'),('warn','⚠'),('siren','🚨'),('excl','❗'),('sofa','🛋'),('bed','🛏'),('tree','🌳'),('palette','🎨'),('pan','🍳'),('beach','🏖')],
 [('bus','🚌'),('cloud','☁'),('disk','💾'),('install','📲'),('upload','📤'),('download','📥'),('clip','📋'),('bell','🔔'),('bellx','🔕'),('spk','🔊'),('spkx','🔇'),('grid','▦'),('sun','☀'),('moon','🌙'),('antenna','📡'),('poop','💩')],
 [('sick','🤒'),('nausea','🤢'),('sneeze','🤧'),('dizzy','😵'),('angry','😠'),('tired','😩'),('sleep','😴'),('broken','💔'),('baby','👶'),('child','🧒'),('old','👴'),('chick','🐣'),('brain','🧠'),('basket','🧺'),('shades','😎'),('lolli','🍭')],
 [('tv','📺'),('teddy','🧸'),('plant','🪴'),('frame','🖼'),('ball','⚽'),('lounger','🪑'),('rug','🟣'),('can','🫗'),('pool','🏊'),('tulips','🌷'),('plot','🌿'),('appletree','🍏'),('w_dots','🔹'),('w_clouds','⛅'),('w_stars','🌠'),('w_bricks','🧱')],
 [('rice','🍚'),('salad','🥗'),('lime','🍈'),('pasta','🍝'),('fish','🐟'),('lentils','🫘'),('soup','🍲'),('chicken','🍗'),('hotdog','🌭'),('pizza','🍕'),('nuggets','🥡'),('fries','🍟'),('candy','🍬'),('cookie','🍪'),('cake','🍰'),('strawberry','🍓')],
 [('apple','🍎'),('carrot','🥕'),('tomato','🍅'),('lettuce','🥬'),('honey','🍯'),('sushi','🍣'),('paella','🥘'),('limecake','🎂'),('applepie','🥧'),('icecream','🍦'),('nougat','🍫'),('watermelon','🍉'),('cupcake','🧁'),('turkey','🦃'),('coffee','☕'),('milk','🥛')],
 [('fridge','🧊'),('plate','🍽'),('steak','🍖'),('quill','✍'),('notes','🎵🎼'),('rod','🎣'),('dumbbell','🏋'),('sprout','🌱'),('piano','🎹'),('chartup','📈'),('chartdown','📉'),('books','📚'),('slot','🎰'),('ferris','🎡'),('runner','🏃'),('fist','✊')],
 [('dart','🎯'),('stopwatch','⏱'),('jump','🦘'),('dance','💃'),('spin','🌀'),('cartwheel','🤸'),('meditate','🧘'),('yawn','🥱'),('wave','👋'),('clap','👏'),('kiss','😘'),('skull','💀'),('handup','🙋'),('hug','🤗'),('greenheart','💚'),('dice','🎲')],
 [('pumpkin','🎃'),('fir','🎄'),('ribbonheart','💝'),('blossom','🌸'),('ghost','👻'),('bat','🦇'),('rose','🌹'),('daisy','🌼'),('shell','🐚'),('bouquet','💐'),('rainbow','🌈'),('comet','☄'),('bird','🐦'),('dove','🕊'),('drop','💧'),('','')],
 [('blackheart','🖤'),('gridsq','🔲'),('mushroom','🍄'),('pepper','🌶'),('grapes','🍇'),('pumpkin2',''),('sunflower','🌻'),('moonflower','🏵'),('fir2',''),('arrowheart','💘'),('tulip2',''),('sunglasses',''),('ghost2',''),('seedbag','🌰'),('diamond','💎'),('gift2','')],
]
# iconos que ya existían (docs/ico/NOMBRE.png) y los emojis que ahora también los usan en cualquier texto
OLD = {'feed':'🍔','play':'🎮','heal':'💊','clean':'🧹','shower':'🚿','light':'💡','scold':'📢','teach':'🎤','shop':'🛒','status':'📊','hunger':'🍴','happy':'😊','energy':'⚡','clean2':'🛁','voice':'🎓','logros':'🏆','album':'📖','bugs':'🦋','mail':'✉','visit':'🤝','guide':'❓','settings':'⚙','history':'📜','egg':'🥚','school':'🏫','work':'💼'}
def alpha(cell):
    a = np.array(cell.convert('RGB')).astype(float)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    mx, mn = a.max(2), a.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    al = np.clip((235 - lum) / 195, 0, 1)
    al = np.where((sat > 0.2) & (lum >= 100), 0, al)                              # relleno de color (p. ej. la cara verde) = transparente
    return al
def norm(cell, box=84):
    al = alpha(cell); ys, xs = np.where(al > 0.08)
    if not len(ys): return None
    al = al[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = al.shape; k = box / max(h, w)
    im = Image.fromarray((al * 255).astype('uint8')).resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    cv = Image.new('L', (96, 96), 0); cv.paste(im, ((96 - im.width) // 2, (96 - im.height) // 2)); return cv
emo, sheet = {}, {}
MAP = os.path.join(OUT, 'glyphs_map.js')
if ONLY: emo = json.loads(open(MAP, encoding='utf-8').read().split('LIMA.GLYPHS = ', 1)[1].rstrip().rstrip(';'))['sheet']
for n, cells in enumerate(SHEETS, 1):
    if ONLY and n != ONLY: continue
    p = None
    for ext in ('jpg', 'png', 'jpeg'):
        q = os.path.join(SRC, f'hoja{n}.{ext}')
        if os.path.exists(q): p = q
    im = Image.open(p).convert('RGB'); cw = im.width // 4; ch = im.height // 4
    out = Image.new('RGBA', (384, 384), (0, 0, 0, 0))
    for i, (gid, chars) in enumerate(cells):
        if not gid: continue
        x, y = (i % 4) * cw, (i // 4) * ch
        m = norm(im.crop((x + 6, y + 6, x + cw - 6, y + ch - 6)))
        if m is None: print('vacío', n, gid); continue
        rgba = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); rgba.putalpha(m)
        out.paste(rgba, ((i % 4) * 96, (i // 4) * 96))
        for c in chars: emo[c] = ['g%d' % n, i % 4, i // 4]
        sheet[gid] = ['g%d' % n, i % 4, i // 4]
    out.save(os.path.join(OUT, 'ico', f'g{n}.png'), optimize=True)
old = {c: n for n, c in OLD.items()}
if ONLY: old = json.loads(open(MAP, encoding='utf-8').read().split('LIMA.GLYPHS = ', 1)[1].rstrip().rstrip(';'))['old']
js = '/* LIMAGOCHI · iconos propios (generado por tools/build_glyphs.py): emoji -> icono. */\nLIMA.GLYPHS = ' + json.dumps({'sheet': emo, 'old': old}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(OUT, 'glyphs_map.js'), 'w', encoding='utf-8').write(js)
print(len(emo), 'emojis ->', len(sheet), 'iconos nuevos;', len(old), 'antiguos')
