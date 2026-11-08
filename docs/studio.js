/* ==========================================================================
   LIMAGOCHI · Estudio y talentos (pintura, escritura, música)
   · Nivel 0-99 por talento. Subir cuesta cada vez más cuanto más cerca del límite.
   · Una sesión dura hasta 10 + disciplina/2 minutos. Al acabar hay una obra: cuadro, capítulo (4 = libro) o canción.
   · Las obras se venden en el mercado: el precio sube con la calidad, cambia cada día, se satura al vender mucho
     y a veces viene un mecenas que paga el doble.
   · Cuantos más talentos (nivel ≥ 10): menos baja la disciplina, pero más rápido caen felicidad y energía.
   · La música suena mejor cuanto mayor es el nivel.
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA;
const A = () => L.api;
const KEYS = ['painting', 'writing', 'music'];
const TAL = {
  painting: { icon: '🎨', name: 'Pintura',   item: 'easel', obj: 'st_easel', noun: 'cuadro',   work: 'painting' },
  writing:  { icon: '✍️', name: 'Escritura', item: 'desk',  obj: 'st_desk',  noun: 'capítulo', work: 'chapter' },
  music:    { icon: '🎵', name: 'Música',    item: 'piano', obj: 'st_piano', noun: 'canción',  work: 'song' }
};
const ITEMS = [
  { id: 'easel', icon: '🎨', name: 'Caballete', cost: 60,  desc: 'pinta cuadros que se venden' },
  { id: 'desk',  icon: '✍️', name: 'Escritorio', cost: 60,  desc: 'escribe libros que se venden' },
  { id: 'piano', icon: '🎹', name: 'Piano',     cost: 120, desc: 'compone: cuanto mejor, mejor suena' }
];
/** Habilidades «extra» (se ganan haciendo cosas, sin sesión de práctica): nivel 0-99. */
const EXTRA = {
  cooking:   { icon: '🍳', name: 'Cocina' },
  gardening: { icon: '🌱', name: 'Jardinería' },
  fishing:   { icon: '🎣', name: 'Pesca' },
  sport:     { icon: '🏅', name: 'Deporte' }
};
const EK = Object.keys(EXTRA);
const CHAPTERS = 4, MAX_WORKS = 24;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const today = () => new Date().toLocaleDateString('sv');
const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };

/* ------------------------------- estado -------------------------------- */
const blank = () => ({
  painting: { lv: 0, mx: 0, idle: 0 }, writing: { lv: 0, mx: 0, idle: 0 }, music: { lv: 0, mx: 0, idle: 0 },
  extra: { cooking: { lv: 0, mx: 0, idle: 0 }, gardening: { lv: 0, mx: 0, idle: 0 }, fishing: { lv: 0, mx: 0, idle: 0 }, sport: { lv: 0, mx: 0, idle: 0 } },
  works: [], book: [], sold: { day: '', n: {}, patron: false }, stats: { books: 0 }, practice: null, news: ''
});
function fix(d) {
  const b = blank();
  if (!d || typeof d !== 'object') return b;
  KEYS.forEach(k => { b[k] = Object.assign(b[k], d[k]); });
  EK.forEach(k => { b.extra[k] = Object.assign(b.extra[k], (d.extra || {})[k]); });
  b.works = (Array.isArray(d.works) ? d.works : []).filter(w => w && typeof w.q === 'number').slice(0, MAX_WORKS);
  b.book = (Array.isArray(d.book) ? d.book : []).filter(q => typeof q === 'number').slice(0, CHAPTERS - 1);
  b.sold = Object.assign(b.sold, d.sold); b.stats = Object.assign(b.stats, d.stats);
  b.practice = d.practice && TAL[d.practice.k] ? { k: d.practice.k, total: +d.practice.total || 10, min: +d.practice.min || 0 } : null;
  b.news = typeof d.news === 'string' ? d.news : '';
  return b;
}
const T = () => { const s = A().S(); if (!s.talent) s.talent = blank(); return s.talent; };
const owns = k => A().S().owned.includes(TAL[k].item);
const lvOf = k => T()[k].lv;
/** Talentos «activos» (con su objeto y nivel ≥ 10): dan disciplina pero cansan. */
const nActive = () => Math.min(4, KEYS.filter(k => owns(k) && lvOf(k) >= 10).length + EK.filter(k => T().extra[k].lv >= 10).length);
const extraLv = k => T().extra[k].lv;
let flashT = 0;
/** Gana experiencia en una habilidad «extra» (base = puntos a nivel 0; rinde menos cerca del límite) y enseña la barra un momento. */
function xp(k, base, quiet) {
  const x = T().extra[k], a = A(); if (!x) return 0;
  x.lv = Math.min(99, x.lv + base * Math.pow(1 - x.lv / 100, 1.6)); x.mx = Math.max(x.mx, x.lv); x.idle = 0;
  if (!quiet && !a.isQuiet() && !working()) {
    a.skillBar({ icon: EXTRA[k].icon, label: `${EXTRA[k].name} ${Math.floor(x.lv)}`, pct: x.lv, sub: '' });
    clearTimeout(flashT); flashT = setTimeout(() => { if (!working()) a.skillBar(null); else showBar(); }, 3500);
  }
  return x.lv;
}
const gain = lv => 0.17 * Math.pow(1 - lv / 100, 1.6);                 // por minuto de práctica: 25 en ~3 h · 50 en ~8 h · 75 en ~21 h · 90 en ~48 h
const maxMin = () => Math.round(10 + A().S().discipline * 0.5);

/** Multiplicadores que aplica game.js a la bajada de felicidad, energía y disciplina. */
function stress() { const n = nActive(), sp = T().extra.sport.lv; return { happy: 1 + 0.08 * n, energy: (1 + 0.08 * n) * (1 - sp * 0.0015), hunger: 1 + sp * 0.001, disc: 1 - 0.15 * n }; }

/* ----------------------------- obras y mercado ---------------------------- */
const rng = seed => { let s = (seed % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const PAINT_T = [['Garabato', 'Mancha', 'Boceto'], ['Paisaje', 'Atardecer', 'Mi jardín', 'Colinas'], ['Amanecer', 'Lago azul', 'Primavera', 'El gran árbol'], ['Obra maestra', 'Sueño dorado', 'Cielo eterno']];
const SONG_T = [['Ruido', 'Tarareo', 'Ensayo'], ['Canción de lima', 'Melodía suave', 'Vals pequeño'], ['Serenata', 'Tarde de piano', 'Baile del jardín'], ['Sinfonía lima', 'Gran concierto', 'Nocturno de oro']];
const BOOK_A = ['El misterio', 'La aventura', 'El secreto', 'El viaje', 'La leyenda', 'El diario'], BOOK_B = ['de la lima', 'del jardín', 'de la estrella', 'del gran bosque', 'de la luna', 'del caracol'];
const tier = q => (q < 25 ? 0 : q < 55 ? 1 : q < 80 ? 2 : 3);
function titleOf(k, q, seed) {
  const r = rng(seed + 11), pick = a => a[Math.floor(r() * a.length)];
  if (k === 'painting') return pick(PAINT_T[tier(q)]);
  if (k === 'song') return pick(SONG_T[tier(q)]);
  if (k === 'book') return `${pick(BOOK_A)} ${pick(BOOK_B)}`;
  return `Capítulo ${seed % 90 + 1}`;
}
function makeWork(k) {                                        // k: painting | writing | music
  const t = T(), lv = lvOf(k), q = clamp(Math.round(lv + (Math.random() * 16 - 8)), 1, 100), seed = Math.floor(Math.random() * 1e6);
  const L2 = A();
  if (k === 'writing') {
    t.book.push(q);
    if (t.book.length < CHAPTERS) return { text: `✍️ ¡Capítulo ${t.book.length}/${CHAPTERS} escrito! Calidad ${q}` };
    const avg = Math.round(t.book.reduce((a, b) => a + b, 0) / t.book.length) + 4;
    t.book = []; t.stats.books++; L.progress && L.progress.stat('books');
    if (t.works.length < MAX_WORKS) t.works.push({ k: 'book', q: clamp(avg, 1, 100), seed, t: Date.now(), title: titleOf('book', avg, seed) });
    return { text: `📚 ¡LIBRO TERMINADO! «${titleOf('book', avg, seed)}» · calidad ${clamp(avg, 1, 100)}` };
  }
  const wk = k === 'painting' ? 'painting' : 'song';
  if (t.works.length >= MAX_WORKS) return { text: 'El estudio está lleno de obras: véndelas en el mercado' };
  t.works.push({ k: wk, q, seed, t: Date.now(), title: titleOf(wk, q, seed) });
  L.progress && L.progress.stat('works');
  return { text: `${TAL[k].icon} ¡${wk === 'painting' ? 'Cuadro' : 'Canción'} terminado: «${titleOf(wk, q, seed)}»! Calidad ${q}` };
}
function dayInfo() {
  const d = today(), t = T();
  if (t.sold.day !== d) t.sold = { day: d, n: {}, patron: false };
  const h = hash(d);
  return { factor: 0.8 + (h % 41) / 100, patron: h % 4 === 0 && !t.sold.patron };
}
const MULT = { painting: 1, song: 0.9, book: 4, chapter: 0.22 };
function priceOf(w, withPatron) {
  const t = T(), di = dayInfo(), n = t.sold.n[w.k] || 0, sat = Math.max(0.5, 1 - 0.1 * n);
  const p = (1 + 60 * Math.pow(w.q / 100, 2)) * MULT[w.k] * di.factor * sat * (withPatron ? 2 : 1);
  return Math.max(1, Math.round(p));
}
function sell(w, patron) {
  const a = A(), t = T(), p = priceOf(w, patron);
  if (w.k === 'chapter') { const i = t.book.indexOf(w.q); if (i >= 0) t.book.splice(i, 1); }
  else { const i = t.works.indexOf(w); if (i >= 0) t.works.splice(i, 1); }
  t.sold.n[w.k] = (t.sold.n[w.k] || 0) + 1;
  if (patron) t.sold.patron = true;
  a.S().lp += p; L.progress.stat('lpEarned', p); L.progress.stat('soldLp', p);
  a.sound.play('coin'); a.setMsg(`🪙 Vendido por ${p}${patron ? ' (mecenas ×2)' : ''}`, 2600);
  L.progress.check(); a.save(); a.render();
}
const allSellables = () => { const t = T(); return [...t.works, ...t.book.map(q => ({ k: 'chapter', q }))]; };

/* ------------------------- dibujo de cuadros (píxeles) --------------------- */
const PALS = [['#9fd8ff', '#ffe45c', '#7bc06a', '#3f9a3c', '#8a5a2c'], ['#f6b27a', '#ffd84d', '#6b4a8f', '#2b2f6b', '#3a2a14'], ['#27324f', '#f4ecc8', '#2f5a4f', '#1d2a3f', '#10202f'], ['#ffd1e8', '#ff7aa8', '#b99cff', '#6e5fd4', '#3a2a5a'], ['#cfeeff', '#ffffff', '#6ec6ff', '#3b82d6', '#1f3a6b']];
/** Cuadro de 16×12 «píxeles»: más detalle cuanto mayor es la calidad. put(x, y, w, h, color) dibuja un rectángulo. */
function paintArt(put, seed, q) {
  const W = 16, H = 12, r = rng(seed * 7 + 3), pal = PALS[Math.floor(r() * PALS.length)];
  if (q < 25) {
    put(0, 0, W, H, '#fff8e6');
    for (let i = 0; i < 7; i++) put(Math.floor(r() * 13), Math.floor(r() * 9), 1 + Math.floor(r() * 4), 1 + Math.floor(r() * 3), pal[Math.floor(r() * 5)]);
    return;
  }
  put(0, 0, W, H, pal[0]);
  put(1 + Math.floor(r() * 11), 1 + Math.floor(r() * 2), 3, 3, pal[1]);
  const gy = 7;
  put(0, gy, W, H - gy, pal[2]);
  for (let x = 0; x < W; x++) put(x, gy - Math.round(1 + Math.sin(x / 2.2 + r() * 0.2) * 1.2), 1, 2, pal[2]);
  if (q >= 55) { const tx = 2 + Math.floor(r() * 11); put(tx, gy - 3, 1, 4, pal[4]); put(tx - 1, gy - 5, 3, 3, pal[3]); }
  if (q >= 65) { const hx = 2 + Math.floor(r() * 10); put(hx, gy + 1, 4, 3, pal[4]); put(hx - 0, gy, 4, 1, '#b3392b'); put(hx + 1, gy + 2, 1, 2, pal[0]); }
  if (q >= 75) for (let i = 0; i < 3; i++) put(1 + Math.floor(r() * 13), Math.floor(r() * 3), 2, 1, '#2a2433');
  if (q >= 85) { put(0, H - 2, W, 2, pal[3]); put(2, H - 2, 3, 1, pal[1]); put(9, H - 1, 4, 1, pal[1]); }
  if (q >= 94) for (let i = 0; i < 5; i++) put(Math.floor(r() * 15), Math.floor(r() * 11), 1, 1, '#ffd84d');
}
function thumb(w) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 12; c.className = 'thumb';
  const g = c.getContext('2d');
  if (w.k === 'painting') paintArt((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }, w.seed, w.q);
  else {
    const r = rng(w.seed), col = ['#b3392b', '#3b82d6', '#2f7d32', '#6b4a8f', '#c98f4a'][Math.floor(r() * 5)];
    g.fillStyle = '#fff8e6'; g.fillRect(0, 0, 16, 12);
    if (w.k === 'song') { g.fillStyle = '#2a2433'; for (let i = 0; i < 5; i++) g.fillRect(1, 2 + i * 2, 14, 1); g.fillStyle = col; for (let i = 0; i < 5; i++) g.fillRect(2 + i * 3, 1 + Math.floor(r() * 8), 2, 2); }
    else { g.fillStyle = col; g.fillRect(3, 1, 10, 10); g.fillStyle = '#fff8e6'; g.fillRect(4, 2, 8, 2); g.fillRect(4, 6, 8, 1); g.fillRect(4, 8, 6, 1); }
  }
  return c;
}

/* ---------------------------------- música ---------------------------------- */
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659];                    // pentatónica de Do
/** Toca una frase: con nivel bajo desafina, va a trompicones y se salta notas; con nivel alto suena limpia y con acompañamiento. */
function play(q, seed) {
  const a = A(), s = a.sound;
  if (!s.enabled() || !s.tone) return 0;
  const r = rng((seed || Math.floor(Math.random() * 1e6)) + 5), n = 10;
  const bad = clamp(1 - q / 70, 0, 1), step = 0.28;                         // «bad» 1 = muy malo · 0 = limpio
  let at = 0, idx = 3;
  for (let i = 0; i < n; i++) {
    idx = clamp(idx + Math.floor(r() * 5) - 2, 0, SCALE.length - 1);
    let f = SCALE[idx];
    if (r() < bad * 0.55) f *= Math.pow(2, (Math.floor(r() * 5) - 2 + 0.5) / 12);       // nota desafinada
    const jit = (r() - 0.5) * step * bad * 1.1, dur = step * (0.9 + (r() - 0.5) * 0.4 * bad);
    if (!(r() < bad * 0.18)) {                                                          // a veces se salta la nota
      s.tone(f, dur * 1.5, { type: q < 35 ? 'square' : 'triangle', vol: q < 35 ? 0.045 : 0.07, at: Math.max(0, at + jit) });
      if (q >= 50) s.tone(f * 2, dur, { type: 'sine', vol: 0.025, at: Math.max(0, at + jit) });         // brillo
    }
    if (q >= 75 && i % 2 === 0) s.tone(SCALE[idx] / 2, dur * 2.2, { type: 'sine', vol: 0.06, at });     // bajo
    if (q >= 90 && i % 4 === 0) s.tone(SCALE[idx] * 1.5, dur * 3, { type: 'triangle', vol: 0.035, at }); // armonía
    at += step;
  }
  return at;
}
setInterval(() => {                                                       // mientras practica música en el estudio, suena
  const a = A && A(); if (!a || !a.S) return;
  const s = a.S(), t = s.talent;
  if (!t || !t.practice || t.practice.k !== 'music' || document.hidden || !a.isHere || a.isHere() !== 'studio') return;
  play(t.music.lv);
}, 6500);

/* ------------------------------ práctica ------------------------------ */
const working = () => { const t = T(); return t.practice ? t.practice.k : null; };
function why(k) {
  const s = A().S();
  if (!owns(k)) return 'Compra el objeto en la tienda (Estudio)';
  if (s.stage === 'egg' || s.stage === 'dead' || s.stage === 'baby') return 'Aún es muy pequeño para practicar';
  if (L.kitchen && L.kitchen.cooking()) return 'Ahora está cocinando';
  if (s.pause) return 'Está de vacaciones';
  if (s.sleeping) return 'Zzz… está durmiendo';
  if (s.sick) return 'Está enfermo';
  if (s.call || s.mess) return 'Atiéndelo primero: te necesita';
  if (s.hunger < 20) return 'Tiene hambre: dale de comer primero';
  if (s.happy < 20) return 'Está triste: que juegue primero';
  if (s.energy < 15) return 'Está cansado: que descanse primero';
  return null;
}
function begin(k, mins) {
  const a = A(), t = T(), bad = why(k);
  if (bad) { a.closePanel(); a.setMsg('⚠️ ' + bad, 4000); a.sound.play('refuse'); return; }
  if (t.practice) { a.setMsg('Ya está practicando', 2500); return; }
  t.practice = { k, total: mins, min: 0 };
  a.closePanel(); a.sound.play('trick');
  a.setMsg(`${TAL[k].icon} Empieza a practicar ${mins} min`, 3000);
  a.save(); a.render();
}
function finish(reason, quiet) {
  const a = A(), t = T(), P = t.practice;
  if (!P) return;
  t.practice = null;
  let msg;
  if (P.min >= 5) { msg = makeWork(P.k).text; if (reason !== 'done') msg += ' (sesión corta)'; }
  else msg = 'Ha dejado de practicar';
  const why2 = { dormir: 'Tiene sueño', enfermo: 'Se ha puesto enfermo', hambre: 'Tiene hambre', triste: 'Está triste', cansado: 'Está agotado', llamada: 'Le llama la atención', trav: 'Se ha puesto travieso', pausa: '' }[reason];
  if (why2) msg = `${why2}. ${msg}`;
  if (quiet) { t.news = msg; }
  else { a.setMsg(msg, 5000); a.sound.play(P.min >= 5 ? 'win' : 'sad'); L.notify && L.notify.event && L.notify.event('Limagochi', msg); }
  barOn = false; a.skillBar && a.skillBar(null);
  L.progress && L.progress.check();
}
function stop() { if (!T().practice) return false; finish('stop', false); A().render(); return true; }

let barOn = false;
function tick(dt, quiet) {
  const a = A(), s = a.S(), t = T();
  KEYS.forEach(k => {                                                      // si no practica un talento, se oxida muy despacio
    const x = t[k]; if (x.lv <= 0) return;
    if (t.practice && t.practice.k === k) { x.idle = 0; return; }
    x.idle += dt;
    if (x.idle > 4320) x.lv = Math.max(x.mx * 0.5, x.lv - 0.00035 * dt);
  });
  EK.forEach(k => {                                                         // olvido suave de las habilidades extra
    const x = t.extra[k]; if (x.lv <= 0) return;
    x.idle += dt;
    if (x.idle > 4320) x.lv = Math.max(x.mx * 0.5, x.lv - 0.00035 * dt);
  });
  if (!quiet && t.news) { a.setMsg(t.news, 5000); t.news = ''; }
  const P = t.practice;
  if (!P) { if (barOn) { barOn = false; a.skillBar(null); } return; }
  const reason = s.sleeping ? 'dormir' : s.pause ? 'pausa' : s.sick ? 'enfermo' : s.call ? 'llamada' : s.mess ? 'trav' : s.hunger < 15 ? 'hambre' : s.happy < 12 ? 'triste' : s.energy < 12 ? 'cansado' : null;
  if (reason) { finish(reason, quiet); return; }
  const x = t[P.k];
  x.lv = Math.min(99, x.lv + gain(x.lv) * dt * (s.happy < 40 ? 0.7 : 1)); x.mx = Math.max(x.mx, x.lv);
  s.happy = clamp(s.happy - 0.10 * dt, 0, 100); s.energy = clamp(s.energy - 0.12 * dt, 0, 100); s.discipline = clamp(s.discipline + 0.03 * dt, 0, 100);
  P.min += dt;
  if (P.min >= P.total) { finish('done', quiet); return; }
  if (!quiet) { barOn = true; a.skillBar({ icon: TAL[P.k].icon, label: `${TAL[P.k].name} ${Math.floor(x.lv)}`, pct: x.lv, sub: `${Math.max(1, Math.ceil(P.total - P.min))} min` }); }
}

/* ------------------------------ menús (paneles) ------------------------------ */
const bar = (v, n = 10) => '▰'.repeat(Math.round(v / 100 * n)) + '▱'.repeat(n - Math.round(v / 100 * n));
const talentLine = k => `${TAL[k].icon} ${TAL[k].name} nv ${Math.floor(lvOf(k))} ${bar(lvOf(k))}`;

function openTalent(k) {
  const a = A(), t = T(), P = t.practice, nodes = [a.p(talentLine(k))];
  if (!owns(k)) { a.setMsg('Compra el objeto en la 🛒 tienda (Estudio)', 3000); return; }
  if (P && P.k === k) {
    nodes.push(a.p(`Practicando… ${Math.max(1, Math.ceil(P.total - P.min))} min`), a.btn('Parar y guardar lo hecho', () => { a.closePanel(); stop(); }));
  } else if (P) nodes.push(a.p(`Ahora practica ${TAL[P.k].name.toLowerCase()}`));
  else if (why(k)) nodes.push(a.p('⚠️ ' + why(k)));
  else {
    const m = maxMin();
    nodes.push(a.p(`Aguanta hasta ${m} min por sesión (según su disciplina)`));
    nodes.push(a.btn(`${TAL[k].icon} Sesión larga · ${m} min`, () => begin(k, m)));
    if (m > 12) nodes.push(a.btn('Sesión corta · 10 min', () => begin(k, 10)));
  }
  if (k === 'music') nodes.push(a.btn('🔊 Escuchar cómo toca', () => { play(lvOf('music')); a.setMsg(`🎵 Toca con nivel ${Math.floor(lvOf('music'))}`, 3000); }));
  if (k === 'writing') nodes.push(a.p(`Libro en curso: ${t.book.length}/${CHAPTERS} capítulos`));
  nodes.push(a.btn('🧾 Obras y mercado', market), a.btn('Cerrar', a.closePanel, 'ghost'));
  a.openPanel(nodes);
}

function market(back) {
  const a = A(), t = T(), di = dayInfo(), list = allSellables();
  const pct = Math.round((di.factor - 1) * 100);
  const nodes = [a.p(`🧾 Mercado · ${pct >= 0 ? '📈 +' : '📉 '}${pct}% hoy`)];
  if (di.patron && list.length) {
    const best = list.reduce((m, w) => (priceOf(w) > priceOf(m) ? w : m));
    nodes.push(a.btn(`🎩 Mecenas: ${priceOf(best, true)} 🪙 por «${best.title || 'capítulo'}»`, () => { sell(best, true); market(back); }));
  }
  if (!list.length) nodes.push(a.p('Aún no hay obras. Practica en el estudio.'));
  list.forEach(w => {
    const label = `${w.k === 'painting' ? '🖼️' : w.k === 'song' ? '🎼' : w.k === 'book' ? '📚' : '📄'} ${w.title || 'Capítulo'} · calidad ${w.q} · ${priceOf(w)} 🪙`;
    const wrap = document.createElement('div'); wrap.className = 'shopitem';
    const b = a.btn(label, () => { sell(w); market(back); });
    const right = document.createElement('div'); right.className = 'shopcol'; right.append(b);
    wrap.append(thumb(w.k === 'chapter' ? { k: 'chapter', seed: w.q, q: w.q } : w), right);
    nodes.push(wrap);
  });
  nodes.push(a.p('Precios por calidad. Vender muchas obras iguales el mismo día las abarata. Un libro completo (4 capítulos) vale mucho más que sus capítulos sueltos.'));
  nodes.push(a.btn('Cerrar', typeof back === 'function' ? back : a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}

function openStatus(back) {
  const a = A(), t = T(), n = nActive();
  const nodes = [a.p('🎨 Talentos'), ...KEYS.map(k => a.p(`${talentLine(k)}${owns(k) ? '' : ' · 🔒 sin objeto'}`))];
  EK.forEach(k => nodes.push(a.p(`${EXTRA[k].icon} ${EXTRA[k].name} nv ${Math.floor(t.extra[k].lv)} ${bar(t.extra[k].lv)}`)));
  nodes.push(a.p(n ? `${n} talento${n > 1 ? 's' : ''} activo${n > 1 ? 's' : ''}: la disciplina baja ${n * 15}% más despacio, pero felicidad y energía caen ${n * 8}% más rápido.` : 'Sube un talento a nivel 10 para ganar disciplina extra (pero se cansa más).'));
  nodes.push(a.p(`Sesión máxima: ${maxMin()} min (según su disciplina). Libros escritos: ${t.stats.books}.`));
  nodes.push(a.btn('🧾 Obras y mercado', () => market(() => openStatus(back))), a.btn('Atrás', back || a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}

function open(id) {
  const a = A();
  if (id === 'st_market' || id === 'st_shelf') { market(); return; }
  const k = KEYS.find(x => TAL[x].obj === id);
  if (k) openTalent(k);
}

/* ------------------------------ dibujo de la sala ------------------------------ */
const put = (x, y, w, h, c) => { const a = A(); a.ctx.fillStyle = a.tint(c); a.ctx.fillRect(x / 2, y / 2, w / 2, h / 2); };
function drawBack() {
  put(0, 0, 96, 72, '#e9d9b8'); put(0, 0, 96, 3, '#d4c096');
  for (let x = 0; x < 96; x += 12) put(x, 3, 1, 41, '#dfcba0');                           // listones de papel pintado
  put(0, 44, 96, 2, '#8a5a2c'); put(0, 46, 96, 26, '#b07a46');
  for (let y = 50; y < 72; y += 6) put(0, y, 96, 1, '#9a6a3a');
  for (let x = 6; x < 96; x += 18) for (let y = 46; y < 72; y += 12) put(x + (y % 24 ? 9 : 0), y, 1, 6, '#9a6a3a');
}
function drawItems(now) {
  const t = T(), s = A().S(), w = working();
  // galería: los 2 mejores cuadros sin vender
  const arts = t.works.filter(x => x.k === 'painting').sort((a, b) => b.q - a.q).slice(0, 2);
  [3, 25].forEach((fx, i) => {
    put(fx - 1, 7, 20, 16, arts[i] && arts[i].q >= 80 ? '#e0b030' : '#6b4a1f');
    if (arts[i]) paintArt((x, y, ww, hh, c) => put(fx + 1 + x, 9 + y, ww, hh, c), arts[i].seed, arts[i].q);
    else put(fx, 8, 18, 14, '#f4ecd8');
  });
  // estantería con los libros escritos
  put(47, 18, 19, 2, '#8a5a2c'); put(47, 8, 19, 2, '#8a5a2c'); put(47, 8, 2, 12, '#8a5a2c'); put(64, 8, 2, 12, '#8a5a2c');
  const cols = ['#b3392b', '#3b82d6', '#2f7d32', '#6b4a8f', '#c98f4a', '#ff8fb1', '#2a2433', '#ffd84d'];
  for (let i = 0; i < Math.min(7, t.stats.books); i++) put(50 + i * 2, 11, 2, 7, cols[i]);
  if (!t.stats.books) put(50, 14, 13, 1, '#bfa97a');
  // cartel del mercado (siempre)
  put(68, 6, 24, 3, '#b3392b'); for (let x = 68; x < 92; x += 6) put(x, 6, 3, 3, '#fff8e6');
  put(69, 9, 22, 13, '#c98f4a'); put(70, 10, 20, 11, '#e6c88a');
  put(76, 12, 8, 8, '#ffd84d'); put(77, 13, 6, 6, '#ffb300'); put(79, 14, 2, 4, '#ffd84d');
  // caballete
  if (owns('painting')) {
    put(10, 46, 2, 14, '#6b4a1f'); put(26, 46, 2, 14, '#6b4a1f'); put(18, 30, 2, 28, '#8a5a2c');
    put(8, 26, 22, 18, '#6b4a1f'); put(10, 28, 18, 14, '#fff8e6');
    const last = t.works.filter(x => x.k === 'painting').slice(-1)[0];
    if (w === 'painting') { const p = Math.floor(now / 400) % 6; put(11, 29, 16, 12, '#fff8e6'); for (let i = 0; i <= p; i++) put(12 + (i * 5) % 13, 30 + (i * 3) % 9, 4, 2, ['#3b82d6', '#e0392f', '#ffd84d', '#2f7d32', '#b99cff', '#ff8fb1'][i % 6]); }
    else if (last) paintArt((x, y, ww, hh, c) => put(10 + x, 29 + y, ww, hh, c), last.seed, last.q);
    put(30, 50, 4, 8, '#c98f4a'); put(30, 50, 4, 2, '#e0392f');                           // pinturas
  }
  // escritorio
  if (owns('writing')) {
    put(36, 46, 30, 4, '#8a5a2c'); put(36, 46, 30, 1, '#a8713a'); put(38, 50, 3, 12, '#6b4a1f'); put(61, 50, 3, 12, '#6b4a1f');
    put(44, 36, 14, 10, '#cfd6de'); put(45, 37, 12, 7, w === 'writing' ? '#dff3ff' : '#2a3a4f'); put(41, 45, 20, 2, '#9aa5b1');
    put(38, 43, 5, 3, '#fff8e6'); put(38, 43, 5, 1, '#e0e0e0');
    if (w === 'writing') for (let i = 0; i < 3; i++) put(47, 39 + i * 2, 4 + (Math.floor(now / 300) + i) % 4, 1, '#2a2433');
  }
  // piano
  if (owns('music')) {
    put(66, 32, 28, 4, '#2a2433'); put(66, 36, 28, 14, '#3a3346'); put(64, 46, 32, 3, '#fff8e6');
    for (let x = 65; x < 95; x += 3) put(x, 46, 1, 3, '#2a2433');
    for (let x = 67; x < 95; x += 6) put(x, 44, 2, 3, '#2a2433');
    put(68, 50, 3, 12, '#2a2433'); put(89, 50, 3, 12, '#2a2433');
    if (w === 'music') { const k = Math.floor(now / 250) % 8; put(65 + k * 3, 47, 2, 2, '#ffd84d'); }
  }
}
function drawFx(now) {
  const w = working(); if (!w) return;
  const cx = { painting: 24, writing: 50, music: 78 }[w];
  for (let i = 0; i < 3; i++) {                                           // notas, hojas o gotas que suben
    const q = ((now / 1400) + i / 3) % 1, x = cx + Math.sin(q * 6 + i * 2) * 6, y = 40 - q * 24;
    if (w === 'music') { put(x, y, 2, 2, '#2a2433'); put(x + 1, y - 3, 1, 3, '#2a2433'); }
    else if (w === 'writing') put(x, y, 3, 2, '#fff8e6');
    else put(x, y, 2, 2, ['#3b82d6', '#e0392f', '#ffd84d'][i]);
  }
}
const HITS = [['st_easel', 4, 12, 18, 31, 'easel'], ['st_desk', 17, 18, 33, 31, 'desk'], ['st_piano', 32, 16, 48, 31, 'piano'], ['st_shelf', 23, 4, 33, 10, null], ['st_market', 34, 3, 47, 12, null]];
function hit(x, y) {
  const s = A().S();
  for (const [id, x0, y0, x1, y1, need] of HITS) if (x >= x0 && x < x1 && y >= y0 && y < y1 && (!need || s.owned.includes(need))) return id;
  if (y >= 3 && y < 12 && x >= 1 && x < 23) return 'st_shelf';                       // galería de cuadros
  return null;
}
const petPos = () => { const w = working(); return { painting: { x: 15, y: 11 }, writing: { x: 14, y: 11 }, music: { x: 27, y: 11 } }[w] || { x: 12, y: 11 }; };

function showBar() {
  const P = T().practice; if (!P) return;
  const x = T()[P.k];
  A().skillBar({ icon: TAL[P.k].icon, label: `${TAL[P.k].name} ${Math.floor(x.lv)}`, pct: x.lv, sub: `${Math.max(1, Math.ceil(P.total - P.min))} min` });
}
L.studio = { xp, extraLv, EXTRA, showBar, ITEMS, TAL, KEYS, fix, blank, tick, stress, stop, working, petPos, drawBack, drawItems, drawFx, hit, open, openStatus, market, play, lvOf, nActive, maxMin, priceOf };
})();
