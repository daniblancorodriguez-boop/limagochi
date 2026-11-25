/* ==========================================================================
   LIMAGOCHI · iconos propios en los textos
   Cambia los emojis del juego por los iconos negros de docs/ico (g1…g9.png y los antiguos) cuando «Iconos negros»
   está activado. El emoji se conserva dentro del <span> (invisible), así que el texto, los lectores de pantalla
   y las pruebas siguen viendo lo mismo; al desactivar el ajuste se devuelve el emoji.
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA, G = L.GLYPHS || { sheet: {}, old: {} };
const clean = s => s.replace(/️/g, '');
const KEYS = Object.keys(G.sheet).concat(Object.keys(G.old)).sort((a, b) => b.length - a.length);
const RE = new RegExp('(' + KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\uFE0F?', 'g');
let obs = null;

function style(c) {
  const s = G.sheet[c];
  if (s) return `-webkit-mask-image:url(ico/${s[0]}.png);mask-image:url(ico/${s[0]}.png);-webkit-mask-size:400% 400%;mask-size:400% 400%;-webkit-mask-position:${s[1] * 100 / 3}% ${s[2] * 100 / 3}%;mask-position:${s[1] * 100 / 3}% ${s[2] * 100 / 3}%`;
  const o = G.old[c];
  return `-webkit-mask-image:url(ico/${o}.png);mask-image:url(ico/${o}.png);-webkit-mask-size:contain;mask-size:contain;-webkit-mask-position:center;mask-position:center`;
}
function span(raw) {
  const c = clean(raw), el = document.createElement('span');
  el.className = 'gi'; el.dataset.emo = raw; el.setAttribute('style', style(c));
  const t = document.createElement('i'); t.textContent = raw; el.append(t);
  return el;
}
function scan(root) {
  if (!root || root.nodeType === 8) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => {
    const p = n.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE)$/.test(p.nodeName) || (p.closest && p.closest('.gi'))) return NodeFilter.FILTER_REJECT;
    RE.lastIndex = 0; return RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  } });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => {
    const f = document.createDocumentFragment(), t = n.nodeValue; let last = 0, m; RE.lastIndex = 0;
    while ((m = RE.exec(t))) { if (m.index > last) f.append(t.slice(last, m.index)); f.append(span(m[0])); last = m.index + m[0].length; }
    if (last < t.length) f.append(t.slice(last));
    n.parentNode.replaceChild(f, n);
  });
}
function revert(root) { (root || document).querySelectorAll('.gi').forEach(el => el.replaceWith(document.createTextNode(el.dataset.emo))); }

/** Activa o desactiva el cambio según el ajuste «Iconos negros». */
function sync(on) {
  if (on) {
    scan(document.body);
    if (!obs) { obs = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 || n.nodeType === 3) { if (n.nodeType === 3) { if (n.parentNode) scan(n.parentNode); } else scan(n); } }))); obs.observe(document.body, { childList: true, subtree: true }); }
  } else { if (obs) { obs.disconnect(); obs = null; } revert(); }
}
L.glyphs = { sync, scan, revert };
})();
