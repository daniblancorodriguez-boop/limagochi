# Crea docs/prueba-robot/: copia jugable del juego para probar Lima robot sin tocar la partida real.
# Guarda en otras claves de localStorage ('prueba.*'), no registra service worker ni avisos y entrega a Lima robot al arrancar.
# Uso: python3 tools/make_preview.py   (borrar la carpeta cuando ya no haga falta: rm -r docs/prueba-robot)
import os, re, shutil
SRC, DST = 'docs', 'docs/prueba-robot'
shutil.rmtree(DST, ignore_errors=True)
shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns('prueba-robot', 'sw.js'))
for f in os.listdir(DST):
    p = os.path.join(DST, f)
    if f.endswith('.js'):
        s = open(p).read().replace("'limagochi.", "'prueba.")
        if f == 'notify.js': s = s.replace("if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {", "if (false) {")
        open(p, 'w').write(s)
open(os.path.join(DST, 'prueba.js'), 'w').write("""/* Solo para la copia de prueba: entrega a Lima robot y lleva a la mascota al cuarto. */
(() => {
  const go = () => {
    if (!window.LIMA || !LIMA.api || !LIMA.robodog) return setTimeout(go, 200);
    const s = LIMA.api.S();
    ['bed', 'lamp', 'picture', 'plush', 'sofa', 'tv', 'rug', 'plant', 'robodog'].forEach(i => { if (!s.owned.includes(i)) s.owned.push(i); });
    let first = true; try { first = !localStorage.getItem('prueba.init'); localStorage.setItem('prueba.init', '1'); } catch { /* */ }
    if (first) { s.stage = 'adult'; s.energy = 90; s.happy = 60; s.hunger = 80; s.lp = 200; s.meta.first.on = false; s.room.where = 'bedroom'; }
    LIMA.api.save(); LIMA.api.closePanel(); LIMA.api.render();
    LIMA.api.setMsg('🧪 PRUEBA: toca a Lima robot para jugar', 8000);
  };
  go();
})();
""")
h = open(os.path.join(DST, 'index.html')).read()
h = h.replace('<script src="game.js"></script>', '<script src="game.js"></script>\n  <script src="prueba.js"></script>')
h = re.sub(r'<title>.*?</title>', '<title>🧪 PRUEBA Lima robot</title>', h)
open(os.path.join(DST, 'index.html'), 'w').write(h)
print('copia de prueba lista en', DST)
