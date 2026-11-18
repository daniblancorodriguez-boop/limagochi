/* Fondo dinámico: cambia con la sala y con el día/noche (fundido entre dos capas). */
(() => {
'use strict';
const L = window.LIMA;
const KEY = 'pprueba.dynbg';
let enabled = false; try { enabled = localStorage.getItem(KEY) === '1'; } catch { /* */ }
let force = 'auto';                                   // solo para probar: 'auto' | 'day' | 'night'
const ROOMS = { bedroom: 'cuarto', salon: 'salon', garden: 'jardin', studio: 'estudio', kitchen: 'cocina' };
const GLOW = { 'salon': 'rgba(120,160,255,.45)', 'jardin': 'rgba(150,190,255,.35)', 'playa': 'rgba(150,190,255,.35)', 'estudio': 'rgba(255,200,120,.5)', 'cocina': 'rgba(235,150,90,.4)', 'cuarto': 'rgba(255,170,90,.5)' };
const layers = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'fx'; document.body.prepend(d); return d; });
let idx = 0, cur = '';

function want() {
  const s = L.api.S(); if (!s) return null;
  const room = s.pause ? 'playa' : (ROOMS[L.api.isHere()] || 'salon');
  const night = force === 'auto' ? !!(s.sleeping || (L.settings.get('cycle') && L.world.isNight())) : force === 'night';
  return { room, night };
}
function update() {
  const b = document.body;
  if (!enabled) { b.classList.remove('dyn', 'f-day', 'f-night'); layers.forEach(l => l.classList.remove('on')); cur = ''; return; }
  const w = want(); if (!w) return;
  const key = w.room + (w.night ? '-n' : '-d');
  b.classList.add('dyn'); b.classList.toggle('f-night', w.night); b.classList.toggle('f-day', !w.night);
  b.style.setProperty('--glow', GLOW[w.room]);
  if (key === cur) return;
  cur = key;
  const next = layers[idx ^ 1], old = layers[idx];
  next.className = `fx f-${w.room} f-${w.night ? 'night' : 'day'}`;
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
