/* ==========================================================================
   LIMAGOCHI · voz: trucos y palabras
   · Reconocimiento de voz del navegador (Web Speech API, es-ES). Necesita https
     o localhost y, en Chrome, envía el audio a un servicio de Google.
   · Sin micro o sin soporte: los botones ↻ hacen la misma "repetición" a mano.
   · Cuanto más lista es la mascota (etapa, forma, errores, disciplina) más rápido aprende.
   · Habla con SpeechSynthesis (voz aguda); pronuncia peor cuanto menos sabe la palabra.
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const A = () => L.api;

const TRICKS = [
  { id: 'salta',  icon: '🦘', name: 'Saltar',            keys: ['salta', 'salto', 'brinca'],             fx: 't_jump',  dur: 1300 },
  { id: 'gira',   icon: '🌀', name: 'Girar',             keys: ['gira', 'girar', 'vuelta', 'da una vuelta'], fx: 't_spin',  dur: 1500 },
  { id: 'saluda', icon: '👋', name: 'Saludar',           keys: ['saluda', 'saludo', 'adios'],             fx: 't_wave',  dur: 1800 },
  { id: 'baila',  icon: '💃', name: 'Bailar',            keys: ['baila', 'bailar', 'baile'],              fx: 't_dance', dur: 2500 },
  { id: 'muerto', icon: '💀', name: 'Hacerse el muerto', keys: ['muerto', 'hazte el muerto', 'pum'],      fx: 't_dead',  dur: 2300 },
  { id: 'canta',  icon: '🎵', name: 'Cantar',            keys: ['canta', 'cantar', 'cancion'],            fx: 't_sing',  dur: 2700 }
];
const WORDS = [
  { id: 'hola',    icon: '🙋', say: 'hola',      keys: ['hola'] },
  { id: 'lima',    icon: '🍈', say: 'lima',      keys: ['lima'] },
  { id: 'mama',    icon: '👩', say: 'mamá',      keys: ['mama', 'mami'] },
  { id: 'papa',    icon: '👨', say: 'papá',      keys: ['papa', 'papi'] },
  { id: 'comer',   icon: '🍽️', say: 'comer',     keys: ['comer', 'comida', 'come'] },
  { id: 'gracias', icon: '🙏', say: 'gracias',   keys: ['gracias'] },
  { id: 'quiero',  icon: '💚', say: 'te quiero', keys: ['te quiero', 'quiero'] }
];
const WORD_CAP = { baby: 35, child: 75, adult: 100 };       // un bebé solo balbucea
const FORM_IQ = { child_good: 0.1, child_naughty: 0, estrella: 0.5, flor: 0.3, guerrera: 0.3, piruleta: 0.25,
                  brote: 0.2, grunona: 0.15, glotona: 0.1, rebelde: 0.1, marchita: 0.05, gominola: 0.05 };

const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (text, keys) => keys.some(k => (' ' + text + ' ').includes(' ' + k + ' '));
const bar = v => '▰'.repeat(Math.floor(v / 20)) + '▱'.repeat(5 - Math.floor(v / 20));

/** Inteligencia 0.15–1.3: etapa + forma - errores + disciplina. */
function iq() {
  const s = A().S();
  const base = { baby: 0.2, child: 0.4, adult: 0.55 }[s.stage] || 0;
  const pen = Math.min(0.25, s.mistakes * 0.03);
  return Math.max(0.15, Math.min(1.3, base + (FORM_IQ[s.form] || 0) - pen + s.discipline / 400));
}

const iqPct = () => Math.round(iq() / 1.3 * 100);       // 100% = máximo posible

/* ------------------------------ habla ---------------------------------- */
function syllables(t) {
  const m = t.replace(/\s+/g, '').match(/[^aeiouáéíóú]*[aeiouáéíóú]+(?:[^aeiouáéíóú]+$)?/gi);
  return m && m.length ? m : [t];
}
function garble(txt, lv) {
  const sy = syllables(txt);
  if (lv < 20) return `${sy[0]}-${sy[0]}`;
  if (lv < 45) return sy.length > 1 ? `${sy[0]}-b${sy[1].replace(/^[^aeiouáéíóú]*/i, '')}` : `${sy[0]}-${sy[0]}`;
  if (lv < 75) return sy.join('-');
  return txt;
}
function say(w, lv) {
  const text = garble(w.say, lv);
  A().setMsg(`🗣 «${text}»`, 3200);
  if (!L.sound.enabled() || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.pitch = 1.9; u.rate = lv < 45 ? 0.75 : 1; u.volume = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { /* sin síntesis */ }
}

/* ----------------------------- aprendizaje ------------------------------ */
const lastRep = {};
function ready(needTrick, key) {
  const a = A(), s = a.S();
  if (s.stage === 'egg' || s.stage === 'dead') { a.setMsg('Aún no puede aprender'); return false; }
  if (s.sleeping) { a.setMsg('Zzz… está durmiendo'); return false; }
  if (s.sick) { a.setMsg('Está enfermo y no se concentra'); return false; }
  if (s.energy < 10) { a.setMsg('Está demasiado cansado'); return false; }
  if (needTrick && s.stage === 'baby') { a.setMsg('Aún es un bebé: solo balbucea palabras'); return false; }
  if (Date.now() - (lastRep[key] || 0) < 2500) { a.setMsg('Dale un momento…'); return false; }
  lastRep[key] = Date.now();
  return true;
}

function perform(t) {
  const a = A();
  a.fx(t.fx, t.dur); a.peek(t.dur);
  if (t.id === 'canta') [0, 1, 2, 3, 4].forEach(i => setTimeout(() => L.sound.play('note', i), i * 380));
  else L.sound.play('trick');
}

function trick(id) {
  const a = A(), s = a.S(), t = TRICKS.find(x => x.id === id);
  if (!ready(true, 't' + id)) return;
  const lv = s.skills[id] || 0;
  if (lv >= 100) { perform(t); s.happy = a.clamp(s.happy + 3); a.setMsg(`${t.icon} ${t.name}: ¡a la orden!`); refresh(); a.save(); return; }
  const ok = Math.random() < Math.min(0.95, 0.25 + lv / 120);
  const gain = (ok ? 7 : 2) * iq() * (s.happy < 30 ? 0.5 : 1);
  s.skills[id] = Math.min(100, lv + gain);
  s.energy = a.clamp(s.energy - 1.5);
  if (ok) { perform(t); a.setMsg(`${t.icon} ¡Casi lo tiene! ${Math.round(s.skills[id])}%`); }
  else { a.fx('confused', 1100); a.peek(1100); a.setMsg(`No lo ha entendido… ${Math.round(s.skills[id])}%`); }
  if (s.skills[id] >= 100) { s.lp += 5; L.sound.play('learn'); a.setMsg(`🎓 ¡Ha aprendido a ${t.name.toLowerCase()}! +5 🪙`, 4000); }
  refresh(); a.save();
}

function word(id) {
  const a = A(), s = a.S(), w = WORDS.find(x => x.id === id);
  if (!ready(false, 'w' + id)) return;
  const cap = WORD_CAP[s.stage] || 0, lv = s.words[id] || 0;
  if (lv >= cap) {
    say(w, lv);
    if (cap < 100) a.setMsg('Aún es pequeño: no puede pronunciarlo mejor', 3500);
    return;
  }
  const gain = 9 * iq() * (s.happy < 30 ? 0.5 : 1);
  s.words[id] = Math.min(cap, lv + gain);
  s.energy = a.clamp(s.energy - 1);
  say(w, s.words[id]);
  if (lv < 100 && s.words[id] >= 100) { s.lp += 5; L.sound.play('learn'); setTimeout(() => a.setMsg(`🎓 ¡Dice «${w.say}» perfectamente! +5 🪙`, 4000), 1200); }
  refresh(); a.save();
}

/* ------------------------------- micro ---------------------------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, statusEl = null, micBtn = null;
const setStatus = t => { if (statusEl) statusEl.textContent = t; };

function heard(alts) {
  const texts = alts.map(norm);
  for (const t of TRICKS) if (texts.some(x => has(x, t.keys))) { setStatus(`Oyó: «${alts[0]}» → ${t.name}`); trick(t.id); return; }
  for (const w of WORDS)  if (texts.some(x => has(x, w.keys))) { setStatus(`Oyó: «${alts[0]}» → ${w.say}`); word(w.id); return; }
  setStatus(`Oyó «${alts[0]}», pero no lo conoce`);
}

function listen() {
  if (!SR) { setStatus('Este navegador no tiene reconocimiento de voz: usa los botones.'); return; }
  if (listening) { try { rec.stop(); } catch { /* */ } return; }
  L.sound.unlock();
  rec = new SR();
  rec.lang = 'es-ES'; rec.interimResults = false; rec.maxAlternatives = 4; rec.continuous = false;
  rec.onstart = () => { listening = true; micBtn && micBtn.classList.add('sel'); setStatus('🎤 Escuchando… di un truco o una palabra'); };
  rec.onresult = e => heard(Array.from(e.results[0]).map(r => r.transcript));
  rec.onerror = e => setStatus({
    'not-allowed': 'Permiso de micro denegado', 'service-not-allowed': 'Permiso de micro denegado',
    'no-speech': 'No he oído nada', 'audio-capture': 'No encuentro el micro', 'network': 'Sin conexión con el servicio de voz'
  }[e.error] || 'Error de micro: ' + e.error);
  rec.onend = () => { listening = false; micBtn && micBtn.classList.remove('sel'); };
  try { rec.start(); } catch { setStatus('No se pudo iniciar el micro'); }
}

/* -------------------------------- panel --------------------------------- */
let tBtns = {}, wBtns = {}, iqEl = null;
const labelT = (t, v) => `${t.icon} ${t.name} ${v >= 100 ? '✓' : bar(v) + ' ' + Math.round(v) + '%'}`;
const labelW = (w, v) => `${w.icon} «${w.say}» ${bar(v)} ${Math.round(v)}%`;

function refresh() {
  const s = A().S();
  if (iqEl) iqEl.textContent = `🧠 Inteligencia: ${iqPct()}%`;
  TRICKS.forEach(t => tBtns[t.id] && (tBtns[t.id].textContent = labelT(t, s.skills[t.id] || 0)));
  WORDS.forEach(w => wBtns[w.id] && (wBtns[w.id].textContent = labelW(w, s.words[w.id] || 0)));
}

function open() {
  const a = A(), s = a.S();
  if (s.stage === 'egg' || s.stage === 'dead') { a.setMsg(s.stage === 'egg' ? 'Aún está en el huevo' : 'Limagochi ya no está…'); return; }
  iqEl = a.p(''); statusEl = a.p('Di el nombre del truco o una palabra. Repítelo para que aprenda.');
  micBtn = a.btn('🎤 Hablarle', listen);
  tBtns = {}; wBtns = {};
  const nodes = [iqEl, micBtn, statusEl, a.p('Trucos: salta · gira · saluda · baila · muerto · canta')];
  TRICKS.forEach(t => { tBtns[t.id] = a.btn('', () => trick(t.id)); nodes.push(tBtns[t.id]); });
  nodes.push(a.p('Palabras (↻ = repetírselas)'));
  WORDS.forEach(w => { wBtns[w.id] = a.btn('', () => word(w.id)); nodes.push(wBtns[w.id]); });
  nodes.push(a.btn('Cerrar', () => { try { rec && listening && rec.stop(); } catch { /* */ } a.closePanel(); }, 'ghost'));
  a.openPanel(nodes, { full: true });
  refresh();
}

/* ---------------- olvido lento y balbuceo espontáneo --------------------- */
function decay(dt) {
  const s = A().S(), k = 0.03 * dt * (1 - s.discipline / 150);
  for (const id in s.skills) if (s.skills[id] < 100) s.skills[id] = Math.max(0, s.skills[id] - k);
  for (const id in s.words) if (s.words[id] < 100) s.words[id] = Math.max(0, s.words[id] - k);
}

setInterval(() => {
  if (!L.api) return;
  const s = L.api.S();
  if (s.sleeping || s.stage === 'dead' || s.stage === 'egg' || document.hidden || !L.sound.enabled()) return;
  const known = WORDS.filter(w => (s.words[w.id] || 0) >= 10);
  if (!known.length || Math.random() > 0.2) return;
  const w = known[Math.floor(Math.random() * known.length)];
  say(w, s.words[w.id]);
}, 45000);

L.voice = { open, decay, iq, iqPct, tricks: TRICKS, words: WORDS, supported: !!SR };
})();
