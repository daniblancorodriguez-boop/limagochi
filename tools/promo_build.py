#!/usr/bin/env python3
"""Monta el borrador del vídeo promocional (sin música) con los clips de tools/record_clips.js.
Uso: python3 tools/promo_build.py CLIPS_DIR SALIDA.mp4"""
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont
clips, out = sys.argv[1], sys.argv[2]
FB = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
FR = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'
if not os.path.exists(FR): FR = FB
# (clip, inicio, duración, título, subtítulo)
SEG = [
 ('01_huevo', 1.2, 4.2, 'Todo empieza con un huevo', ''),
 ('02_bebe', 0.4, 2.2, 'Nace tu Limagotchi', ''),
 ('03_creciendo', 1.0, 4.0, 'Crece según cómo lo cuides', ''),
 ('04_caca', 0.6, 3.6, '¡A limpiar la caca!', ''),
 ('05_comiendo', 0.6, 4.0, 'Tú eliges qué come', ''),
 ('06_pescando', 1.0, 4.4, 'Pesca, juega y gana monedas', ''),
 ('07_jugando', 0.8, 3.0, 'Minijuegos', ''),
 ('08_enfermo', 0.4, 3.6, 'Si enferma… ¡a curarlo!', ''),
 ('09_javigotchi', 0.4, 3.2, 'JAVIGOTCHI', 'Tu Limagotchi con tu nombre'),
 ('10_bobbygotchi', 0.4, 3.2, 'BOBBYGOTCHI', 'Hasta tu perro puede ser uno'),
 ('11_gatigotchi', 0.4, 3.2, 'GATIGOTCHI', '…o tu gato'),
 ('12_javigotchi_dragonball', 1.6, 4.0, 'Con tu carcasa favorita', 'Dragon Ball'),
 ('13_bobbygotchi_navidad', 0.2, 3.4, 'Fondos interactivos', 'Navidad'),
 ('14_gatigotchi_pokemon', 1.9, 4.2, 'Intro y sonido propios', 'Pokémon'),
 ('15_carcasas', 0.0, 7.5, 'Carcasas y fondos animados', 'Naruto · Pokémon · Dragon Ball · Pesadilla'),
]
os.makedirs('/tmp/pb', exist_ok=True)
def card(i, title, sub):
    im = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    ft, fs = ImageFont.truetype(FB, 62), ImageFont.truetype(FR, 38)
    lines = [(title, ft)] + ([(sub, fs)] if sub else [])
    ws = [d.textlength(t, font=f) for t, f in lines]; w = max(ws) + 90; h = 100 + (60 if sub else 0)
    x0, y0 = (1080 - w) / 2, 1752
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 36, fill=(10, 14, 28, 205))
    y = y0 + 22
    for (t, f), tw in zip(lines, ws):
        d.text(((1080 - tw) / 2, y), t, font=f, fill=(255, 255, 255, 255)); y += 78 if f is ft else 0
    p = f'/tmp/pb/c{i}.png'; im.save(p); return p
def end_card():
    im = Image.new('RGB', (1080, 1920), (18, 22, 38)); d = ImageDraw.Draw(im)
    f1, f2, f3 = ImageFont.truetype(FB, 96), ImageFont.truetype(FB, 54), ImageFont.truetype(FR, 44)
    for t, f, y, col in [('Limagotchi', f1, 640, (190, 235, 110)), ('personalizados', f2, 770, (255, 255, 255)),
                         ('para regalar en Navidad', f3, 880, (230, 230, 240)), ('Tu nombre, tus fondos, tu carcasa', f3, 1010, (255, 216, 77)),
                         ('y un manual hecho a medida', f3, 1075, (255, 216, 77))]:
        d.text(((1080 - d.textlength(t, font=f)) / 2, y), t, font=f, fill=col)
    im.save('/tmp/pb/end.png')
parts = []
for i, (c, ss, dur, t, s) in enumerate(SEG):
    ov = card(i, t, s); o = f'/tmp/pb/s{i}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-t', str(dur), '-i', os.path.join(clips, c + '.mp4'), '-i', ov,
        '-filter_complex', '[0][1]overlay=0:0,fade=t=in:d=0.15,fade=t=out:st=%.2f:d=0.2,format=yuv420p' % (dur - 0.2), '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-an', o], check=True)
    parts.append(o)
end_card()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-t', '3', '-i', '/tmp/pb/end.png', '-vf', 'fade=t=in:d=0.3,format=yuv420p', '-r', '30', '-c:v', 'libx264', '-crf', '18', '/tmp/pb/end.mp4'], check=True)
parts.append('/tmp/pb/end.mp4')
open('/tmp/pb/list.txt', 'w').write(''.join(f"file '{p}'\n" for p in parts))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', '/tmp/pb/list.txt', '-c', 'copy', out], check=True)
print('listo', out)
