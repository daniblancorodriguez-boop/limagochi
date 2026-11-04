#!/usr/bin/env node
/* ==========================================================================
   LIMAGOCHI · servidor
   · Sirve la carpeta public/ (la app).
   · Web Push: guarda el calendario de avisos que calcula el juego y los envía a su hora,
     aunque la app esté cerrada.

   Uso:        npm install && node server.js        → http://localhost:3000
   Variables:  PORT, HOST, VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, DATA_DIR,
               PUSH_DRY_RUN=1 (no envía: solo escribe en el log; sirve para probar)
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = path.join(__dirname, 'docs');
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const DRY = process.env.PUSH_DRY_RUN === '1';
const TICK_MS = Number(process.env.PUSH_TICK_MS) || 15000;
const MAX_BODY = 64 * 1024, MAX_SUBS = 5000, MAX_SCHEDULE = 12;

let webpush = null;
try { webpush = require('web-push'); } catch { console.warn('⚠ falta web-push: ejecuta «npm install»'); }

fs.mkdirSync(DATA, { recursive: true });

/* ------------------------------ claves VAPID ----------------------------- */
function loadVapid() {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) return { publicKey: process.env.VAPID_PUBLIC, privateKey: process.env.VAPID_PRIVATE };
  const f = path.join(DATA, 'vapid.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* se genera */ }
  if (!webpush) return { publicKey: 'dry-run-key', privateKey: '' };
  const k = webpush.generateVAPIDKeys();
  fs.writeFileSync(f, JSON.stringify(k), { mode: 0o600 });
  return k;
}
const VAPID = loadVapid();
if (webpush && !DRY) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', VAPID.publicKey, VAPID.privateKey);

/* ------------------------------ suscripciones ---------------------------- */
const SUBS_FILE = path.join(DATA, 'subs.json');
let subs = {};
try { subs = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')); } catch { subs = {}; }
let dirty = false;
const persist = () => { if (!dirty) return; dirty = false; try { fs.writeFileSync(SUBS_FILE + '.tmp', JSON.stringify(subs)); fs.renameSync(SUBS_FILE + '.tmp', SUBS_FILE); } catch (e) { console.error('no se pudo guardar subs:', e.message); } };

const validId = id => typeof id === 'string' && /^[\w-]{8,64}$/.test(id);
const validSub = s => s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
  s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string';

function cleanSchedule(list) {
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  return list.slice(0, MAX_SCHEDULE).map(o => ({
    at: Number(o && o.at), tag: String((o && o.tag) || 'limagochi').slice(0, 40),
    title: String((o && o.title) || 'Limagochi').slice(0, 80), body: String((o && o.body) || '').slice(0, 160)
  })).filter(o => isFinite(o.at) && o.at > now - 60000 && o.at < now + 48 * 3600e3);
}

/* ------------------------------- envío ----------------------------------- */
const sentLog = [];                                        // para pruebas: lo último enviado
async function deliver(id, msg) {
  const e = subs[id];
  if (!e) return false;
  sentLog.push({ id, ...msg, sentAt: Date.now() }); if (sentLog.length > 50) sentLog.shift();
  if (DRY || !webpush) { console.log(`[dry-run] push → ${id.slice(0, 8)}: ${msg.title} · ${msg.body}`); return true; }
  try {
    await webpush.sendNotification(e.sub, JSON.stringify({ title: msg.title, body: msg.body, tag: msg.tag }), { TTL: 3600, urgency: 'normal' });
    return true;
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) { delete subs[id]; dirty = true; console.log('suscripción caducada, eliminada'); }
    else console.error('push falló:', err.statusCode || err.message);
    return false;
  }
}

async function tickPush() {
  const now = Date.now();
  for (const id of Object.keys(subs)) {
    const e = subs[id];
    const due = e.schedule.filter(o => o.at <= now);
    if (!due.length) continue;
    e.schedule = e.schedule.filter(o => o.at > now);
    dirty = true;
    for (const o of due) if (now - o.at < 6 * 3600e3) await deliver(id, o);       // no enviamos avisos viejísimos
  }
  persist();
}
setInterval(() => tickPush().catch(e => console.error(e)), TICK_MS).unref?.();

/* --------------------------------- API ----------------------------------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > MAX_BODY) { reject(new Error('body')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(new Error('json')); } });
    req.on('error', reject);
  });
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(obj)); };

async function api(req, res, url) {
  if (req.method === 'GET' && url === '/api/push/key') return send(res, 200, { key: VAPID.publicKey });
  if (req.method === 'GET' && url === '/api/health') return send(res, 200, { ok: true, subs: Object.keys(subs).length, dry: DRY });
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  let b;
  try { b = await readBody(req); } catch { return send(res, 400, { error: 'bad body' }); }
  if (!validId(b.id)) return send(res, 400, { error: 'bad id' });

  if (url === '/api/push/subscribe') {
    if (!validSub(b.subscription)) return send(res, 400, { error: 'bad subscription' });
    if (!subs[b.id] && Object.keys(subs).length >= MAX_SUBS) return send(res, 503, { error: 'full' });
    subs[b.id] = { sub: b.subscription, schedule: cleanSchedule(b.schedule), updated: Date.now() };
    dirty = true; persist();
    return send(res, 200, { ok: true });
  }
  if (url === '/api/push/schedule') {
    if (!subs[b.id]) return send(res, 404, { error: 'unknown' });
    subs[b.id].schedule = cleanSchedule(b.schedule); subs[b.id].updated = Date.now();
    dirty = true;
    return send(res, 200, { ok: true, n: subs[b.id].schedule.length });
  }
  if (url === '/api/push/unsubscribe') {
    delete subs[b.id]; dirty = true; persist();
    return send(res, 200, { ok: true });
  }
  if (url === '/api/push/test') {
    if (!subs[b.id]) return send(res, 404, { error: 'unknown' });
    const ok = await deliver(b.id, { title: 'Limagochi', body: '¡Los avisos funcionan! 🍈', tag: 'test' });
    return send(res, ok ? 200 : 502, { ok });
  }
  if (url === '/api/_debug/sent' && DRY) return send(res, 200, { sent: sentLog });          // solo en modo prueba
  if (url === '/api/_debug/tick' && DRY) { await tickPush(); return send(res, 200, { ok: true }); }
  return send(res, 404, { error: 'not found' });
}

/* ------------------------------ estáticos -------------------------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    let rel = url === '/' ? '/index.html' : url;
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end('403'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' || path.basename(file) === 'sw.js' ? 'no-cache' : 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  } catch (e) { res.writeHead(400); res.end('bad request'); }
});

server.listen(PORT, HOST, () => {
  console.log(`Limagochi → http://localhost:${PORT}${DRY ? '  (push en modo prueba)' : ''}`);
  console.log('Web Push exige https (o localhost) en el navegador.');
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { persist(); process.exit(0); });
