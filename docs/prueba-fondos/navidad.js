/* Tema navideño (solo copia de prueba): con la carcasa «navidad» cambia fondos, cama, lámpara y colores de la pantalla. */
(() => {
  const ROOMS = ['cuarto', 'salon', 'cocina', 'estudio', 'jardin', 'jardin_k'];
  let on = false, orig = null, timer = 0;
  const ch = n => String.fromCharCode(97 + n);
  function patchItems(L) {
    const bed = L.ITEMS.bed.hd, lamp = L.ITEMS.lamp.hd;
    orig = { bed: JSON.stringify(bed), lamp: JSON.stringify(lamp) };
    /* cama: colcha roja con copos */
    let n = bed.pal.length; bed.pal.push('#d8312a', '#a8221f', '#f7fbe6');
    const R = ch(n), RD = ch(n + 1), W = ch(n + 2), isG = c => 'efgidh'.includes(c);
    const rows = bed.rows[0].map(r => [...r]);
    for (let y = 20; y <= 33; y++) for (let x = 3; x < 37; x++) if (rows[y] && isG(rows[y][x])) rows[y][x] = (x + y) % 7 === 0 && y < 31 ? RD : R;
    [8, 20, 31].forEach(cx => ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'].forEach((fr, j) => [...fr].forEach((c, i) => { const row = rows[24 + j], x = cx - 2 + i; if (c === 'X' && row && row[x] === R) row[x] = W; })));
    bed.rows[0] = rows.map(r => r.join(''));
    /* lámpara: guirnalda con luces que parpadean */
    n = lamp.pal.length; lamp.pal.push('#2f7d32', '#3f9a3c', '#ff5a5a', '#ffe27a', '#6ec6ff');
    const G = ch(n), G2 = ch(n + 1), L1 = ch(n + 2), L2 = ch(n + 3), L3 = ch(n + 4);
    lamp.rows = lamp.rows.map(v => v.map((row, y) => { const cs = [...row]; if (y >= 14 && y <= 40) { const off = ((y - 14) % 8) < 4 ? 0 : 1; for (let x = 4 + off; x < 8 + off; x++) cs[x] = (x + y) % 2 ? G : G2; if (y % 4 === 1) cs[3 + off] = [L1, L2, L3][(y >> 2) % 3]; } return cs.join(''); }));
    timer = setInterval(() => { const t = Math.floor(Date.now() / 450) % 2; ['#ff5a5a', '#ffe27a', '#6ec6ff'].forEach((c, i) => { lamp.pal[n + 2 + i] = t ? ['#ffe27a', '#6ec6ff', '#ff5a5a'][i] : c; }); }, 450);
  }
  function set(L, v) {
    if (v === on) return; on = v;
    document.body.classList.toggle('xmas', v);
    ROOMS.forEach(r => { const im = L.BG[r]; if (im) im.src = (v ? 'bg/nav_' : 'bg/') + r + '.png'; });
    if (v) patchItems(L); else if (orig) { clearInterval(timer); Object.assign(L.ITEMS.bed.hd, JSON.parse(orig.bed)); Object.assign(L.ITEMS.lamp.hd, JSON.parse(orig.lamp)); orig = null; }
    try { L.api.render(); } catch { /* */ }
  }
  const go = () => {
    const L = window.LIMA;
    if (!L || !L.BG || !L.ITEMS || !L.skins || !L.api) return setTimeout(go, 200);
    setInterval(() => { try { set(L, L.skins.current() === 'navidad'); } catch { /* */ } }, 300);
  };
  go();
})();
