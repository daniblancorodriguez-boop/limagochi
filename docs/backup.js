/* ==========================================================================
   LIMAGOCHI · ajustes, copia de seguridad (exportar/importar) e instalación
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const A = () => L.api;

/* ---------------------------- instalación (PWA) ------------------------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
window.addEventListener('appinstalled', () => { installEvt = null; A() && A().setMsg('📲 ¡Instalada!'); });
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

async function install() {
  const a = A();
  if (standalone()) { a.setMsg('Ya estás usando la app instalada', 3500); return; }
  if (installEvt) {
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* */ }
    installEvt = null; return;
  }
  a.setMsg(isIOS() ? 'En Safari: Compartir → «Añadir a pantalla de inicio»' : 'Menú del navegador → «Instalar app» (necesita http(s))', 6000);
}

/* --------------------------- exportar / importar ------------------------- */
const rd = k => { try { return localStorage.getItem(k); } catch { return null; } };

function buildBackup() {
  return {
    app: 'limagochi', format: 1, exported: new Date().toISOString(),
    save: JSON.parse(A().getSave()),
    settings: L.settings.all(),
    lcd: rd('limagochi.lcd') === '1',
    shell: rd('limagochi.shell') || null
  };
}

function fileName() { return `limagochi-${new Date().toISOString().slice(0, 10)}.json`; }

function exportFile() {
  const a = A();
  try {
    a.save();
    const blob = new Blob([JSON.stringify(buildBackup(), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName();
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    a.setMsg('💾 Copia guardada: ' + fileName(), 4500);
  } catch { a.setMsg('No se pudo exportar'); }
}

async function shareFile() {
  const a = A();
  try {
    a.save();
    const file = new File([JSON.stringify(buildBackup(), null, 1)], fileName(), { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Copia de Limagochi' });
    } else exportFile();
  } catch (e) { if (e && e.name !== 'AbortError') exportFile(); }
}

/** Valida y aplica una copia. Devuelve {ok, msg}. */
function importText(text) {
  let d;
  try { d = JSON.parse(text); } catch { return { ok: false, msg: 'El archivo no es válido' }; }
  if (!d || d.app !== 'limagochi' || !d.save || typeof d.save !== 'object') return { ok: false, msg: 'No parece una copia de Limagochi' };
  if (d.save.v !== 1 && d.save.v !== 2) return { ok: false, msg: 'Versión de partida desconocida' };
  if (typeof d.save.stage !== 'string') return { ok: false, msg: 'La partida está dañada' };
  if (!A().replaceState(d.save)) return { ok: false, msg: 'No se pudo cargar la partida' };
  if (d.settings) L.settings.replace(d.settings);
  try {
    localStorage.setItem('limagochi.lcd', d.lcd ? '1' : '0');
    if (typeof d.shell === 'string' && /^#[0-9a-f]{6}$/i.test(d.shell)) { localStorage.setItem('limagochi.shell', d.shell); document.documentElement.style.setProperty('--shell', d.shell); }
  } catch { /* */ }
  A().setLcd(!!d.lcd);
  return { ok: true, msg: '✅ Partida importada' };
}

function importFile() {
  const a = A();
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    if (f.size > 2e6) { a.setMsg('Archivo demasiado grande'); return; }
    if (!confirm('Esto reemplazará tu partida actual. ¿Continuar?')) return;
    const r = importText(await f.text());
    a.setMsg(r.msg, 4000);
    if (r.ok) { a.closePanel(); a.render(); }
  });
  inp.click();
}

/* -------------------------------- ajustes -------------------------------- */
const hh = h => String(h).padStart(2, '0') + ':00';
/** El descanso dura como mucho 8 h: si se pasa, se acorta por el final. */
function fixRest() {
  const f = L.settings.get('restFrom'), len = (L.settings.get('restTo') - f + 24) % 24;
  if (len > 8) L.settings.set('restTo', (f + 8) % 24);
}
function openSettings(back) {
  const a = A();
  const onoff = v => (v ? 'SÍ' : 'NO');
  const push = L.push;
  const nodes = [
    a.p('⚙️ Ajustes'),
    a.btn(`🌙 Ciclo día/noche: ${onoff(L.settings.get('cycle'))}`, () => { L.settings.set('cycle', !L.settings.get('cycle')); a.render(); openSettings(back); }),
    a.btn(`🖤 Iconos negros: ${onoff(L.settings.get('mono'))}`, () => { L.settings.set('mono', !L.settings.get('mono')); a.paintIcons(); openSettings(back); }),
    a.btn(`🔲 Píxel fino: ${onoff(L.settings.get('fine'))}`, () => { L.settings.set('fine', !L.settings.get('fine')); a.setFine(L.settings.get('fine')); openSettings(back); }),
    a.btn(`😴 Descanso del dueño: ${onoff(L.settings.get('rest'))}`, () => { L.settings.set('rest', !L.settings.get('rest')); a.render(); openSettings(back); }),
    ...(L.settings.get('rest') ? [a.row(
      a.btn(`Desde ${hh(L.settings.get('restFrom'))}`, () => { const f = (L.settings.get('restFrom') + 1) % 24; L.settings.set('restFrom', f); fixRest(); openSettings(back); }),
      a.btn(`Hasta ${hh(L.settings.get('restTo'))}`, () => { L.settings.set('restTo', (L.settings.get('restTo') + 1) % 24); fixRest(); openSettings(back); })
    ), a.p('Durante el descanso (máx. 8 h) las barras bajan más despacio y no hay cacas, enfermedades ni errores.')] : []),
    a.btn(`🎃 Eventos de temporada: ${onoff(L.settings.get('events'))}`, () => { L.settings.set('events', !L.settings.get('events')); a.render(); openSettings(back); })
  ];
  if (push && push.supported()) {
    nodes.push(a.btn(`📡 Avisos con la app cerrada: ${onoff(push.on())}`, async () => {
      const r = await push.toggle();
      a.setMsg(r.msg, 5000); openSettings(back);
    }));
    if (push.on()) nodes.push(a.btn('🔔 Enviar aviso de prueba', async () => { const r = await push.test(); a.setMsg(r.msg, 4500); }));
  } else nodes.push(a.p('📡 Avisos con app cerrada: no disponibles aquí (necesita https y servidor)'));
  nodes.push(
    a.btn(`🏖️ Vacaciones${a.S().pause ? ' (volver)' : ' (detener el tiempo)'}`, () => { a.closePanel(); a.startVacation(); }),
    a.btn(standalone() ? '📲 App instalada ✓' : '📲 Instalar como app', install, '', standalone()),
    a.p('Copia de seguridad'),
    a.row(a.btn('💾 Exportar', exportFile), a.btn('📤 Compartir', shareFile)),
    a.btn('📥 Importar partida', importFile),
    a.btn('Atrás', back || a.closePanel, 'ghost')
  );
  a.openPanel(nodes, { full: true });
}

L.backup = { openSettings, exportFile, importText, buildBackup, install };
})();
