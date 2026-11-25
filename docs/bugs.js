/* ==========================================================================
   LIMAGOCHI · insectos del jardín (datos). 11 especies para el álbum.
   rar: común · poco común · rara · legendaria   ·   w: peso al aparecer un bicho
   v: velocidad en el suelo (0 = vuela)          ·   night: solo sale de noche
   fr: fotogramas (filas de texto; '.' = vacío)  ·   pal: colores de cada letra
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const pad = (rows, n) => rows.map(r => r.padEnd(n, '.').slice(0, n));
const K = '#2a2433';

const BUGS = {
  mariposa: { name: 'Mariposa', rar: 'común', w: 13, v: 0, pal: { p: '#ff8fb1', P: '#d95f86', k: K },
    fr: [['pp..k..pp', 'pPpkkkpPp', 'pPPpkpPPp', '.pPpkpPp.', '..pp.pp..'], ['...k.k...', '..pkkkp..', '..PpkpP..', '..pPkPp..', '...p.p...']],
    hint: 'Revolotea de día por el jardín.', gift: 'felicidad' },
  mariquita: { name: 'Mariquita', rar: 'común', w: 13, v: 3, pal: { r: '#e0392f', R: '#ff6a5a', k: K },
    fr: [pad(['..kkkk..', '.krrkrrk.', 'krkrkrkrk', 'krrrkrrrk', '.krkrkrk.', '..kkkk..'], 9)],
    hint: 'Camina por el césped. Da suerte.', gift: '3 🪙' },
  caracol: { name: 'Caracol', rar: 'común', w: 13, v: 1.2, pal: { n: '#8a5a2c', N: '#c98f4a', c: '#d9c79a', k: K },
    fr: [['...kkk....', '..kNnNk...', '.kNnkNnk.k', '.kNnnNnk.k', 'kcccccccck', '.kcccccck.'], ['...kkk..k.', '..kNnNk.k.', '.kNnkNnkk.', '.kNnnNnk..', 'kcccccccck', '.kcccccck.']],
    hint: 'Muy lento: dura más en pantalla. Sale de día y de noche.', gift: '1 🪙 y felicidad' },
  saltamontes: { name: 'Saltamontes', rar: 'común', w: 13, v: 5, pal: { g: '#6cc24a', G: '#3e8f3a', k: K },
    fr: [pad(['.......gg.', '.ggggggggk', 'gGggggGggg', '.k.kg.k...', 'k..k..k...'], 10), pad(['.......gg.', '.ggggggggk', 'gGggggGggg', '..kg.gk...', '.k..k..k..'], 10)],
    hint: 'Va a saltitos por la hierba.', gift: '2 🪙' },
  hormiga: { name: 'Hormiga', rar: 'común', w: 13, v: 4, pal: { n: '#7a3f1d', N: '#b3622f', k: K },
    fr: [pad(['..n..n...', '.nNnnNnn.', 'nnNnnNnnn', '.n.n.n.n.'], 9), pad(['..n..n...', '.nNnnNnn.', 'nnNnnNnnn', 'n.n.n.n..'], 9)],
    hint: 'Trabajadora: trae monedas.', gift: '2 🪙' },
  abeja: { name: 'Abeja', rar: 'poco común', w: 8.5, v: 0, pal: { y: '#ffd84d', k: K, w: '#dff3ff', b: '#9ad6ff' },
    fr: [['..ww.ww..', '.wbw.wbw.', '.kyykyyk.', 'kkyykyykk', '.kyykyyk.', '..kk.kk..'], ['.........', '..w...w..', '.kyykyyk.', 'kkyykyykk', '.kyykyyk.', '..kk.kk..']],
    hint: 'Da miel… pero a veces pica.', gift: 'miel 🍯' },
  escarabajo: { name: 'Escarabajo', rar: 'poco común', w: 8.5, v: 2.2, pal: { b: '#3b82d6', B: '#6ec6ff', k: K },
    fr: [pad(['...kk...', '..kbbk..', '.bbBbbb.', 'bbbBbbbb', 'bbbBbbbb', '.bbBbbb.', '..bbbb..'], 8)],
    hint: 'Camina despacio por el suelo. Brilla como un metal.', gift: '4 🪙' },
  mariposaazul: { name: 'Mariposa azul', rar: 'poco común', w: 8.5, v: 0, pal: { p: '#6ec6ff', P: '#3b82d6', k: K, w: '#fff' },
    fr: [['pp..k..pp', 'pwpkkkpwp', 'pPPpkpPPp', '.pPpkpPp.', '..pp.pp..'], ['...k.k...', '..pkkkp..', '..PpkpP..', '..pPkPp..', '...p.p...']],
    hint: 'Una mariposa de color azul. No es tan común.', gift: '3 🪙 y felicidad' },
  libelula: { name: 'Libélula', rar: 'rara', w: 8, v: 0, pal: { b: '#3b82d6', c: '#6ec6ff', w: '#dff3ff', k: K },
    fr: [pad(['.ww.ww.....', 'wwwkwww.....', '.ww.kk.bbbc.', '...kkk......', '.ww.ww......'], 11), pad(['...........', '...........', 'kkkkkkkbbbc', '...........', '...........'], 11)],
    hint: 'Rara: vuela rápido y da un buen premio.', gift: '10 🪙' },
  luciernaga: { name: 'Luciérnaga', rar: 'rara', w: 80, v: 0, night: true, pal: { w: '#e8f0ff', k: K, Y: '#fff06a', n: '#b58a2a' },
    fr: [pad(['..w...w..', '.wwkkkww.', '...kkk...', '...kkk...', '...YYY...'], 9), pad(['..w...w..', '.wwkkkww.', '...kkk...', '...kkk...', '...nnn...'], 9)],
    hint: 'Solo sale de noche, con su lucecita.', gift: '2 🪙 y felicidad' },
  dorada: { name: 'Mariposa dorada', rar: 'legendaria', w: 0.5, v: 0, pal: { y: '#ffd84d', Y: '#ffb300', w: '#fff8d0', k: K },
    fr: [['yy...k...yy', 'yYyykkkyyYy', 'yYYyykyyYYy', 'wyYyykyyYyw', '.yyYykyYyy.', '..yyy.yyy..'], ['....k.k....', '...ykkky...', '...YykyY...', '...yYkYy...', '....y.y....', '...........']],
    hint: '¡Legendaria! Casi nunca aparece, de día o de noche.', gift: '20 🪙 y mucha felicidad' }
};
const ORDER = ['mariposa', 'mariquita', 'caracol', 'saltamontes', 'hormiga', 'abeja', 'escarabajo', 'mariposaazul', 'libelula', 'luciernaga', 'dorada'];
Object.keys(BUGS).forEach(k => { const d = BUGS[k]; d.id = k; d.w9 = d.fr[0][0].length; d.h9 = d.fr[0].length; });

/** Elige un bicho al azar (de día o de noche). La dorada puede salir siempre. */
function pick(night) {
  const pool = ORDER.filter(k => (night ? (BUGS[k].night || k === 'caracol' || k === 'dorada') : !BUGS[k].night));
  const w = k => (night && k === 'caracol' ? 20 : BUGS[k].w);
  let r = Math.random() * pool.reduce((s, k) => s + w(k), 0);
  for (const k of pool) { r -= w(k); if (r <= 0) return k; }
  return pool[0];
}

Object.assign(window.LIMA, { BUGS, BUG_ORDER: ORDER, pickBug: pick });
})();
