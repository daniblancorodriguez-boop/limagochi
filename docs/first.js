/* ==========================================================================
   LIMAGOCHI · primeros pasos
   Solo para partidas nuevas (primera vida): regalo de bienvenida y 5 mini-misiones con premio
   y una pista contextual a la vez. Las partidas que ya existían no ven nada de esto.
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const A = () => L.api;

const GIFT = 20, PAY = 5, BONUS = 10;
const STEPS = [
  { id: 'feed',   icon: '🍔', name: 'Dar de comer',               tip: 'Tiene hambre: pulsa 🍔',            gen: 'Primeros pasos: dale de comer con 🍔',          now: s => s.hunger < 70 },
  { id: 'clean',  icon: '🧹', name: 'Limpiar una caca',            tip: 'Hay caca: pulsa 🧹',                gen: 'Primeros pasos: cuando haga caca, límpiala con 🧹', now: s => s.poops > 0 },
  { id: 'play',   icon: '🎮', name: 'Jugar un minijuego',          tip: 'Está aburrido: pulsa 🎮',           gen: 'Primeros pasos: juega un rato con 🎮',          now: s => s.happy < 75 && s.energy >= 15 },
  { id: 'buy',    icon: '🛒', name: 'Comprar algo en la tienda',   tip: 'Tienes 🪙 para estrenar: pulsa 🛒', gen: 'Primeros pasos: compra algo con 🛒',            now: s => s.lp >= 15 },
  { id: 'school', icon: '🏫', name: 'Ir al cole',                  tip: '¡Llegó el bus del cole! Pulsa «Ir»', gen: 'Primeros pasos: de niño irá al cole en el bus', now: () => !!(L.school && L.school.hasOffer()) }
];

const F = () => { const m = A().S().meta; return m && m.first; };
const active = () => { const f = F(); return !!(f && f.on && !f.fin); };
const count = () => { const f = F(); return f ? STEPS.filter(x => f.done[x.id]).length : 0; };

/** Regalo de bienvenida: se llama una vez, al crear una partida nueva. */
function welcome() {
  const s = A().S(), f = s.meta.first;
  f.on = true; s.lp += GIFT;
  A().setMsg(`🎁 ¡Bienvenido! Regalo: ${GIFT} 🪙 para tu primera compra`, 6000);
  A().save();
}

/** Una misión cumplida (feed · clean · play · buy · school). */
function did(id) {
  if (!active()) return;
  const f = F();
  if (f.done[id] || !STEPS.some(x => x.id === id)) return;
  f.done[id] = 1;
  const s = A().S(), st = STEPS.find(x => x.id === id);
  s.lp += PAY;
  const n = count();
  if (n >= STEPS.length) {
    f.fin = true; s.lp += BONUS;
    if (!A().isQuiet()) { A().setMsg(`🎉 ¡Primeros pasos completados! +${PAY + BONUS} 🪙`, 6000); A().sound.play('win'); }
  } else if (!A().isQuiet()) A().setMsg(`🌟 ${st.name} · ${n}/${STEPS.length} · +${PAY} 🪙`, 4500);
  A().save();
}

/** Pista contextual: una sola línea, la de la primera misión pendiente cuya situación se da ahora. */
function hint() {
  if (!active()) return '';
  const s = A().S(), f = F(), pend = STEPS.filter(x => !f.done[x.id]);
  if (!pend.length) return '';
  const now = pend.find(x => x.now(s));
  return now ? now.tip : pend[0].gen;
}

function open(back) {
  const a = A(), f = F();
  if (!f) return;
  const nodes = [a.p(`🌟 Primeros pasos · ${count()}/${STEPS.length}`), a.p(`Cada misión da ${PAY} 🪙 y al completar las ${STEPS.length} te llevas ${BONUS} 🪙 extra.`)];
  STEPS.forEach(x => nodes.push(a.p(`${f.done[x.id] ? '✅' : '⬜'} ${x.icon} ${x.name}`)));
  nodes.push(a.btn('Cerrar', () => (back ? back() : a.closePanel()), 'ghost'));
  a.openPanel(nodes, { full: true });
}

L.first = { welcome, did, hint, open, active, count, steps: STEPS, GIFT, PAY, BONUS };
})();
