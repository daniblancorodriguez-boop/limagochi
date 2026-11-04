/* ==========================================================================
   LIMAGOCHI · progreso: estadísticas, logros y álbum de evoluciones
   Todo vive en state.meta (se conserva al empezar un huevo nuevo y va en la copia de seguridad).
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const A = () => L.api;

/* las 13 formas coleccionables: bebé, 2 de niño, 10 adultas */
const ALBUM = ['baby', 'child_good', 'child_naughty',
  'estrella', 'flor', 'brote', 'marchita', 'guerrera', 'grunona', 'rebelde', 'piruleta', 'glotona', 'gominola'];

const HINT = {
  baby: 'Eclosiona tu primer huevo.',
  child_good: 'Crece de bebé con 0–1 errores de cuidado.',
  child_naughty: 'Crece de bebé con 2 o más errores de cuidado.',
  estrella: 'Adulto perfecto: ≤1 error, disciplina ≥80% y dieta variada.',
  flor: 'Dieta de verduras y cuidado excelente (0–1 errores).',
  brote: 'Dieta de verduras y cuidado normal (2–5 errores).',
  marchita: 'Dieta de verduras y cuidado flojo (6+ errores).',
  guerrera: 'Dieta de carne y cuidado excelente (0–1 errores).',
  grunona: 'Dieta de carne y cuidado normal (2–5 errores).',
  rebelde: 'Dieta de carne y cuidado flojo (6+ errores).',
  piruleta: 'Dieta de dulces y cuidado excelente (0–1 errores).',
  glotona: 'Dieta de dulces y cuidado normal (2–5 errores).',
  gominola: 'Dieta de dulces y cuidado flojo (6+ errores).'
};

const ADULTS = ALBUM.slice(3);
const mastered = s => Object.values(s.skills || {}).filter(v => v >= 100).length;
const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);

/* id · icono · nombre · descripción · test(meta, state) · progreso opcional [actual, objetivo] */
const ACH = [
  { id: 'hatch',    icon: '🐣', name: 'Primer aliento',     desc: 'Eclosiona un huevo.',                       prog: (m) => [has(m, 'baby') ? 1 : 0, 1] },
  { id: 'child',    icon: '🧒', name: 'Creciendo',          desc: 'Llega a la etapa de niño.',                 prog: (m) => [has(m, 'child_good') || has(m, 'child_naughty') ? 1 : 0, 1] },
  { id: 'adult',    icon: '🌟', name: 'Mayor de edad',      desc: 'Consigue una forma adulta.',                prog: (m) => [adultsSeen(m), 1] },
  { id: 'star',     icon: '⭐', name: 'Cuidador perfecto',   desc: 'Consigue la forma Estrella.',               prog: (m) => [has(m, 'estrella') ? 1 : 0, 1] },
  { id: 'coll5',    icon: '📖', name: 'Coleccionista',      desc: 'Descubre 5 formas en el álbum.',            prog: (m) => [Object.keys(m.album).length, 5] },
  { id: 'coll10',   icon: '📚', name: 'Gran coleccionista', desc: 'Descubre 10 formas en el álbum.',           prog: (m) => [Object.keys(m.album).length, 10] },
  { id: 'collAll',  icon: '👑', name: 'Maestro de limas',   desc: 'Completa el álbum: las 13 formas.',         prog: (m) => [Object.keys(m.album).length, ALBUM.length] },
  { id: 'veg',      icon: '🥬', name: 'Vegetariano',        desc: 'Consigue una forma de dieta verde.',        prog: (m) => [['flor', 'brote', 'marchita'].filter(f => has(m, f)).length, 1] },
  { id: 'meat',     icon: '🍖', name: 'Carnívoro',          desc: 'Consigue una forma de dieta de carne.',     prog: (m) => [['guerrera', 'grunona', 'rebelde'].filter(f => has(m, f)).length, 1] },
  { id: 'sweet',    icon: '🍭', name: 'Dientes dulces',     desc: 'Consigue una forma de dieta de dulces.',    prog: (m) => [['piruleta', 'glotona', 'gominola'].filter(f => has(m, f)).length, 1] },
  { id: 'fed50',    icon: '🍽️', name: 'Buen anfitrión',     desc: 'Da de comer 50 veces.',                     prog: (m) => [m.stats.fed || 0, 50] },
  { id: 'gourmet',  icon: '🍣', name: 'Paladar fino',       desc: 'Sirve una comida gourmet.',                 prog: (m) => [m.stats.gourmet || 0, 1] },
  { id: 'clean20',  icon: '🧹', name: 'Casa reluciente',    desc: 'Limpia 20 veces.',                          prog: (m) => [m.stats.cleans || 0, 20] },
  { id: 'heal5',    icon: '💊', name: 'Enfermero',          desc: 'Cura a tu mascota 5 veces.',                prog: (m) => [m.stats.heals || 0, 5] },
  { id: 'play10',   icon: '🎮', name: 'Jugón',              desc: 'Juega 10 partidas.',                        prog: (m) => [m.stats.played || 0, 10] },
  { id: 'flappy10', icon: '🐦', name: 'Piloto de limas',    desc: 'Pasa 10 tubos en Lima Vuela.',              prog: (m) => [m.stats.best.flappy || 0, 10] },
  { id: 'dodgeWin', icon: '☄️', name: 'Intocable',          desc: 'Sobrevive a Esquiva.',                      prog: (m) => [m.stats.wins.dodge || 0, 1] },
  { id: 'mem6',     icon: '🧠', name: 'Memoria de elefante', desc: 'Supera 6 rondas de Eco Lima.',             prog: (m) => [m.stats.best.memory || 0, 6] },
  { id: 'rich',     icon: '🪙', name: 'Ahorrador',          desc: 'Gana 100 Lima Points jugando.',            prog: (m) => [m.stats.lpEarned || 0, 100] },
  { id: 'tricks3',  icon: '🎓', name: 'Domador',            desc: 'Domina 3 trucos o palabras.',               prog: (m, s) => [mastered(s) + Object.values(s.words || {}).filter(v => v >= 100).length, 3] },
  { id: 'night5',   icon: '🌙', name: 'Búho nocturno',      desc: 'Acuéstalo de noche 5 veces.',               prog: (m) => [m.stats.nightSleeps || 0, 5] },
  { id: 'events3',  icon: '🎃', name: 'Fiestero',           desc: 'Vive 3 eventos de temporada distintos.',    prog: (m) => [Object.keys(m.stats.events).length, 3] },
  { id: 'oldage',   icon: '🌈', name: 'Larga vida',         desc: 'Que tu Limagochi muera de viejo.',          prog: (m, s) => [s.cause === 'vejez' && s.stage === 'dead' ? 1 : 0, 1] }
];
const has = (m, f) => !!m.album[f];
const adultsSeen = m => ADULTS.filter(f => has(m, f)).length;

/* ---- datos ---- */
function blankMeta() { return { album: {}, ach: {}, stats: { fed: 0, snacks: 0, gourmet: 0, cleans: 0, heals: 0, scolds: 0, played: 0, wins: {}, best: {}, lpEarned: 0, nightSleeps: 0, events: {} } }; }
/** Rellena huecos de una meta antigua o incompleta. */
function fixMeta(m) {
  const b = blankMeta();
  m = m && typeof m === 'object' ? m : {};
  const st = Object.assign(b.stats, m.stats || {});
  st.wins = Object.assign({}, m.stats && m.stats.wins); st.best = Object.assign({}, m.stats && m.stats.best); st.events = Object.assign({}, m.stats && m.stats.events);
  return { album: Object.assign({}, m.album), ach: Object.assign({}, m.ach), stats: st };
}
const meta = () => A().S().meta;

function record(form) {
  if (!form || !ALBUM.includes(form)) return false;
  const m = meta();
  if (m.album[form]) return false;
  m.album[form] = Date.now();
  if (!A().isQuiet()) A().setMsg(`📖 Nueva forma en el álbum: ${(L.META[form] || {}).name || form}`, 4500);
  check();
  return true;
}

function stat(key, n = 1) { const st = meta().stats; st[key] = (st[key] || 0) + n; }
function statMap(map, key, v, mode) {
  const o = meta().stats[map];
  o[key] = mode === 'max' ? Math.max(o[key] || 0, v) : (o[key] || 0) + v;
}

/** Registra el resultado de un minijuego. */
function game(kind, win, score, lp) {
  stat('played');
  if (win) statMap('wins', kind, 1);
  statMap('best', kind, score || 0, 'max');
  if (lp > 0) stat('lpEarned', lp);
  check();
}

function check() {
  const s = A().S(), m = s.meta;
  for (const a of ACH) {
    if (m.ach[a.id]) continue;
    const [cur, goal] = a.prog(m, s);
    if (cur >= goal) {
      m.ach[a.id] = Date.now();
      s.lp += 2;
      if (!A().isQuiet()) {
        A().setMsg(`🏆 ¡Logro! ${a.name} · +2 🪙`, 4500);
        A().sound.play('learn');
      }
    }
  }
}

/* ---- pantallas ---- */
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function openAchievements(back) {
  const a = A(), m = meta();
  const done = ACH.filter(x => m.ach[x.id]).length;
  const nodes = [a.p(`🏆 Logros ${done}/${ACH.length}`)];
  for (const x of ACH) {
    const ok = !!m.ach[x.id];
    const [cur, goal] = x.prog(m, a.S());
    const box = el('div', 'ach' + (ok ? ' done' : ''));
    box.append(el('span', 'ach-i', ok ? x.icon : '🔒'));
    const t = el('div', 'ach-t');
    t.append(el('strong', '', x.name), el('small', '', x.desc + (!ok && goal > 1 ? `  (${Math.min(cur, goal)}/${goal})` : '')));
    box.append(t);
    nodes.push(box);
  }
  nodes.push(a.btn('Atrás', back || a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}

function formCanvas(id, seen) {
  const c = document.createElement('canvas');
  c.width = 24; c.height = 24;
  const g = c.getContext('2d');
  const set = L.SPR[id];
  const rows = set && (set.happy || set.idle);
  if (rows) rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = seen ? L.PAL[ch] : 'rgba(29,42,18,.55)';
    g.fillRect(x, y, 1, 1);
  }));
  return c;
}

function openAlbum(back) {
  const a = A(), m = meta();
  const n = Object.keys(m.album).length;
  const grid = el('div', 'album');
  ALBUM.forEach(id => {
    const seen = !!m.album[id];
    const b = el('button', 'cell' + (seen ? ' seen' : ''));
    b.type = 'button';
    b.append(formCanvas(id, seen), el('span', '', seen ? ((L.META[id] || {}).name || id) : '???'));
    b.addEventListener('click', () => { a.sound.play('click'); a.setMsg(seen ? `${L.META[id].name} · descubierto` : HINT[id], 5000); });
    grid.append(b);
  });
  a.openPanel([
    a.p(`📖 Álbum ${n}/${ALBUM.length}`),
    grid,
    a.p('Toca una forma para ver cómo conseguirla.'),
    a.btn('Atrás', back || a.closePanel, 'ghost')
  ], { full: true });
}

L.progress = { ALBUM, ACH, blankMeta, fixMeta, record, stat, statMap, game, check, openAchievements, openAlbum };
})();
