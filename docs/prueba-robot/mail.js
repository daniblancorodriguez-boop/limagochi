/* ==========================================================================
   LIMAGOCHI · buzón de cartas e historias de eventos
   · Cartas de tu Limagochi (logros, evolución, visitas) con el tono de su forma.
   · Cada evento de temporada tiene una mini-historia de 3 capítulos que llegan por carta
     (día 1, 3 y 5 del evento). Al terminar se gana un recuerdo (gorro) y 🪙.
   · Todo vive en state.meta (sobrevive a un huevo nuevo y va en la copia de seguridad).
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const A = () => L.api;

const STORY = {
  halloween: ['🎃 Esta noche el desván hace ruidos raros. Dicen que una calabaza susurra… ¡y creo que me ha guiñado un ojo!',
              '👻 Seguí el susurro: era un fantasmita tímido que solo quería jugar. Le he enseñado a esconderse mejor que yo.',
              '🦇 Hemos hecho una fiesta con los murciélagos. Me han regalado un sombrero de bruja. ¡Es el mejor Halloween!'],
  navidad:    ['🎄 Ha nevado sobre la lima del jardín. He encontrado una cajita con una nota: «sigue la estrella».',
              '⭐ La estrella me llevó a un taller diminuto. Unos duendes envolvían regalos y me pidieron ayuda con los lazos.',
              '🎁 ¡Un regalo tenía mi nombre! Dentro había un gorro de Papá Noel. Gracias por cuidarme tanto.'],
  sanvalentin:['💝 Hoy el aire huele a fresas. Alguien dejó una carta sin nombre en mi ventana. ¿Será de un admirador?',
              '🌹 Era de una limita del barrio, ¡tan tímida como yo! Hemos paseado juntos y no hemos dicho nada. Fue perfecto.',
              '💌 Me ha regalado una diadema de corazones. Te escribo con una sonrisa enorme.'],
  primavera:  ['🌸 Ha brotado una flor justo a mi lado. Creo que me está mirando. Las abejas zumban un baile nuevo.',
              '🐝 Una abeja me ha enseñado el camino al panal. ¡La miel de primavera sabe a sol!',
              '🌼 He tejido una corona de flores con las abejas. Me la he puesto: me siento florecer.'],
  verano:     ['☀️ El sol aprieta y la arena quema. He cavado un hoyo y creo que hay algo brillante ahí abajo.',
              '🐚 Era una caracola enorme: ¡se oye el mar! Un cangrejo me ha pedido que se la preste un rato.',
              '🏖️ El cangrejo, de agradecido, me ha dado unas gafas de sol. ¡Me quedan genial! Gracias por el veranito.']
};

const TONE = {
  good: { hello: ['Hoy me he sentido muy querido. ¡Gracias!', 'He soñado con jugar contigo otra vez.', 'Estoy tan contento que no me cabe en la lima.'],
          evolve: n => `¡He crecido y ahora soy ${n}! Gracias por cuidarme tan bien.`, learn: n => `¡Ya sé ${n.toLowerCase()}! ¿Te gusta?`, word: n => `¡Ya sé decir «${n}»! ¿Me has oído?`, visit: n => `¡Qué bien lo pasé con ${n}! Vuelve pronto.` },
  bad:  { hello: ['No me hables, estoy ocupado… (pero sigo aquí).', 'Hmpf. Hoy me apetece hacer lo que quiera.', 'Si me das snacks, quizá te perdone.'],
          evolve: n => `Ahora soy ${n}. Y sí, voy a hacer lo que me dé la gana.`, learn: n => `Ya sé ${n.toLowerCase()}. No es para tanto, ¿eh?`, word: n => `Digo «${n}». Cuando me apetece.`, visit: n => `${n} vino a verme. Vale, estuvo bien.` },
  mid:  { hello: ['Un día tranquilo, como me gustan.', 'Me he echado una siestecita al sol.', 'Pensaba en ti y en un buen bocado.'],
          evolve: n => `Mira, ahora soy ${n}. ¡Qué cosas!`, learn: n => `He aprendido ${n.toLowerCase()}. ¡Te lo enseño cuando quieras!`, word: n => `Ya digo «${n}». ¡Es fácil!`, visit: n => `Hoy vino ${n}. ¡Qué rato más bueno!` }
};
const BAD = new Set(['rebelde', 'grunona', 'gominola', 'child_naughty', 'teen_naughty', 'marchita']);
const GOOD = new Set(['estrella', 'flor', 'guerrera', 'piruleta', 'child_good', 'teen_good']);
const tone = () => { const f = A().S().form; return BAD.has(f) ? TONE.bad : GOOD.has(f) ? TONE.good : TONE.mid; };

const meta = () => A().S().meta;
const fmt = ts => { const d = new Date(ts); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const unread = () => meta().letters.filter(l => !l.read).length;

/** Añade una carta (id único: no se repite). */
function add(id, from, icon, text) {
  const m = meta();
  if (m.letters.some(l => l.id === id)) return false;
  m.letters.push({ id, ts: Date.now(), from, icon, text, read: false });
  while (m.letters.length > 30) { const i = m.letters.findIndex(l => l.read); m.letters.splice(i < 0 ? 0 : i, 1); }
  if (!A().isQuiet()) { A().setMsg('✉️ Carta nueva en el buzón', 3500); A().sound.play('learn'); }
  A().save();
  return true;
}

const dayKey = () => { const d = L.world.now(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/** Día del evento (0 = primer día) y año en que empezó. */
function eventDay(ev) {
  const d = L.world.now(), [fm, fd] = ev.from;
  let y = d.getFullYear();
  if ((d.getMonth() + 1) * 100 + d.getDate() < fm * 100 + fd) y--;                // Navidad cruza el año
  const start = new Date(y, fm - 1, fd);
  return { y, day: Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 864e5) };
}

function chapterToday() {
  const ev = L.world.event();
  if (!ev || !STORY[ev.id]) return;
  const { y, day } = eventDay(ev), m = meta();
  const want = day >= 4 ? 3 : day >= 2 ? 2 : 1;
  for (let ch = 1; ch <= want; ch++) {
    if (!add(`story-${ev.id}-${y}-${ch}`, `${ev.icon} ${ev.name} · cap. ${ch}/3`, ev.icon, STORY[ev.id][ch - 1])) continue;
    if (ch === 3) {
      m.story[ev.id] = y;
      const first = !m.souvenirs[ev.id];
      m.souvenirs[ev.id] = true;
      if (first) { A().S().lp += 10; if (!A().isQuiet()) A().setMsg(`${ev.icon} ¡Historia completa! Recuerdo desbloqueado · +10 🪙`, 5000); }
      L.progress.check();
    }
  }
}

/** Llamar a menudo: ocurre una vez al día y solo con la mascota viva. */
let lastPoll = '';
function poll() {
  const s = A().S();
  if (!s || s.stage === 'egg' || s.stage === 'dead' || s.pause) return;
  const k = dayKey();
  if (k === lastPoll) return;
  lastPoll = k;
  chapterToday();
  const t = tone().hello;
  add(`hello-${k}`, 'Tu Limagochi', '🍈', t[(L.world.now().getDate() + s.mistakes) % t.length]);
}

function on(type, data = {}) {
  const s = A().S();
  if (!s || s.stage === 'dead') return;
  const t = tone(), n = data.name || '';
  const key = `${type}-${n}-${s.stage}`;
  if (type === 'evolve') add(`${key}-${s.born}`, 'Tu Limagochi', '🌱', t.evolve(n));
  else if (type === 'learn') add(`${key}-${s.born}`, 'Tu Limagochi', '🎓', t.learn(n));
  else if (type === 'word') add(`${key}-${s.born}`, 'Tu Limagochi', '🗣️', t.word(n));
  else if (type === 'gift') { const [who, what, u] = n.split('|'); add(`gift-${u}`, who, '🎁', `${who} te mandó un regalo: ${what}. ¡Qué detalle!`); }
  else if (type === 'note') add(String(data.id || `note-${Date.now()}`), data.from || 'Tu Limagochi', data.icon || '✉️', String(data.text || ''));
  else if (type === 'visit') add(`visit-${n}-${dayKey()}`, 'Tu Limagochi', '🤝', t.visit(n));
}

/* --------------------------------- pantallas ---------------------------- */
function openLetter(l, back) {
  const a = A();
  l.read = true; a.save();
  a.openPanel([a.p(`${l.icon} ${l.from}`), a.p(l.text), a.p(fmt(l.ts)), a.btn('Atrás', () => open(back), 'ghost')], { full: true });
}

function open(back) {
  const a = A(), m = meta();
  back = back || open._back; open._back = back;
  const nodes = [a.p(`✉️ Buzón${unread() ? ` · ${unread()} sin leer` : ''}`)];
  if (!m.letters.length) nodes.push(a.p('Aún no hay cartas. Tu Limagochi escribe de vez en cuando.'));
  [...m.letters].reverse().slice(0, 12).forEach(l => nodes.push(a.btn(`${l.read ? '' : '● '}${l.icon} ${l.from} · ${fmt(l.ts)}`, () => openLetter(l, back))));
  nodes.push(a.row(a.btn('🎩 Recuerdos', () => openSouvenirs(back)), a.btn('Cerrar', back || a.closePanel, 'ghost')));
  a.openPanel(nodes, { full: true });
}

function openSouvenirs(back) {
  const a = A(), s = a.S(), m = meta();
  const own = L.world.EVENTS.filter(e => m.souvenirs[e.id]);
  const nodes = [a.p('🎩 Recuerdos de eventos'), a.p(own.length ? 'Elige el gorro que llevará tu Limagochi.' : 'Completa la historia de un evento de temporada para ganar su gorro.')];
  own.forEach(e => nodes.push(a.btn(`${e.icon} ${e.name}${s.hat === e.id ? ' ✓' : ''}`, () => { s.hat = s.hat === e.id ? null : e.id; a.save(); a.render(); openSouvenirs(back); })));
  if (s.hat) nodes.push(a.btn('Quitar gorro', () => { s.hat = null; a.save(); a.render(); openSouvenirs(back); }, 'ghost'));
  nodes.push(a.btn('Atrás', () => open(back), 'ghost'));
  a.openPanel(nodes, { full: true });
}

L.mail = { open, on, poll, add, unread, STORY, eventDay };
})();
