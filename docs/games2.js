/* ==========================================================================
   LIMAGOCHI · más minijuegos
   · Casino: Tragaperras · Ruleta (apuestas) · Ruleta del día (gratis)  → con límites
   · Pesca · Piedra, papel o tijera · Carrera
   Usan L.mini.reg (ver minigames.js) y la API de game.js (L.api).
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA;
const A = () => L.api;
const r5 = v => Math.round(v * 2) / 2;

/** Dibuja filas de texto como píxeles (k = tamaño del píxel en unidades lógicas). */
function spr(rows, pal, x, y, k = 1) {
  const a = A(), g = a.ctx;
  rows.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch === '.' || !pal[ch]) return;
    g.fillStyle = a.tint(pal[ch]); g.fillRect(r5(x + i * k), r5(y + j * k), k, k);
  }));
}
const rect = (x, y, w, h, c) => { const a = A(); a.ctx.fillStyle = a.tint(c); a.ctx.fillRect(r5(x), r5(y), r5(w), r5(h)); };

/* ============================ LÍMITES DEL CASINO ========================== */
const MAXBET = 10, DAILY_LOSS = 50, DAILY_SPINS = 60;
const today = () => new Date().toLocaleDateString('sv');
function cs() {
  const s = A().S();
  s.casino = Object.assign({ day: '', lost: 0, spins: 0, free: '' }, s.casino);
  if (s.casino.day !== today()) { s.casino.day = today(); s.casino.lost = 0; s.casino.spins = 0; }
  return s.casino;
}
/** ¿Puede apostar `bet`? Devuelve null si sí, o el motivo. */
function why(bet) {
  const s = A().S(), c = cs();
  if (s.lp < 1) return 'Sin monedas: gana 🪙 en los minijuegos';
  if (c.lost >= DAILY_LOSS) return `El casino cierra por hoy: has perdido ${DAILY_LOSS} 🪙. Mañana, más`;
  if (c.spins >= DAILY_SPINS) return `Hoy ya has jugado ${DAILY_SPINS} veces. ¡Descansa!`;
  if (bet > s.lp) return 'No tienes tantas monedas';
  return null;
}
const maxBet = () => Math.max(1, Math.min(MAXBET, A().S().lp));
function settle(bet, win) {                          // paga y apunta las pérdidas del día
  const s = A().S(), c = cs();
  s.lp += win; c.lost = Math.max(0, c.lost + bet - win);
  A().save();
  L.progress.stat('lpEarned', Math.max(0, win - bet));
}

/* ================================ TRAGAPERRAS ============================= */
const SYM = [
  { n: 'lima', w: 6, pal: { g: '#2f7d32', G: '#6cc24a', l: '#c9f2a0' }, rows: ['..gggg..', '.gGGGGg.', 'gGGllGGg', 'gGlGGGGg', 'gGGGGGGg', '.gGGGGg.', '..gggg..'] },
  { n: 'cereza', w: 5, pal: { n: '#6b4a1f', r: '#e0392f', R: '#ff7a6a' }, rows: ['....n...', '...n.n..', '..n...n.', '.rr...rr', 'rRrr.rRr', 'rrrr.rrr', '.rr...rr'] },
  { n: 'campana', w: 4, pal: { y: '#ffd84d', Y: '#ffb300', k: '#2a2433' }, rows: ['...yy...', '..yYYy..', '.yYYYYy.', '.yYYYYy.', 'yyyyyyyy', '...kk...', '........'] },
  { n: 'estrella', w: 3, pal: { y: '#ffd84d' }, rows: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.', 'yy....yy'] },
  { n: 'siete', w: 2, pal: { r: '#e0392f', w: '#fff' }, rows: ['rrrrrrr.', 'rwwwwrr.', '....rr..', '...rr...', '..rr....', '..rr....', '..rr....'] }
];
const TRIPLE = [3, 5, 8, 12, 30], PAIR = [1, 1, 1, 2, 3];
const slotPay = r => {
  if (r[0] === r[1] && r[1] === r[2]) return TRIPLE[r[0]];
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) if (r[i] === r[j]) return PAIR[r[i]];
  return 0;
};
const SW = SYM.reduce((t, s) => t + s.w, 0);
const rollSym = () => { let r = Math.random() * SW; for (let i = 0; i < SYM.length; i++) { r -= SYM[i].w; if (r < 0) return i; } return 0; };

function slots() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const s = { bet: Math.min(3, maxBet()), reel: [0, 1, 2], spin: false, t: 0, stop: [0, 0, 0], fin: [0, 0, 0], text: 'Elige apuesta y gira', done: false };
  const hud = () => a.hud(`🎰 ${a.S().lp} 🪙 · apuesta ${s.bet}`);
  function ui() {
    const dis = s.spin;
    a.openPanel([
      a.p(s.text),
      a.row(a.btn('−', () => { s.bet = Math.max(1, s.bet - 1); hud(); ui(); }, '', dis || s.bet <= 1), a.btn(`${s.bet} 🪙`, () => {}, 'ghost', true), a.btn('+', () => { s.bet = Math.min(maxBet(), s.bet + 1); hud(); ui(); }, '', dis || s.bet >= maxBet())),
      a.row(a.btn('🎰 Girar', go, '', dis), a.btn('Salir', exit, 'ghost'))
    ]);
  }
  function exit() { a.closePanel(); L.mini.stop(); }
  function go() {
    if (s.spin) return;
    s.bet = Math.min(s.bet, maxBet());
    const bad = why(s.bet);
    if (bad) { s.text = bad; ui(); return; }
    const st = a.S(); st.lp -= s.bet; cs().spins++; a.save();
    s.fin = [rollSym(), rollSym(), rollSym()];
    s.spin = true; s.t = 0; s.stop = [0.9, 1.35, 1.8]; s.text = 'Girando…'; a.sound.play('click'); hud(); ui();
  }
  function result() {
    const mult = slotPay(s.fin), win = mult * s.bet;
    settle(s.bet, win);
    s.spin = false;
    if (mult >= 30) { L.progress.stat('jackpots'); s.text = `🎉 ¡PREMIO GORDO! +${win} 🪙`; a.sound.play('win'); }
    else if (mult > 1) { s.text = `¡Premio! +${win} 🪙`; a.sound.play('win'); }
    else if (mult === 1) { s.text = `Pareja: recuperas ${win} 🪙`; a.sound.play('coin'); }
    else { s.text = `Nada… −${s.bet} 🪙`; a.sound.play('sad'); }
    L.progress.stat('spins'); L.progress.check();
    const bad = why(1);
    if (bad && cs().lost >= DAILY_LOSS) s.text += ` · ${bad}`;
    s.bet = Math.min(s.bet, maxBet()); hud(); ui();
  }
  hud(); ui();
  return {
    key() { go(); }, onStop() { a.closePanel(); },
    update(dt) {
      if (!s.spin) return;
      s.t += dt;
      for (let i = 0; i < 3; i++) if (s.t >= s.stop[i]) s.reel[i] = s.fin[i];
      if (s.t >= s.stop[2] + 0.25) result();
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      rect(1, 1, 46, 16, C.dark); rect(2, 2, 44, 14, C.light);
      for (let i = 0; i < 3; i++) {
        const x = 4 + i * 14, y = 3, w = 12, h = 12;
        rect(x - 1, y - 1, w + 2, h + 2, C.ink); rect(x, y, w, h, C.bg);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        if (s.spin && s.t < s.stop[i]) {
          const off = (s.t * 55) % 12;                                           // los símbolos pasan de arriba abajo
          for (let k = -1; k < 2; k++) { const q = SYM[(Math.floor(s.t * 55 / 12) + k + i * 2 + 100) % 5]; spr(q.rows, q.pal, x + 2, y + 3 + off + k * 12); }
        } else spr(SYM[s.reel[i]].rows, SYM[s.reel[i]].pal, x + 2, y + 3);
        g.restore();
      }
      rect(0, 8, 2, 1, C.ink); rect(46, 8, 2, 1, C.ink);                         // marca de la línea
    }
  };
}

/* ================================== RULETA ================================ */
const WHEEL20 = 'GRBRBRBRBRGBRBRBRBRB'.split('');                               // 0 y 00 verdes · 9 rojos · 9 negros
const COLORS = { R: '#e0392f', B: '#2a2433', G: '#2fae4a' };
const FREE = [0, 1, 1, 2, 2, 3, 3, 5, 8, 15];                                     // ruleta del día: media 4 🪙
const FCOL = v => (v === 0 ? '#2a2433' : v <= 2 ? '#6ec6ff' : v <= 5 ? '#ffd84d' : '#ff8fb1');

function roulette(mode) {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const free = mode === 'free', N = free ? FREE.length : WHEEL20.length, WG = Math.PI * 2 / N;
  const s = { bet: Math.min(3, maxBet()), pick: 'R', spin: false, t: 0, rot: 0, rot0: 0, rot1: 0, target: 0, dur: 3.4, text: free ? 'Gira la ruleta del día' : 'Rojo y negro ×2 · verde ×9' };
  const hud = () => a.hud(free ? '🎁 Ruleta del día · gratis' : `🎡 ${a.S().lp} 🪙 · ${s.bet} a ${{ R: 'rojo', B: 'negro', G: 'verde' }[s.pick]}`);
  function ui() {
    const dis = s.spin, nodes = [a.p(s.text)];
    if (!free) {
      nodes.push(a.row(a.btn('−', () => { s.bet = Math.max(1, s.bet - 1); hud(); ui(); }, '', dis || s.bet <= 1), a.btn(`${s.bet}🪙`, () => {}, 'ghost', true), a.btn('+', () => { s.bet = Math.min(maxBet(), s.bet + 1); hud(); ui(); }, '', dis || s.bet >= maxBet()),
        ...['R', 'B', 'G'].map(c => a.btn(`${{ R: '🔴', B: '⚫', G: '🟢' }[c]}${s.pick === c ? '✓' : ''}`, () => { s.pick = c; hud(); ui(); }, s.pick === c ? '' : 'ghost', dis))));
    }
    nodes.push(a.row(a.btn(free ? '🎁 Girar' : '🎡 Girar', go, '', dis || s.done), a.btn('Salir', exit, 'ghost')));
    a.openPanel(nodes);
  }
  function exit() { a.closePanel(); L.mini.stop(); }
  function go() {
    if (s.spin || s.done) return;
    if (free) { cs().free = today(); }
    else {
      s.bet = Math.min(s.bet, maxBet());
      const bad = why(s.bet);
      if (bad) { s.text = bad; ui(); return; }
      a.S().lp -= s.bet; cs().spins++;
    }
    a.save();
    s.target = Math.floor(Math.random() * N);                                     // el resultado se decide aquí; la rueda solo lo enseña
    const end = -(s.target + 0.5) * WG, TAU = Math.PI * 2;
    s.rot0 = s.rot; s.rot1 = s.rot + TAU * 5 + (((end - s.rot) % TAU) + TAU) % TAU;
    s.spin = true; s.t = 0; s.text = 'Girando…'; a.sound.play('click'); hud(); ui();
  }
  function result() {
    s.spin = false;
    if (free) {
      const v = FREE[s.target]; a.S().lp += v; L.progress.stat('lpEarned', v); a.save();
      s.text = v ? `🎁 ¡Hoy te llevas ${v} 🪙!` : 'Hoy no hay premio… ¡vuelve mañana!'; a.sound.play(v ? 'win' : 'sad'); s.done = true;
    } else {
      const col = WHEEL20[s.target], win = col === s.pick ? s.bet * (col === 'G' ? 9 : 2) : 0;
      settle(s.bet, win);
      s.text = (win ? `¡${{ R: 'Rojo', B: 'Negro', G: 'Verde' }[col]}! +${win - s.bet} 🪙` : `Sale ${{ R: 'rojo', B: 'negro', G: 'verde' }[col]}… −${s.bet} 🪙`);
      a.sound.play(win ? 'win' : 'sad'); L.progress.stat('spins');
      if (cs().lost >= DAILY_LOSS) s.text += ` · ${why(1)}`;
      s.bet = Math.min(s.bet, maxBet());
    }
    L.progress.check(); hud(); ui();
  }
  hud(); ui();
  return {
    key() { go(); }, onStop() { a.closePanel(); },
    update(dt) {
      if (!s.spin) return;
      s.t += dt; const q = Math.min(1, s.t / s.dur), e = 1 - Math.pow(1 - q, 3);
      s.rot = s.rot0 + (s.rot1 - s.rot0) * e;
      if (q >= 1) { s.rot = s.rot1; result(); }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      const cx = 24, cy = 10, R = 8, TAU = Math.PI * 2;
      for (let py = -R; py <= R; py += 0.5) for (let px = -R; px <= R; px += 0.5) {
        const r = Math.hypot(px + 0.25, py + 0.25);
        if (r > R) continue;
        let col;
        if (r > R - 1) col = C.ink;
        else if (r < 2) col = r < 1.2 ? '#ffd84d' : C.ink;
        else {
          const ang = ((Math.atan2(px + 0.25, -(py + 0.25)) - s.rot) % TAU + TAU) % TAU, i = Math.floor(ang / WG) % N;
          col = free ? FCOL(FREE[i]) : COLORS[WHEEL20[i]];
          if (Math.abs(ang - i * WG) < 0.03) col = C.ink;                         // línea entre casillas
        }
        g.fillStyle = a.tint(col); g.fillRect(cx + px, cy + py, 0.5, 0.5);
      }
      rect(cx - 1.5, 0, 3, 2, C.ink); rect(cx - 1, 0, 2, 1.5, '#ffd84d'); rect(cx - 0.5, 1.5, 1, 1, C.ink);   // puntero
    }
  };
}

/* ============================= MENÚ DEL CASINO ============================ */
L.casino = {
  open(back) {
    const a = A(), s = a.S(), c = cs();
    const left = Math.max(0, DAILY_LOSS - c.lost), usedFree = c.free === today();
    a.openPanel([
      a.p(`🎰 Casino · ${s.lp} 🪙`),
      a.p(`Hoy puedes perder ${left} 🪙 más · apuesta máx. ${MAXBET} 🪙`),
      a.btn('🎰 Tragaperras', () => { a.closePanel(); const w = why(1); if (w) { a.setMsg(w, 3500); return; } L.mini.start('slots'); }),
      a.btn('🎡 Ruleta (apuestas)', () => { a.closePanel(); const w = why(1); if (w) { a.setMsg(w, 3500); return; } L.mini.start('roulette'); }),
      a.btn(usedFree ? '🎁 Ruleta del día · ya girada' : '🎁 Ruleta del día · gratis', () => { a.closePanel(); L.mini.start('wheel'); }, usedFree ? 'ghost' : '', usedFree),
      a.p('Es dinero ficticio del juego: no se puede comprar.'),
      a.btn('Atrás', back || a.closePanel, 'ghost')
    ], { full: true });
  },
  slotPay, SYM, MAXBET, DAILY_LOSS
};

/* ================================== PESCA ================================= */
const CATCH = [
  { n: 'pez', w: 55, t: '🐟 ¡Un pez! Va a la despensa', fish: 1 }, { n: 'dorado', w: 15, t: '🐠 ¡Pez dorado! +3 🪙', fish: 1, lp: 3 },
  { n: 'cangrejo', w: 12, t: '🦀 ¡Un cangrejo! +2 🪙', lp: 2 }, { n: 'bota', w: 10, t: '👢 Una bota vieja…' },
  { n: 'estrella', w: 5, t: '⭐ ¡Estrella de mar! +5 🪙', lp: 5 }, { n: 'tesoro', w: 3, t: '💎 ¡TESORO! +10 🪙', lp: 10 }
];
function fishing() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H, rows = a.petRows('happy');
  const CASTS = 5, F = Math.min(99, L.studio.extraLv('fishing') + (a.S().owned.includes('rod') ? 15 : 0));        // nivel de pesca (la caña mejor suma)
  const s = { cast: 0, phase: 'idle', t: 0, wait: 0, fish: 0, lp: 0, got: null, text: '', bob: 0 };
  const hud = () => a.hud(`🎣 ${Math.min(s.cast + 1, CASTS)}/${CASTS} · 🐟${s.fish}${s.text ? '  ' + s.text : ''}`);
  hud();
  function tap() {
    if (s.phase === 'idle') { s.phase = 'wait'; s.t = 0; s.wait = (1.4 + Math.random() * 2.8) * (1 - F * 0.004); s.text = ''; a.sound.play('click'); hud(); }
    else if (s.phase === 'wait') { s.phase = 'res'; s.t = 0; s.got = null; s.text = '¡Muy pronto!'; a.sound.play('sad'); hud(); }
    else if (s.phase === 'bite') {
      const adj = CATCH.map(x => Object.assign({}, x, { w: x.n === 'bota' ? x.w * (1 - F / 100) : x.n === 'pez' ? x.w : x.w * (1 + F / 50) })).concat(F >= 40 ? [{ n: 'atun', w: 8, t: '🐟 ¡Un atún enorme! +2 🪙', fish: 2, lp: 2 }] : []);
      let r = Math.random() * adj.reduce((n, x) => n + x.w, 0), c = adj[0];
      for (const x of adj) { r -= x.w; if (r < 0) { c = x; break; } }
      if (c.fish && Math.random() < F / 150) { c = Object.assign({}, c, { fish: c.fish + 1 }); }
      L.studio.xp('fishing', c.fish || c.lp ? 0.9 : 0.3);
      s.got = c; s.phase = 'res'; s.t = 0; s.text = c.t;
      if (c.fish) { s.fish += c.fish; a.S().inv.pez = (a.S().inv.pez || 0) + c.fish; L.progress.stat('fish', c.fish); }
      if (c.lp) s.lp += c.lp;
      a.sound.play(c.lp ? 'win' : c.fish ? 'coin' : 'hit'); hud();
    }
  }
  return {
    pointer: tap, key: tap,
    update(dt) {
      s.t += dt; s.bob += dt;
      if (s.phase === 'wait' && s.t > s.wait) { s.phase = 'bite'; s.t = 0; a.sound.play('alert'); a.sound.vibrate && a.sound.vibrate(60); }
      else if (s.phase === 'bite' && s.t > 0.9 + F * 0.004) { s.phase = 'res'; s.t = 0; s.got = null; s.text = 'Se ha escapado…'; hud(); }
      else if (s.phase === 'res' && s.t > 1.4) {
        s.cast++;
        if (s.cast >= CASTS) {
          L.mini.end('fishing', s.fish >= 3 ? '¡Gran pesca!' : 'Fin de la pesca', [`Peces: ${s.fish}`, s.fish ? 'Los tienes en 🥗 Sanas' : 'Ninguno hoy'],
            { happy: 8 + 3 * s.fish, energy: -6, hunger: -4, weight: -0.2, lp: s.lp, win: s.fish >= 3, score: s.fish });
        } else { s.phase = 'idle'; s.t = 0; s.text = ''; hud(); }
      }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      rect(0, 14, W, H - 14, C.mid); for (let x = 0; x < W; x += 5) rect(x + ((Math.floor(s.bob * 2) + x) % 2), 17 + (x % 3) * 5, 3, 0.5, C.light);
      rect(0, 14, W, 1, C.ink);
      rect(0, 22, 14, 2, C.dark); rect(1, 24, 2, 8, C.dark); rect(11, 24, 2, 8, C.dark);          // muelle
      a.drawSprite(rows, 0, 11 - 10, { scale: 0.5 });
      const bx = 30, by = 20 + (s.phase === 'bite' ? 3 + Math.abs(Math.sin(s.t * 20)) * 1.5 : Math.sin(s.bob * 3) * 0.6);
      if (s.phase !== 'idle') {
        rect(13, 8, 0.5, 0.5, C.ink);
        g.strokeStyle = a.tint('#2a2433'); g.lineWidth = 0.4; g.beginPath(); g.moveTo(13, 9); g.lineTo(bx, 19); g.stroke();
        rect(bx - 1, by - 1, 2, 2, s.phase === 'bite' ? '#e0392f' : C.bg); rect(bx - 1, by - 1, 2, 0.5, C.ink);
      }
      if (s.phase === 'bite') { rect(bx - 3, by + 2, 6, 0.5, C.light); rect(bx - 4, by + 3, 8, 0.5, C.light); }
      if (s.phase === 'res' && s.got) {                                               // lo pescado salta
        const q = Math.min(1, s.t / 0.8), fx = bx - q * 14, fy = 19 - Math.sin(q * Math.PI) * 9;
        rect(fx - 2, fy - 1, 5, 3, s.got.n === 'dorado' ? '#ffb300' : s.got.n === 'tesoro' ? '#6ec6ff' : s.got.n === 'cangrejo' ? '#e0392f' : s.got.n === 'estrella' ? '#ffd84d' : s.got.n === 'bota' ? '#6b4a1f' : C.dark);
        rect(fx + 3, fy - 1, 1, 3, C.ink);
      }
      if (s.phase === 'idle') rect(20, 28, 14, 0.5, C.ink);
    }
  };
}

/* ============================ PIEDRA, PAPEL O TIJERA ====================== */
const HANDS = [
  { n: 'Piedra', pal: { s: '#9aa5b1', S: '#cfd6de', k: '#2a2433' }, rows: ['..kkkk..', '.kSSssk.', 'kSssssk.'.padEnd(8, '.'), 'ksssssSk', 'ksssssSk', '.kssssk.', '..kkkk..'] },
  { n: 'Papel', pal: { w: '#fff', k: '#2a2433' }, rows: ['kkkkkkk.', 'kwwwwwk.', 'kkkkkwk.', 'kwwwwwk.', 'kkkkkwk.', 'kwwwwwk.', 'kkkkkkk.'] },
  { n: 'Tijera', pal: { k: '#2a2433', r: '#e0392f', s: '#cfd6de' }, rows: ['s.....s.', '.s...s..', '..s.s...', '...k....', '..k.k...', '.rr.rr..', 'rrr.rrr.'] }
];
function rps() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H, rows = a.petRows('happy');
  const s = { me: 0, pet: 0, you: null, her: null, phase: 'pick', t: 0, text: 'Elige' };
  const hud = () => a.hud(`✊ Tú ${s.me} – ${s.pet} Limagochi · ${s.text}`);
  function ui() {
    a.openPanel([a.row(...HANDS.map((h, i) => a.btn(h.n, () => play(i), '', s.phase !== 'pick'))), a.btn('Salir', () => { a.closePanel(); L.mini.stop(); }, 'ghost')]);
  }
  function play(i) {
    if (s.phase !== 'pick') return;
    s.you = i; s.her = Math.floor(Math.random() * 3); s.phase = 'shake'; s.t = 0; s.text = '¡Piedra, papel…!'; a.sound.play('click'); hud(); ui();
  }
  hud(); ui();
  return {
    onStop() { a.closePanel(); },
    update(dt) {
      s.t += dt;
      if (s.phase === 'shake' && s.t > 1.0) {
        s.phase = 'show'; s.t = 0;
        const d = (s.you - s.her + 3) % 3;                                  // 0 empate · 1 gana quien elige «el siguiente» (papel>piedra…)
        if (d === 0) { s.text = 'Empate'; a.sound.play('click'); }
        else if (d === 1) { s.me++; s.text = '¡Punto para ti!'; a.sound.play('win'); }
        else { s.pet++; s.text = 'Punto para Limagochi'; a.sound.play('sad'); }
        hud();
      } else if (s.phase === 'show' && s.t > 1.1) {
        if (s.me >= 2 || s.pet >= 2) {
          const win = s.me > s.pet;
          a.closePanel();
          L.mini.end('rps', win ? '¡Has ganado!' : 'Ha ganado Limagochi', [`Resultado: ${s.me} – ${s.pet}`],
            { happy: win ? 10 : 4, energy: -3, hunger: -2, lp: win ? 3 : 0, win, score: s.me });
        } else { s.phase = 'pick'; s.text = 'Elige'; hud(); ui(); }
      }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      const shake = s.phase === 'shake' ? Math.abs(Math.sin(s.t * 14)) * 3 : 0;
      const sh = (h, x) => { const hand = HANDS[h]; spr(hand.rows, hand.pal, x, 5 + (s.phase === 'shake' ? -shake * 0.6 : 0), 1.5); };
      if (s.phase === 'shake' || s.phase === 'pick') { sh(0, 8); sh(0, 28); }
      else { sh(s.you, 8); sh(s.her, 28); }
      for (let y = 2; y < 17; y += 3) rect(23.5, y, 1, 1.5, C.dark);
    }
  };
}

/* ================================== CARRERA =============================== */
function race() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H, rows = a.petRows('happy');
  const LEN = 150, PX = 10, SP = L.studio.extraLv('sport');
  const s = { x: 0, rx: 0, y: 0, vy: 0, jump: false, stun: 0, rstun: 0, over: false, t: 0, hits: 0, started: 0, text: '' };
  s.hurdles = []; for (let x = 24; x < LEN - 10; x += 16 + Math.random() * 14) s.hurdles.push(x);
  s.rstuns = [30 + Math.random() * 30, 80 + Math.random() * 30];                  // el rival tropieza dos veces
  const hud = () => a.hud(`🏃 ${s.text || 'Toca para saltar las vallas'}`);
  hud();
  const jump = () => { if (s.over || s.jump || s.stun > 0) return; s.jump = true; s.vy = -30; a.sound.play('flap'); };
  return {
    pointer: jump, key: jump,
    update(dt) {
      s.t += dt;
      if (s.started < 1.0) { s.started += dt; s.text = s.started < 1 ? '¡Preparados…!' : ''; if (s.started >= 1) hud(); return; }
      if (s.over) return;
      if (s.jump) { s.vy += 100 * dt; s.y += s.vy * dt; if (s.y >= 0) { s.y = 0; s.jump = false; s.vy = 0; } }
      s.stun = Math.max(0, s.stun - dt);
      if (s.stun <= 0) {
        s.x += 16 * (1 + SP * 0.0015) * dt;
        for (const h of s.hurdles) if (!h.hit && Math.abs(s.x - h) < 1 && s.y > -2) { s.hurdles = s.hurdles.filter(q => q !== h); s.stun = 0.55 * (1 - SP / 250); s.hits++; a.sound.play('hit'); a.sound.vibrate && a.sound.vibrate(60); break; }
      }
      s.rstuns = s.rstuns.filter(p => { if (s.rx > p) { s.rstun = 0.55; return false; } return true; });
      s.rstun = Math.max(0, s.rstun - dt);
      if (s.rstun <= 0) s.rx += (14.6 + Math.sin(s.t * 1.7) * 1.8) * dt;
      if (s.x >= LEN || s.rx >= LEN) {
        s.over = true;
        const win = s.x >= s.rx;
        L.studio.xp('sport', win ? 1.8 : 1.2);
        L.mini.end('race', win ? '¡Has ganado la carrera!' : 'Te han adelantado…', [`Tropiezos: ${s.hits}`],
          { happy: win ? 12 : 4, energy: -10, hunger: -6, weight: -0.4, lp: win ? 4 + Math.floor(SP / 20) : 1, win, score: win ? Math.max(1, 6 - s.hits) : 0 });
      }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      const cam = Math.max(0, s.x - PX);
      for (const gy of [18, 34]) { rect(0, gy, W, 1, C.ink); for (let x = -((cam * 1) % 6); x < W; x += 6) rect(x, gy + 1, 3, 0.5, C.dark); }
      const fx = LEN - cam + PX;                                                  // meta
      if (fx < W + 4) for (let j = 0; j < 17; j += 2) { rect(fx, 3 + j, 1.5, 1, C.ink); rect(fx + 1.5, 4 + j, 1.5, 1, C.ink); }
      for (const h of s.hurdles) { const hx = h - cam + PX; if (hx > -3 && hx < W + 3) { rect(hx - 1, 29, 2, 5, C.ink); rect(hx - 2, 29, 4, 1, C.mid); } }
      // rival (abajo del todo está la mascota)
      const rx = s.rx - cam + PX, rj = s.rstun > 0 ? 0 : Math.abs(Math.sin(s.t * 9)) * 1.5;
      rect(rx - 4, 12 - rj, 9, 6, C.dark); rect(rx - 3, 13 - rj, 7, 4, C.mid); rect(rx + 1, 14 - rj, 1, 1, C.ink); rect(rx + 3, 14 - rj, 1, 1, C.ink);
      const px = s.x - cam + PX, bob = s.jump ? s.y : (s.stun > 0 ? 0 : Math.abs(Math.sin(s.t * 12)) * -1);
      a.drawSprite(rows, r5(px - 6), r5(34 - 12 + bob + 1), { scale: 0.5 });
      if (s.stun > 0) { rect(px + 4, 20, 1, 1, C.ink); rect(px + 6, 21, 1, 1, C.ink); }
    }
  };
}

L.mini.reg.slots = slots; L.mini.reg.roulette = () => roulette('bet'); L.mini.reg.wheel = () => roulette('free');
L.mini.reg.fishing = fishing; L.mini.reg.rps = rps; L.mini.reg.race = race;
})();
