/* ==========================================================================
   LIMAGOCHI · visitas con tarjeta
   · Tu tarjeta (nombre, forma y etapa) va en un enlace #visit=CÓDIGO y en un QR.
   · No hay servidor: quien la recibe ve llegar a tu Limagochi de visita y ambos ganan.
   · Un mismo amigo solo da premio una vez cada 20 h (sin trucos para sacar 🪙).
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const A = () => L.api;

const STAGES = ['baby', 'child', 'teen', 'adult'];
const COOLDOWN = 20 * 3600e3;
const nowMs = () => Date.now();

/* ------------------------------ identidad ------------------------------- */
function cid() {
  let c = L.settings.get('cid');
  if (!/^[a-z0-9]{8,16}$/.test(c || '')) {
    const r = new Uint8Array(6);
    (crypto.getRandomValues ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.random() * 256; }));
    c = [...r].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
    L.settings.set('cid', c);
  }
  return c;
}
const cleanNick = t => String(t || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 12);

/* ------------------------------- tarjeta -------------------------------- */
const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = t => decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))));

function myCard() {
  const s = A().S();
  if (s.stage === 'egg' || s.stage === 'dead') return null;
  return { v: 1, c: cid(), n: cleanNick(L.settings.get('nick')), f: s.form || 'baby', s: s.stage };
}
const encode = card => b64(JSON.stringify(card));

/** Valida el código de una tarjeta (texto, enlace o #visit=…). Devuelve la tarjeta o null. */
function parse(text) {
  try {
    let t = String(text || '').trim();
    const i = t.indexOf('visit=');
    if (i >= 0) t = t.slice(i + 6);
    t = t.replace(/[^\w-]/g, '');
    if (!t || t.length > 400) return null;
    const o = JSON.parse(unb64(t));
    if (!o || o.v !== 1 || !/^[a-z0-9]{8,16}$/.test(o.c || '') || !STAGES.includes(o.s)) return null;
    if (typeof o.f !== 'string' || !L.SPR[o.f]) return null;
    return { c: o.c, nick: cleanNick(o.n), form: o.f, stage: o.s, name: (L.META[o.f] || {}).name || 'un amigo' };
  } catch { return null; }
}

const link = () => { const c = myCard(); return c ? `${location.origin}${location.pathname}#visit=${encode(c)}` : ''; };

/* -------------------------------- visita -------------------------------- */
function canReceive() {
  const a = A(), s = a.S();
  if (s.stage === 'egg' || s.stage === 'dead') { a.setMsg('Ahora no puede recibir visitas'); return false; }
  if (s.pause) { a.setMsg('Está de vacaciones'); return false; }
  if (s.sleeping) { a.setMsg('Zzz… está durmiendo'); return false; }
  if (s.sick) { a.setMsg('Está enfermo: nada de visitas'); return false; }
  if (L.mini.active()) return false;
  return true;
}

function receive(card) {
  const a = A(), s = a.S(), m = s.meta;
  if (!card) { a.setMsg('Esa tarjeta no es válida', 3500); return false; }
  if (card.c === cid()) { a.setMsg('¡Es tu propia tarjeta! Pásasela a un amigo', 4000); return false; }
  if (!canReceive()) return false;
  a.closePanel();
  const last = m.friends[card.c] || 0, fresh = nowMs() - last >= COOLDOWN, first = !last;
  card.finish = () => {
    const r = { title: `¡Qué buena visita de ${card.name}!`, happy: 8, lp: 0, lines: [] };
    if (fresh) {
      r.happy = first ? 25 : 20; r.lp = first ? 5 : 2;
      m.friends[card.c] = nowMs();
      m.stats.visits = (m.stats.visits || 0) + 1;
      r.lines.push(first ? '¡Nuevo amigo!' : 'Los amigos se echan de menos.');
    } else r.lines.push('Ya os visitasteis hoy: sin premio extra, pero se lo han pasado genial.');
    L.mail && L.mail.on('visit', { name: card.nick || card.name });
    L.progress.check();
    return r;
  };
  L.mini.start('visit', card);
  return true;
}

/* ---------------------------------- QR ---------------------------------- */
function qrCanvas(text) {
  const c = document.createElement('canvas');
  c.className = 'qr';
  try {
    const q = window.qrcode(0, 'L'); q.addData(text); q.make();
    const n = q.getModuleCount(), k = 4, size = (n + 8) * k;
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#10140a';
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) g.fillRect((col + 4) * k, (r + 4) * k, k, k);
  } catch { c.width = c.height = 1; }
  return c;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/* ------------------------------- pantallas ------------------------------ */
function open(back) {
  const a = A();
  back = back || open._back; open._back = back;
  const card = myCard();
  const s = a.S(), m = s.meta;
  const nodes = [a.p('🤝 Visitas')];
  if (!card) nodes.push(a.p('Cuando haya nacido tu Limagochi podrás compartir su tarjeta.'));
  else {
    const url = link();
    const nick = document.createElement('input');
    nick.type = 'text'; nick.maxLength = 12; nick.className = 'vtext'; nick.placeholder = 'Tu nombre (opcional)';
    nick.value = L.settings.get('nick') || '';
    nick.addEventListener('change', () => { L.settings.set('nick', cleanNick(nick.value)); open(back); });
    nodes.push(a.p('Tu tarjeta: que tu amigo la escanee o abra el enlace.'), qrCanvas(url), nick,
      a.row(
        a.btn('📋 Copiar', async () => a.setMsg((await copy(url)) ? 'Enlace copiado' : 'No se pudo copiar', 3000)),
        a.btn('📤 Enviar', async () => {
          try { if (navigator.share) await navigator.share({ title: 'Visita a mi Limagochi', text: '¡Ven a visitar a mi Limagochi!', url }); else a.setMsg((await copy(url)) ? 'Enlace copiado' : 'No se pudo compartir', 3000); } catch { /* cancelado */ }
        })
      ));
  }
  const ta = document.createElement('textarea');
  ta.className = 'vtext'; ta.rows = 2; ta.placeholder = 'Pega aquí el enlace o código de tu amigo (visita o regalo)';
  nodes.push(a.row(a.btn('🎁 Enviar un regalo', () => openGift(() => open(back)))), a.p('Recibir una visita o un regalo'), ta,
    a.btn('👋 Recibir', () => { const t = ta.value; if (t.indexOf('gift=') >= 0) receiveGift(parseGift(t)); else receive(parse(t)); }));
  const n = Object.keys(m.friends).length;
  nodes.push(a.p(`Amigos: ${n} · visitas: ${m.stats.visits || 0}`), a.btn('Atrás', back || a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}

/** Al abrir un enlace #visit=…: pregunta si se recibe la visita. */
function checkHash() {
  const h = location.hash || '';
  if (h.startsWith('#gift=')) {
    const g = parseGift(h);
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* */ }
    const a = A();
    if (!g) { a.setMsg('El enlace del regalo no es válido', 4000); return; }
    a.openPanel([a.p(`🎁 ${g.nick || 'Un amigo'} te manda un regalo`), a.p(giftName(g)), a.row(a.btn('Abrir', () => receiveGift(g)), a.btn('Ahora no', a.closePanel, 'ghost'))]);
    return;
  }
  if (!h.startsWith('#visit=')) return;
  const card = parse(h);
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* */ }
  const a = A();
  if (!card) { a.setMsg('El enlace de visita no es válido', 4000); return; }
  a.openPanel([
    a.p(`👋 ${card.nick ? card.nick + ' envía a ' : ''}${card.name} de visita`),
    a.row(a.btn('Recibir', () => receive(card)), a.btn('Ahora no', a.closePanel, 'ghost'))
  ]);
}
window.addEventListener('hashchange', () => A() && checkHash());

/* ================================ REGALOS ==================================
   Un regalo es un enlace #gift=CÓDIGO (y QR). Al crearlo, el objeto sale de tu inventario.
   Quien lo abre lo recibe una sola vez (cada regalo lleva un número único), hasta 7 días después
   y como mucho 5 al día. Solo se aceptan comida de huerto, platos cocinados y flores. */
const GIFT_DAYS = 7, GIFT_MAX_DAY = 5;
const GIFT_FOODS = ['manzana', 'zanahoria', 'tomate', 'lechuga', 'fresa', 'pez'];
const FLOWERS = {
  f_tulip:   { icon: '🌷', name: 'Tulipán',        cost: 8,  happy: 18 },
  f_bouquet: { icon: '💐', name: 'Ramo de flores', cost: 20, happy: 35 }
};
/* Regalos especiales: los firma el autor del juego (ECDSA P-256) y aquí solo se verifica con la clave pública. */
let GIFT_PUB = {"kty":"EC","crv":"P-256","x":"3q1CF-D2mdzOFNrxeGPkXwUK4Q62Jg8iYzgt4abd99s","y":"KAYJiwlVbWD8artT5Pru1VD1OzCDcbeLCBX7enTkIQs"};
const SPECIAL_DAYS = 30;
const b64bytes = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const specialText = o => `${o.c}|${o.u}|${o.ts}|${o.m}|${o.e}|${o.h}|${o.l}`;
async function verifySpecial(g) {
  try {
    const key = await crypto.subtle.importKey('jwk', GIFT_PUB, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64bytes(g.s), new TextEncoder().encode(specialText(g)));
  } catch { return false; }
}
const uid = () => { const r = new Uint8Array(5); (crypto.getRandomValues ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.random() * 256; })); return [...r].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 9); };
const dayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const giftMeta = () => { const m = A().S().meta; m.gifts = m.gifts || {}; m.giftDay = m.giftDay || { d: '', n: 0 }; return m; };

/** Qué se puede regalar ahora mismo (lo que hay en el inventario). */
function giftables() {
  const a = A(), s = a.S(), k = s.kitchen, out = [];
  GIFT_FOODS.forEach(id => { const f = a.FOODS.find(x => x.id === id); if (f && (s.inv[id] || 0) > 0) out.push({ k: 'food', i: id, icon: f.icon, name: f.name, have: s.inv[id] }); });
  (k.plates || []).forEach((p, idx) => { const r = L.kitchen.RECIPES.find(x => x.id === p.r); if (r) out.push({ k: 'plate', i: p.r, idx, m: p.m, st: p.st, icon: r.icon, name: `${r.name} ${'⭐'.repeat(p.st)}` }); });
  Object.keys(FLOWERS).forEach(id => { if ((s.inv[id] || 0) > 0) out.push({ k: 'flower', i: id, icon: FLOWERS[id].icon, name: FLOWERS[id].name, have: s.inv[id] }); });
  return out;
}

const giftLink = g => `${location.origin}${location.pathname}#gift=${b64(JSON.stringify(g))}`;

function createGift(it) {
  const a = A(), s = a.S();
  if (s.stage === 'egg' || s.stage === 'dead') { a.setMsg('Ahora no puedes enviar regalos'); return; }
  const g = { v: 1, t: 'g', c: cid(), n: cleanNick(L.settings.get('nick')), k: it.k, i: it.i, u: uid(), ts: nowMs() };
  if (it.k === 'plate') { g.m = Math.round(it.m * 100) / 100; g.st = it.st; }
  // el objeto sale de tu inventario
  if (it.k === 'plate') { const p = s.kitchen.plates; const idx = p.findIndex(x => x.r === it.i && x.st === it.st && x.m === it.m); if (idx < 0) { a.setMsg('Ese plato ya no está'); return; } p.splice(idx, 1); }
  else { if (!(s.inv[it.i] > 0)) { a.setMsg('Ya no lo tienes'); return; } s.inv[it.i]--; L.kitchen.sync(); }
  const m = giftMeta();
  m.lastGift = { url: giftLink(g), name: `${it.icon} ${it.name}`, ts: g.ts };
  L.progress.stat('giftsSent'); L.progress.check(); a.save(); a.render();
  showGift(m.lastGift);
}

function showGift(lg, back) {
  const a = A();
  const left = Math.max(0, Math.ceil((lg.ts + GIFT_DAYS * 864e5 - nowMs()) / 864e5));
  a.openPanel([
    a.p(`🎁 Regalo listo: ${lg.name}`),
    a.p(left > 0 ? `Tu amigo lo puede abrir durante ${left} día${left > 1 ? 's' : ''}.` : 'Este regalo ya ha caducado.'),
    ...(left > 0 ? [qrCanvas(lg.url), a.row(
      a.btn('📋 Copiar', async () => a.setMsg((await copy(lg.url)) ? 'Enlace copiado' : 'No se pudo copiar', 3000)),
      a.btn('📤 Enviar', async () => {
        try { if (navigator.share) await navigator.share({ title: 'Un regalo para tu Limagochi', text: '¡Te mando un regalo para tu Limagochi!', url: lg.url }); else a.setMsg((await copy(lg.url)) ? 'Enlace copiado' : 'No se pudo compartir', 3000); } catch { /* cancelado */ }
      })
    )] : []),
    a.btn('Atrás', () => openGift(back), 'ghost')
  ], { full: true });
}

function openGift(back) {
  const a = A(), m = giftMeta(), items = giftables();
  back = back || openGift._back; openGift._back = back;
  const nodes = [a.p('🎁 Enviar un regalo'), a.p('Elige qué mandar. Sale de tu inventario y se convierte en un enlace para tu amigo.')];
  if (m.lastGift && nowMs() - m.lastGift.ts < GIFT_DAYS * 864e5) nodes.push(a.btn(`↩ Último regalo: ${m.lastGift.name}`, () => showGift(m.lastGift, back), 'ghost'));
  if (!items.length) nodes.push(a.p('No tienes nada para regalar. Cosecha, cocina o compra flores en la 🛒 tienda (🎁 Flores).'));
  items.forEach(it => nodes.push(a.btn(`${it.icon} ${it.name}${it.have ? ' ×' + it.have : ''}`, () => confirmGift(it, back))));
  nodes.push(a.btn('Atrás', back || a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}
function confirmGift(it, back) {
  const a = A();
  a.openPanel([
    a.p(`¿Regalar ${it.icon} ${it.name}?`), a.p('Se quita de tu inventario y se crea el enlace.'),
    a.row(a.btn('Sí, crear regalo', () => createGift(it)), a.btn('No', () => openGift(back), 'ghost'))
  ]);
}

/** Valida el código de un regalo. Devuelve el regalo o null. */
function parseGift(text) {
  try {
    let t = String(text || '').trim();
    const i = t.indexOf('gift='); if (i >= 0) t = t.slice(i + 5);
    t = t.replace(/[^\w-]/g, '');
    if (!t || t.length > 900) return null;
    const o = JSON.parse(unb64(t));
    if (!o || o.v !== 1 || o.t !== 'g' || !/^[a-z0-9]{8,16}$/.test(o.c || '') || !/^[a-z0-9]{6,12}$/.test(o.u || '')) return null;
    const ts = Number(o.ts); if (!ts || ts > nowMs() + 36e5) return null;
    const g = { c: o.c, nick: cleanNick(o.n), k: o.k, i: o.i, u: o.u, ts };
    if (g.k === 'food') { if (!GIFT_FOODS.includes(g.i)) return null; }
    else if (g.k === 'flower') { if (!FLOWERS[g.i]) return null; }
    else if (g.k === 'plate') {
      if (!L.kitchen.RECIPES.some(r => r.id === g.i)) return null;
      g.m = Math.min(1.6, Math.max(0.6, Number(o.m) || 1)); g.st = Math.min(3, Math.max(1, Math.round(Number(o.st) || 1)));
    } else if (g.k === 'special') {
      const e = Number(o.e), h = Number(o.h), l = Number(o.l), m = String(o.m || '');
      if (![e, h, l].every(Number.isInteger) || e < 0 || e > 100 || h < 0 || h > 100 || l < 0 || l > 500 || m.length > 60 || !/^[\p{L}\p{N} .,!¡?¿:;()'-]*$/u.test(m)) return null;
      if (typeof o.s !== 'string' || !/^[\w-]{80,100}$/.test(o.s) || o.i !== 'f_bouquet') return null;
      Object.assign(g, { m, e, h, l, s: o.s });
    } else return null;
    return g;
  } catch { return null; }
}
const giftName = g => g.k === 'special' ? `${FLOWERS.f_bouquet.icon} Ramo especial`
  : g.k === 'flower' ? `${FLOWERS[g.i].icon} ${FLOWERS[g.i].name}`
  : g.k === 'plate' ? (() => { const r = L.kitchen.RECIPES.find(x => x.id === g.i); return `${r.icon} ${r.name} ${'⭐'.repeat(g.st)}`; })()
  : (() => { const f = A().FOODS.find(x => x.id === g.i); return `${f.icon} ${f.name}`; })();

function receiveGift(g) {
  const a = A(), s = a.S(), m = giftMeta();
  if (!g) { a.setMsg('Ese regalo no es válido', 3500); return false; }
  if (g.c === cid()) { a.setMsg('Es un regalo tuyo: ¡ofrécelo a un amigo!', 4000); return false; }
  if (s.stage === 'egg' || s.stage === 'dead') { a.setMsg('Ahora no puede recibir regalos'); return false; }
  if (nowMs() - g.ts > (g.k === 'special' ? SPECIAL_DAYS : GIFT_DAYS) * 864e5) { a.setMsg('Este regalo ha caducado', 3500); return false; }
  if (m.gifts[g.u]) { a.setMsg('Este regalo ya lo abriste', 3500); return false; }
  if (m.giftDay.d !== dayStr()) m.giftDay = { d: dayStr(), n: 0 };
  if (m.giftDay.n >= GIFT_MAX_DAY) { a.setMsg('Hoy ya ha recibido muchos regalos. Vuelve mañana', 4000); return false; }
  if (g.k === 'plate' && (s.kitchen.plates || []).length >= 6) { a.setMsg('La nevera está llena de platos: cómete alguno antes', 4000); return false; }
  if (g.k === 'special') {                                      // se comprueba la firma antes de dar nada
    a.closePanel();
    verifySpecial(g).then(good => {
      if (!good) { a.setMsg('Ese regalo no es auténtico', 4000); return; }
      if (m.gifts[g.u]) { a.setMsg('Este regalo ya lo abriste', 3500); return; }
      s.energy = Math.min(100, s.energy + g.e); s.happy = Math.min(100, s.happy + g.h); s.lp += g.l;
      m.gifts[g.u] = g.ts; m.giftDay.n++;
      L.progress.stat('giftsGot'); L.progress.check();
      L.mail && L.mail.on('gift', { name: `${g.nick || 'Un amigo'}|${giftName(g)}|${g.u}` });
      a.sound.play('win');
      a.setMsg(`💐 «${g.m}» ${g.e ? '· +' + g.e + ' ⚡ ' : ''}${g.h ? '· +' + g.h + ' 😊 ' : ''}${g.l ? '· +' + g.l + ' 🪙' : ''}`, 9000);
      a.save(); a.render();
    });
    return true;
  }
  a.closePanel();
  let happy = 8, line = '';
  if (g.k === 'flower') { happy = FLOWERS[g.i].happy; line = 'Las flores le han alegrado el día'; }
  else if (g.k === 'food') { s.inv[g.i] = (s.inv[g.i] || 0) + 1; L.kitchen.sync(); line = 'Lo guarda en la despensa'; }
  else { s.kitchen.plates.push({ r: g.i, m: g.m, age: 0, st: g.st }); happy = 10; line = 'Lo guarda en la nevera'; }
  s.happy = Math.min(100, s.happy + happy);
  m.gifts[g.u] = g.ts;
  const keys = Object.keys(m.gifts); if (keys.length > 80) keys.sort((x, y) => m.gifts[x] - m.gifts[y]).slice(0, keys.length - 80).forEach(k => delete m.gifts[k]);
  m.giftDay.n++;
  L.progress.stat('giftsGot'); L.progress.check();
  const who = g.nick || 'Un amigo';
  L.mail && L.mail.on('gift', { name: `${who}|${giftName(g)}|${g.u}` });
  a.sound.play('happy');
  a.setMsg(`🎁 ¡${who} te regala ${giftName(g)}! +${happy} 😊 · ${line}`, 5000);
  a.save(); a.render();
  return true;
}

L.visit = { open, myCard, encode, parse, link, receive, checkHash, cid, COOLDOWN, openGift, receiveGift, parseGift, FLOWERS, verifySpecial, specialText, setKey: k => { GIFT_PUB = k; } };
})();
