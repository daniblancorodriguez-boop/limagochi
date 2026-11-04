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
  ta.className = 'vtext'; ta.rows = 2; ta.placeholder = 'Pega aquí el enlace o código de tu amigo';
  nodes.push(a.p('Recibir una visita'), ta, a.btn('👋 Recibir visita', () => receive(parse(ta.value))));
  const n = Object.keys(m.friends).length;
  nodes.push(a.p(`Amigos: ${n} · visitas: ${m.stats.visits || 0}`), a.btn('Atrás', back || a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}

/** Al abrir un enlace #visit=…: pregunta si se recibe la visita. */
function checkHash() {
  const h = location.hash || '';
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

L.visit = { open, myCard, encode, parse, link, receive, checkHash, cid, COOLDOWN };
})();
