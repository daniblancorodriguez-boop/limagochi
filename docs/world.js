/* ==========================================================================
   LIMAGOCHI · mundo: reloj real (día/noche), ajustes, eventos de temporada
   Para probar sin esperar: ?hour=23  ·  ?date=2026-10-31  (en la URL)
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const params = new URLSearchParams(location.search);

/* ------------------------------ ajustes -------------------------------- */
const SKEY = 'limagochi.settings';
const settings = { cycle: true, events: true, rest: true, restFrom: 0, restTo: 6, fine: true, mono: true, nick: '', cid: '' };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch { /* */ }
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch { /* */ } };
L.settings = {
  get: k => settings[k],
  set(k, v) { settings[k] = v; persist(); },
  all: () => ({ ...settings }),
  replace(o) { for (const k in settings) if (typeof o[k] === typeof settings[k]) settings[k] = o[k]; persist(); }
};

/* ------------------------------ reloj ---------------------------------- */
function now() {
  const d = new Date();
  const ds = params.get('date');
  if (ds && /^\d{4}-\d{2}-\d{2}$/.test(ds)) { const [y, m, dd] = ds.split('-').map(Number); d.setFullYear(y, m - 1, dd); }
  const h = params.get('hour');
  if (h !== null && h !== '' && !isNaN(h)) d.setHours(Math.max(0, Math.min(23, Number(h))), 0, 0, 0);
  return d;
}
/** night 22:00–06:59 · dusk 07:00–07:59 y 19:00–21:59 · day el resto. Con el ciclo desactivado siempre es de día. */
function phaseAt(ts) {
  if (!settings.cycle) return 'day';
  const ov = params.get('hour');
  const h = ov !== null && ov !== '' && !isNaN(ov) ? Math.max(0, Math.min(23, Number(ov))) : new Date(ts).getHours();
  if (h >= 22 || h < 7) return 'night';
  if (h < 8 || h >= 19) return 'dusk';
  return 'day';
}
const phase = () => phaseAt(now().getTime());
/** Mañana (07:00–11:59): a esa hora se despierta solo aunque no haya recuperado toda la energía. */
function isMorningAt(ts) {
  if (!settings.cycle) return false;
  const ov = params.get('hour');
  const h = ov !== null && ov !== '' && !isNaN(ov) ? Number(ov) : new Date(ts).getHours();
  return h >= 7 && h < 12;
}

/* ------------------------------ eventos --------------------------------- */
const EVENTS = [
  { id: 'halloween',   icon: '🎃', name: 'Halloween',    from: [10, 24], to: [11, 2] },
  { id: 'navidad',     icon: '🎄', name: 'Navidad',      from: [12, 15], to: [1, 6] },
  { id: 'sanvalentin', icon: '💝', name: 'San Valentín', from: [2, 10],  to: [2, 15] },
  { id: 'primavera',   icon: '🌸', name: 'Primavera',    from: [3, 20],  to: [4, 20] },
  { id: 'verano',      icon: '☀️', name: 'Verano',       from: [6, 21],  to: [8, 31] }
];
/* comida de temporada: solo aparece en los menús mientras dura el evento */
const EVENT_FOODS = [
  { id: 'pumpkin',  event: 'halloween',   cat: 'meal',  icon: '🎃', name: 'Calabaza asada',     hunger: 30, happy: 10, weight: 1,   disc: 0,  diet: 'veg' },
  { id: 'ghostcake',event: 'halloween',   cat: 'snack', icon: '🧁', name: 'Magdalena fantasma', hunger: 8,  happy: 30, weight: 2,   disc: -4, diet: 'candy', sweet: 0.6 },
  { id: 'turkey',   event: 'navidad',     cat: 'meal',  icon: '🦃', name: 'Pavo navideño',      hunger: 40, happy: 12, weight: 1.5, disc: 0,  diet: 'meat' },
  { id: 'nougat',   event: 'navidad',     cat: 'snack', icon: '🍫', name: 'Turrón',             hunger: 8,  happy: 30, weight: 2,   disc: -4, diet: 'candy', sweet: 0.8 },
  { id: 'strawberry',event:'sanvalentin', cat: 'snack', icon: '🍓', name: 'Fresas con nata',    hunger: 10, happy: 32, weight: 1.5, disc: 0,  diet: 'candy', sweet: 0.5 },
  { id: 'bonbon',   event: 'sanvalentin', cat: 'meal',  icon: '🍝', name: 'Pasta del corazón',  hunger: 34, happy: 14, weight: 1.5, disc: 0,  diet: 'veg' },
  { id: 'flowersalad',event:'primavera',  cat: 'meal',  icon: '🥬', name: 'Ensalada de flores', hunger: 24, happy: 12, weight: 0.3, disc: 0,  diet: 'veg' },
  { id: 'honey',    event: 'primavera',   cat: 'snack', icon: '🍯', name: 'Miel fresca',        hunger: 10, happy: 28, weight: 1.5, disc: 0,  diet: 'candy', sweet: 0.4 },
  { id: 'watermelon',event:'verano',      cat: 'meal',  icon: '🍉', name: 'Sandía fría',        hunger: 22, happy: 14, weight: 0.5, disc: 0,  diet: 'veg' },
  { id: 'icecream', event: 'verano',      cat: 'snack', icon: '🍦', name: 'Helado',             hunger: 6,  happy: 30, weight: 1.5, disc: -3, diet: 'candy', sweet: 0.7 }
];

function inRange(d, [fm, fd], [tm, td]) {
  const v = (d.getMonth() + 1) * 100 + d.getDate(), a = fm * 100 + fd, b = tm * 100 + td;
  return a <= b ? v >= a && v <= b : v >= a || v <= b;      // los eventos de fin de año cruzan enero
}
function eventNow() {
  if (!settings.events) return null;
  const d = now();
  return EVENTS.find(e => inRange(d, e.from, e.to)) || null;
}

/* --------------------------- dibujo (decoración) ------------------------- */
const T = c => (L.api && L.api.tint ? L.api.tint(c) : c);
const px = (g, x, y, w, h, c) => { g.fillStyle = T(c); g.fillRect(x, y, w, h); };
const draw = (g, x, y, rows, map) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (map[ch]) px(g, x + i, y + j, 1, 1, map[ch]); }));

function skyColors(lcd) {
  const p = phase();
  if (lcd) return { day: '#d4e5a4', dusk: '#b8d474', night: '#3f5a28' }[p];
  return { day: '#d4e5a4', dusk: '#ecd49a', night: '#27324f' }[p];
}

function sky(g, W, H, t, lcd) {
  const p = phase();
  g.fillStyle = skyColors(lcd); g.fillRect(0, 0, W, H);
  if (p === 'night') {
    const star = lcd ? '#b8d474' : '#f7fbe6';
    [[4, 3], [11, 8], [19, 4], [27, 10], [33, 3], [44, 8], [8, 15], [40, 16], [23, 14]].forEach(([x, y], i) => {
      if ((Math.floor(t / 600) + i) % 5) px(g, x, y, 1, 1, star);
    });
    draw(g, 38, 4, ['.hhh.', 'hhh..', 'hh...', 'hhh..', '.hhh.'], { h: lcd ? '#d4e5a4' : '#f4ecc8' });      // luna
  } else if (p === 'dusk') {
    px(g, 0, 26, W, 7, lcd ? '#d4e5a4' : '#f3b98a');                                                           // franja de atardecer
    px(g, 0, 22, W, 4, lcd ? '#c9de92' : '#f6cf95');
  }
}

const ROW = (n, c) => c.repeat(n);
function decor(g, ev, t, W, H) {
  if (!ev) return;
  const id = ev.id;
  if (id === 'halloween') {
    draw(g, 1, 27, ['..g...', '.oooo.', 'oooooo', 'okook.', 'oooooo', '.oooo.'].map(r => r.replace('k', 'K')), { o: '#f29a3c', g: '#3f5a28', K: '#1d2a12', k: '#1d2a12' });
    const bx = ((t / 70) % 62) - 8, by = 5 + Math.round(Math.sin(t / 300) * 2);
    draw(g, Math.round(bx), by, Math.floor(t / 180) % 2 ? ['k...k', 'kkkkk', '.k.k.'] : ['.kkk.', 'kkkkk', 'k...k'], { k: '#2b2233' });
  } else if (id === 'navidad') {
    draw(g, 41, 20, ['..y..', '.ggg.', '..g..', '.ggg.', 'ggggg', '.ggg.', 'ggggg', 'ggggg', '..n..'], { y: '#ffd84d', g: '#3f7a35', n: '#6b4a1f' });
    for (let i = 0; i < 9; i++) px(g, (i * 5 + Math.round(Math.sin(t / 900 + i) * 2) + 48) % 48, Math.floor((t / 90 + i * 11) % 34), 1, 1, '#f7fbe6');
  } else if (id === 'sanvalentin') {
    for (let i = 0; i < 4; i++) {
      const y = 32 - Math.floor((t / 100 + i * 9) % 36);
      draw(g, 4 + i * 11 + Math.round(Math.sin(t / 500 + i) * 2), y, ['p.p', 'ppp', '.p.'], { p: '#ff8fb1' });
    }
  } else if (id === 'primavera') {
    [4, 14, 30, 43].forEach((x, i) => draw(g, x, 27, [i % 2 ? '.y.' : '.p.', i % 2 ? 'yKy' : 'pKp', '.g.', '.g.', '.g.'].map(r => r.replace('K', 'w')), { p: '#ff8fb1', y: '#ffd84d', w: '#f7fbe6', g: '#3f7a35' }));
    const bx = 8 + Math.round(((Math.sin(t / 1400) + 1) / 2) * 30), by = 8 + Math.round(Math.sin(t / 400) * 3);
    draw(g, bx, by, Math.floor(t / 200) % 2 ? ['o.o', '.k.', 'o.o'] : ['.k.', 'ooo', '.k.'], { o: '#f29a3c', k: '#1d2a12' });
  } else if (id === 'verano') {
    px(g, 38, 3, 6, 6, '#ffd84d'); px(g, 37, 4, 8, 4, '#ffd84d'); px(g, 39, 2, 4, 8, '#ffd84d');
    const ray = Math.floor(t / 400) % 2;
    [[41, ray], [41, 10 - ray], [36 - ray, 6], [46 + ray, 6]].forEach(([x, y]) => px(g, x, y, 1, 1, '#f29a3c'));
  }
}

/* gorros por evento: [filas, mapa de colores, alto]; se apoyan en la fila superior del cuerpo */
const HATS = {
  halloween: { rows: ['....kk....', '...kkkk...', '...kkkk...', '..kkkkkk..', '..vvvvvv..', 'kkkkkkkkkk'], map: { k: '#2b2233', v: '#8a4fd6' } },
  navidad:   { rows: ['....ww....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', 'wwwwwwwwww'],            map: { r: '#e0523f', w: '#f7fbe6' } },
  sanvalentin: { rows: ['.pp..pp.', 'pppppppp', '.pppppp.', '..pppp..', '...pp...'],                     map: { p: '#ff8fb1' } },
  primavera: { rows: ['p.y.p.y.p.', 'gggggggggg'],                                                           map: { p: '#ff8fb1', y: '#ffd84d', g: '#3f7a35' } },
  verano:    { rows: ['...yyyy...', '..yyyyyy..', '..rrrrrr..', 'yyyyyyyyyy'],                               map: { y: '#ffd84d', r: '#e0523f' } }
};
function hat(g, evId, spriteX, bodyTopY) {
  const h = HATS[evId]; if (!h) return;
  const w = h.rows[0].length;
  draw(g, spriteX + Math.round((24 - w) / 2), bodyTopY - h.rows.length + 1, h.rows, h.map);
}

L.world = {
  now, phase, phaseAt, isMorningAt, isNight: () => phase() === 'night', event: eventNow, EVENTS, EVENT_FOODS,
  sky, decor, hat,
  eventLabel(ev) { return ev ? `${ev.icon} ${ev.name}` : ''; }
};
})();
