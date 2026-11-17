# Crea docs/prueba-fondos/: copia jugable con carcasas sin fondo y fondo dinámico por sala y hora, sin tocar la partida real.
# Guarda en claves 'pfondos.*', no registra service worker ni avisos y desbloquea todas las carcasas.
# Antes: python3 tools/cutout.py docs/skins /tmp/cut   (carcasas con transparencia)
# Uso: python3 tools/make_preview_fondos.py /tmp/cut   (borrar luego: rm -r docs/prueba-fondos)
import os, re, shutil, subprocess, sys
CUT = sys.argv[1]
SRC, DST = 'docs', 'docs/prueba-fondos'
shutil.rmtree(DST, ignore_errors=True)
shutil.copytree(SRC, DST, ignore=shutil.ignore_patterns('prueba-robot', 'prueba-fondos', 'sw.js'))
for f in os.listdir(CUT):
    if f.endswith('.webp'): shutil.copy(os.path.join(CUT, f), os.path.join(DST, 'skins', f))
for f in os.listdir(DST):
    p = os.path.join(DST, f)
    if f.endswith('.js'):
        s = open(p).read().replace("'limagochi.", "'pfondos.")
        if f == 'notify.js': s = s.replace("if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {", "if (false) {")
        if f == 'backup.js':
            s = s.replace("    a.btn('🐚 Cambio de carcasa ›'", "    a.btn(`🌗 Fondo dinámico: ${L.fondos.on() ? 'SÍ' : 'NO'}`, () => { L.fondos.toggle(); openSettings(back); }),\n    a.btn('🐚 Cambio de carcasa ›'", 1)
        open(p, 'w').write(s)
shutil.copy('tools/fondos/fondos.js', os.path.join(DST, 'fondos.js'))
open(os.path.join(DST, 'fondos.js'), 'w').write(open('tools/fondos/fondos.js').read().replace("'limagochi.", "'pfondos."))
css = open(os.path.join(DST, 'style.css')).read() + '\n' + open('tools/fondos/fondos.css').read() + '\n' + open('tools/fondos/navidad.css').read()
open(os.path.join(DST, 'style.css'), 'w').write(css)
shutil.copy('tools/fondos/navidad.js', os.path.join(DST, 'navidad.js'))
subprocess.run(['python3', 'tools/make_navidad_bgs.py', os.path.join(DST, 'bg')], check=True)
g = open(os.path.join(DST, 'game.js')).read()
g = g.replace("const bgOk = n =>", "LIMA.BG = BG;\nconst bgOk = n =>", 1)
open(os.path.join(DST, 'game.js'), 'w').write(g)
open(os.path.join(DST, 'prueba.js'), 'w').write("""/* Solo para la copia de prueba: desbloquea carcasas y añade una barra para forzar día/noche. */
(() => {
  const go = () => {
    if (!window.LIMA || !LIMA.api || !LIMA.skins || !LIMA.fondos) return setTimeout(go, 200);
    const s = LIMA.api.S();
    LIMA.skins.list.forEach(k => { if (!s.owned.includes('skin_' + k.id)) s.owned.push('skin_' + k.id); });
    let first = true; try { first = !localStorage.getItem('pfondos.init'); localStorage.setItem('pfondos.init', '1'); } catch { /* */ }
    if (first) { s.stage = 'adult'; s.energy = 90; s.happy = 70; s.hunger = 80; s.lp = 500; s.meta.first.on = false; ['bed','lamp','picture','sofa','tv','rug','plant'].forEach(i => { if (!s.owned.includes(i)) s.owned.push(i); }); }
    LIMA.api.save(); LIMA.api.closePanel(); LIMA.api.render();
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:6px;left:6px;z-index:99;display:flex;gap:4px;font:12px system-ui';
    [['auto', '🔄 Auto'], ['day', '☀️ Día'], ['night', '🌙 Noche']].forEach(([m, t]) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'padding:6px 9px;border-radius:8px;border:0;background:#fffc;color:#222'; b.onclick = () => LIMA.fondos.force(m); bar.append(b); });
    const rs = document.createElement('button'); rs.textContent = '♻️ Reiniciar'; rs.style.cssText = 'padding:6px 9px;border-radius:8px;border:0;background:#fffc;color:#222';
    rs.onclick = () => { if (confirm('¿Borrar la partida de prueba y empezar de nuevo?')) { Object.keys(localStorage).filter(k => k.startsWith('pfondos.')).forEach(k => localStorage.removeItem(k)); location.reload(); } }; bar.append(rs);
    document.body.append(bar);
    LIMA.api.setMsg('🧪 PRUEBA: carcasas en ⚙️ Ajustes, salas con la flecha; día/noche arriba', 8000);
  };
  go();
})();
""")
h = open(os.path.join(DST, 'index.html')).read()
h = h.replace('<script src="game.js"></script>', '<script src="fondos.js"></script>\n  <script src="game.js"></script>\n  <script src="prueba.js"></script>\n  <script src="navidad.js"></script>')
h = re.sub(r'<title>.*?</title>', '<title>🧪 PRUEBA carcasas y fondos</title>', h)
open(os.path.join(DST, 'index.html'), 'w').write(h)
print('copia de prueba lista en', DST)
