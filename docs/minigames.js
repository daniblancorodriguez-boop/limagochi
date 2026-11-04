/* ==========================================================================
   LIMAGOCHI · minijuegos de acción (se dibujan en la propia pantalla LCD)
   · Lima Vuela  (tipo Flappy Bird)
   · Esquiva     (esquivar rocas, recoger estrellas)
   · Eco Lima    (memoria: repite la secuencia de luces y sonidos)
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

function end(kind, title, lines, rewardObj) {
  const a = A();
  cur = null; cancelAnimationFrame(raf);
  a.hud(null);
  a.reward({ ...rewardObj, game: kind }, title);
  a.openPanel([
    a.p(title), ...lines.map(t => a.p(t)),
    a.row(
      a.btn('Otra vez', () => { a.closePanel(); if (a.canPlay()) L.mini.start(kind); }),
      a.btn('Salir', a.closePanel, 'ghost')
    )
  ]);
}

const L = LIMA;
L.mini = {
  active: () => !!cur,
  start(kind) {
    this.stop(false);
    cur = ({ flappy, dodge, memory })[kind]();
    last = performance.now();
    loop();
  },
  stop(redraw = true) {
    cancelAnimationFrame(raf);
    const was = !!cur; cur = null;
    if (was) { A().hud(null); if (redraw) A().render(); }
  },
  pointer(fx) { cur && cur.pointer && cur.pointer(fx); },
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
})();
