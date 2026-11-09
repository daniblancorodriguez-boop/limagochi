/* ==========================================================================
   LIMAGOCHI · colegio (niño y adolescente) y trabajo (adulto)
   · Cada día llega el aviso «el bus espera» 5 min antes de la hora elegida. Si aceptas, se va 5 h.
   · Mientras está fuera no hay cacas, errores ni enfermedades y las barras bajan despacio (igual que el descanso del dueño).
   · Si no vas no pasa nada: solo que no aprende, no cobra ni asciende.
   · El horario (Ajustes) nunca puede coincidir con el descanso del dueño.
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA = window.LIMA || {};
const A = () => L.api;
const S = () => A().S();
const DUR = 300;                       // 5 horas
const BEFORE = 5, AFTER = 30;          // el bus avisa 5 min antes y espera 30 min
const MIN = 60000;

const PROF = {
  chef:      { icon: '🍳', name: 'Cocina',      skill: 'cooking',   ranks: ['Pinche', 'Cocinero', 'Cocinero jefe', 'Chef estrella'] },
  pintor:    { icon: '🎨', name: 'Pintura',     skill: 'painting',  ranks: ['Aprendiz de pintor', 'Pintor', 'Pintor de galería', 'Artista famoso'] },
  escritor:  { icon: '✍️', name: 'Escritura',   skill: 'writing',   ranks: ['Redactor', 'Escritor', 'Novelista', 'Autor superventas'] },
  musico:    { icon: '🎵', name: 'Música',      skill: 'music',     ranks: ['Músico callejero', 'Pianista', 'Compositor', 'Director de orquesta'] },
  jardinero: { icon: '🌱', name: 'Jardinería',  skill: 'gardening', ranks: ['Ayudante de vivero', 'Jardinero', 'Paisajista', 'Maestro jardinero'] },
  pescador:  { icon: '🎣', name: 'Pesca',       skill: 'fishing',   ranks: ['Grumete', 'Pescador', 'Capitán', 'Lobo de mar'] },
  atleta:    { icon: '⚽', name: 'Deporte',     skill: 'sport',     ranks: ['Monitor', 'Entrenador', 'Atleta profesional', 'Campeón'] }
};
const PIDS = Object.keys(PROF);
const OFFER_LV = 10;                                   // nivel para que llegue la oferta
const BASE = [10, 20, 35, 55];                         // 🪙 al día por rango
const PROMO = [{ days: 2, lv: 25 }, { days: 3, lv: 45 }, { days: 3, lv: 70 }];   // para pasar al rango 1, 2 y 3

const blank = () => ({ day: '', st: 'idle', away: null, job: null, ranks: {}, seen: {}, schoolDays: 0, workDays: 0, earned: 0, last: '' });
function fix(d) {
  const b = blank();
  if (!d || typeof d !== 'object') return b;
  b.day = String(d.day || '').slice(0, 12);
  b.st = ['idle', 'offer', 'went', 'missed'].includes(d.st) ? d.st : 'idle';
  if (d.away && typeof d.away === 'object' && Number(d.away.to) > 0) b.away = { kind: d.away.kind === 'work' ? 'work' : 'school', from: Number(d.away.from) || 0, to: Number(d.away.to), p: PROF[d.away.p] ? d.away.p : null };
  b.job = PROF[d.job] ? d.job : null;
  PIDS.forEach(p => { const r = d.ranks && d.ranks[p]; if (r) b.ranks[p] = { r: Math.min(3, Math.max(0, Math.floor(Number(r.r) || 0))), d: Math.max(0, Math.floor(Number(r.d) || 0)) }; if (d.seen && d.seen[p]) b.seen[p] = true; });
  b.schoolDays = Math.max(0, Math.floor(Number(d.schoolDays) || 0)); b.workDays = Math.max(0, Math.floor(Number(d.workDays) || 0));
  b.earned = Math.max(0, Math.floor(Number(d.earned) || 0)); b.last = String(d.last || '').slice(0, 160);
  return b;
}

/* ------------------------------- horario -------------------------------- */
const cfg = () => L.settings;
const enabled = () => cfg().get('school') !== false;
const hourStart = () => { const h = Number(cfg().get('jobFrom')); return Number.isFinite(h) ? ((Math.floor(h) % 24) + 24) % 24 : 9; };
const pad = n => String(n).padStart(2, '0');
const slotText = (h = hourStart()) => `${pad(h)}:00–${pad((h + 5) % 24)}:00`;

function restLen() {
  if (!cfg().get('rest')) return 0;
  const from = Number(cfg().get('restFrom')) || 0;
  const len = (Number(cfg().get('restTo')) - from + 24) % 24;
  return Math.min(8, len);
}
const inRest = minOfDay => {
  const len = restLen(); if (!len) return false;
  const from = (Number(cfg().get('restFrom')) || 0) * 60;
  return (minOfDay - from + 1440) % 1440 < len * 60;
};
/** ¿El horario que empieza a las `h` choca con el descanso del dueño? (se mira también el aviso de 5 min antes) */
function slotOk(h) {
  for (let m = -BEFORE; m < DUR; m += 5) if (inRest((((h * 60 + m) % 1440) + 1440) % 1440)) return false;
  return true;
}
/** Siguiente hora de inicio válida (para el botón de Ajustes). */
function nextStart(h) { for (let i = 1; i <= 24; i++) { const c = (h + i) % 24; if (slotOk(c)) return c; } return h; }
/** Si el descanso cambió y el horario choca, lo mueve a la hora válida más cercana. */
function fixSlot() {
  const h = hourStart();
  if (slotOk(h)) return false;
  let best = h, bd = 99;
  for (let c = 0; c < 24; c++) if (slotOk(c)) { const d = Math.min((c - h + 24) % 24, (h - c + 24) % 24); if (d < bd) { bd = d; best = c; } }
  cfg().set('jobFrom', best);
  return true;
}

const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const startMs = t => { const d = new Date(t); d.setHours(hourStart(), 0, 0, 0); return d.getTime(); };

/* -------------------------------- estado -------------------------------- */
const kind = s => (s.stage === 'adult' ? 'work' : s.stage === 'child' || s.stage === 'teen' ? 'school' : null);
const skillLv = k => { const t = S().talent; return Math.floor(t[k] ? t[k].lv : (t.extra[k] ? t.extra[k].lv : 0)); };
const rankOf = p => { const s = S().sch; return (s.ranks[p] || (s.ranks[p] = { r: 0, d: 0 })); };
const wageOf = p => Math.round(BASE[rankOf(p).r] * (0.8 + 0.4 * skillLv(PROF[p].skill) / 100));
const rankName = p => PROF[p].ranks[rankOf(p).r];
const offers = () => PIDS.filter(p => skillLv(PROF[p].skill) >= OFFER_LV);
const isAway = () => { const s = S(); return !!(s && s.sch && s.sch.away); };
const hasOffer = () => { const s = S(); return !!(s && s.sch && s.sch.st === 'offer' && !s.sch.away); };
const hhmm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function canGo(s) {
  if (!kind(s) || s.pause || s.sleeping || s.sick || s.stage === 'dead') return false;
  if (kind(s) === 'work' && !s.sch.job) return false;
  if (s.talent && s.talent.practice) return false;
  if (L.mini && L.mini.active && L.mini.active()) return false;
  return true;
}

/** Se llama en cada minuto de juego. Devuelve true si Limagochi está fuera (colegio/trabajo) durante este minuto. */
function tick(dt, now, quiet) {
  const s = S();
  if (!s || !s.sch) return false;
  const sch = s.sch;
  if (sch.away) {
    if (now >= sch.away.to) { finish(now, quiet); return false; }
    return true;
  }
  if (!enabled() || !kind(s) || s.pause) { if (sch.st === 'offer') sch.st = 'missed'; return false; }
  const key = dayKey(now);
  if (sch.day !== key) { sch.day = key; sch.st = 'idle'; }
  const m = (now - startMs(now)) / MIN;                  // minutos desde la hora de salida
  if (sch.st === 'idle' && m >= -BEFORE && m < AFTER && canGo(s)) {
    sch.st = 'offer';
    if (cfg().get('schoolAuto')) { accept(now, quiet); return true; }
    if (!quiet) { A().setMsg(kind(s) === 'work' ? '🚌 ¡El bus del trabajo espera!' : '🚌 ¡El bus del cole espera!', 5000); A().sound.play('alert'); }
  } else if (sch.st === 'offer' && (m >= AFTER || !canGo(s))) sch.st = 'missed';
  return false;
}

function accept(now = Date.now(), quiet = false) {
  const s = S(), sch = s.sch;
  if (!canGo(s)) { A().setMsg('Ahora no puede ir'); return false; }
  const k = kind(s), to = Math.max(now, startMs(now)) + DUR * MIN;
  sch.away = { kind: k, from: now, to, p: k === 'work' ? sch.job : null };
  sch.st = 'went';
  if (!quiet) { A().sound.play('click'); A().setMsg(k === 'work' ? `💼 Se va a trabajar hasta las ${hhmm(to)}` : `🏫 Se va al cole hasta las ${hhmm(to)}`, 4500); A().render(); }
  return true;
}

/* ----------------------------- al volver ------------------------------- */
const clamp01 = v => Math.max(0, Math.min(1, v));
function finish(now, quiet) {
  const s = S(), sch = sch0(s), a = sch.away;
  sch.away = null;
  const a2 = A();
  const iqp = L.voice && L.voice.iqPct ? L.voice.iqPct() : 30;
  const f = Math.max(0.3, Math.min(1.2, 0.25 + 0.95 * clamp01((s.happy + s.discipline + iqp) / 300)));   // buen ánimo, disciplina e inteligencia → aprende más
  const notes = [];
  if (a.kind === 'school') {
    sch.schoolDays++;
    ['cooking', 'gardening', 'fishing', 'sport'].forEach(k => L.studio.xp(k, 0.9 * f, true));
    ['painting', 'writing', 'music'].forEach(k => L.studio.xpTalent && L.studio.xpTalent(k, 0.9 * f));
    const w = L.voice && L.voice.study ? L.voice.study(14 * f) : null;
    if (w) notes.push(w);
    s.happy = Math.min(100, s.happy + (f > 0.8 ? 6 : 2));
    s.discipline = Math.min(100, s.discipline + 1.5 * f);
    notes.unshift('un poco de cada habilidad');
    sch.last = `🏫 Volvió del cole: ${notes.join(', ')}.`;
  } else {
    const p = a.p || sch.job;
    if (p && PROF[p]) {
      const R = rankOf(p), wage = wageOf(p);
      s.lp += wage; sch.earned += wage; sch.workDays++; R.d++;
      L.progress.stat('lpEarned', wage); L.progress.stat('workDays');
      const k = PROF[p].skill;
      if (L.studio.extraLv && ['cooking', 'gardening', 'fishing', 'sport'].includes(k)) L.studio.xp(k, 1.4 * f, true); else L.studio.xpTalent && L.studio.xpTalent(k, 1.4 * f);
      s.energy = Math.max(0, s.energy - 8);
      sch.last = `💼 Volvió del trabajo de ${rankName(p).toLowerCase()}: +${wage} 🪙.`;
      const nx = PROMO[R.r];
      if (nx && R.d >= nx.days && skillLv(k) >= nx.lv) {
        R.r++; R.d = 0;
        const t = `¡Ascenso! Ahora es ${rankName(p)} (${wageOf(p)} 🪙 al día).`;
        sch.last += ' ' + t;
        L.mail && L.mail.on('note', { id: `promo-${p}-${R.r}-${s.born}`, from: 'Tu trabajo', icon: '📈', text: `${t} Sigue así.` });
      }
    }
  }
  L.progress.check();
  if (!quiet) { a2.setMsg(sch.last, 6000); a2.sound.play('win'); a2.render(); }
  else if (L.mail) L.mail.on('note', { id: `day-${dayKey(now)}-${a.kind}-${s.born}`, from: a.kind === 'work' ? 'Tu trabajo' : 'Tu colegio', icon: a.kind === 'work' ? '💼' : '🏫', text: sch.last });
  checkOffers(quiet);
}
const sch0 = s => s.sch;

/** Cuando una habilidad llega al nivel pedido, llega una oferta de empleo al buzón. */
function checkOffers(quiet) {
  const s = S(); if (!s || s.stage !== 'adult') return;
  PIDS.forEach(p => {
    if (s.sch.seen[p] || skillLv(PROF[p].skill) < OFFER_LV) return;
    s.sch.seen[p] = true;
    L.mail && L.mail.on('note', { id: `offer-${p}-${s.born}`, from: 'Oferta de empleo', icon: PROF[p].icon, text: `Han visto lo bien que se le da la ${PROF[p].name.toLowerCase()}. Hay un puesto de «${PROF[p].ranks[0]}»: míralo en ☰ Menú → 💼 Trabajo.` });
  });
}

/* ------------------------------ pantallas ------------------------------- */
function hudText() {
  const s = S(), a = s.sch.away;
  return a ? `${a.kind === 'work' ? '💼 Trabajando' : '🏫 En el cole'} · vuelve a las ${hhmm(a.to)}` : '';
}
function open(back) {
  const a = A(), s = S(), sch = s.sch, k = kind(s);
  back = back || open._back; open._back = back;
  const nodes = [];
  if (k === 'school' || (!k && s.stage !== 'adult')) {
    nodes.push(a.p('🏫 Colegio'));
    nodes.push(a.p(k ? `Bus cada día a las ${slotText().split('–')[0]} (5 h). Si va, aprende un poco de todo: más si está contento, disciplinado y listo.` : 'El colegio empieza cuando es niño.'));
    nodes.push(a.p(`Días de cole: ${sch.schoolDays}`));
    if (sch.last && sch.last.startsWith('🏫')) nodes.push(a.p(sch.last));
  } else {
    nodes.push(a.p('💼 Trabajo'));
    if (s.stage !== 'adult') nodes.push(a.p('Podrá trabajar de adulto.'));
    else {
      const j = sch.job;
      if (j) {
        const R = rankOf(j), nx = PROMO[R.r];
        nodes.push(a.p(`${PROF[j].icon} ${rankName(j)} · ${wageOf(j)} 🪙/día`));
        nodes.push(a.p(nx ? `Ascenso: ${R.d}/${nx.days} días y ${PROF[j].name} ${skillLv(PROF[j].skill)}/${nx.lv}` : '¡Ya está en el puesto más alto!'));
      } else nodes.push(a.p('Aún no tiene trabajo. Las ofertas llegan al subir sus habilidades.'));
      nodes.push(a.p(`Días trabajados: ${sch.workDays} · ganado: ${sch.earned} 🪙`));
      if (sch.last && sch.last.startsWith('💼')) nodes.push(a.p(sch.last));
      const of = offers();
      if (!of.length) nodes.push(a.p(`Sin ofertas todavía: sube una habilidad a nivel ${OFFER_LV}.`));
      of.forEach(p => {
        const R = rankOf(p), cur = sch.job === p;
        nodes.push(a.btn(cur ? `${PROF[p].icon} ${rankName(p)} ✓ actual` : `${PROF[p].icon} ${PROF[p].ranks[R.r]} · ${wageOf(p)} 🪙/día`, () => { if (!cur) { sch.job = p; a.save(); open(back); } }, cur ? 'ghost' : ''));
      });
      if (sch.job) nodes.push(a.btn('Dejar el trabajo', () => { sch.job = null; a.save(); open(back); }, 'ghost'));
      nodes.push(a.p(`Horario: ${slotText()} (cambiar en ⚙️ Ajustes)`));
    }
  }
  if (!enabled()) nodes.push(a.p('⚠️ Colegio y trabajo están desactivados en Ajustes.'));
  nodes.push(a.btn('Atrás', back || a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}

/** Próximo aviso del bus (ms) para el Web Push con la app cerrada. */
function nextOfferAt(now = Date.now()) {
  const s = S();
  if (!s || !enabled() || !kind(s) || s.pause || s.sch.away) return null;
  if (kind(s) === 'work' && !s.sch.job) return null;
  let t = startMs(now) - BEFORE * MIN;
  if (t <= now) t += 864e5;
  return t < now + 48 * 3600e3 ? t : null;
}

L.school = { blank, fix, tick, accept, isAway, hasOffer, hudText, open, kind, enabled, slotText, slotOk, nextStart, fixSlot, hourStart, nextOfferAt, checkOffers, PROF, DUR };
})();
