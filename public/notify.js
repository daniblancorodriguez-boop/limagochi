/* ==========================================================================
   LIMAGOCHI · notificaciones
   · Avisos locales: funcionan mientras la página siga abierta (aunque esté en segundo plano).
   · Web Push (LIMA.push): con la app cerrada. Necesita https (o localhost) y el servidor server.js,
     que guarda el calendario de avisos que calcula el juego y los envía a su hora.
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};

const KEY = 'limagochi.notify';
const COOLDOWN_MS = 10 * 60 * 1000;
const supported = 'Notification' in window;
let enabled = false;
let reg = null;
const lastSent = {};

try { enabled = localStorage.getItem(KEY) === '1' && supported && Notification.permission === 'granted'; } catch { /* sin storage */ }

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').then(r => { reg = r; }).catch(() => {});
}

function show(title, body, tag) {
  if (!enabled || !supported) return;
  const opts = { body, tag, icon: undefined, vibrate: [120, 60, 120] };
  try {
    if (reg && reg.showNotification) reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch { /* algunos móviles solo admiten la vía del service worker */ }
}

LIMA.notify = {
  supported,
  enabled: () => enabled,
  async toggle() {
    if (!supported) return { ok: false, reason: 'Tu navegador no admite notificaciones' };
    if (enabled) {
      enabled = false;
      try { localStorage.setItem(KEY, '0'); } catch { /* */ }
      return { ok: true, on: false };
    }
    let perm = Notification.permission;
    if (perm !== 'granted') perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'Permiso denegado en el navegador' };
    enabled = true;
    try { localStorage.setItem(KEY, '1'); } catch { /* */ }
    show('Limagochi', '¡Notificaciones activadas!', 'welcome');
    return { ok: true, on: true };
  },
  /** reasons: [{key, text}] — avisa solo si la página no está a la vista y respeta el enfriamiento. */
  check(reasons) {
    if (!enabled || !document.hidden) return;
    const now = Date.now();
    for (const r of reasons) {
      if (now - (lastSent[r.key] || 0) < COOLDOWN_MS) continue;
      lastSent[r.key] = now;
      show('Limagochi te necesita', r.text, r.key);
    }
  },
  /** Eventos puntuales (evolución, muerte…), sin enfriamiento. */
  event(title, body) { if (document.hidden) show(title, body, 'event-' + Date.now()); }
};

/* ============================== WEB PUSH ================================ */
const PID = 'limagochi.pushid', PON = 'limagochi.push';
let pushOn = false;
try { pushOn = localStorage.getItem(PON) === '1'; } catch { /* */ }

const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && supported && /^https?:$/.test(location.protocol);
function pushId() {
  let id = null;
  try { id = localStorage.getItem(PID); } catch { /* */ }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
    try { localStorage.setItem(PID, id); } catch { /* */ }
  }
  return id;
}
const setPushOn = v => { pushOn = v; try { localStorage.setItem(PON, v ? '1' : '0'); } catch { /* */ } };
function b64ToBytes(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function call(path, body) {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}
const schedule = () => (LIMA.api && LIMA.api.predictSchedule ? LIMA.api.predictSchedule() : []);

LIMA.push = {
  supported: pushSupported,
  on: () => pushOn,
  async toggle() { return pushOn ? this.disable() : this.enable(); },
  async enable() {
    if (!pushSupported()) return { ok: false, msg: 'Este navegador no admite Web Push' };
    try {
      let perm = Notification.permission;
      if (perm !== 'granted') perm = await Notification.requestPermission();
      if (perm !== 'granted') return { ok: false, msg: 'Permiso de notificaciones denegado' };
      const reg = await navigator.serviceWorker.ready;
      let key;
      try { key = (await call('/api/push/key')).key; } catch { return { ok: false, msg: 'No hay servidor de avisos: ejecuta «node server.js»' }; }
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
      await call('/api/push/subscribe', { id: pushId(), subscription: sub.toJSON(), schedule: schedule() });
      setPushOn(true);
      return { ok: true, msg: '📡 Avisos con la app cerrada activados' };
    } catch (e) { return { ok: false, msg: 'No se pudo activar: ' + (e && e.message || e) }; }
  },
  async disable() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await call('/api/push/unsubscribe', { id: pushId() }).catch(() => {});
    } catch { /* */ }
    setPushOn(false);
    return { ok: true, msg: 'Avisos con la app cerrada desactivados' };
  },
  async test() {
    try { await call('/api/push/test', { id: pushId() }); return { ok: true, msg: 'Aviso enviado: míralo en unos segundos' }; }
    catch { return { ok: false, msg: 'No se pudo enviar el aviso de prueba' }; }
  },
  /** Reemplaza el calendario guardado en el servidor. Con beacon=true sobrevive al cierre de la página. */
  sync(list, beacon) {
    if (!pushOn) return;
    const body = JSON.stringify({ id: pushId(), schedule: list });
    try {
      if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/push/schedule', new Blob([body], { type: 'application/json' }));
      else fetch('/api/push/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch { /* */ }
  }
};
})();
