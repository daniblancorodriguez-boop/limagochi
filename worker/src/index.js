/* ==========================================================================
   LIMAGOCHI · servidor de avisos para Cloudflare Workers
   Misma API que server.js, pero sin servidor propio:
     · D1 guarda cada suscripción y su calendario de avisos.
     · Un cron de Cloudflare (cada minuto) envía los avisos que ya tocan.
   Secretos/variables: VAPID_PRIVATE (secreto), VAPID_PUBLIC y VAPID_SUBJECT (variables).
   ========================================================================== */
import { buildPushPayload } from '@block65/webcrypto-web-push';

const MAX_BODY = 64 * 1024, MAX_SUBS = 5000, MAX_SCHEDULE = 12, MAX_PER_TICK = 40;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const validId = id => typeof id === 'string' && /^[\w-]{8,64}$/.test(id);
const validSub = s => s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
  s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string' && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;

function cleanSchedule(list) {
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  return list.slice(0, MAX_SCHEDULE).map(o => ({
    at: Number(o && o.at), tag: String((o && o.tag) || 'limagochi').slice(0, 40),
    title: String((o && o.title) || 'Limagochi').slice(0, 80), body: String((o && o.body) || '').slice(0, 160)
  })).filter(o => isFinite(o.at) && o.at > now - 60000 && o.at < now + 48 * 3600e3).sort((a, b) => a.at - b.at);
}

let ready = null;
function init(env) {            // crea la tabla la primera vez (no hace falta migrar nada a mano)
  if (!ready) ready = env.DB.exec('CREATE TABLE IF NOT EXISTS subs (id TEXT PRIMARY KEY, sub TEXT NOT NULL, schedule TEXT NOT NULL, next_at INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL)').catch(e => { ready = null; throw e; });
  return ready;
}
const nextAt = sched => (sched.length ? sched[0].at : 0);

async function readJson(request) {
  const text = await request.text();                 // text/plain para evitar «preflight» desde el móvil
  if (text.length > MAX_BODY) throw new Error('body');
  return JSON.parse(text || '{}');
}

/** Envía un aviso. Devuelve 'ok' | 'gone' (suscripción caducada) | 'error'. */
async function deliver(env, subJson, msg) {
  let sub;
  try { sub = JSON.parse(subJson); } catch { return 'gone'; }
  try {
    const payload = await buildPushPayload(
      { data: JSON.stringify({ title: msg.title, body: msg.body, tag: msg.tag }), options: { ttl: 3600, urgency: 'normal' } },
      sub, { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC, privateKey: env.VAPID_PRIVATE });
    const res = await fetch(sub.endpoint, payload);
    if (res.status === 404 || res.status === 410) return 'gone';
    if (!res.ok) { console.log('push falló', res.status); return 'error'; }
    return 'ok';
  } catch (e) { console.log('push error', e && e.message); return 'error'; }
}

async function api(request, env, path) {
  if (request.method === 'GET' && path === '/api/push/key') return json({ key: env.VAPID_PUBLIC });
  if (request.method === 'GET' && path === '/api/health') {
    await init(env);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM subs').first();
    return json({ ok: true, subs: n ? n.n : 0, configured: !!env.VAPID_PRIVATE && !String(env.VAPID_PUBLIC).startsWith('REEMPLAZAR') });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let b;
  try { b = await readJson(request); } catch { return json({ error: 'bad body' }, 400); }
  if (!validId(b.id)) return json({ error: 'bad id' }, 400);
  await init(env);
  const now = Date.now();

  if (path === '/api/push/subscribe') {
    if (!validSub(b.subscription)) return json({ error: 'bad subscription' }, 400);
    const have = await env.DB.prepare('SELECT 1 AS x FROM subs WHERE id = ?').bind(b.id).first();
    if (!have) {
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM subs').first();
      if (n && n.n >= MAX_SUBS) return json({ error: 'full' }, 503);
    }
    const sched = cleanSchedule(b.schedule);
    await env.DB.prepare('INSERT OR REPLACE INTO subs (id, sub, schedule, next_at, updated) VALUES (?, ?, ?, ?, ?)')
      .bind(b.id, JSON.stringify(b.subscription), JSON.stringify(sched), nextAt(sched), now).run();
    return json({ ok: true });
  }
  if (path === '/api/push/schedule') {
    const sched = cleanSchedule(b.schedule);
    const r = await env.DB.prepare('UPDATE subs SET schedule = ?, next_at = ?, updated = ? WHERE id = ?').bind(JSON.stringify(sched), nextAt(sched), now, b.id).run();
    if (!r.meta || !r.meta.changes) return json({ error: 'unknown' }, 404);
    return json({ ok: true, n: sched.length });
  }
  if (path === '/api/push/unsubscribe') {
    await env.DB.prepare('DELETE FROM subs WHERE id = ?').bind(b.id).run();
    return json({ ok: true });
  }
  if (path === '/api/push/test') {
    const row = await env.DB.prepare('SELECT sub FROM subs WHERE id = ?').bind(b.id).first();
    if (!row) return json({ error: 'unknown' }, 404);
    const r = await deliver(env, row.sub, { title: 'Limagochi', body: '¡Los avisos funcionan! 🍈', tag: 'test' });
    if (r === 'gone') await env.DB.prepare('DELETE FROM subs WHERE id = ?').bind(b.id).run();
    return json({ ok: r === 'ok' }, r === 'ok' ? 200 : 502);
  }
  return json({ error: 'not found' }, 404);
}

/** Cron: envía lo que ya toca y recalcula el siguiente aviso de cada suscripción. */
async function tick(env) {
  await init(env);
  const now = Date.now();
  const { results } = await env.DB.prepare('SELECT id, sub, schedule FROM subs WHERE next_at > 0 AND next_at <= ? LIMIT ?').bind(now, MAX_PER_TICK).all();
  for (const row of results || []) {
    let sched = [];
    try { sched = JSON.parse(row.schedule); } catch { /* */ }
    const due = sched.filter(o => o.at <= now), rest = sched.filter(o => o.at > now);
    let gone = false;
    for (const o of due) {
      if (now - o.at >= 6 * 3600e3) continue;                         // no enviamos avisos viejísimos
      if ((await deliver(env, row.sub, o)) === 'gone') { gone = true; break; }
    }
    if (gone) await env.DB.prepare('DELETE FROM subs WHERE id = ?').bind(row.id).run();
    else await env.DB.prepare('UPDATE subs SET schedule = ?, next_at = ? WHERE id = ?').bind(JSON.stringify(rest), nextAt(rest), row.id).run();
  }
  // limpieza (una vez por hora): suscripciones sin actividad desde hace 60 días
  if (new Date(now).getUTCMinutes() === 0) await env.DB.prepare('DELETE FROM subs WHERE updated < ?').bind(now - 60 * 86400e3).run();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env, url.pathname);
      return new Response('Limagochi push · OK', { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });
    } catch (e) {
      console.log('error', e && e.message);
      return json({ error: 'server' }, 500);
    }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(tick(env)); }
};
