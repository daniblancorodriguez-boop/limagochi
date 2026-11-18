# Crea docs/prueba/: copia jugable con todas las carcasas desbloqueadas, partida aparte ('pprueba.*') y sin service worker.
# Uso: python3 tools/make_preview.py   (borrar luego: rm -r docs/prueba)
import os, shutil
SRC, DST = 'docs', 'docs/prueba'
shutil.rmtree(DST, ignore_errors=True)
shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns('prueba', 'sw.js'))
for f in os.listdir(DST):
    p = os.path.join(DST, f)
    if f.endswith('.js'):
        s = open(p).read().replace("'limagochi.", "'pprueba.")
        if f == 'notify.js': s = s.replace("if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {", "if (false) {")
        open(p, 'w').write(s)
open(os.path.join(DST, 'prueba.js'), 'w').write("""/* Solo copia de prueba: desbloquea las carcasas y da monedas. */
(() => {
  const go = () => {
    if (!window.LIMA || !LIMA.api || !LIMA.skins) return setTimeout(go, 200);
    const s = LIMA.api.S();
    LIMA.skins.list.forEach(k => { if (!s.owned.includes('skin_' + k.id)) s.owned.push('skin_' + k.id); });
    let first = true; try { first = !localStorage.getItem('pprueba.init'); localStorage.setItem('pprueba.init', '1'); } catch { /* */ }
    if (first) { s.stage = 'adult'; s.energy = 90; s.happy = 70; s.hunger = 80; s.lp = 500; s.meta.first.on = false; ['bed', 'lamp', 'picture', 'sofa', 'tv', 'rug', 'plant'].forEach(i => { if (!s.owned.includes(i)) s.owned.push(i); }); }
    LIMA.api.save(); LIMA.api.closePanel(); LIMA.api.render();
    LIMA.api.setMsg('🧪 PRUEBA: carcasas en ⚙️ Ajustes → Cambio de carcasa', 7000);
  };
  go();
})();
""")
h = open(os.path.join(DST, 'index.html')).read()
h = h.replace('<script src="game.js"></script>', '<script src="game.js"></script>\n  <script src="prueba.js"></script>').replace('<title>Limagochi</title>', '<title>🧪 PRUEBA Limagochi</title>')
open(os.path.join(DST, 'index.html'), 'w').write(h)
print('copia de prueba en', DST)
