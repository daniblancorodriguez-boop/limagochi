/* Fondo dinámico: cambia con la sala y con el día/noche (fundido entre dos capas). */
(() => {
'use strict';
const L = window.LIMA;
const KEY = 'pprueba.dynbg';
let enabled = false; try { enabled = localStorage.getItem(KEY) === '1'; } catch { /* */ }
let force = 'auto';                                   // solo para probar: 'auto' | 'day' | 'night'
const ROOMS = { bedroom: 'cuarto', salon: 'salon', garden: 'jardin', studio: 'estudio', kitchen: 'cocina' };
const GLOW = { 'salon': 'rgba(120,160,255,.45)', 'jardin': 'rgba(150,190,255,.35)', 'playa': 'rgba(150,190,255,.35)', 'estudio': 'rgba(255,200,120,.5)', 'cocina': 'rgba(235,150,90,.4)', 'cuarto': 'rgba(255,170,90,.5)', 'dbz': 'rgba(90,170,255,.65)', 'nar': 'rgba(255,120,40,.6)', 'pk': 'rgba(255,215,60,.6)', 'pe': 'rgba(150,190,255,.55)' };
const layers = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'fx'; document.body.prepend(d); return d; });
let idx = 0, cur = '', snd = null, armed = false;                  // armed: no suena al abrir el juego, solo al activarlo

/* Sonido de activación de las carcasas con fondo propio (respeta el sonido del juego) */
const snds = {};
function sfx(src, vol) {
  try {
    if (!(L.sound && L.sound.enabled())) return;
    const a = snds[src] || (snds[src] = new Audio(src)); a.volume = vol; a.currentTime = 0;
    const p = a.play(); if (p && p.catch) p.catch(() => { /* el navegador exige un toque previo */ });
  } catch { /* */ }
}
const aura = () => sfx('snd/superaiyan.mp3', 0.8);

/* Naruto: dibujo 571×800 a pantalla completa; el fuego (mano) y los ojos destellan. [x, y, tipo, tamaño: fracción del ancho] */
const INTRO = {
  nar: { w: 571, h: 800, snd: 'snd/naruto_transicion.mp3', vol: 0.9, g: [[.50, .64, 'fire', .95], [.70, .53, 'fire', .5], [.30, .47, 'fire', .42], [.376, .34, 'eye', .13], [.613, .335, 'eye', .13]] },
  pk: { w: 381, h: 762, snd: 'snd/pokemon_trueno.mp3', vol: 0.9, g: [[.49, .72, 'zap', .8], [.30, .56, 'zap', .24], [.67, .56, 'zap', .24], [.39, .52, 'eye', .1], [.62, .52, 'eye', .1], [.15, .20, 'zap', .3], [.85, .27, 'zap', .3]] },
  pe: { w: 500, h: 750, snd: 'snd/pesadilla_jingle.mp3', vol: 0.9, g: [[.46, .30, 'moon', 1.0], [.20, .08, 'bolt', .35], [.85, .14, 'bolt', .3], [.76, .12, 'eye', .08]] }
};
const narGlints = r => INTRO[r].g.map((g, i) => `<i class="nr-g nr-${g[2]}" data-x="${g[0]}" data-y="${g[1]}" data-s="${g[3]}" style="animation-delay:-${(i * 0.37).toFixed(2)}s"></i>`).join('');
function placeNar() {
  document.querySelectorAll('[data-room]').forEach(root => {
    const c = INTRO[root.dataset.room], vw = innerWidth, vh = innerHeight, k = Math.max(vw / c.w, vh / c.h), ox = (c.w * k - vw) / 2, oy = (c.h * k - vh) / 2;
    root.querySelectorAll('.nr-g').forEach(e => {
      const sz = +e.dataset.s * c.w * k;
      e.style.left = (+e.dataset.x * c.w * k - ox) + 'px'; e.style.top = (+e.dataset.y * c.h * k - oy) + 'px'; e.style.width = e.style.height = sz + 'px';
    });
  });
}
addEventListener('resize', placeNar);
/* Al activar la carcasa: el dibujo tapa todo, suena la transición y se desvanece dejando el fondo animado */
function narIntro(r) {
  const old = document.getElementById('narIntro'); if (old) old.remove();
  const e = document.createElement('div'); e.id = 'narIntro'; e.className = r; e.dataset.room = r; e.innerHTML = '<i class="nr-img"></i>' + narGlints(r);
  document.body.append(e); placeNar(); sfx(INTRO[r].snd, INTRO[r].vol);
  setTimeout(() => e.remove(), 4000);
}

/* Carcasa Sakura: fondos japoneses (docs/bg/sakura/<sala>_<d|n>.webp, 768×1376 o 572×1024) y luces que destellan de noche.
   Cada destello: [x, y (fracción de la imagen), tipo, tamaño (fracción del ancho)] */
const SK = { bedroom: 'habitacion', salon: 'salon', garden: 'jardin', studio: 'estudio', kitchen: 'cocina' };
const SKSIZE = { cocina: [768, 1376], jardin: [768, 1376], habitacion: [572, 1024], estudio: [572, 1024], salon: [572, 1024] };
const SKG = {
  cocina: [[.512, .12, 'lamp', .3], [.60, .69, 'fire', .13], [.90, .925, 'fire', .2]],
  jardin: [[.797, .07, 'moon', .34], [.3125, .287, 'lamp', .2], [.96, .41, 'lamp', .16]],
  habitacion: [[.74, .112, 'lamp', .42]],
  estudio: [[.717, .156, 'lamp', .34], [.73, .84, 'lamp', .26]],
  salon: [[.712, .088, 'lamp', .44]]
};
let skScene = null;
function placeSk() {
  if (!skScene) return;
  const [W, H] = SKSIZE[skScene], vw = innerWidth, vh = innerHeight, k = Math.max(vw / W, vh / H), ox = (W * k - vw) / 2, oy = (H * k - vh) / 2;
  document.querySelectorAll('.sk-g').forEach(e => {
    const sz = +e.dataset.s * W * k;
    e.style.left = (+e.dataset.x * W * k - ox) + 'px'; e.style.top = (+e.dataset.y * H * k - oy) + 'px'; e.style.width = e.style.height = sz + 'px';
  });
}
addEventListener('resize', placeSk);

function want() {
  const s = L.api.S(); if (!s) return null;
  if (L.skins.current() === 'dragonball') return { room: 'dbz', night: false };      // esa carcasa trae su propio fondo
  if (L.skins.current() === 'naruto') return { room: 'nar', night: false };
  if (L.skins.current() === 'pokemon') return { room: 'pk', night: false };
  if (L.skins.current() === 'pesadilla') return { room: 'pe', night: false };
  const night = force === 'auto' ? !!(s.sleeping || (L.settings.get('cycle') && L.world.isNight())) : force === 'night';
  if (L.skins.current() === 'sakura' && !s.pause) return { room: 'sk-' + (SK[L.api.isHere()] || 'salon'), night };   // Sakura: fondos japoneses
  const room = s.pause ? 'playa' : (ROOMS[L.api.isHere()] || 'salon');
  return { room, night };
}
/* Fondo Dragon Ball: la imagen (662×463) se coloca debajo de la carcasa para que se vean Goku (cara en 250,145) y la bola de energía (555,265) */
function place() {
  const vw = innerWidth, vh = innerHeight, k = vw / 400, st = document.documentElement.style;
  const sh = document.querySelector('.shell'), bot = sh ? sh.getBoundingClientRect().bottom : vh * 0.8;
  const ox = 250 * k - 0.12 * vw;                                   // la cara queda a la izquierda y la bola a la derecha
  let top = bot + 40 - 145 * k;                                      // la cara asoma justo bajo la carcasa
  if (top + 265 * k > vh - 70) top = vh - 70 - 265 * k;              // la bola no se sale por abajo
  st.setProperty('--ix', -ox + 'px'); st.setProperty('--iy', top + 'px'); st.setProperty('--iw', 662 * k + 'px'); st.setProperty('--ih', 463 * k + 'px');
  st.setProperty('--bx', (555 * k - ox) + 'px'); st.setProperty('--by', (top + 265 * k) + 'px'); st.setProperty('--br', (170 * k) + 'px');
}
addEventListener('resize', place);
function over(on) {                                   // destello por encima de la carcasa (la luz de la bola se derrama sobre ella)
  let e = document.getElementById('dbzOver');
  if (on && !e) { e = document.createElement('div'); e.id = 'dbzOver'; document.body.append(e); place(); }
  else if (!on && e) e.remove();
}
function update() {
  const b = document.body;
  if (!enabled) { b.classList.remove('dyn', 'f-day', 'f-night'); layers.forEach(l => l.classList.remove('on')); over(false); const ni = document.getElementById('narIntro'); if (ni) ni.remove(); cur = ''; return; }
  const w = want(); if (!w) return;
  over(w.room === 'dbz'); if (w.room === 'dbz') place();
  const key = w.room + (w.night ? '-n' : '-d');
  b.classList.add('dyn'); b.classList.toggle('f-night', w.night); b.classList.toggle('f-day', !w.night);
  b.style.setProperty('--glow', GLOW[w.room] || 'rgba(255,190,120,.45)');
  if (key === cur) return;
  cur = key;
  if (w.room === 'dbz' && armed) aura();
  if (INTRO[w.room] && armed) narIntro(w.room);
  const next = layers[idx ^ 1], old = layers[idx];
  next.className = `fx f-${w.room} f-${w.night ? 'night' : 'day'}`;
  const sk = w.room.startsWith('sk-') ? w.room.slice(3) : null; skScene = sk;
  if (sk) next.classList.add('f-sk');
  next.innerHTML = sk ? (w.night ? SKG[sk].map(g => `<i class="sk-g sk-${g[2]}" data-x="${g[0]}" data-y="${g[1]}" data-s="${g[3]}" style="animation-delay:-${(Math.random() * 3).toFixed(2)}s"></i>`).join('') : '') : w.room === 'dbz' ? '<i class="dbz-img"></i><i class="dbz-flash"></i><i class="dbz-glow"></i>' : INTRO[w.room] ? '<i class="nr-img"></i>' + narGlints(w.room) : '';
  if (w.room === 'dbz') place();
  if (sk) placeSk();
  if (INTRO[w.room]) { next.dataset.room = w.room; placeNar(); }
  requestAnimationFrame(() => { next.classList.add('on'); old.classList.remove('on'); });
  idx ^= 1;
}
L.fondos = {
  on: () => enabled,
  toggle() { enabled = !enabled; try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch { /* */ } cur = ''; update(); },
  force(m) { force = m; update(); },
  update
};
setInterval(update, 400);
setTimeout(() => { update(); armed = true; }, 300);
})();
