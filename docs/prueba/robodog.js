/* ==========================================================================
   LIMAGOCHI · Lima robot, el galgo de peluche robot (regalo exclusivo, objeto 'robodog')
   Vive en el cuarto, a la derecha de la lámpara, tumbado con su pelota. Cada rato juega con la mascota:
   · «bola»   la lanza, se levanta, corre tras ella, la recoge y vuelve a tumbarse con ella
   · «cuerda» se planta y tira con fuerza de una cuerda: la mascota se ve arrastrada y tira de vuelta
   Al tocarlo juega al momento. Con ruidos (guau, bzzt, gruñidos y pasitos) si el sonido está activo.
   Fotogramas: ver tools/build_robodog.py (L.ITEMS.robodog.hd.rows[f], meta[f] = boca y bombilla).
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA;
const A = () => L.api;
const X = 28, FLOOR = 34;                       // x de su sitio y y del suelo (lógicos)
const F = { idle: 0, up: 1, down: 2, blink: 3, toss: 4, sleep: 5, stand: 6, runA: 7, runB: 8, pullA: 9, pullB: 10 };
const D = () => L.ITEMS.robodog;
const dims = () => { const r = D().hd.rows[0]; return { w: r[0].length, h: r.length }; };
const r5 = v => Math.round(v * 2) / 2;
let S = null, next = 0, last = 0, n = 0, freeze = false;      // S = juego en curso; n alterna bola y cuerda

const awake = () => { const s = A().S(); return !s.sleeping && !s.sick && s.stage !== 'egg' && s.stage !== 'dead' && !s.pause; };
const snd = name => L.sound && L.sound.play(name);

function begin(mode) {
  S = { mode, t: 0, ph: 'prep', dog: { x: X, f: F.idle, flip: false, dx: 0, dy: 0, v: 0 }, ball: null, step: 0, cycle: -1, petx: 1, ev: {}, t2: 0 };
}
function once(k, fn) { if (!S.ev[k]) { S.ev[k] = 1; fn(); } }

/* posición de la boca (lógicos) del fotograma f con el perro en x */
function mouth(f, x, flip) {
  const d = dims(), m = D().meta[f].mouth, y = FLOOR - d.h / 2;
  return { x: x + (flip ? (d.w - m[0]) / 2 : m[0] / 2), y: y + m[1] / 2 };
}

function stepBall(b, dt) {
  if (b.ph === 'fly') {
    b.vy += 80 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y >= FLOOR - 1.5) { b.y = FLOOR - 1.5; b.vy = -Math.abs(b.vy) * 0.5; b.vx *= 0.8; if (Math.abs(b.vy) < 6) { b.ph = 'roll'; b.vy = 0; } }
  } else if (b.ph === 'roll') { b.x += b.vx * dt; b.vx *= 0.97; if (Math.abs(b.vx) < 1) b.vx = 0; }
}

/* avanza el juego dt segundos */
function advance(dt) {
  const s = S, d = s.dog; s.t += dt;
  if (s.mode === 'ball') {
    if (s.ph === 'prep') {
      d.f = F.idle; once('b0', () => snd('rbeep'));
      if (s.t > 0.5) { s.ph = 'toss'; s.t2 = 0; }
    } else if (s.ph === 'toss') {
      s.t2 += dt; d.f = F.toss;
      if (s.t2 > 0.15) once('b1', () => { const m = mouth(F.toss, d.x, false); s.ball = { x: m.x, y: m.y, vx: -27, vy: -30, ph: 'fly' }; snd('rbark'); });
      if (s.t2 > 0.4) { s.ph = 'chase'; s.t2 = 0; }
    } else if (s.ph === 'chase') {
      s.t2 += dt; stepBall(s.ball, dt);
      const dir = Math.sign(s.ball.x - mouth(d.f, d.x, d.flip).x) || -1;
      if (s.t2 < 0.18) d.f = F.stand;
      else { d.flip = dir > 0; d.v += (dir * 34 - d.v) * Math.min(1, dt * 9); d.x += d.v * dt; d.f = Math.floor(s.t2 / 0.09) % 2 ? F.runB : F.runA; d.dy = d.f === F.runA ? -0.5 : 0; once('b2', () => snd('rbark')); s.step -= dt; if (s.step <= 0) { s.step = 0.16; snd('rstep'); } }
      const m = mouth(d.f, d.x, d.flip);
      if ((Math.abs(m.x - s.ball.x) < 1.6 && s.ball.y > FLOOR - 6 && s.t2 > 0.3) || s.t2 > 6) { s.ph = 'carry'; s.ball.ph = 'held'; d.flip = true; d.v = 0; snd('rbark'); }
    } else if (s.ph === 'carry') {
      d.v += (30 - d.v) * Math.min(1, dt * 9); d.x += d.v * dt; d.f = Math.floor(s.t * 11) % 2 ? F.runB : F.runA; d.dy = d.f === F.runA ? -0.5 : 0; s.step -= dt; if (s.step <= 0) { s.step = 0.16; snd('rstep'); }
      const m = mouth(d.f, d.x, true); s.ball.x = m.x; s.ball.y = m.y;
      if (d.x >= X) { d.x = X; d.v = 0; d.dy = 0; d.flip = false; s.ph = 'home'; s.t2 = 0; s.ball = null; snd('rbeep'); }
    } else if (s.ph === 'home') {
      s.t2 += dt; d.f = s.t2 < 0.35 ? F.stand : F.idle;
      if (s.t2 > 0.9) end();
    }
    s.petx = 1;
  } else {                                                   // cuerda
    if (s.ph === 'prep') {
      d.f = F.stand; once('t0', () => snd('rgrowl'));
      if (s.t > 0.5) { s.ph = 'tug'; s.t2 = 0; }
    } else if (s.ph === 'tug') {
      s.t2 += dt;
      const c = Math.floor(s.t2 / 0.55), u = (s.t2 % 0.55) / 0.55, pull = u < 0.55;
      if (c !== s.cycle) { s.cycle = c; snd(c % 2 ? 'rbark' : 'rgrowl'); }
      d.f = pull ? F.pullA : F.pullB;
      const goal = pull ? 1.9 : -0.6; d.dx += (goal - d.dx) * Math.min(1, dt * 14);
      d.dy = pull ? Math.sin(s.t2 * 90) * 0.35 : 0;
      s.petx = pull ? 10 : 1;
      if (s.t2 > 3.3) { s.ph = 'end'; s.t2 = 0; snd('rbeep'); }
    } else if (s.ph === 'end') {
      s.t2 += dt; d.dx += (0 - d.dx) * Math.min(1, dt * 8); d.dy = 0; d.f = s.t2 < 0.35 ? F.stand : F.idle; s.petx = 1;
      if (s.t2 > 0.9) end();
    }
  }
}
function end() {
  const s = A().S(); s.happy = Math.min(100, s.happy + 2); A().fx('happy', 1500);
  S = null; next = Date.now() + 18000 + Math.random() * 14000;
}

/* ------------------------------ dibujo ------------------------------ */
function blit(f, x, y, flip) {
  const a = A(), g = a.ctx, it = D().hd, rows = it.rows[f], w = rows[0].length;
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < w; i++) {
    const c = rows[j][i]; if (c === '.') continue;
    g.fillStyle = a.tint(it.pal[c.charCodeAt(0) - 97]);
    g.fillRect(x + (flip ? w - 1 - i : i) / 2, y + j / 2, 0.5, 0.5);
  }
}
function ball(x, y) {
  const a = A(), g = a.ctx;
  g.fillStyle = a.tint('#2b1a10'); g.fillRect(r5(x - 1.5), r5(y - 1), 3, 2); g.fillRect(r5(x - 1), r5(y - 1.5), 2, 3);
  g.fillStyle = a.tint('#e0392f'); g.fillRect(r5(x - 1), r5(y - 1), 2, 2); g.fillStyle = a.tint('#ffb0a0'); g.fillRect(r5(x - 1), r5(y - 1), 0.5, 0.5);
}

/** Fotograma en reposo (parpadea, mueve la cola) o dormido. */
function idleFrame(T) {
  if (!awake()) return F.sleep;
  if (T % 4300 < 150) return F.blink;
  if (T % 9500 < 1700) return [F.up, F.idle, F.down, F.idle][Math.floor(T / 280) % 4];
  return F.idle;
}

function tick(now) {
  if (!last) last = now;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S && !awake()) S = null;                                            // se duerme o enferma: se acaba el juego
  if (S && !freeze) { try { let r = dt; while (r > 0 && S) { const k = Math.min(r, 1 / 60); advance(k); r -= k; } } catch (e) { S = null; next = Date.now() + 20000; } }   // un fallo nunca debe vaciar el cuarto
  else if (!S && awake() && !freeze) {
    if (!next) next = now + 12000 + Math.random() * 10000;
    else if (now >= next) { begin(n++ % 2 ? 'tug' : 'ball'); }
  }
}

/** El perro tumbado (en reposo) va por detrás de la mascota; jugando se pinta delante (ver drawFx). */
function draw(now) {
  try { tick(now); } catch (e) { S = null; }
  if (L.school.isAway() || S) return;
  const d = dims(), y = FLOOR - d.h / 2, a = A(), g = a.ctx, f = idleFrame(now);
  blit(f, X, r5(y), false);
  if (f !== F.sleep) { const m = mouth(F.idle, X, false); ball(m.x + 1, FLOOR - 1.5); }      // su pelota entre las patas
  if (f !== F.sleep) {                                                    // bombilla de la antena
    const bl = D().meta[f].bulb; g.fillStyle = a.tint(Math.floor(now / 700) % 2 ? '#ff5a5a' : '#8a3030');
    g.fillRect(X + bl[0] / 2, y + bl[1] / 2, 1, 0.5);
  }
}

function drawFx(now) {
  if (L.school.isAway() || !S) return;
  const d = dims(), a = A(), g = a.ctx, dog = S.dog, y = r5(FLOOR - d.h / 2 + dog.dy), x = r5(dog.x + dog.dx);
  const m = mouth(dog.f, x, dog.flip);
  if (S.mode === 'tug' && S.ph !== 'prep' && S.ph !== 'end' || S.mode === 'tug' && S.ph === 'prep' && S.t > 0.1) {
    const pb = a.petBox(), ex = pb.x + 21, ey = pb.y + 17, taut = dog.f === F.pullA, slack = taut ? 0.2 : 2.4, nn = 28;
    for (let i = 0; i <= nn; i++) {
      const u = i / nn, px = m.x + (ex - m.x) * u, py = m.y + (ey - m.y) * u + Math.sin(Math.PI * u) * slack;
      g.fillStyle = a.tint(i % 4 < 2 ? '#e3c27f' : '#b8955a'); g.fillRect(r5(px), r5(py), 0.5, 0.5);
      g.fillStyle = a.tint(i % 4 < 2 ? '#b8955a' : '#e3c27f'); g.fillRect(r5(px), r5(py + 0.5), 0.5, 0.5);
    }
  }
  blit(dog.f, x, y, dog.flip);
  const bl = D().meta[dog.f].bulb, bx = dog.flip ? (d.w - 1 - bl[0]) / 2 : bl[0] / 2;
  g.fillStyle = a.tint(Math.floor(now / 300) % 2 ? '#ff5a5a' : '#8a3030'); g.fillRect(x + bx, y + bl[1] / 2, 1, 0.5);
  if (S.mode === 'ball') {
    if (S.ph === 'prep') ball(m.x + 1, m.y + 0.5);
    else if (S.ball) ball(S.ball.x, S.ball.y);
    else if (S.ph === 'home') ball(mouth(F.idle, X, false).x + 1, FLOOR - 1.5);
  }
}

const safe = fn => (...a) => { try { return fn(...a); } catch (e) { S = null; } };
L.robodog = {
  has: () => A().S().owned.includes('robodog'),
  name: 'Lima robot',
  draw: safe(draw), drawFx: safe(drawFx),
  playing: () => !!S && awake(),
  petX: () => (S && isFinite(S.petx) ? S.petx : 1),
  inside(x, y) { const d = dims(), px = S ? X + (S.dog.x - X) + S.dog.dx : X; return x >= px && x < px + d.w / 2 && y >= FLOOR - 8 && y < FLOOR; },
  poke: safe(function () {
    const s = A().S(); if (!awake()) { A().setMsg(s.sleeping ? 'Zzz… duerme' : 'Ahora no puede jugar'); return; }
    if (!S) { begin(n++ % 2 ? 'tug' : 'ball'); freeze = false; }
    snd('rbark'); setTimeout(() => snd('rbeep'), 160); A().setMsg('🤖 Lima robot: ¡bzzt, guau!', 2500);
  }),
  /* ayudas para pruebas y capturas */
  debug(mode, t) { if (!mode) { S = null; freeze = false; return; } begin(mode); freeze = true; while (S && S.t < t) advance(1 / 60); },
  _ff(sec) { let r = sec; while (r > 0 && S) { advance(Math.min(r, 1 / 60)); r -= 1 / 60; } },
  state: () => (S ? { mode: S.mode, ph: S.ph, t: S.t } : null)
};
})();
