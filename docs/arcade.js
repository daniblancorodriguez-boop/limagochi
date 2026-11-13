/* ==========================================================================
   LIMAGOCHI · minijuegos de arcade con monedas limitadas
   · Esquiva  (llueven piedras y monedas por 6 columnas)
   · Bloques  (tipo Arkanoid: la mascota rebota la bola y rompe ladrillos)
   Límites (cada juego los lleva por separado): 5 monedas por partida y 20 monedas al día.
   Al llegar a cualquiera de los dos la partida termina con un «¡Bravo!».
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA;
const A = () => L.api;
const r5 = v => Math.round(v * 2) / 2;
const COIN_GAME = 5, COIN_DAY = 20;
const today = () => new Date().toLocaleDateString('sv');

/** Monedas ya ganadas hoy en un juego (se reinicia cada día). */
function got(kind) {
  const s = A().S();
  s.arcade = Object.assign({ day: '' }, s.arcade);
  if (s.arcade.day !== today()) s.arcade = { day: today() };
  return s.arcade[kind] || 0;
}
function addCoins(kind, n) { got(kind); const s = A().S(); s.arcade[kind] = (s.arcade[kind] || 0) + n; }

/** Moneda de las pantallas de minijuego (la misma de Lima Vuela). */
function coin(cx, cy) {
  const g = A().ctx, C = A().colors;
  g.fillStyle = C.ink; g.fillRect(r5(cx - 1.5), r5(cy - 2), 3, 4); g.fillRect(r5(cx - 2), r5(cy - 1.5), 4, 3);
  g.fillStyle = C.light; g.fillRect(r5(cx - 1), r5(cy - 1.5), 2, 3);
  g.fillStyle = C.dark; g.fillRect(r5(cx - 0.5), r5(cy - 1), 1, 2);
}
/** Dibuja filas de texto como píxeles de medio píxel lógico (el sprite de la piedra). */
function sprite(rows, pal, x, y, k) {
  const a = A(), g = a.ctx;
  rows.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch === '.' || !pal[ch]) return;
    g.fillStyle = a.tint(pal[ch]); g.fillRect(r5(x + i * k), r5(y + j * k), k, k);
  }));
}

/** Texto de cierre según el motivo; devuelve { title, full } */
function verdict(kind, coins, base) {
  const day = got(kind) + coins >= COIN_DAY, full = coins >= COIN_GAME;
  if (day) return { title: `¡Bravo! Has conseguido las ${COIN_DAY} monedas de hoy`, full: true };
  if (full) return { title: '¡Bravo! Has conseguido todas las monedas', full: true };
  return { title: base, full: false };
}
/** Cuántas monedas puede dar todavía esta partida (0 si hoy ya no quedan). */
const room = kind => Math.max(0, Math.min(COIN_GAME, COIN_DAY - got(kind)));
const hudCoins = (kind, n) => `🪙 ${n}/${COIN_GAME} · hoy ${Math.min(COIN_DAY, got(kind) + n)}/${COIN_DAY}`;

/* ================================ ESQUIVA ================================ */
function dodge() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H, rows = a.petRows('happy');
  const COLS = 6, XS = Array.from({ length: COLS }, (_, i) => 4 + i * 8), DUR = 30, GROUND = H - 3, PET_TOP = GROUND - 12;
  const cap = room('dodge');
  const s = { x: 24, tx: 24, t: 0, lives: 3, coins: 0, objs: [], spawn: 0.7, over: false, win: false, flash: 0, overT: 0, why: '' };
  const hud = () => a.hud(`${'♥'.repeat(Math.max(0, s.lives))} ${cap ? hudCoins('dodge', s.coins) : 'hoy ya no hay monedas'} ⏱${Math.max(0, Math.ceil(DUR - s.t))}`);
  hud();
  const col = () => Math.max(0, Math.min(COLS - 1, Math.round((s.tx - 4) / 8)));
  const goto = c => { if (!s.over) { s.tx = XS[Math.max(0, Math.min(COLS - 1, c))]; a.sound.play('click'); } };
  const rock = L.hands[0];

  return {
    key(k) { if (k === 'left') goto(col() - 1); else if (k === 'right') goto(col() + 1); },
    pointer(fx) { goto(Math.floor(fx * COLS)); },
    drag(fx) { if (!s.over) s.tx = XS[Math.max(0, Math.min(COLS - 1, Math.floor(fx * COLS)))]; },
    update(dt) {
      if (s.over) {
        s.overT += dt;
        if (s.overT > 0.8) {
          const v = verdict('dodge', s.coins, s.win ? '¡Lo esquivó todo!' : '¡Le han dado!');
          addCoins('dodge', s.coins);
          L.mini.end('dodge', v.title, [`Monedas: ${s.coins}`, s.why || (s.win ? 'Sobrevivió los 30 s' : 'No sobrevivió')],
            { happy: 10 + 3 * s.coins + (s.win ? 12 : 0), energy: -6, hunger: -8, weight: -Math.min(2, 0.4 + 0.1 * s.coins), lp: s.coins, win: s.win, score: s.coins });
        }
        return;
      }
      s.t += dt; s.flash = Math.max(0, s.flash - dt);
      s.x += (s.tx - s.x) * Math.min(1, dt * 18);
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.3, 0.75 - s.t * 0.014);
        const onScreen = s.objs.filter(o => o.type === 'coin').length;
        const free = Array.from({ length: COLS }, (_, i) => i);
        const pick = () => free.splice(Math.floor(Math.random() * free.length), 1)[0];
        const rocks = Math.random() < 0.35 ? 2 : 1;                     // como mucho 2 piedras por tanda: siempre hay hueco
        for (let i = 0; i < rocks; i++) s.objs.push({ x: XS[pick()], y: -6, type: 'rock' });
        if (s.coins + onScreen < cap && Math.random() < 0.3) s.objs.push({ x: XS[pick()], y: -6, type: 'coin' });
      }
      const spd = 20 + s.t * 0.7;
      for (const o of s.objs) {
        o.y += spd * dt;
        // la pieza solo golpea mientras solapa el cuerpo: cuando ya ha pasado por los pies, no hace daño
        if (!o.dead && o.y + 6 > PET_TOP + 3 && o.y < GROUND - 4 && Math.abs(o.x - s.x) < 6) {
          o.dead = true;
          if (o.type === 'coin') { s.coins++; a.sound.play('coin'); }
          else { s.lives--; s.flash = 0.6; a.sound.play('hit'); a.sound.vibrate(60); }
          hud();
        }
      }
      s.objs = s.objs.filter(o => !o.dead && o.y < H + 2);
      if (s.lives <= 0) { s.over = true; s.win = false; }
      else if (cap && (s.coins >= cap)) { s.over = true; s.win = true; s.why = 'Recogió todas las monedas'; a.sound.play('win'); }
      else if (s.t >= DUR) { s.over = true; s.win = true; a.sound.play('win'); }
      if (!s.over && Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) hud();
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      g.fillStyle = C.dark; g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = C.ink; g.fillRect(0, GROUND, W, 0.5);
      g.fillStyle = C.light; XS.forEach(x => g.fillRect(x - 0.5, GROUND + 1, 1, 1));
      for (const o of s.objs) {
        if (o.type === 'rock') sprite(rock.rows, rock.pal, o.x - 3, o.y, 0.5);
        else coin(o.x, o.y + 3);
      }
      if (s.flash <= 0 || Math.floor(s.flash * 12) % 2) a.drawSprite(rows, r5(s.x - 6), r5(PET_TOP), { scale: 0.5 });
    }
  };
}

/* ================================= BLOQUES ================================ */
function brick() {
  const a = A(), g = a.ctx, C = a.colors, W = a.W, H = a.H, rows = a.petRows('happy');
  const COLS = 8, ROWS = 3, BW = 5, BH = 2, PET_TOP = H - 12, HALF = 7, BS = 1.5;
  const cap = room('brick');
  const bricks = [];
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) bricks.push({ x: i * 6 + 0.5, y: 3 + j * 3, j, coin: false });
  const pool = bricks.slice(); for (let i = 0; i < cap; i++) pool.splice(Math.floor(Math.random() * pool.length), 1)[0].coin = true;
  const s = { px: 24, tx: 24, bx: 24, by: PET_TOP - BS, vx: 0, vy: 0, stuck: true, lives: 3, coins: 0, broken: 0, drops: [], over: false, win: false, overT: 0, speed: 24, flash: 0, why: '' };
  const hud = () => a.hud(`${'♥'.repeat(Math.max(0, s.lives))} ${cap ? hudCoins('brick', s.coins) : 'hoy ya no hay monedas'}`);
  hud();
  const launch = () => {
    if (!s.stuck || s.over) return;
    s.stuck = false; s.speed = 24; const an = (Math.random() * 0.5 - 0.25) - Math.PI / 2;
    s.vx = Math.cos(an) * s.speed; s.vy = Math.sin(an) * s.speed; a.sound.play('click');
  };
  const side = d => { if (!s.over) s.tx = Math.max(HALF, Math.min(W - HALF, s.tx + d)); };
  const finish = (why) => { if (!s.over) { s.over = true; s.why = why; } };

  return {
    key(k) { if (k === 'left') side(-6); else if (k === 'right') side(6); else if (k === 'action') launch(); },
    pointer(fx) { s.tx = Math.max(HALF, Math.min(W - HALF, fx * W)); launch(); },
    drag(fx) { s.tx = Math.max(HALF, Math.min(W - HALF, fx * W)); },
    update(dt) {
      if (s.over) {
        s.overT += dt;
        if (s.overT > 0.8) {
          const v = verdict('brick', s.coins, s.win ? '¡Tablero limpio!' : 'Se acabaron las bolas');
          addCoins('brick', s.coins);
          L.mini.end('brick', v.title, [`Bloques rotos: ${s.broken}/${bricks.length}`, `Monedas: ${s.coins}`],
            { happy: 8 + 2 * s.coins + (s.win ? 10 : 0), energy: -6, hunger: -6, weight: -Math.min(2, 0.4 + 0.1 * s.coins), lp: s.coins, win: s.win, score: s.broken });
        }
        return;
      }
      s.flash = Math.max(0, s.flash - dt);
      s.px += (s.tx - s.px) * Math.min(1, dt * 20);
      if (s.stuck) { s.bx = s.px; s.by = PET_TOP - BS; }
      else {
        // la bola avanza en pasos pequeños para no atravesar bloques
        const steps = Math.ceil(Math.hypot(s.vx, s.vy) * dt / 0.75);
        for (let n = 0; n < steps && !s.stuck; n++) {
          s.bx += s.vx * dt / steps; s.by += s.vy * dt / steps;
          if (s.bx < 0) { s.bx = 0; s.vx = Math.abs(s.vx); }
          if (s.bx > W - BS) { s.bx = W - BS; s.vx = -Math.abs(s.vx); }
          if (s.by < 0) { s.by = 0; s.vy = Math.abs(s.vy); }
          if (s.vy > 0 && s.by + BS >= PET_TOP && s.by + BS <= PET_TOP + 4 && Math.abs(s.bx + BS / 2 - s.px) < HALF + 0.5) {
            s.speed = Math.min(40, s.speed * 1.03);
            const off = Math.max(-1, Math.min(1, (s.bx + BS / 2 - s.px) / HALF)), an = off * 1.0 - Math.PI / 2;
            s.vx = Math.cos(an) * s.speed; s.vy = Math.sin(an) * s.speed; s.by = PET_TOP - BS; a.sound.play('click');
          }
          for (const b of bricks) {
            if (b.dead) continue;
            if (s.bx + BS > b.x && s.bx < b.x + BW && s.by + BS > b.y && s.by < b.y + BH) {
              const ox = Math.min(s.bx + BS - b.x, b.x + BW - s.bx), oy = Math.min(s.by + BS - b.y, b.y + BH - s.by);
              if (ox < oy) s.vx = -s.vx; else s.vy = -s.vy;
              b.dead = true; s.broken++; a.sound.play('hit');
              if (b.coin) s.drops.push({ x: b.x + BW / 2, y: b.y });
              break;
            }
          }
          if (s.by > H) {
            s.lives--; s.flash = 0.6; s.stuck = true; a.sound.play('sad'); hud();
            if (s.lives <= 0) { s.win = false; finish(''); }
          }
        }
      }
      for (const d of s.drops) {
        d.y += 14 * dt;
        if (!d.dead && d.y + 2 >= PET_TOP && d.y < H - 2 && Math.abs(d.x - s.px) < HALF) { d.dead = true; s.coins++; a.sound.play('coin'); hud(); }
      }
      s.drops = s.drops.filter(d => !d.dead && d.y < H + 2);
      if (!s.over && cap && s.coins >= cap) { s.win = true; finish('Recogió todas las monedas'); a.sound.play('win'); }
      else if (!s.over && bricks.every(b => b.dead) && !s.drops.length) { s.win = true; finish(''); a.sound.play('win'); }
    },
    draw() {
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      for (const b of bricks) {
        if (b.dead) continue;
        g.fillStyle = C.ink; g.fillRect(r5(b.x), r5(b.y), BW, BH);
        g.fillStyle = b.coin ? '#ffd84d' : [C.dark, C.mid, C.light][b.j];
        g.fillRect(r5(b.x + 0.5), r5(b.y + 0.5), BW - 1, BH - 1);
      }
      for (const d of s.drops) coin(d.x, d.y + 2);
      g.fillStyle = C.ink; g.fillRect(r5(s.bx), r5(s.by), BS, BS);
      if (s.flash <= 0 || Math.floor(s.flash * 12) % 2) a.drawSprite(rows, r5(s.px - 6), r5(PET_TOP), { scale: 0.5 });
    }
  };
}

L.mini.reg.dodge = dodge; L.mini.reg.brick = brick;
L.arcade = { COIN_GAME, COIN_DAY, got };
})();
