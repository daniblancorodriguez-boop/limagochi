/* ==========================================================================
   LIMAGOCHI · disfraces de temporada
   Durante un evento (Halloween, Navidad, San Valentín, Primavera, Verano), al comer 3 platos del evento el
   Limagochi se disfraza hasta que el evento acaba. El disfraz se dibuja por código encima de su forma actual
   (no la sustituye) y se apunta en el álbum como forma «cos_<evento>».
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const NEED = 3;                                              // platos del evento para disfrazarse
const COS = {
  halloween:   { name: 'Lima bruja',     hint: 'En Halloween, come 3 platos de temporada.' },
  navidad:     { name: 'Lima Noel',      hint: 'En Navidad, come 3 platos de temporada.' },
  sanvalentin: { name: 'Lima Cupido',    hint: 'En San Valentín, come 3 platos de temporada.' },
  primavera:   { name: 'Lima florida',   hint: 'En Primavera, come 3 platos de temporada.' },
  verano:      { name: 'Lima veraneante', hint: 'En Verano, come 3 platos de temporada.' }
};
const IDS = Object.keys(COS).map(k => 'cos_' + k);
L.META = L.META || {};
Object.keys(COS).forEach(k => { L.META['cos_' + k] = { name: COS[k].name, grp: 'season' }; });

/** Rectángulos [x, y, w, h, color] del disfraz, en píxeles del sprite 24×24 (pueden salirse por arriba y por los lados). */
function pixels(id, rows) {
  let top = 24, bot = 0, minI = 24, maxI = 0;
  rows.forEach((r, j) => { for (let i = 0; i < 24; i++) if (r[i] !== '.') { top = Math.min(top, j); bot = Math.max(bot, j); minI = Math.min(minI, i); maxI = Math.max(maxI, i); } });
  if (top > bot) return [];
  let hr = top;                                             // primera fila ancha: ahí empieza la cabeza (por encima queda la hoja o la flor)
  for (let j = top; j <= bot; j++) { if ([...rows[j]].filter(c => c !== '.').length >= 9) { hr = j; break; } }
  let a = 24, b = 0; for (let i = 0; i < 24; i++) if (rows[hr][i] !== '.') { a = Math.min(a, i); b = Math.max(b, i); }
  const cx = Math.round((a + b) / 2), hh = bot - top + 1, K = '#1d1626', out = [];
  let ey = top + Math.round(hh * 0.5);                      // fila de los ojos: primera con «K» interior a partir del 40 % del cuerpo
  for (let j = top + Math.round(hh * 0.4); j <= bot - 3; j++) {
    let n = 0; for (let i = 1; i < 23; i++) if (rows[j][i] === 'K' && rows[j][i - 1] !== '.' && rows[j][i - 1] !== 'K' && rows[j][i + 1] !== '.') n++;
    if (n >= 2) { ey = j; break; }
  }
  const R = (x, y, w, h, c) => out.push([x, y, w, h, c]), px = (dx, dy, w, h, c) => R(cx + dx, hr + dy, w, h, c);
  if (id === 'halloween') {                                  // sombrero de bruja
    px(-6, 0, 13, 1, K); px(-5, -1, 11, 1, '#3a2a5a');
    px(-3, -2, 7, 1, '#f28c28'); px(-3, -3, 7, 1, '#3a2a5a'); px(-2, -4, 5, 1, '#3a2a5a'); px(-2, -5, 4, 1, '#3a2a5a'); px(-1, -6, 3, 1, '#3a2a5a'); px(0, -7, 3, 1, '#3a2a5a'); px(2, -8, 2, 1, '#3a2a5a');
    px(-1, -2, 2, 1, '#ffd84d');
  } else if (id === 'navidad') {                             // gorro de Papá Noel
    px(-5, 0, 11, 2, '#ffffff'); px(-4, -1, 9, 1, '#d62b2b'); px(-3, -2, 8, 1, '#d62b2b'); px(-2, -3, 8, 1, '#d62b2b'); px(0, -4, 7, 1, '#d62b2b'); px(3, -5, 5, 1, '#d62b2b'); px(5, -4, 3, 2, '#d62b2b'); px(6, -2, 3, 3, '#ffffff');
    px(-5, 1, 11, 1, '#dfe6ee');
  } else if (id === 'sanvalentin') {                         // alas de Cupido y corazón
    const wy = ey - 2, W = '#ffffff', S = '#c9d6e8';
    [[0, 0, 3], [-1, 1, 4], [-2, 2, 5], [-2, 3, 4], [-1, 4, 2]].forEach(([dx, dy, w]) => { R(minI - 4 + dx, wy + dy, w, 1, W); R(maxI + 5 - dx - w, wy + dy, w, 1, W); });
    R(minI - 5, wy + 4, 1, 1, S); R(minI - 3, wy + 5, 2, 1, S); R(maxI + 5, wy + 4, 1, 1, S); R(maxI + 2, wy + 5, 2, 1, S);
    px(-2, -5, 2, 1, '#ff4f7a'); px(1, -5, 2, 1, '#ff4f7a'); px(-3, -4, 7, 1, '#ff4f7a'); px(-2, -3, 5, 1, '#ff4f7a'); px(-1, -2, 3, 1, '#ff4f7a'); px(0, -1, 1, 1, '#ff4f7a'); px(-2, -4, 1, 1, '#ffd1dc');
  } else if (id === 'primavera') {                           // corona de flores
    const cols = ['#ff8fb1', '#ffd84d', '#b99cff', '#ff8fb1', '#ffffff'];
    for (let i = 0; i < 5; i++) { const fx = -7 + i * 3, c = cols[i]; px(fx + 1, -2, 1, 3, c); px(fx, -1, 3, 1, c); px(fx + 1, -1, 1, 1, '#f28c28'); }
    px(-7, 1, 15, 1, '#3f9a3c');
  } else if (id === 'verano') {                              // gafas de sol y flotador
    const gy = ey - 1, x0g = minI + 2, wg = maxI - minI - 3, hw = Math.floor((wg - 1) / 2);
    R(x0g, gy, wg, 1, K); R(x0g, gy + 1, hw, 2, K); R(x0g + wg - hw, gy + 1, hw, 2, K); R(x0g + 1, gy + 1, 1, 1, '#6e7fa8'); R(x0g + wg - hw + 1, gy + 1, 1, 1, '#6e7fa8');
    const fy = bot - 5, x0 = minI - 1, w = maxI - minI + 3;
    R(x0, fy, w, 3, '#ffffff'); for (let i = 0; i < w; i += 4) R(x0 + i, fy, 2, 3, '#e0392f'); R(x0, fy + 3, w, 1, '#b8c2cc');
  }
  return out;
}

/** Disfraz activo ahora (id del evento) o null: hace falta haberlo ganado y que el evento siga en curso. */
function active(s) {
  const ev = L.world && L.world.event && L.world.event();
  return s && s.season && s.season.on && ev && ev.id === s.season.ev && s.stage !== 'egg' && s.stage !== 'dead' ? ev.id : null;
}
/** Ha comido un plato del evento `evId`. Devuelve true si con este se disfraza. */
function ate(s, evId) {
  if (!COS[evId]) return false;
  if (!s.season || s.season.ev !== evId) s.season = { ev: evId, n: 0, on: false };
  s.season.n++;
  if (s.season.on || s.season.n < NEED) return false;
  s.season.on = true;
  return true;
}
L.season = { COS, IDS, NEED, pixels, active, ate };
})();
