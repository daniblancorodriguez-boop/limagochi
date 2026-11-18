/* Fondo dinámico: cambia con la sala y con el día/noche (fundido entre dos capas). */
(() => {
'use strict';
const L = window.LIMA;
const KEY = 'limagochi.dynbg';
let enabled = false; try { enabled = localStorage.getItem(KEY) === '1'; } catch { /* */ }
let force = 'auto';                                   // solo para probar: 'auto' | 'day' | 'night'
const ROOMS = { bedroom: 'cuarto', salon: 'salon', garden: 'jardin', studio: 'estudio', kitchen: 'cocina' };
const GLOW = { 'salon': 'rgba(120,160,255,.45)', 'jardin': 'rgba(150,190,255,.35)', 'playa': 'rgba(150,190,255,.35)', 'estudio': 'rgba(255,200,120,.5)', 'cocina': 'rgba(235,150,90,.4)', 'cuarto': 'rgba(255,170,90,.5)', 'dbz': 'rgba(90,170,255,.65)' };
const layers = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'fx'; document.body.prepend(d); return d; });
let idx = 0, cur = '';

function want() {
  const s = L.api.S(); if (!s) return null;
  if (L.skins.current() === 'dragonball') return { room: 'dbz', night: false };      // esa carcasa trae su propio fondo
  const room = s.pause ? 'playa' : (ROOMS[L.api.isHere()] || 'salon');
  const night = force === 'auto' ? !!(s.sleeping || (L.settings.get('cycle') && L.world.isNight())) : force === 'night';
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
  if (!enabled) { b.classList.remove('dyn', 'f-day', 'f-night'); layers.forEach(l => l.classList.remove('on')); over(false); cur = ''; return; }
  const w = want(); if (!w) return;
  over(w.room === 'dbz'); if (w.room === 'dbz') place();
  const key = w.room + (w.night ? '-n' : '-d');
  b.classList.add('dyn'); b.classList.toggle('f-night', w.night); b.classList.toggle('f-day', !w.night);
  b.style.setProperty('--glow', GLOW[w.room]);
  if (key === cur) return;
  cur = key;
  const next = layers[idx ^ 1], old = layers[idx];
  next.className = `fx f-${w.room} f-${w.night ? 'night' : 'day'}`;
  next.innerHTML = w.room === 'dbz' ? '<i class="dbz-img"></i><i class="dbz-flash"></i><i class="dbz-glow"></i>' : '';
  if (w.room === 'dbz') place();
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
setTimeout(update, 300);
})();
