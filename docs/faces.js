/* ==========================================================================
   LIMAGOCHI · Caras extra para todas las formas: enfadado, enfermo, sorprendido, aburrido y con hambre.
   Se construyen al cargar a partir del dibujo normal (idle): se localizan los ojos y la boca y se repintan.
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA;
L.FACES_X = ['angry', 'sick', 'shock', 'bored', 'hungry'];

/** Localiza ojos y boca del dibujo normal. Los ojos tienen un punto blanco 'w' con 'K' a la izquierda y debajo. */
function anchors(rows) {
  const eyes = [];
  for (let y = 8; y < 22; y++) for (let x = 2; x < 22; x++) {
    if (rows[y][x] === 'w' && rows[y][x - 1] === 'K' && rows[y + 1][x - 1] === 'K' && rows[y + 1][x] === 'K') eyes.push([x - 1, y]);
  }
  let l, r, ey;
  if (eyes.length >= 2) { eyes.sort((a, b) => a[0] - b[0]); const row = eyes.filter(e => e[1] === eyes[0][1]); if (row.length >= 2) { l = row[0][0]; r = row[row.length - 1][0]; ey = row[0][1]; } }
  if (l == null) { l = 8; r = 14; ey = 13; }                         // cuerpo de flor: ojos en arco, posición fija
  return { l, r, ey, mx: Math.floor((l + r + 1) / 2), my: ey + 3, ch: ey + 2 };
}

function build(rows, kind) {
  const A = anchors(rows), g = rows.map(r => r.split(''));
  const { l, r, ey, mx, my, ch } = A;
  const body = g[ey][l + 2] && g[ey][l + 2] !== 'K' && g[ey][l + 2] !== '.' ? g[ey][l + 2] : 'g';
  const put = (x, y, c) => { if (g[y] && g[y][x] !== undefined && g[y][x] !== '.') g[y][x] = c; };
  const clear = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] !== undefined && /[Kwc]/.test(g[y][x]) && x > 4 && x < 20) g[y][x] = body; };
  clear(l - 1, ey - 1, l + 2, ey + 2); clear(r - 1, ey - 1, r + 2, ey + 2); clear(mx - 3, my - 1, mx + 4, my + 1);
  const px = (list, c) => list.forEach(([x, y]) => put(x, y, c));
  const eyeSq = (x, c) => px([[x, ey], [x + 1, ey], [x, ey + 1], [x + 1, ey + 1]], c);
  if (kind === 'angry') {
    px([[l - 1, ey - 2], [l, ey - 1], [r + 2, ey - 2], [r + 1, ey - 1]], 'K');
    eyeSq(l, 'K'); eyeSq(r, 'K');
    px([[mx - 1, my], [mx, my], [mx + 1, my], [mx + 2, my], [mx - 2, my + 1], [mx + 3, my + 1]], 'K');
    px([[l - 2, ch], [l - 1, ch], [r + 2, ch], [r + 3, ch]], 'r');
  } else if (kind === 'sick') {
    for (const x of [l, r]) px([[x, ey], [x + 2, ey], [x + 1, ey + 1], [x, ey + 2], [x + 2, ey + 2]], 'K');
    px([[mx - 1, my], [mx + 1, my], [mx, my + 1], [mx + 2, my + 1]], 'K');
    px([[r + 4, ey - 2], [r + 4, ey - 1]], 'c');
  } else if (kind === 'shock') {
    px([[l, ey - 2], [l + 1, ey - 2], [r + 1, ey - 2], [r + 2, ey - 2]], 'K');
    for (const x of [l - 1, r]) { for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) put(x + dx, ey - 1 + dy, dy === 0 || dy === 3 || dx === 0 || dx === 3 ? 'K' : 'w'); put(x + 2, ey + 1, 'K'); }
    px([[mx, my], [mx + 1, my], [mx - 1, my + 1], [mx + 2, my + 1], [mx, my + 2], [mx + 1, my + 2]], 'K'); px([[mx, my + 1], [mx + 1, my + 1]], 'R');
  } else if (kind === 'bored') {
    for (const x of [l, r - 1]) px([[x, ey + 1], [x + 1, ey + 1], [x + 2, ey + 1]], 'K');
    px([[mx - 1, my + 1], [mx, my + 1], [mx + 1, my + 1], [mx + 2, my + 1]], 'K');
  } else if (kind === 'hungry') {
    for (const x of [l, r]) { px([[x, ey], [x + 1, ey], [x, ey + 1]], 'K'); put(x + 1, ey + 1, 'w'); }
    px([[mx, my], [mx + 1, my], [mx - 1, my + 1], [mx + 2, my + 1], [mx, my + 2], [mx + 1, my + 2]], 'K'); px([[mx, my + 1], [mx + 1, my + 1]], 'R');
    px([[mx + 3, my + 1], [mx + 3, my + 2]], 'c');
  }
  return g.map(r => r.join(''));
}

Object.keys(L.SPR).forEach(id => {
  if (id === 'egg' || !L.SPR[id].idle) return;
  L.FACES_X.forEach(k => { try { L.SPR[id][k] = build(L.SPR[id].idle, k); } catch (e) { /* queda la cara normal */ } });
});
})();
