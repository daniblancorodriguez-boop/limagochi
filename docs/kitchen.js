/* ==========================================================================
   LIMAGOCHI · Cocina: nevera básica, nevera mejorada, fogón (recetas + habilidad) y cafetera
   · El icono 🍔 lleva a la cocina y abre la nevera.
   · Nevera básica (gratis): pocos alimentos que se reponen despacio. Arroz siempre disponible (ración de emergencia).
   · Nevera mejorada (tienda): todas las comidas y recetas. Guarda lo fresco (huerto, fruta, pescado, gourmet) unos días.
     Sin ella, lo fresco dura 1 día y se pierde.
   · Fogón: cocina platos con ingredientes frescos. Cuanto más nivel de cocina, mejores platos y menos quemados.
   · Cafetera: energía rápida, pero más caca, menos disciplina, peor sueño. Límite diario.
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA;
const A = () => L.api;
const S = () => A().S();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const today = () => new Date().toLocaleDateString('sv');
const DAY = 1440;

const ITEMS = [
  { id: 'fridge2', icon: '🧊', name: 'Nevera mejorada', cost: 150, desc: 'todas las comidas; guarda lo fresco 3-5 días' },
  { id: 'stove',   icon: '🍳', name: 'Fogón',           cost: 100, desc: 'cocina platos y gana habilidad' },
  { id: 'coffee',  icon: '☕', name: 'Cafetera',        cost: 80,  desc: 'energía rápida (más caca, menos disciplina)' }
];
const BASIC = { salad: 3, lime: 3, soup: 2, fries: 2, cookie: 2 };                      // tope de cada alimento de la nevera básica
const REFILL = 120;                                                           // minutos entre reposiciones (+1 de cada)
const LIFE = { manzana: 5, zanahoria: 5, tomate: 4, lechuga: 3, pez: 3, fresa: 3, sushi: 3, paella: 4, limecake: 5 };   // días (la miel no caduca)
const ING = { lechuga: '🥬', tomate: '🍅', zanahoria: '🥕', manzana: '🍎', pez: '🐟', fresa: '🍓', miel: '🍯' };

const RECIPES = [
  { id: 'r_salad',  icon: '🥗', name: 'Ensalada de huerta', lv: 0,  need: { lechuga: 1, tomate: 1, zanahoria: 1 }, cat: 'meal',  hunger: 34, happy: 4,  energy: 5, weight: 0.5, disc: 3, diet: 'veg' },
  { id: 'r_soup',   icon: '🍲', name: 'Sopa casera',        lv: 0,  need: { zanahoria: 1, tomate: 1 },             cat: 'meal',  hunger: 36, happy: 3,  energy: 5, weight: 0.5, disc: 2, diet: 'veg' },
  { id: 'r_compot', icon: '🍎', name: 'Compota de manzana', lv: 5,  need: { manzana: 2 },                          cat: 'snack', hunger: 14, happy: 18, energy: 2, weight: 0.5, disc: 0, diet: 'candy', sweet: 0.3 },
  { id: 'r_fish',   icon: '🐟', name: 'Pescado al horno',   lv: 15, need: { pez: 1, tomate: 1 },                   cat: 'meal',  hunger: 42, happy: 6,  energy: 5, weight: 0.8, disc: 2, diet: 'meat' },
  { id: 'r_pie',    icon: '🥧', name: 'Tarta de manzana',   lv: 10, need: { manzana: 2, miel: 1 },                 cat: 'snack', hunger: 16, happy: 36, energy: 2, weight: 1.2, disc: 0, diet: 'candy', sweet: 0.7 },
  { id: 'r_honey',  icon: '🍯', name: 'Pastel de miel',     lv: 25, need: { miel: 2, manzana: 1 },                 cat: 'snack', hunger: 18, happy: 44, energy: 3, weight: 1.5, disc: 0, diet: 'candy', sweet: 1 },
  { id: 'r_straw',  icon: '🍰', name: 'Tarta de fresa',     lv: 20, need: { fresa: 2, miel: 1 },                 cat: 'snack', hunger: 14, happy: 40, energy: 3, weight: 1.2, disc: 0, diet: 'candy', sweet: 0.7 },
  { id: 'r_paella', icon: '🥘', name: 'Paella casera',      lv: 35, need: { pez: 2, tomate: 1, zanahoria: 1 },     cat: 'meal',  hunger: 54, happy: 16, energy: 6, weight: 1.2, disc: 2, diet: 'meat' },
  { id: 'r_chef',   icon: '🍽️', name: 'Menú del chef',      lv: 55, need: { pez: 1, lechuga: 1, tomate: 1, zanahoria: 1, miel: 1 }, cat: 'meal', hunger: 64, happy: 26, energy: 8, weight: 1.2, disc: 3, diet: 'meat' }
];

/* ------------------------------- estado -------------------------------- */
const blank = () => ({ basic: Object.assign({}, BASIC), rt: 0, fresh: {}, plates: [], cof: { day: '', n: 0, buff: 0 }, cook: null, news: '' });
function fix(d) {
  const b = blank();
  if (!d || typeof d !== 'object') return b;
  Object.keys(BASIC).forEach(k => { if (typeof (d.basic || {})[k] === 'number') b.basic[k] = clamp(d.basic[k], 0, BASIC[k]); });
  b.rt = +d.rt || 0;
  Object.keys(LIFE).forEach(k => { const a = (d.fresh || {})[k]; if (Array.isArray(a)) b.fresh[k] = a.filter(x => typeof x === 'number'); });
  b.plates = (Array.isArray(d.plates) ? d.plates : []).filter(x => x && RECIPES.some(r => r.id === x.r)).slice(0, 6);
  b.cof = Object.assign(b.cof, d.cof);
  b.cook = d.cook && RECIPES.some(r => r.id === d.cook.r) ? { r: d.cook.r, min: +d.cook.min || 0, total: +d.cook.total || 4 } : null;
  b.news = typeof d.news === 'string' ? d.news : '';
  return b;
}
const K = () => { const s = S(); if (!s.kitchen) s.kitchen = blank(); return s.kitchen; };
const owns = id => S().owned.includes(id);
const cookLv = () => (L.studio ? L.studio.extraLv('cooking') : 0);
const recipe = id => RECIPES.find(r => r.id === id);
const FOODS = () => A().FOODS;
const foodName = id => { const f = FOODS().find(x => x.id === id); return f ? f.name : id; };

/* ----------------------------- frescura ----------------------------- */
const lifeMin = id => { const d = LIFE[id] * DAY; return owns('fridge2') ? d : Math.min(d, DAY); };
const plateLife = () => (owns('fridge2') ? 3 * DAY : DAY);
const ico = r => (r < 0.5 ? '🟢' : r < 0.85 ? '🟡' : '🔴');
/** Ratio de edad (0-1) de la unidad más vieja de un alimento fresco, o -1 si no caduca. */
function oldest(id) {
  if (!LIFE[id]) return -1;
  const a = K().fresh[id]; if (!a || !a.length) return 0;
  return a[0] / lifeMin(id);
}
const fresh = id => { const r = oldest(id); return r < 0 ? '' : ico(r); };
function sync() {
  const s = S(), k = K();
  Object.keys(LIFE).forEach(id => {
    const n = s.inv[id] || 0, a = k.fresh[id] || (k.fresh[id] = []);
    while (a.length < n) a.push(0);
    while (a.length > n) a.shift();
  });
}

/* --------------------------------- tick --------------------------------- */
let barOn = false;
function tick(dt, quiet) {
  const s = S(), k = K(), a = A();
  if (s.stage === 'egg' || s.stage === 'dead') return;
  k.rt += dt;
  if (k.rt >= REFILL) { k.rt -= REFILL; Object.keys(BASIC).forEach(id => { k.basic[id] = Math.min(BASIC[id], (k.basic[id] || 0) + 1); }); }
  sync();
  const lost = [];
  Object.keys(LIFE).forEach(id => {
    const arr = k.fresh[id]; if (!arr || !arr.length) return;
    for (let i = 0; i < arr.length; i++) arr[i] += dt;
    while (arr.length && arr[0] > lifeMin(id)) { arr.shift(); s.inv[id] = Math.max(0, (s.inv[id] || 0) - 1); lost.push(foodName(id)); }
  });
  for (let i = k.plates.length - 1; i >= 0; i--) { k.plates[i].age += dt; if (k.plates[i].age > plateLife()) { lost.push(recipe(k.plates[i].r).name); k.plates.splice(i, 1); } }
  if (lost.length) k.news = `🗑️ Se ha echado a perder: ${[...new Set(lost)].join(', ')}`;
  if (!quiet && k.news) { a.setMsg(k.news, 5000); k.news = ''; }

  const c = k.cof;                                                          // efectos del café
  if (c.buff > 0) {
    c.buff = Math.max(0, c.buff - dt);
    const lv = cookLv();
    if (!s.sleeping) s.poopTimer += 0.8 * (1 - lv / 200) * dt;              // más caca
    else s.energy = clamp(s.energy - 0.1 * dt, 0, 100);                      // duerme peor
  }

  const C = k.cook;
  if (!C) { if (barOn) { barOn = false; a.skillBar(null); } return; }
  if (s.sleeping || s.pause || s.sick || s.stage === 'baby') { k.cook = null; if (barOn) { barOn = false; a.skillBar(null); } return; }
  C.min += dt;
  if (C.min >= C.total) { finishCook(quiet); return; }
  if (!quiet) { barOn = true; a.skillBar({ icon: '🍳', label: `Cocina ${Math.floor(cookLv())}`, pct: cookLv(), sub: `${Math.max(1, Math.ceil(C.total - C.min))} min` }); }
}

/* ------------------------------- cocinar ------------------------------- */
const have = id => (id === 'miel' || LIFE[id] ? (S().inv[id] || 0) : 0);
const canMake = r => cookLv() >= r.lv && Object.keys(r.need).every(i => have(i) >= r.need[i]);
const needTxt = r => Object.keys(r.need).map(i => `${ING[i]}${r.need[i]}`).join(' ');
const mult = lv => 0.85 + lv * 0.006;
const burnChance = lv => Math.max(0, 0.3 - lv * 0.005);

function why() {
  const s = S();
  if (!owns('stove')) return 'Compra el fogón en la tienda';
  if (s.stage === 'baby') return 'Aún es muy pequeño para cocinar';
  if (s.pause) return 'Está de vacaciones';
  if (s.sleeping) return 'Zzz… está durmiendo';
  if (s.sick) return 'Está enfermo';
  if (s.call || s.mess) return 'Atiéndelo primero: te necesita';
  if (s.talent && s.talent.practice) return 'Ahora está practicando';
  if (K().cook) return 'Ya está cocinando';
  if (s.energy < 15) return 'Está agotado: que descanse';
  return null;
}
function startCook(r) {
  const a = A(), k = K(), bad = why();
  if (bad) { a.setMsg(bad, 3000); return; }
  if (!canMake(r)) { a.setMsg('Faltan ingredientes', 2500); return; }
  if (k.plates.length >= 6) { a.setMsg('La nevera está llena de platos: cómetelos', 3500); return; }
  k.cook = { r: r.id, min: 0, total: Math.max(1.5, 4 - cookLv() / 40) };
  a.closePanel(); a.sound.play('trick'); a.setMsg(`🍳 Cocina ${r.name}`, 3000); a.save(); a.render();
}
function finishCook(quiet) {
  const a = A(), s = S(), k = K(), C = k.cook, r = recipe(C.r);
  k.cook = null; barOn = false; a.skillBar(null);
  if (!Object.keys(r.need).every(i => have(i) >= r.need[i])) { if (!quiet) a.setMsg('Faltaban ingredientes', 3000); return; }
  Object.keys(r.need).forEach(i => { s.inv[i] -= r.need[i]; });
  sync();
  const lv = cookLv();
  L.studio.xp('cooking', 1.2, true);
  s.discipline = clamp(s.discipline + 0.5);
  if (Math.random() < burnChance(lv)) {
    s.happy = clamp(s.happy - 3);
    const m = '🔥 ¡Se ha quemado! Se pierden los ingredientes';
    if (quiet) k.news = m; else { a.setMsg(m, 4500); a.sound.play('sad'); }
    return;
  }
  k.plates.push({ r: r.id, m: +mult(lv).toFixed(2), age: 0, st: lv < 25 ? 1 : lv < 60 ? 2 : 3 });
  L.progress.stat('dishes');
  const m = `🍽️ ¡${r.name} listo! ${'⭐'.repeat(k.plates[k.plates.length - 1].st)}`;
  if (quiet) k.news = m; else { a.setMsg(m, 4500); a.sound.play('win'); L.notify && L.notify.event && L.notify.event('Limagochi', m); }
  L.progress.check(); a.save(); a.render();
}
/** Convierte un plato cocinado en un «alimento» que game.js sabe comer. */
function plateFood(p, i) {
  const r = recipe(p.r), m = p.m, up = v => (v > 0 ? Math.round(v * m) : v);
  return { id: 'plate', plate: i, icon: r.icon, name: `${r.name} ${'⭐'.repeat(p.st)}`, grp: 'dish', cat: r.cat, hunger: up(r.hunger), happy: up(r.happy), energy: r.energy, weight: r.weight, disc: r.disc, diet: r.diet, sweet: r.sweet || 0 };
}
function eatPlate(i) { const k = K(); k.plates.splice(i, 1); }

/* ------------------------------ café ------------------------------ */
function drink(kind) {
  const a = A(), s = S(), k = K(), c = k.cof, d = today();
  if (c.day !== d) { c.day = d; c.n = 0; }
  a.closePanel();
  if (s.sleeping || s.sick) { a.setMsg(s.sleeping ? 'Zzz… duerme' : 'Está enfermo', 2500); return; }
  if (s.stage === 'baby') { a.setMsg('Aún es muy pequeño para el café', 3000); return; }
  if (c.n >= 5) { a.setMsg('☕ Ni una taza más hoy: está temblando', 3500); return; }
  const lv = cookLv(), night = L.world.phase() === 'night', latte = kind === 'latte';
  s.energy = clamp(s.energy + (latte ? 22 : 28) * (1 + lv / 200));
  s.discipline = clamp(s.discipline - 3 * (1 - lv / 150));
  if (latte) { s.happy = clamp(s.happy + 5); s.weight = clamp(s.weight + 0.4, 0, 99); }
  c.n++; c.buff += night ? 360 : 180;
  L.studio.xp('cooking', 0.5, true);
  let msg = latte ? '☕ Café con leche: +energía y +felicidad' : '☕ Café solo: ¡+energía!';
  if (night) msg += ' · de noche le quitará el sueño';
  if (c.n > 3) { s.happy = clamp(s.happy - 8); msg = '😵 ¡Demasiado café! Está nervioso'; }
  a.sound.play('happy'); a.setMsg(msg, 4000); a.save(); a.render();
}
function openCoffee() {
  const a = A(), k = K(), c = k.cof;
  if (c.day !== today()) { c.day = today(); c.n = 0; }
  a.openPanel([
    a.p(`☕ Cafetera · hoy ${c.n}/3 tazas (más de 3 le ponen nervioso)`),
    a.btn('☕ Café solo', () => drink('black')),
    a.btn('🥛 Café con leche (engorda un poco)', () => drink('latte')),
    a.p('Da energía rápido, pero hace más caca, baja la disciplina y de noche duerme peor.'),
    a.btn('Cerrar', a.closePanel, 'ghost')
  ]);
}

/* ------------------------------ menús ------------------------------ */
function openStove() {
  const a = A(), k = K(), nodes = [a.p(`🍳 Fogón · cocina nv ${Math.floor(cookLv())}`)];
  if (k.cook) {
    nodes.push(a.p(`Cocinando ${recipe(k.cook.r).name}… ${Math.max(1, Math.ceil(k.cook.total - k.cook.min))} min`), a.btn('Cancelar', () => { k.cook = null; a.skillBar(null); barOn = false; a.closePanel(); a.save(); a.render(); }, 'ghost'));
  } else {
    RECIPES.slice().sort((x, y) => x.lv - y.lv).forEach(r => {
      const locked = cookLv() < r.lv;
      nodes.push(a.btn(locked ? `🔒 ${r.name} · nv ${r.lv}` : `${r.icon} ${r.name} · ${needTxt(r)}`, () => startCook(r), locked ? 'ghost' : '', !canMake(r)));
    });
    nodes.push(a.p('Los ingredientes salen del huerto, el manzano, la pesca y la miel. Más nivel = mejores platos y menos quemados.'));
  }
  nodes.push(a.btn('🍽️ Platos listos (' + k.plates.length + ')', () => openPlates()), a.btn('Cerrar', a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}
function openPlates() {
  const a = A(), k = K(), nodes = [a.p('🍽️ Platos cocinados')];
  if (!k.plates.length) nodes.push(a.p('Aún no hay platos. Cocina en el fogón.'));
  k.plates.forEach((p, i) => { const f = plateFood(p, i); nodes.push(a.btn(`${f.name} ${ico(p.age / plateLife())}`, () => a.feed(f))); });
  nodes.push(a.btn('Atrás', owns('stove') ? openStove : a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}
/** Menú de la nevera básica: igual que el de siempre (Sanas · Rápida · Snacks), pero con pocos alimentos. */
const CATS = { healthy: '🥗 Sanas', fast: '🍔 Comida rápida', snack: '🍬 Snacks' };
function basicMenu() {
  const a = A(), s = S(), k = K();
  const fr = FOODS().filter(f => (f.stock || f.gourmet) && (s.inv[f.id] || 0) > 0);
  const nodes = [a.p('🧊 Nevera básica · ¿qué le das?')];
  Object.keys(CATS).forEach(c => nodes.push(a.btn(CATS[c], () => basicList(c))));
  if (fr.length) nodes.push(a.btn(`🧺 Cesta (${fr.reduce((n, f) => n + s.inv[f.id], 0)})`, basicBasket));
  if (k.plates.length) nodes.push(a.btn(`🍽️ Platos cocinados (${k.plates.length})`, openPlates));
  nodes.push(a.p('Se repone despacio. Con la nevera mejorada (🛒) tendrás todas las comidas.'), a.btn('Cancelar', a.closePanel, 'ghost'));
  a.openPanel(nodes, { full: true });
}
function basicList(cat) {
  const a = A(), k = K(), fo = id => FOODS().find(f => f.id === id), ev = L.world.event();
  const title = { healthy: 'Sanas · dan energía y disciplina', fast: 'Rápida · anima, pero ensucia y engorda', snack: 'Snacks · animan, pero engordan' }[cat];
  const nodes = [a.p(title)];
  if (cat === 'healthy') nodes.push(a.btn(`${fo('rice').icon} ${fo('rice').name} · siempre`, () => a.feed(fo('rice'))));
  if (ev) L.world.EVENT_FOODS.filter(f => f.event === ev.id && f.cat === (cat === 'snack' ? 'snack' : 'meal') && cat !== 'fast').forEach(f => nodes.push(a.btn(`${ev.icon} ${f.name} (temporada)`, () => a.feed(f))));
  Object.keys(BASIC).map(fo).filter(f => f.grp === cat).forEach(f =>
    nodes.push(a.btn(`${f.icon} ${f.name} ×${k.basic[f.id] || 0}`, () => a.feed(Object.assign({}, f, { fromBasic: true })), '', !(k.basic[f.id] > 0))));
  nodes.push(a.btn('Atrás', basicMenu, 'ghost'));
  a.openPanel(nodes, { full: true });
}
function basicBasket() {
  const a = A(), s = S(), nodes = [a.p('🧺 Cesta · sin nevera mejorada se estropea en 1 día')];
  FOODS().filter(f => (f.stock || f.gourmet) && (s.inv[f.id] || 0) > 0).forEach(f => nodes.push(a.btn(`${f.icon} ${f.name} ×${s.inv[f.id]} ${fresh(f.id)}`, () => a.feed(f))));
  nodes.push(a.btn('Atrás', basicMenu, 'ghost'));
  a.openPanel(nodes, { full: true });
}

function open(id) {
  if (id === 'k_fridge') { A().openFeed(); return; }
  if (id === 'k_stove') { openStove(); return; }
  if (id === 'k_coffee') openCoffee();
}

/* ------------------------------ dibujo ------------------------------ */
const put = (x, y, w, h, c) => { const a = A(); a.ctx.fillStyle = a.tint(c); a.ctx.fillRect(x / 2, y / 2, w / 2, h / 2); };
function drawBack() {
  put(0, 0, 96, 72, '#f4ead2');
  for (let y = 0; y < 44; y += 6) put(0, y, 96, 1, '#e3d6b6');
  for (let x = 0; x < 96; x += 6) for (let y = 0; y < 44; y += 12) put(x + ((y / 12) % 2 ? 3 : 0), y, 1, 6, '#e3d6b6');
  put(0, 44, 96, 28, '#c9b690');
  for (let x = 0; x < 96; x += 12) for (let y = 44; y < 72; y += 8) put(x + ((y / 8) % 2 ? 6 : 0), y, 6, 8, '#b9a47a');
  put(0, 44, 96, 2, '#8a6a3a');
  put(60, 4, 14, 12, '#6b4a1f'); put(61, 5, 12, 10, '#bfe6ff'); put(66, 5, 1, 10, '#6b4a1f'); put(61, 10, 12, 1, '#6b4a1f');   // ventana
  put(30, 6, 8, 8, '#fff'); put(31, 7, 6, 6, '#fff8e6'); put(34, 8, 1, 3, '#2a2433'); put(34, 10, 2, 1, '#2a2433');          // reloj
}
function drawItems(now) {
  const s = S(), k = K(), cooking = !!k.cook;
  // encimera
  put(26, 32, 70, 4, '#8a8f99'); put(26, 36, 70, 12, '#c98f4a'); put(26, 36, 70, 1, '#a8713a');
  for (let x = 28; x < 96; x += 17) { put(x, 38, 14, 8, '#b07a3a'); put(x + 6, 41, 2, 2, '#e6c88a'); }
  // nevera
  if (owns('fridge2')) {
    put(2, 6, 24, 42, '#b8c2cc'); put(3, 7, 22, 40, '#d6dde4'); put(3, 24, 22, 2, '#8a96a3'); put(21, 11, 2, 9, '#6b7684'); put(21, 30, 2, 12, '#6b7684');
    put(7, 11, 5, 5, '#ff8fb1'); put(14, 12, 4, 4, '#ffd84d');
  } else {
    put(4, 18, 20, 30, '#e8eef2'); put(5, 19, 18, 28, '#fbfdff'); put(5, 29, 18, 1, '#aab4be'); put(20, 22, 2, 5, '#8a96a3'); put(20, 33, 2, 8, '#8a96a3');
  }
  // fogón
  if (owns('stove')) {
    put(32, 22, 26, 10, '#dfe4ea'); put(32, 22, 26, 2, '#9aa5b1'); put(34, 31, 22, 2, '#2a2433');
    put(34, 18, 12, 5, '#7b8794'); put(36, 16, 8, 3, '#7b8794'); put(46, 20, 8, 2, '#2a2433');
    if (cooking) for (let i = 0; i < 3; i++) { const q = ((now / 900) + i / 3) % 1; put(36 + i * 3 + Math.sin(q * 7 + i) * 2, 15 - q * 12, 2, 2, '#fff'); }
  } else { put(34, 28, 22, 4, '#bfc6cf'); put(36, 26, 18, 2, '#aab4be'); }
  // cafetera
  if (owns('coffee')) {
    put(72, 14, 14, 18, '#2a2433'); put(74, 16, 10, 6, '#6b7684'); put(75, 24, 8, 1, '#0b0b12'); put(77, 26, 4, 5, '#fff8e6');
    put(80, 17, 2, 2, S().talent && K().cof.buff > 0 ? '#ff5a4a' : '#7bd88f');
  }
}
const HITS = [['k_fridge', 1, 3, 13, 24, null], ['k_stove', 15, 7, 30, 17, 'stove'], ['k_coffee', 35, 6, 44, 17, 'coffee']];
function hit(x, y) {
  const s = S();
  for (const [id, x0, y0, x1, y1, need] of HITS) if (x >= x0 && x < x1 && y >= y0 && y < y1 && (!need || s.owned.includes(need))) return id;
  return null;
}
const cooking = () => !!K().cook;
const petPos = () => ({ x: 14, y: 11 });

L.kitchen = { sync, openPlates, ITEMS, RECIPES, blank, fix, tick, fresh, oldest, plateFood, eatPlate, basicMenu, open, drawBack, drawItems, hit, cooking, petPos, openStove, cookLv, K };
})();
