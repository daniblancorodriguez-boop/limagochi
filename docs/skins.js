/* ==========================================================================
   LIMAGOCHI · Carcasas: la básica (con 5 colores) y las de la tienda.
   La carcasa es una imagen; la pantalla y los botones reales se colocan encima.
   La elegida se guarda en la partida (state.skin): 'base', 'base:pink', 'galaxia'…
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA, A = () => L.api;

/* geometría en % de la imagen: pantalla (l, t, w) y botones [izq, arriba, ancho, alto] */
const STD = { ar: '800 / 1150', bz: [10, 13.2, 80.2], page: '#1a1e2a', keys: { keyA: [26.5, 77.3, 11.5, 8], keyB: [44.3, 79.3, 11.5, 8], keyC: [62, 77.3, 11.5, 8], keyM: [38.5, 88.5, 23, 6] } };
const SAKURA = { ar: '665 / 975', bz: [7.1, 10.4, 85.7], page: '#161a2c', keys: { keyA: [24.8, 76.8, 12.6, 8.6], keyB: [43.3, 79.1, 12.6, 8.6], keyC: [62.1, 76.8, 12.6, 8.6], keyM: [37.6, 89.3, 24.7, 5.1] } };
const NARU = { ar: '760 / 1110', bz: [7.2, 9.9, 85.5], page: '#161a2c', keys: { keyA: [25.1, 76.4, 12.4, 8.5], keyB: [43.8, 78.6, 12.4, 8.5], keyC: [62.2, 76.4, 12.4, 8.5], keyM: [37.9, 88.7, 24.2, 5] } };

/* los 5 colores de siempre: giran el tono de la carcasa verde */
const COLORS = [
  ['green', 'Verde', 'none', '#7ed957'], ['pink', 'Rosa', 'hue-rotate(240deg) saturate(1.05)', '#ff8fb1'],
  ['blue', 'Azul', 'hue-rotate(115deg)', '#6ec6ff'], ['yellow', 'Amarillo', 'hue-rotate(-42deg) saturate(1.15)', '#ffd84d'],
  ['lila', 'Lila', 'hue-rotate(170deg)', '#b99cff']
];
const SKINS = [
  { id: 'estrellas_lila', name: 'Estrellas lila', cost: 200, g: STD },
  { id: 'galaxia', name: 'Galaxia', cost: 250, g: STD },
  { id: 'navidad', name: 'Navidad', cost: 300, g: STD },
  { id: 'dragon_rojo_verde', name: 'Dragón rojo y verde', cost: 300, g: STD },
  { id: 'sakura', name: 'Sakura', cost: 300, g: SAKURA },
  { id: 'dragon_rojo', name: 'Dragón rojo', cost: 400, g: STD },
  { id: 'dragon_violeta', name: 'Dragón violeta', cost: 400, g: STD },
  { id: 'naruto', name: 'Naruto', cost: 400, g: NARU }
];
const ACCENT = { estrellas_lila: '#a064dc', galaxia: '#4a5fcf', navidad: '#d83a3a', dragon_rojo_verde: '#d4324a', sakura: '#d9b66a', dragon_rojo: '#e0473c', dragon_violeta: '#a56bd6', naruto: '#f07a1a' };
const img = id => `skins/${id}.webp`;
const own = id => A().S().owned.includes('skin_' + id);
const colorOf = k => COLORS.find(c => c[0] === k) || COLORS[0];

let shell, bezel;

/** Carcasa elegida → { img, filter, g }; si no es válida o no se ha comprado, la básica. */
function resolve(id) {
  const base = String(id || 'base');
  if (base === 'base' || base.startsWith('base:')) return { id: base === 'base' ? 'base' : 'base:' + colorOf(base.slice(5))[0], img: img('base'), filter: colorOf(base.slice(5))[2], g: STD };
  const sk = SKINS.find(s => s.id === base);
  if (sk && own(sk.id)) return { id: sk.id, img: img(sk.id), filter: 'none', g: sk.g };
  return { id: 'base', img: img('base'), filter: 'none', g: STD };
}

function apply() {
  shell = shell || document.querySelector('.shell'); bezel = bezel || document.querySelector('.bezel');
  if (!shell) return;
  const sk = resolve(A().S().skin), g = sk.g, st = shell.style;
  shell.classList.add('skin');
  st.setProperty('--sk-img', `url(${sk.img})`); st.setProperty('--sk-filter', sk.filter); st.setProperty('aspect-ratio', g.ar);
  document.documentElement.style.setProperty('--page', g.page);
  const ck = sk.id.startsWith('base') ? colorOf(sk.id.slice(5))[3] : (ACCENT[sk.id] || '#7ed957');
  document.documentElement.style.setProperty('--accent', ck);
  bezel.style.left = g.bz[0] + '%'; bezel.style.top = g.bz[1] + '%';
  bezel.style.width = g.bz[2] + '%'; bezel.style.transform = '';
  Object.entries(g.keys).forEach(([k, v]) => { const e = document.getElementById(k); if (e) { e.style.left = v[0] + '%'; e.style.top = v[1] + '%'; e.style.width = v[2] + '%'; e.style.height = v[3] + '%'; } });
}

function set(id) { const s = A().S(); s.skin = resolve(id).id; A().save(); apply(); }

/** Partidas anteriores: el color que tenían elegido pasa a ser la variante equivalente de la básica. */
function migrate() {
  const s = A().S();
  if (typeof s.skin === 'string') return;
  let c = null; try { c = localStorage.getItem('limagochi.shell'); } catch { /* */ }
  const k = COLORS.find(x => x[3].toLowerCase() === String(c || '').toLowerCase());
  s.skin = k && k[0] !== 'green' ? 'base:' + k[0] : 'base';
}

/* ---- interfaz: botones con miniatura ---- */
function thumbBtn(label, imgId, filter, on, sel) {
  const a = A(), b = a.btn(label, on, sel ? 'sel' : '');
  b.classList.add('skinrow');
  const i = document.createElement('img'); i.src = img(imgId); i.alt = ''; i.className = 'skin-th'; i.style.filter = filter || 'none';
  b.prepend(i); return b;
}

/** Ajustes → Cambio de carcasa: los 5 colores y las compradas. */
function openPicker(back) {
  const a = A(), cur = resolve(a.S().skin).id;
  const nodes = [a.p('🐚 Cambio de carcasa'), a.p('Colores básicos')];
  COLORS.forEach(([k, name, f]) => { const id = k === 'green' ? 'base' : 'base:' + k; nodes.push(thumbBtn(`${name}${cur === id ? ' ✓' : ''}`, 'base', f, () => { set(id); openPicker(back); }, cur === id)); });
  const mine = SKINS.filter(s => own(s.id));
  nodes.push(a.p(mine.length ? 'Compradas' : 'Más carcasas en la tienda (🛒 → 🐚 Carcasas)'));
  mine.forEach(s => nodes.push(thumbBtn(`${s.name}${cur === s.id ? ' ✓' : ''}`, s.id, 'none', () => { set(s.id); openPicker(back); }, cur === s.id)));
  nodes.push(a.btn('Atrás', back || a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}

/** Tienda → Carcasas. `again` vuelve a abrir la sección. */
function shopNodes(again) {
  const a = A(), s = a.S(), nodes = [a.p('Cada carcasa es una imagen distinta. Se cambia en ⚙️ Ajustes → Cambio de carcasa.')];
  SKINS.forEach(k => {
    if (own(k.id)) nodes.push(thumbBtn(`${k.name} ✓ tuya`, k.id, 'none', () => { set(k.id); a.setMsg(`Carcasa: ${k.name}`); again(); }, false));
    else nodes.push(thumbBtn(`${k.name} · ${k.cost}🪙`, k.id, 'none', () => {
      if (s.lp < k.cost) { a.setMsg('Te faltan Lima Points'); return; }
      s.lp -= k.cost; s.owned.push('skin_' + k.id); s.skin = k.id; a.sound.play('coin'); a.setMsg(`Comprado: ${k.name}`);
      L.first && L.first.did('buy'); a.save(); apply(); a.render(); again();
    }));
  });
  return nodes;
}

L.skins = { apply, set, migrate, openPicker, shopNodes, list: SKINS, colors: COLORS, current: () => resolve(A().S().skin).id };
})();
