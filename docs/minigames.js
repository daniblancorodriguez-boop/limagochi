/* ==========================================================================
   LIMAGOCHI · minijuegos de acción (se dibujan en la propia pantalla LCD)
   · Lima Vuela  (tipo Flappy Bird)
   · Esquiva     (esquivar rocas, recoger estrellas)
   · Penaltis    (tanda de 5 penaltis: para la mira y chuta)
   · Eco Lima    (memoria: repite la secuencia de luces y sonidos)
   · Ducha       (frota con el dedo para quitar la suciedad)
   · Visita      (un amigo viene de visita con su tarjeta)
   El juego "Adivina" vive en game.js (es de menú, no de acción).
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};

let cur = null, raf = 0, last = 0;
const A = () => LIMA.api;
const r5 = v => Math.round(v * 2) / 2;            // alinea a píxel de canvas (medio píxel lógico)

function box(g, x, y, w, h, fill, line) {
  g.fillStyle = line; g.fillRect(r5(x), r5(y), r5(w), r5(h));
  g.fillStyle = fill; g.fillRect(r5(x + 0.5), r5(y + 0.5), r5(w - 1), r5(h - 1));
}

/* ------------------------------ bucle común ----------------------------- */
function loop() {
  raf = requestAnimationFrame(t => {
    const c = cur;
    if (!c) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    c.update(dt);                       // update() puede terminar la partida (cur = null)
    if (cur === c) { c.draw(); loop(); }
  });
}

function end(kind, title, lines, rewardObj, opts = {}) {
  const a = A();
  cur = null; cancelAnimationFrame(raf);
  a.hud(null);
  a.reward(opts.noStats ? rewardObj : { ...rewardObj, game: kind }, title);
  a.openPanel([
    a.p(title), ...lines.map(t => a.p(t)),
    opts.noAgain ? a.btn('Cerrar', a.closePanel)
      : a.row(a.btn('Otra vez', () => { a.closePanel(); if (a.canPlay()) L.mini.start(kind); }), a.btn('Salir', a.closePanel, 'ghost'))
  ]);
}

const L = LIMA;
const REG = {};                                  // minijuegos registrados desde otros archivos (games2.js)
L.mini = {
  reg: REG, end,
  active: () => !!cur,
  start(kind, arg) {
    this.stop(false);
    cur = ({ flappy, dodge, memory, penalty, shower, visit, ...REG })[kind](arg);
    last = performance.now();
    loop();
  },
  stop(redraw = true) {
    cancelAnimationFrame(raf);
    const was = !!cur; if (cur && cur.onStop) cur.onStop(); cur = null;
    if (was) { A().hud(null); if (redraw) A().render(); }
  },
  pointer(fx, fy) { cur && cur.pointer && cur.pointer(fx, fy); },
  drag(fx, fy) { cur && cur.drag && cur.drag(fx, fy); },
  up() { cur && cur.up && cur.up(); },
  key(k) { cur && cur.key && cur.key(k); }
};

/* ============================ LIMA VUELA ================================ */
function flappy() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const rows = a.petRows('happy');
  const BX = 12, R = 4, GAP = 18, PW = 7, FLOOR = H - 3;
  const s = { y: H / 2, vy: 0, started: false, over: false, overT: 0, score: 0, pipes: [], spawn: 0.5, t: 0 };

  a.hud('Toca para volar');
  const flap = () => { if (s.over) return; s.started = true; s.vy = -26; a.sound.play('flap'); };
  const die = () => { if (s.over) return; s.over = true; a.sound.play('hit'); a.sound.vibrate(80); };

  return {
    pointer: flap, key: flap,
    update(dt) {
      s.t += dt;
      if (s.over) {
        s.vy += 80 * dt; s.y = Math.min(FLOOR - R, s.y + s.vy * dt);
        s.overT += dt;
        if (s.overT > 0.9) {
          const sc = s.score;
          end('flappy', sc >= 3 ? '¡Qué vuelo!' : 'Ha caído…', [`Tubos pasados: ${sc}`],
            { happy: Math.min(45, 5 + 6 * sc), energy: -10, hunger: -6, weight: -Math.min(2, 0.3 + 0.2 * sc), lp: sc, win: sc >= 3, score: sc });
        }
        return;
      }
      if (!s.started) { s.y = H / 2 + Math.sin(s.t * 5) * 1.5; return; }
      s.vy += 80 * dt; s.y += s.vy * dt;
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = 1.6;
        s.pipes.push({ x: W, gy: a.rand(GAP / 2 + 4, H - GAP / 2 - 6), pass: false });
      }
      const spd = 18 + Math.min(8, s.score * 0.6);
      for (const p of s.pipes) {
        p.x -= spd * dt;
        if (!p.pass && p.x + PW < BX - R) { p.pass = true; s.score++; a.sound.play('coin'); a.hud('Puntos: ' + s.score); }
        if (BX + R > p.x && BX - R < p.x + PW && (s.y - R < p.gy - GAP / 2 || s.y + R > p.gy + GAP / 2)) die();
      }
      s.pipes = s.pipes.filter(p => p.x > -PW - 2);
      if (s.y + R > FLOOR || s.y - R < 0) die();
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      for (const p of s.pipes) {
        const top = p.gy - GAP / 2, bot = p.gy + GAP / 2;
        box(g, p.x, -1, PW, top + 1, C.mid, C.ink);
        box(g, p.x - 1, top - 3, PW + 2, 3, C.light, C.ink);
        box(g, p.x, bot, PW, H - bot, C.mid, C.ink);
        box(g, p.x - 1, bot, PW + 2, 3, C.light, C.ink);
      }
      g.fillStyle = C.dark; g.fillRect(0, FLOOR, W, H - FLOOR);
      g.fillStyle = C.ink; g.fillRect(0, FLOOR, W, 0.5);
      a.drawSprite(rows, r5(BX - 6), r5(s.y - 6), { scale: 0.5 });
    }
  };
}

/* ============================== ESQUIVA ================================= */
function dodge() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const rows = a.petRows('happy');
  const LANES = [8, 24, 40], DUR = 30, GROUND = H - 3, PET_TOP = GROUND - 12;
  const s = { lane: 1, x: 24, t: 0, lives: 3, stars: 0, objs: [], spawn: 0.6, over: false, win: false, flash: 0, overT: 0 };
  const hud = () => a.hud(`${'♥'.repeat(Math.max(0, s.lives))}  ⭐${s.stars}  ⏱${Math.max(0, Math.ceil(DUR - s.t))}`);
  hud();

  const move = d => { if (!s.over) { s.lane = Math.max(0, Math.min(2, s.lane + d)); a.sound.play('click'); } };

  return {
    key(k) { if (k === 'left') move(-1); else if (k === 'right') move(1); },
    pointer(fx) { move(fx < 0.5 ? -1 : 1); },
    update(dt) {
      if (s.over) {
        s.overT += dt;
        if (s.overT > 0.8) {
          const lp = s.stars + (s.win ? 3 : 0);
          end('dodge', s.win ? '¡Lo esquivó todo!' : '¡Le han dado!',
            [`Estrellas: ${s.stars}`, s.win ? 'Sobrevivió los 30 s' : 'No sobrevivió'],
            { happy: 10 + 3 * s.stars + (s.win ? 12 : 0), energy: -12, hunger: -8, weight: -Math.min(2, 0.4 + 0.1 * s.stars), lp, win: s.win, score: s.stars });
        }
        return;
      }
      s.t += dt; s.flash = Math.max(0, s.flash - dt);
      s.x += (LANES[s.lane] - s.x) * Math.min(1, dt * 14);
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.32, 0.8 - s.t * 0.015);
        const add = l => s.objs.push({ x: LANES[l], y: -6, type: Math.random() < 0.22 ? 'star' : 'rock' });
        const l1 = Math.floor(Math.random() * 3); add(l1);
        if (Math.random() < 0.3) add((l1 + 1 + Math.floor(Math.random() * 2)) % 3);
      }
      const spd = 20 + s.t * 0.7;
      for (const o of s.objs) {
        o.y += spd * dt;
        if (!o.dead && o.y + 6 > PET_TOP + 2 && o.y < GROUND && Math.abs(o.x - s.x) < 7) {
          o.dead = true;
          if (o.type === 'star') { s.stars++; a.sound.play('coin'); }
          else { s.lives--; s.flash = 0.6; a.sound.play('hit'); a.sound.vibrate(60); }
          hud();
        }
      }
      s.objs = s.objs.filter(o => !o.dead && o.y < H + 2);
      if (s.lives <= 0) { s.over = true; s.win = false; }
      else if (s.t >= DUR) { s.over = true; s.win = true; a.sound.play('win'); }
      if (!s.over && Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) hud();
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = C.light;
      LANES.forEach(x => { for (let y = 0; y < H; y += 4) g.fillRect(x - 0.5, y, 1, 2); });
      g.fillStyle = C.dark; g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = C.ink; g.fillRect(0, GROUND, W, 0.5);
      for (const o of s.objs) {
        if (o.type === 'rock') {
          box(g, o.x - 3, o.y, 6, 6, C.dark, C.ink);
          g.fillStyle = C.mid; g.fillRect(o.x - 2, o.y + 1, 2, 1);
        } else {
          g.fillStyle = C.ink; g.fillRect(o.x - 1.5, o.y - 0.5, 3, 7); g.fillRect(o.x - 3.5, o.y + 1.5, 7, 3);
          g.fillStyle = '#ffd84d'; g.fillRect(o.x - 0.5, o.y + 0.5, 1, 5); g.fillRect(o.x - 2.5, o.y + 2.5, 5, 1);
        }
      }
      if (s.flash <= 0 || Math.floor(s.flash * 12) % 2) a.drawSprite(rows, r5(s.x - 6), r5(PET_TOP), { scale: 0.5 });
    }
  };
}

/* ============================== ECO LIMA (memoria) ======================== */
function memory() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const rows = a.petRows('happy');
  const PW = 10, GAP = 2, X0 = (W - (4 * PW + 3 * GAP)) / 2, PY = H - 15;
  const px = i => X0 + i * (PW + GAP);
  const MAXR = 8;
  const s = { seq: [], phase: 'intro', t: 0, show: 0, input: 0, round: 0, lit: -1, litT: 0, cursor: 0, over: false, win: false, overT: 0, bad: false };
  const hud = () => a.hud(`Ronda ${Math.max(1, s.round)}/${MAXR}`);
  const light = (i, dur = 0.38) => { s.lit = i; s.litT = dur; a.sound.play('note', i); };
  const next = () => {
    s.round++; s.seq.push(Math.floor(Math.random() * 4)); s.show = 0; s.t = 0; s.phase = 'show'; s.input = 0; hud();
  };
  const press = i => {
    if (s.over || s.phase !== 'input') return;
    light(i, 0.25);
    if (s.seq[s.input] !== i) { s.bad = true; s.phase = 'fail'; s.t = 0; a.sound.play('hit'); a.sound.vibrate(80); return; }
    s.input++;
    if (s.input >= s.seq.length) {
      if (s.round >= MAXR) { s.phase = 'done'; s.t = 0; s.win = true; a.sound.play('win'); }
      else { s.phase = 'pause'; s.t = 0; }
    }
  };
  a.hud('Mira y repite');

  return {
    pointer(fx) { press(Math.max(0, Math.min(3, Math.floor((fx * W - X0 + GAP / 2) / (PW + GAP))))); },
    key(k) {
      if (k === 'left') s.cursor = (s.cursor + 1) % 4;       // A: siguiente casilla
      else if (k === 'right' || k === 'action') press(s.cursor);   // B: pulsar
      else if (/^[1-4]$/.test(String(k))) press(Number(k) - 1);
    },
    update(dt) {
      s.t += dt; s.litT -= dt; if (s.litT <= 0) s.lit = -1;
      if (s.phase === 'intro' && s.t > 0.9) next();
      else if (s.phase === 'pause' && s.t > 0.7) next();
      else if (s.phase === 'show') {
        const step = Math.max(0.32, 0.6 - s.round * 0.04);
        if (s.t > 0.5 + s.show * step && s.show < s.seq.length) { light(s.seq[s.show], step * 0.7); s.show++; }
        if (s.show >= s.seq.length && s.t > 0.5 + s.seq.length * step) { s.phase = 'input'; s.t = 0; a.hud('¡Tu turno!'); }
      } else if (s.phase === 'fail' || s.phase === 'done') {
        if (s.t > 1) {
          const r = s.win ? MAXR : s.round - 1;
          end('memory', s.win ? '¡Memoria de elefante!' : 'Se ha liado…', [`Rondas superadas: ${r}`],
            { happy: Math.min(45, 6 + 5 * r), energy: -8, hunger: -5, weight: -Math.min(1.5, 0.2 + 0.12 * r), lp: Math.ceil(r * 0.7), win: r >= 4, score: r });
        }
      }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = C.dark; g.fillRect(0, H - 3, W, 3);
      a.drawSprite(rows, r5(W / 2 - 6), r5(3), { scale: 0.5 });
      for (let i = 0; i < 4; i++) {
        const on = s.lit === i, x = px(i);
        box(g, x, PY, PW, PW, on ? C.ink : C.light, C.ink);
        g.fillStyle = on ? C.bg : C.ink;
        const cx = x + PW / 2, cy = PY + PW / 2;
        if (i === 0) g.fillRect(cx - 1, cy - 3, 2, 6);                                   // |
        else if (i === 1) { g.fillRect(cx - 3, cy - 1, 6, 2); }                         // —
        else if (i === 2) { g.fillRect(cx - 2, cy - 2, 4, 4); }                         // ■
        else { g.fillRect(cx - 1, cy - 3, 2, 6); g.fillRect(cx - 3, cy - 1, 6, 2); }    // +
        if (s.phase === 'input' && s.cursor === i && !on) { g.fillStyle = C.ink; g.fillRect(x, PY + PW + 0.5, PW, 0.5); }
      }
      g.fillStyle = C.ink;
      for (let i = 0; i < s.seq.length && i < MAXR; i++) g.fillRect(4 + i * 3, 17.5, 2, 1);          // progreso de la secuencia
    }
  };
}

/* ================================ DUCHA ==================================== */
function shower() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const rows = a.petRows('happy'), dirt = a.S().dirt;
  const PX = 12, PY = 6, DUR = 25;
  // manchas sobre píxeles del cuerpo
  const cells = [];
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.' && c !== 'K' && j > 3 && j < 22) cells.push([i, j]); }));
  const n = Math.max(4, Math.min(14, Math.round(dirt / 100 * 12) + 3));
  const spots = [];
  for (let tries = 0; spots.length < n && cells.length && tries < 300; tries++) {
    const [cx, cy] = cells[Math.floor(Math.random() * cells.length)];
    if (spots.some(s => Math.hypot(s.x - (PX + cx), s.y - (PY + cy)) < 3.2)) continue;
    spots.push({ x: PX + cx, y: PY + cy, hp: 1 });
  }
  const total = spots.length;
  const s = { t: 0, px: W / 2, py: H - 8, down: false, moved: false, bubbles: [], removed: 0, phase: 'scrub', rinse: 0 };
  const hud = () => a.hud(`🧼 ${s.removed}/${total} · ⏱${Math.max(0, Math.ceil(DUR - s.t))}`);
  hud();
  a.setMsg('🧽 Frota las manchas con el dedo', 4000);
  const toL = (fx, fy) => [fx * W, fy * H];
  const finish = () => {
    cur = null; cancelAnimationFrame(raf); a.hud(null);
    a.showered(total ? s.removed / total : 1);
  };
  return {
    pointer(fx, fy) { if (isFinite(fx) && isFinite(fy)) [s.px, s.py] = toL(fx, fy); s.down = true; },
    up() { s.down = false; },
    drag(fx, fy) {
      if (s.phase !== 'scrub') return;
      if (!isFinite(fx) || !isFinite(fy)) return;
      const [x, y] = toL(fx, fy), d = Math.hypot(x - s.px, y - s.py);
      s.px = x; s.py = y; s.down = true;
      if (d < 0.2) return;
      if (Math.random() < 0.7) s.bubbles.push({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 4, r: 1 + Math.random() * 1.5, life: 0.9 });
      for (const sp of spots) {
        if (sp.hp <= 0 || Math.hypot(sp.x - x, sp.y - y) > 6) continue;
        sp.hp -= d * 0.11;
        if (sp.hp <= 0) { s.removed++; a.sound.play('click'); hud(); for (let k = 0; k < 5; k++) s.bubbles.push({ x: sp.x + (Math.random() - 0.5) * 4, y: sp.y + (Math.random() - 0.5) * 4, r: 1.5 + Math.random(), life: 1.2 }); }
      }
      if (s.removed >= total) { s.phase = 'rinse'; s.rinse = 0; a.sound.play('win'); }
    },
    key() { /* solo táctil / ratón */ },
    update(dt) {
      s.t += dt;
      s.bubbles.forEach(b => { b.life -= dt; b.y -= dt * 3; });
      s.bubbles = s.bubbles.filter(b => b.life > 0);
      if (s.phase === 'scrub') { if (Math.floor(s.t * 2) !== Math.floor((s.t - dt) * 2)) hud(); if (s.t >= DUR) { s.phase = 'rinse'; s.rinse = 0; } }
      else { s.rinse += dt; if (s.rinse > 1.2) finish(); }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = C.dark; g.fillRect(0, H - 3, W, 3);
      a.drawSprite(rows, PX, PY, {});
      g.fillStyle = '#6b4a1f';
      for (const sp of spots) if (sp.hp > 0) {
        const k = Math.max(0.4, sp.hp);                                       // se desvanece al frotar
        g.globalAlpha = k; g.fillRect(r5(sp.x), r5(sp.y), 2.5, 1.5); g.fillRect(r5(sp.x + 0.5), r5(sp.y + 1), 1.5, 1); g.globalAlpha = 1;
      }
      g.fillStyle = '#f7fbe6';
      for (const b of s.bubbles) { g.fillRect(r5(b.x), r5(b.y), r5(b.r), r5(b.r)); g.fillStyle = C.ink; g.fillRect(r5(b.x), r5(b.y), 0.5, 0.5); g.fillStyle = '#f7fbe6'; }
      if (s.phase === 'rinse') {                                              // ducha: gotas cayendo
        g.fillStyle = '#6ec6ff';
        for (let i = 0; i < 24; i++) g.fillRect(2 + i * 2, (s.rinse * 40 + i * 7) % H, 0.5, 2);
      }
      if (s.phase === 'scrub') {                                 // esponja
        box(g, s.px - 3.5, s.py - 2, 7, 4, s.down ? '#ffd84d' : '#f2c14a', C.ink);
        g.fillStyle = C.ink; g.fillRect(r5(s.px - 1.5), r5(s.py - 0.5), 0.5, 0.5); g.fillRect(r5(s.px + 0.5), r5(s.py + 0.5), 0.5, 0.5);
      } else if (s.phase === 'scrub' && s.t < 3) { g.fillStyle = C.ink; g.fillRect(2, 2, 0, 0); }
    }
  };
}

/* ================================= VISITA ================================== */
function visit(card) {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const mine = a.petRows('happy');
  const SP = L.SPR[card.form] || L.SPR.child_good;
  const guestRows = SP.happy || SP.idle;
  const PADY = 26, PADW = 14, PADX = (W - PADW * 3 - 4) / 2;
  const s = { t: 0, phase: 'arrive', gx: W + 4, n: 0, act: -1, actT: 0, cursor: 0, hearts: [] };
  const GX = 24;
  a.hud(`${card.nick ? card.nick + ' · ' : ''}visita de ${card.name}`);
  const ICON = [
    [".k.k.k.", ".kkkkk.", "kkkkkkk", "kkkkkkk", ".kkkkk.", "..kkk..", "..kkk.."],           // saludar
    ["...k...", "..kkk..", ".kkkkk.", "kkkkkkk", "k.....k", "kkkkkkk", "......."],             // tarta
    [".kkkkk.", "k..k..k", "k.kkk.k", "kk.k.kk", "k.kkk.k", "k..k..k", ".kkkkk."]              // pelota
  ];
  const press = i => {
    if (s.phase !== 'play' || s.actT > 0) return;
    s.act = i; s.actT = 1.7; s.n++; a.sound.play(['happy', 'eat', 'coin'][i]);
    for (let k = 0; k < 3; k++) s.hearts.push({ x: 24 + (k - 1) * 3, y: 10, v: 6 + k, life: 1.6 });
    a.hud(`${'♥'.repeat(s.n)}${'♡'.repeat(3 - s.n)}`);
  };
  return {
    pointer(fx) { press(Math.max(0, Math.min(2, Math.floor((fx * W - PADX + 1) / (PADW + 2))))); },
    key(k) { if (k === 'left') s.cursor = (s.cursor + 1) % 3; else if (k === 'right' || k === 'action') press(s.cursor); else if (/^[1-3]$/.test(String(k))) press(Number(k) - 1); },
    update(dt) {
      s.t += dt; s.actT = Math.max(0, s.actT - dt);
      s.hearts.forEach(h => { h.y -= h.v * dt; h.life -= dt; });
      s.hearts = s.hearts.filter(h => h.life > 0);
      if (s.phase === 'arrive') { s.gx = Math.max(GX, s.gx - dt * 20); if (s.gx <= GX && s.t > 1.6) { s.phase = 'play'; s.t = 0; a.hud('Toca un botón: ♡♡♡'); } }
      else if (s.phase === 'play' && s.n >= 3 && s.actT <= 0) { s.phase = 'bye'; s.t = 0; a.sound.play('win'); }
      else if (s.phase === 'bye' && s.t > 1.4) {
        const r = card.finish ? card.finish() : { happy: 20, lp: 0, lines: [] };
        end('visit', r.title || '¡Qué buena visita!', r.lines || [], { happy: r.happy, energy: -2, lp: r.lp || 0 }, { noAgain: true, noStats: true });
      }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = C.dark; g.fillRect(0, 24, W, 0.5);
      const bob = k => (s.act >= 0 && s.actT > 0 && ((Math.floor(s.actT * 6) + k) % 2)) ? -2 : 0;
      const jy = s.phase === 'arrive' ? Math.abs(Math.sin(s.t * 9)) * -2 : 0;
      a.drawSprite(mine, 0, 2 + bob(0), {});
      a.drawSprite(guestRows, Math.round(s.gx), Math.round(2 + bob(1) + jy), { flip: true });
      // objeto que viaja entre los dos
      if (s.actT > 0 && s.act >= 1) {
        const q = 1 - s.actT / 1.7, px = 12 + Math.abs(Math.sin(q * Math.PI * 2)) * 0 + q * 24, py = 12 - Math.sin(q * Math.PI * (s.act === 2 ? 4 : 1)) * (s.act === 2 ? 5 : 3);
        g.fillStyle = s.act === 1 ? '#ff8fb1' : '#e0523f'; g.fillRect(r5(px), r5(py), 3, 3); g.fillStyle = C.ink; g.fillRect(r5(px), r5(py), 3, 0.5);
      }
      for (const h of s.hearts) a.drawHeart(Math.round(h.x), Math.round(h.y));
      for (let i = 0; i < 3; i++) {
        const x = PADX + i * (PADW + 2), on = s.act === i && s.actT > 0;
        box(g, x, PADY, PADW, 9, on ? C.ink : C.light, C.ink);
        g.fillStyle = on ? C.bg : C.ink;
        ICON[i].forEach((row, j) => [...row].forEach((c, k) => { if (c === 'k') g.fillRect(r5(x + 3.5 + k), r5(PADY + 1 + j * 1.0 * 1), 1, 1); }));
        if (s.phase === 'play' && s.cursor === i && !on) { g.fillStyle = C.ink; g.fillRect(x, PADY + 9.5, PADW, 0.5); }
      }
    }
  };
}
/* ============================== PENALTIS ================================== */
function penalty() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H;
  const rows = a.petRows('happy');
  const GX0 = 6, GX1 = 42, GY0 = 7, GY1 = 21, SHOTS = 5, SPOT = { x: 24, y: 30 };
  const s = { shot: 0, goals: 0, res: [], phase: 'aim', t: 0, cx: 24, speed: 1.0, ball: { x: SPOT.x, y: SPOT.y }, from: 0, to: { x: 24, y: 14 }, kz: 1, kx: 24, text: '', textT: 0, hop: 0, over: false };
  const hud = () => a.hud(`${s.phase === 'res' || s.phase === 'end' ? s.text + '  ' : ''}⚽ ${Math.min(s.shot + 1, SHOTS)}/${SHOTS}  ✔${s.goals}`);
  hud();

  const zoneOf = x => Math.max(0, Math.min(2, Math.floor((x - GX0) / ((GX1 - GX0) / 3))));
  const zoneX = z => GX0 + (GX1 - GX0) / 3 * (z + 0.5);

  function shoot() {
    if (s.phase !== 'aim' || s.over) return;
    s.phase = 'shot'; s.t = 0;
    s.to = { x: s.cx, y: GY0 + 2 + Math.random() * 6 };
    const out = s.cx < GX0 || s.cx > GX1;
    s.kz = Math.floor(Math.random() * 3);                      // el portero se lanza a un lado al azar
    s.out = out; s.save = !out && zoneOf(s.cx) === s.kz;
    a.sound.play('click');
  }

  return {
    key() { shoot(); },
    pointer() { shoot(); },
    update(dt) {
      s.hop = Math.max(0, s.hop - dt);
      if (s.phase === 'aim') {
        s.t += dt;
        s.cx = 24 + Math.sin(s.t * 2.2 * s.speed) * 22;       // la mira va y viene: pulsa en el momento justo
      } else if (s.phase === 'shot') {
        s.t += dt;
        const q = Math.min(1, s.t / 0.45);
        s.ball.x = SPOT.x + (s.to.x - SPOT.x) * q;
        s.ball.y = SPOT.y + (s.to.y - SPOT.y) * q - Math.sin(q * Math.PI) * 3;
        s.kx += (zoneX(s.kz) - s.kx) * Math.min(1, dt * 10);
        if (q >= 1) {
          s.phase = 'res'; s.t = 0;
          if (s.out) { s.text = '¡FUERA!'; a.sound.play('sad'); }
          else if (s.save) { s.text = '¡PARADA!'; a.sound.play('hit'); }
          else { s.text = '¡GOL!'; s.goals++; s.hop = 0.8; a.sound.play('win'); }
          s.res.push(s.out ? 'x' : s.save ? 's' : 'g'); hud();
        }
      } else if (s.phase === 'res') {
        s.t += dt; s.kx += (zoneX(s.kz) - s.kx) * Math.min(1, dt * 10);
        if (s.t > 1.0) {
          s.shot++;
          if (s.shot >= SHOTS) { s.over = true; s.phase = 'end'; s.t = 0; }
          else { s.phase = 'aim'; s.t = 0; s.kx = 24; s.kz = 1; s.ball = { x: SPOT.x, y: SPOT.y }; s.speed = 1 + s.shot * 0.18; hud(); }
        }
      } else if (s.phase === 'end') {
        s.t += dt;
        if (s.t > 0.5) {
          const gl = s.goals, win = gl >= 3;
          end('penalty', gl >= 5 ? '¡Tanda perfecta!' : win ? '¡Gran tanda!' : 'Otra vez será',
            [`Goles: ${gl}/${SHOTS}`],
            { happy: 6 + 4 * gl, energy: -8, hunger: -5, weight: -0.3 - 0.1 * gl, lp: gl + (gl >= 5 ? 3 : 0), win, score: gl });
        }
      }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = C.light; g.fillRect(0, 22, W, H - 22);                      // césped
      g.fillStyle = C.dark; for (let x = 0; x < W; x += 6) g.fillRect(x, 24 + (x % 12 ? 2 : 0), 3, 0.5);
      // portería
      g.fillStyle = C.mid;
      for (let x = GX0 + 2; x < GX1; x += 3) g.fillRect(x, GY0, 0.5, GY1 - GY0);
      for (let y = GY0 + 2; y < GY1; y += 3) g.fillRect(GX0, y, GX1 - GX0, 0.5);
      g.fillStyle = C.ink; g.fillRect(GX0 - 1, GY0 - 1, GX1 - GX0 + 2, 1); g.fillRect(GX0 - 1, GY0 - 1, 1, GY1 - GY0 + 1); g.fillRect(GX1, GY0 - 1, 1, GY1 - GY0 + 1);
      // portero
      const dive = s.phase === 'shot' || s.phase === 'res', kx = dive ? s.kx : 24, tilt = dive ? (s.kz - 1) * 3 : 0;
      g.fillStyle = C.ink; g.fillRect(r5(kx - 2 + tilt * 0.3), GY1 - 9, 4, 6); g.fillRect(r5(kx - 4 + tilt), GY1 - 8 - (dive ? 1 : 0), 8, 1.5);
      g.fillStyle = C.bg; g.fillRect(r5(kx - 1.5 + tilt * 0.3), GY1 - 12, 3, 3); g.fillStyle = C.ink; g.fillRect(r5(kx - 1.5 + tilt * 0.3), GY1 - 12, 3, 0.5);
      // mira
      if (s.phase === 'aim') {
        const x = r5(s.cx), y = (GY0 + GY1) / 2;
        g.fillStyle = C.ink; g.fillRect(x - 3, y, 7, 1); g.fillRect(x, y - 3, 1, 7);
        g.fillStyle = s.cx < GX0 || s.cx > GX1 ? C.mid : C.bg; g.fillRect(x, y, 1, 1);
      }
      // balón
      const bx = r5(s.ball.x), by = r5(s.ball.y);
      g.fillStyle = C.ink; g.fillRect(bx - 2, by - 2, 5, 5); g.fillStyle = C.bg; g.fillRect(bx - 1, by - 1, 3, 3); g.fillStyle = C.ink; g.fillRect(bx, by, 1, 1);
      // mascota que chuta
      const hop = s.hop > 0 ? -Math.abs(Math.sin(s.hop * 12)) * 3 : 0;
      a.drawSprite(rows, r5(SPOT.x - 6 - 10), r5(24 + hop), { scale: 0.5 });
      // resultado de cada tiro
      for (let i = 0; i < SHOTS; i++) {
        const c = s.res[i]; g.fillStyle = C.ink; g.fillRect(28 + i * 4, H - 4, 3.5, 3);
        g.fillStyle = c === 'g' ? C.bg : c ? C.mid : C.light; g.fillRect(28.5 + i * 4, H - 3.5, 2.5, 2);
      }
    }
  };
}

})();
