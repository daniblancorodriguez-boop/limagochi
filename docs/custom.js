/* ==========================================================================
   LIMAGOTCHI · Personalizado: nombre propio + aspecto (niño, perro, gato) con colores a medida.
   Es solo cosmético: recolorea los sprites 24×24 y les dibuja pelo u orejas encima.
   Se aplica con un enlace  …/#custom=BASE64  (tools/custom.js lo genera) y se guarda en este dispositivo.
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA, KEY = 'limagochi.custom';
const LOOKS = {
  kid: { name: 'Niño',  body: ['#ffdcc0', '#f1b98d', '#c98a5e'], hair: ['#5a3a1c', '#3b2410', '#5a3a1c'], acc: 'kid' },
  dog: { name: 'Perro', body: ['#e0b987', '#bf8f58', '#8d6439'], hair: ['#6b4a1f', '#3f2a10', '#6b4a1f'], acc: 'dog' },
  cat: { name: 'Gato',  body: ['#ffc98a', '#f29a3c', '#c26d1c'], hair: ['#f29a3c', '#a8561a', '#ff9fbf'], acc: 'cat' }
};
const HEX = /^#[0-9a-fA-F]{6}$/;
const orig = JSON.parse(JSON.stringify(L.SPR));       // sprites originales (para poder volver atrás)
const origPal = Object.assign({}, L.PAL);
let cfg = null;

const BODY = { l: 'A', g: 'B', G: 'C' };

function decorate(rows, acc) {
  const g = rows.map(r => [...r]);
  const ext = r => { let a = -1, b = -1; for (let i = 0; i < 24; i++) if (g[r][i] !== '.') { if (a < 0) a = i; b = i; } return [a, b, a < 0 ? 0 : b - a + 1]; };
  let bt = -1; for (let r = 0; r < 24; r++) if (ext(r)[2] >= 8) { bt = r; break; }
  if (bt < 0) return g.map(r => r.join(''));
  const set = (x, y, c) => { if (x >= 0 && x < 24 && y >= 0 && y < 24) g[y][x] = c; };
  const [xl, xr] = ext(bt);
  if (acc === 'cat') {
    [['.K..', 'KIK.', 'KHHK'], ['..K.', '.KIK', 'KHHK']].forEach((p, k) => {
      const x0 = k ? xr - 3 : xl, y0 = bt - 3;
      p.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') set(x0 + i, y0 + j, c); }));
    });
  } else if (acc === 'dog') {
    for (let r = bt + 1; r <= bt + 5; r++) {
      const [a, b] = ext(r); if (a < 0) continue;
      const inset = (r === bt + 1 || r === bt + 5) ? 1 : 0;
      set(a - 1 - inset, r, 'H'); set(a - 2 - inset, r, 'J'); set(b + 1 + inset, r, 'H'); set(b + 2 + inset, r, 'J');
    }
    set(xl, bt, 'J'); set(xr, bt, 'J');
  } else if (acc === 'kid') {
    for (let r = bt; r <= bt + 2; r++) {
      const [a, b] = ext(r);
      for (let i = a + 1; i < b; i++) {
        if (r === bt + 2 && !(i <= a + 2 || i >= b - 2 || (i - a) % 3 === 0)) continue;     // flequillo
        if ('ABCwcp'.includes(g[r][i])) g[r][i] = 'H';
      }
    }
  }
  return g.map(r => r.join(''));
}

function build() {
  const look = cfg && LOOKS[cfg.look];
  Object.keys(L.PAL).forEach(k => { if (!(k in origPal)) delete L.PAL[k]; });
  for (const k of Object.keys(L.SPR)) {
    if (k === 'egg' || !look) { L.SPR[k] = JSON.parse(JSON.stringify(orig[k])); continue; }
    const set = {};
    for (const f of Object.keys(orig[k])) {
      const rows = orig[k][f].map(r => [...r].map(c => BODY[c] || c).join(''));
      set[f] = decorate(rows, look.acc).map(r => r.replace(/I/g, 'I'));
    }
    L.SPR[k] = set;
  }
  if (look) {
    const b = (cfg.body && cfg.body.every(c => HEX.test(c))) ? cfg.body : look.body, h = look.hair;
    Object.assign(L.PAL, { A: b[0], B: b[1], C: b[2], H: h[0], J: h[1], I: h[2] });
  }
  const name = cfg && cfg.name ? cfg.name : null;
  const br = document.querySelector('.brand'); if (br) br.textContent = name || 'Limagotchi';
  document.body.classList.toggle('custom', !!name);
  if (name) document.title = name;
}

function clean(o) {
  if (!o || typeof o !== 'object' || !LOOKS[o.look]) return null;
  const name = String(o.name || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 14);
  const c = { look: o.look, name };
  if (Array.isArray(o.body) && o.body.length === 3 && o.body.every(x => HEX.test(x))) c.body = o.body;
  return c;
}
function set(o) { cfg = clean(o); try { if (cfg) localStorage.setItem(KEY, JSON.stringify(cfg)); else localStorage.removeItem(KEY); } catch { /* */ } build(); }

try { cfg = clean(JSON.parse(localStorage.getItem(KEY))); } catch { cfg = null; }
const m = /#custom=([\w-]+)/.exec(location.hash);
if (m) {
  try {
    const t = m[1].replace(/-/g, '+').replace(/_/g, '/'), o = JSON.parse(decodeURIComponent(escape(atob(t + '='.repeat((4 - t.length % 4) % 4)))));
    const c = clean(o); if (c) { cfg = c; localStorage.setItem(KEY, JSON.stringify(c)); }
    history.replaceState(null, '', location.pathname + location.search);
  } catch { /* enlace no válido: se ignora */ }
}
L.custom = { set, get: () => cfg, looks: LOOKS };
build();
})();
