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

/* ------------------------- copia en la nube ------------------------------
   La partida se sube al servidor de avisos bajo un código secreto de 12 letras que solo tú conoces.
   Con ese código se recupera en cualquier móvil. Se sube sola cada 6 h (y al pulsar «Guardar ahora»). */
const CLOUD_EVERY = 6 * 3600e3, ABC = 'abcdefghjkmnpqrstuvwxyz23456789';
const cloudBase = () => String((L.CONFIG && L.CONFIG.pushServer) || '').replace(/\/+$/, '');
const cloudOk = () => !!cloudBase() || location.protocol.startsWith('http');
const newCode = () => { const r = new Uint8Array(12); crypto.getRandomValues(r); return [...r].map(b => ABC[b % ABC.length]).join(''); };
const showCode = c => String(c || '').toUpperCase().replace(/(.{4})(?=.)/g, '$1-');
const cleanCode = t => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const validCode = c => /^[a-hjkmnp-z2-9]{12}$/.test(c);
function devId() {
  let d = rd('limagochi.dev');
  if (!/^[\w-]{6,40}$/.test(d || '')) { const r = new Uint8Array(9); crypto.getRandomValues(r); d = [...r].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 16); try { localStorage.setItem('limagochi.dev', d); } catch { /* */ } }
  return d;
}
async function cloudCall(path, body) {
  const r = await fetch(cloudBase() + path, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch { /* */ }
  return { status: r.status, ...j };
}
const ago = ts => { if (!ts) return 'nunca'; const m = Math.round((Date.now() - ts) / 60000); return m < 2 ? 'ahora mismo' : m < 90 ? `hace ${m} min` : m < 2880 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} días`; };

let cloudBusy = false, cloudNote = '';
/** Sube la partida. Devuelve {ok, msg}. `force` sobrescribe la copia de otro dispositivo. */
async function cloudSave(force) {
  const S = L.settings, code = S.get('cloudCode');
  if (!S.get('cloud') || !validCode(code)) return { ok: false, msg: 'La copia en la nube está desactivada' };
  if (cloudBusy) return { ok: false, msg: 'Ya se está guardando…' };
  cloudBusy = true;
  try {
    A().save();
    const data = JSON.stringify(buildBackup());
    const r = await cloudCall('/api/save/put', { code, dev: devId(), data, force: !!(force || S.get('cloudTake')) });
    if (r.ok) { S.set('cloudAt', r.updated || Date.now()); S.set('cloudTake', false); cloudNote = ''; return { ok: true, msg: '☁️ Copia guardada en la nube' }; }
    if (r.status === 409) { cloudNote = 'otro'; return { ok: false, conflict: true, updated: r.updated, msg: 'Este código lo usa otro dispositivo' }; }
    if (r.status === 429) return { ok: true, msg: '☁️ Ya estaba guardada hace un momento' };
    if (r.status === 503) return { ok: false, msg: 'El servidor está lleno. Usa «Exportar» de momento' };
    return { ok: false, msg: 'No se pudo guardar en la nube' };
  } catch { return { ok: false, msg: 'Sin conexión: no se pudo guardar' }; }
  finally { cloudBusy = false; }
}
/** Subida automática: como mucho cada 6 h, con la app abierta. */
function cloudAuto() {
  const S = L.settings;
  if (!S.get('cloud') || cloudNote === 'otro' || !A() || !A().S()) return;
  if (Date.now() - (S.get('cloudAt') || 0) < CLOUD_EVERY) return;
  cloudSave(false);
}
async function cloudEnable(back) {
  const a = A(), S = L.settings;
  if (!validCode(S.get('cloudCode'))) S.set('cloudCode', newCode());
  S.set('cloud', true);
  a.setMsg('☁️ Guardando…', 2500);
  const r = await cloudSave(false);
  if (!r.ok && !r.conflict) { S.set('cloud', false); a.setMsg(r.msg, 4500); }
  openCloud(back);
}
async function cloudRestore(text, back) {
  const a = A(), S = L.settings, code = cleanCode(text);
  if (!validCode(code)) { a.setMsg('Ese código no es válido (son 12 letras y números)', 4500); return; }
  a.setMsg('☁️ Buscando tu copia…', 2500);
  let r;
  try { r = await cloudCall('/api/save/get', { code }); } catch { a.setMsg('Sin conexión: inténtalo luego', 4000); return; }
  if (r.status === 404) { a.setMsg('No hay ninguna copia con ese código', 4500); return; }
  if (!r.ok || typeof r.data !== 'string') { a.setMsg('No se pudo recuperar la copia', 4000); return; }
  if (!confirm(`Hay una copia de ${new Date(r.updated).toLocaleString('es-ES')}. Reemplazará la partida de este dispositivo. ¿Continuar?`)) return;
  const res = importText(r.data);
  if (res.ok) {                                       // este dispositivo pasa a ser el dueño de la copia
    S.set('cloud', true); S.set('cloudCode', code); S.set('cloudAt', r.updated || Date.now()); S.set('cloudTake', true); cloudNote = '';
    a.closePanel(); a.render();
    a.setMsg('✅ Partida recuperada de la nube', 4500);
  } else a.setMsg(res.msg, 4500);
}
function openCloud(back) {
  const a = A(), S = L.settings, on = !!S.get('cloud'), code = S.get('cloudCode');
  const nodes = [a.p('☁️ Copia en la nube')];
  if (!cloudOk()) nodes.push(a.p('No disponible aquí (necesita conexión con el servidor).'));
  else if (on && validCode(code)) {
    const box = document.createElement('div'); box.className = 'codebox'; box.textContent = showCode(code);
    nodes.push(a.p('Tu código secreto. Apúntalo: con él recuperas la partida en cualquier móvil.'), box,
      a.row(
        a.btn('📋 Copiar código', async () => { try { await navigator.clipboard.writeText(showCode(code)); a.setMsg('Código copiado', 2500); } catch { a.setMsg('No se pudo copiar: apúntalo a mano', 3500); } }),
        a.btn('☁️ Guardar ahora', async () => { const r = await cloudSave(false); a.setMsg(r.msg, 4000); openCloud(back); })
      ),
      a.p(`Última copia: ${ago(S.get('cloudAt'))}. Se guarda sola cada 6 h con la app abierta.`));
    if (cloudNote === 'otro') nodes.push(a.p('⚠️ Esta partida se recuperó en otro dispositivo, así que aquí la copia automática está en pausa.'),
      a.btn('Usar ESTE dispositivo como principal', async () => { if (!confirm('La copia de la nube se sustituirá por la partida de este dispositivo. ¿Seguro?')) return; const r = await cloudSave(true); a.setMsg(r.msg, 4000); openCloud(back); }));
    nodes.push(a.btn('Desactivar copia en la nube', () => { S.set('cloud', false); openCloud(back); }, 'ghost'));
  } else {
    nodes.push(a.p('Guarda tu partida en internet para no perderla si cambias de móvil o se borran los datos del navegador. Sin cuentas: solo un código secreto.'),
      a.btn('☁️ Activar copia en la nube', () => cloudEnable(back)));
  }
  if (cloudOk()) {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'vtext'; inp.maxLength = 20; inp.placeholder = 'Código (p. ej. ABCD-EFGH-JKMN)'; inp.autocapitalize = 'characters'; inp.autocomplete = 'off';
    nodes.push(a.p('¿Ya tienes un código?'), inp, a.btn('📥 Recuperar partida con código', () => cloudRestore(inp.value, back)));
  }
  nodes.push(a.btn('Atrás', () => openSettings(back), 'ghost'));
  a.openPanel(nodes, { full: true });
}
setTimeout(cloudAuto, 8000);
setInterval(cloudAuto, 15 * 60000);
document.addEventListener('visibilitychange', () => { if (document.hidden) cloudAuto(); });

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
    a.btn(`😴 Descanso del dueño: ${onoff(L.settings.get('rest'))}`, () => { L.settings.set('rest', !L.settings.get('rest')); L.school.fixSlot(); a.render(); openSettings(back); }),
    ...(L.settings.get('rest') ? [a.row(
      a.btn(`Desde ${hh(L.settings.get('restFrom'))}`, () => { const f = (L.settings.get('restFrom') + 1) % 24; L.settings.set('restFrom', f); fixRest(); L.school.fixSlot(); openSettings(back); }),
      a.btn(`Hasta ${hh(L.settings.get('restTo'))}`, () => { L.settings.set('restTo', (L.settings.get('restTo') + 1) % 24); fixRest(); L.school.fixSlot(); openSettings(back); })
    ), a.p('Durante el descanso (máx. 8 h) las barras bajan más despacio y no hay cacas, enfermedades ni errores.')] : []),
    a.btn(`🏫 Colegio y trabajo: ${onoff(L.settings.get('school'))}`, () => { L.settings.set('school', !L.settings.get('school')); a.render(); openSettings(back); }),
    ...(L.settings.get('school') ? [a.btn(`🚌 Horario (5 h): ${L.school.slotText()}`, () => { L.settings.set('jobFrom', L.school.nextStart(L.school.hourStart())); openSettings(back); }),
      a.btn(`🚌 Ir solo sin preguntar: ${onoff(L.settings.get('schoolAuto'))}`, () => { L.settings.set('schoolAuto', !L.settings.get('schoolAuto')); openSettings(back); }),
      a.p('El horario nunca coincide con tu descanso. Si no va, no pasa nada: solo no aprende ni cobra.')] : []),
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
    a.btn(`☁️ Copia en la nube: ${L.settings.get('cloud') ? 'SÍ · ' + ago(L.settings.get('cloudAt')) : 'NO'}`, () => openCloud(back)),
    a.row(a.btn('💾 Exportar', exportFile), a.btn('📤 Compartir', shareFile)),
    a.btn('📥 Importar partida', importFile),
    a.btn('Atrás', back || a.closePanel, 'ghost')
  );
  a.openPanel(nodes, { full: true });
}

L.backup = { openSettings, exportFile, importText, buildBackup, install, openCloud, cloudSave, cloudRestore };
})();
