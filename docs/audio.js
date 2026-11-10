/* ==========================================================================
   LIMAGOCHI · sonido (Web Audio, sintetizado: no hay archivos de audio)
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};

const KEY = 'limagochi.sound';
let ctx = null;
let on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch { /* sin storage */ }

function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.05, at = 0, slide = 0 } = {}) {
  if (!on) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.03);
}

const seq = (notes, step = 0.1, opts = {}) => notes.forEach((f, i) => f && tone(f, step * 0.9, { ...opts, at: i * step }));

const SFX = {
  click:  () => tone(880, 0.05),
  eat:    () => seq([330, 392, 330, 392], 0.09, { type: 'triangle', vol: 0.07 }),
  happy:  () => seq([523, 659, 784], 0.1),
  sad:    () => seq([392, 330, 262], 0.16, { type: 'triangle' }),
  refuse: () => seq([200, 0, 200], 0.1),
  heal:   () => seq([659, 784, 988, 1319], 0.08, { type: 'triangle' }),
  clean:  () => tone(300, 0.5, { type: 'sawtooth', vol: 0.03, slide: 900 }),
  lightOff: () => tone(520, 0.3, { type: 'triangle', slide: -300 }),
  lightOn:  () => tone(300, 0.3, { type: 'triangle', slide: 300 }),
  shout:  () => seq([700, 900, 700, 900, 700, 900], 0.07, { type: 'sawtooth', vol: 0.08 }),
  alert:  () => seq([988, 0, 988, 0, 988], 0.09),
  evolve: () => seq([262, 330, 392, 523, 659, 784, 1047], 0.09),
  die:    () => seq([392, 370, 349, 330, 294, 262], 0.22, { type: 'triangle' }),
  flap:   () => tone(420, 0.12, { type: 'square', vol: 0.04, slide: 300 }),
  hit:    () => tone(220, 0.35, { type: 'sawtooth', vol: 0.06, slide: -180 }),
  coin:   () => seq([988, 1319], 0.07),
  win:    () => seq([523, 659, 784, 1047, 784, 1047], 0.1),
  trick:  () => seq([392, 523, 659], 0.08, { type: 'triangle' }),
  tvNote: (n = 0) => { const m = [523, 659, 784, 659, 587, 698, 880, 698, 0, 0, 0, 0][n % 12]; if (m) tone(m, 0.45, { type: 'sine', vol: 0.025 }); },
  note:   (n = 0) => tone([523, 587, 659, 784, 880][n % 5], 0.18, { type: 'triangle', vol: 0.07 }),
  learn:  () => seq([523, 659, 784, 1047, 1319], 0.08)
};

LIMA.sound = {
  play(name, arg) {
    try { (SFX[name] || (() => {}))(arg); } catch { /* audio bloqueado */ }
  },
  enabled: () => on,
  tone: (f, d, o) => { try { tone(f, d, o); } catch { /* */ } },
  toggle() {
    on = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* sin storage */ }
    if (on) { ac(); SFX.click(); }
    return on;
  },
  unlock: ac,                    // llamar dentro de un gesto del usuario
  vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* no soportado */ } }
};
})();
