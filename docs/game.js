/* ==========================================================================
   LIMAGOCHI · núcleo del juego
   Secciones: CONFIG · ESTADO · LÓGICA · ACCIONES · TIENDA · ADIVINA · RENDER · UI · API · INIT
   Otros módulos (ya cargados antes): sprites.js, audio.js, world.js, notify.js, progress.js, backup.js, minigames.js, voice.js
   ========================================================================== */
(() => {
'use strict';

const L = window.LIMA = window.LIMA || {};
const { SPR, PAL, META } = L;
const Sound = L.sound;

/* ============================== CONFIG ================================== */
const CFG = {
  saveKey: 'limagochi.v1',
  shellKey: 'limagochi.shell',
  maxOfflineMin: 14 * 1440,           // máximo que se simula al volver (14 días)
  dayMin: 1440,                       // 1 día de vida = 24 h reales
  /* tiempos como el Tamagotchi original: bebé 65 min · niño hasta el día 3 · adolescente hasta el día 6 · adulto 16 días (más que el original) */
  stageMin: { egg: 5, baby: 65, child: 3 * 1440 - 70, teen: 3 * 1440 },     // niño hasta el día 3 · adolescente hasta el día 6
  minWeight: { egg: 3, baby: 3, child: 8, teen: 12, adult: 15 },
  obese: { baby: 10, child: 22, teen: 30, adult: 40 },   // peso a partir del cual está obeso
  /* por minuto (despierto): hambre vacía en ~8 h, felicidad en ~10 h, energía en ~14 h; dormir recupera en ~8 h */
  rate: { hunger: 0.21, happy: 0.17, energy: 0.12, discipline: 0.008, sleep: 0.21, dirt: 0.06 },   // dirt: sucio del todo en ~28 h despierto
  poopEvery: [90, 180],               // minutos entre caquitas (adulto)
  poopByStage: { baby: [10, 20], child: [60, 120] },   // los pequeños hacen caca mucho más a menudo
  /* los corazones de hambre y felicidad se vacían más deprisa cuanto más pequeño (como el Tamagotchi original) */
  needMult: { baby: { hunger: 5, happy: 4 }, child: { hunger: 2, happy: 1.8 }, teen: { hunger: 1.3, happy: 1.2 } },
  callChance: 0.0033,                 // probabilidad por minuto de llamar la atención (~una cada 5 h despierto)
  callMax: { baby: 1, child: 5, teen: 5, adult: 6 },   // máximo de llamadas por etapa
  preSickMin: { baby: 10, child: 180, teen: 180 },      // se pone malito este rato antes de evolucionar
  oldAgeAt: 0.65,                     // a partir de este % de vida del adulto enferma cada día (dosis doble)
  callWindowMin: 45,                  // tiempo para responder antes de que cuente como error
  sickRisk: 0.0004,                   // riesgo base de enfermar por minuto
  sickMistakeMin: 60,                 // enfermo sin curar durante este tiempo = error de cuidado
  dangerMin: 480,                     // descuido acumulado que lanza el aviso de peligro (8 h)
  weightLossH: 0.25,                  // gramos que pierde por hora despierto (quema pasiva)
  healthyWeightK: 0.5,                // la comida sana engorda la mitad
  deathNeglectMin: 720,               // descuido acumulado que mata (12 h)
  lifespanMin: 16 * 1440              // vida del adulto (la obesidad la acorta x2.5)
};

/* grp: healthy = sana (sube energía y disciplina, anima menos) · fast = comida rápida (anima mucho, baja disciplina, ensucia, engorda) ·
   snack = dulce (engorda y da caries) · gourmet = se compra con 🪙. cat: meal = sacia hambre · snack = sube felicidad
   Efectos extra: energy (±energía) · dirt (suciedad) · el «paladar» (taste) sube con rápida/snacks y baja con sana. */
const FOODS = [
  { id: 'rice',  grp: 'healthy', cat: 'meal',  icon: '🍚', name: 'Arroz',          hunger: 25, happy: -1, energy: 3, weight: 1,   disc: 2,  diet: 'veg' },
  { id: 'salad', grp: 'healthy', cat: 'meal',  icon: '🥗', name: 'Ensalada',       hunger: 20, happy: -2, energy: 4, weight: 0.5, disc: 3,  diet: 'veg' },
  { id: 'lime',  grp: 'healthy', cat: 'meal',  icon: '🍈', name: 'Lima fresca',    hunger: 15, happy: 0,  energy: 3, weight: 0.2, disc: 2,  diet: 'veg' },
  { id: 'pasta', grp: 'healthy', cat: 'meal',  icon: '🍝', name: 'Pasta',          hunger: 32, happy: -1, energy: 5, weight: 1.5, disc: 2,  diet: 'veg' },
  { id: 'fish',  grp: 'healthy', cat: 'meal',  icon: '🐟', name: 'Pescado',        hunger: 28, happy: -1, energy: 4, weight: 1,   disc: 2,  diet: 'meat' },
  { id: 'lentils', grp: 'healthy', cat: 'meal', icon: '🫘', name: 'Lentejas',      hunger: 30, happy: -2, energy: 6, weight: 0.8, disc: 3,  diet: 'veg' },
  { id: 'soup',  grp: 'healthy', cat: 'meal',  icon: '🍲', name: 'Sopa de verduras', hunger: 22, happy: -1, energy: 4, weight: 0.4, disc: 2, diet: 'veg' },
  { id: 'chicken', grp: 'healthy', cat: 'meal', icon: '🍗', name: 'Pollo a la plancha', hunger: 30, happy: -1, energy: 5, weight: 0.8, disc: 2, diet: 'meat' },
  { id: 'burger',grp: 'fast',  cat: 'meal',  icon: '🍔', name: 'Hamburguesa',      hunger: 38, happy: 11, dirt: 8,  weight: 2.5, disc: -4, diet: 'meat' },
  { id: 'hotdog',grp: 'fast',  cat: 'meal',  icon: '🌭', name: 'Perrito caliente', hunger: 34, happy: 10, dirt: 8,  weight: 2.5, disc: -4, diet: 'meat' },
  { id: 'pizza', grp: 'fast',  cat: 'meal',  icon: '🍕', name: 'Pizza',            hunger: 40, happy: 12, dirt: 10, weight: 3,   disc: -5, diet: 'meat' },
  { id: 'nuggets', grp: 'fast', cat: 'meal', icon: '🥡', name: 'Nuggets',          hunger: 30, happy: 9,  dirt: 8,  weight: 2.5, disc: -4, diet: 'meat' },
  { id: 'fries', grp: 'fast',  cat: 'meal',  icon: '🍟', name: 'Patatas fritas',   hunger: 20, happy: 9,  dirt: 6,  weight: 2,   disc: -3, diet: 'candy' },
  { id: 'candy', grp: 'snack', cat: 'snack', icon: '🍬', name: 'Caramelo',    hunger: 5,  happy: 22, weight: 2,   disc: -6, diet: 'candy', sweet: 1 },
  { id: 'cookie',grp: 'snack', cat: 'snack', icon: '🍪', name: 'Galleta',     hunger: 8,  happy: 16, weight: 1.5, disc: -3, diet: 'candy', sweet: 0.8 },
  { id: 'cake',  grp: 'snack', cat: 'snack', icon: '🍰', name: 'Tarta',       hunger: 10, happy: 30, weight: 3,   disc: -8, diet: 'candy', sweet: 1.5 },
  { id: 'fresa',     stock: true, grp: 'healthy', cat: 'meal',  icon: '🍓', name: 'Fresa',     hunger: 12, happy: 6,  energy: 3, weight: 0.2, disc: 1, diet: 'veg' },
  { id: 'manzana',   stock: true, grp: 'healthy', cat: 'meal',  icon: '🍎', name: 'Manzana',   hunger: 14, happy: -1, energy: 4, weight: 0.2, disc: 2, diet: 'veg' },
  { id: 'zanahoria', stock: true, grp: 'healthy', cat: 'meal',  icon: '🥕', name: 'Zanahoria', hunger: 18, happy: -1, energy: 3, weight: 0.3, disc: 2, diet: 'veg' },
  { id: 'tomate',    stock: true, grp: 'healthy', cat: 'meal',  icon: '🍅', name: 'Tomate',    hunger: 12, happy: 2,  energy: 2, weight: 0.2, disc: 1, diet: 'veg' },
  { id: 'lechuga',   stock: true, grp: 'healthy', cat: 'meal',  icon: '🥬', name: 'Lechuga',   hunger: 10, happy: -1, energy: 2, weight: 0.1, disc: 2, dirt: -6, diet: 'veg' },
  { id: 'pez',       stock: true, grp: 'healthy', cat: 'meal',  icon: '🐟', name: 'Pez fresco', hunger: 26, happy: 1, energy: 4, weight: 0.6, disc: 2, diet: 'meat' },
  { id: 'miel',      stock: true, grp: 'snack',   cat: 'snack', icon: '🍯', name: 'Miel',      hunger: 6,  happy: 24, weight: 1, disc: -2, diet: 'candy', sweet: 0.6 },
  { id: 'sushi', grp: 'gourmet', cat: 'meal',  icon: '🍣', name: 'Sushi gourmet', hunger: 40, happy: 15, weight: 1,  disc: 0, diet: 'meat',  gourmet: true, cost: 12 },
  { id: 'paella',grp: 'gourmet', cat: 'meal',  icon: '🥘', name: 'Paella',      hunger: 45, happy: 12, weight: 1.5, disc: 0,  diet: 'meat',  gourmet: true, cost: 15 },
  { id: 'limecake', grp: 'gourmet', cat: 'snack', icon: '🎂', name: 'Tarta de lima', hunger: 15, happy: 40, weight: 2, disc: 0, diet: 'candy', sweet: 0, gourmet: true, cost: 18 }
];
/** Paladar: cuánto se ha acostumbrado a la comida rápida (0–100). Con él alto rechaza la comida sana. */
const tasteLabel = t => t < 25 ? 'Sano' : t < 50 ? 'Normal' : t < 75 ? 'Caprichoso' : 'Muy caprichoso';

/* ---- jardín: objetos, cultivos y tiempos (en minutos de juego) ---- */
const GARDEN_ITEMS = [
  { id: 'flowers', icon: '🌷', name: 'Flores',   cost: 15,  desc: 'decoran el jardín' },
  { id: 'can',     icon: '🫗', name: 'Regadera', cost: 20,  desc: 'las plantas crecen un 30% más rápido' },
  { id: 'lounger', icon: '🪑', name: 'Tumbona',  cost: 40,  desc: 'tócala para tomar el sol' },
  { id: 'plot',    icon: '🌿', name: 'Huerto',   cost: 70,  desc: 'planta semillas y cosecha' },
  { id: 'apple',   icon: '🍏', name: 'Manzano',  cost: 90,  desc: 'da manzanas con el tiempo' },
  { id: 'pool',    icon: '🏊', name: 'Piscina',  cost: 500, desc: 'chapuzón: mucha felicidad y se limpia' },
  { id: 'rod',     icon: '🎣', name: 'Caña mejor', cost: 60, desc: 'la pesca pica antes y se escapa menos' }
];
const CROPS = { zanahoria: { icon: '🥕', name: 'zanahoria', need: 180 }, tomate: { icon: '🍅', name: 'tomate', need: 300 }, lechuga: { icon: '🥬', name: 'lechuga', need: 120 }, fresa: { icon: '🍓', name: 'fresa', need: 360, lv: 30 } };
const gLv = () => L.studio.extraLv('gardening');
const cropOpen = k => gLv() >= (CROPS[k].lv || 0);
const SEED_COST = 5, WET = 480, APPLE = { young: 240, adult: 720, every: 180, max: 3 };

const SHOP_EXTRAS = [
  { id: 'bg_dots',   type: 'bg',  key: 'dots',   icon: '🔹', name: 'Fondo lunares',   cost: 15 },
  { id: 'bg_clouds', type: 'bg',  key: 'clouds', icon: '⛅', name: 'Fondo nubes',     cost: 20 },
  { id: 'bg_stars',  type: 'bg',  key: 'stars',  icon: '🌠', name: 'Fondo estrellas', cost: 25 },
  { id: 'bg_bricks', type: 'bg',  key: 'bricks', icon: '🧱', name: 'Fondo ladrillos', cost: 20 },
  { id: 'ball',      type: 'toy', icon: '⚽', name: 'Pelota',  cost: 20, desc: 'se aburre un 15% menos', img: 'ball' },
  { id: 'plush',     type: 'toy', icon: '🧸', name: 'Peluche', cost: 35, desc: 'se aburre un 30% menos', img: 'teddy' },
  { id: 'sofa',      type: 'furn', icon: '🛋️', name: 'Sofá',    cost: 40, desc: 'tócalo para sentarse o tumbarse', img: 'sofa' },
  { id: 'bed',       type: 'furn', icon: '🛏️', name: 'Cama',    cost: 50, desc: 'duerme en ella de noche', img: 'bed' },
  { id: 'tv',        type: 'furn', icon: '📺', name: 'Tele',    cost: 60, desc: 'tócala para encenderla y verla', img: 'tv' },
  { id: 'lamp',      type: 'furn', icon: '💡', name: 'Lámpara', cost: 30, desc: 'tócala para encenderla: da felicidad', img: 'lamp' },
  { id: 'plant',     type: 'furn', icon: '🪴', name: 'Planta',  cost: 25, desc: 'tócala para regarla', img: 'plant' },
  { id: 'picture',   type: 'furn', icon: '🖼️', name: 'Cuadro',  cost: 20, desc: 'decora la pared', img: 'picture' },
  { id: 'rug',       type: 'furn', icon: '🟣', name: 'Alfombra', cost: 25, desc: 'decora el suelo', img: 'rug' }
];

/* ---- la casa: dónde se dibuja cada objeto (pantalla lógica 48×36) ---- */
/* los objetos se dibujan a doble resolución (hd): 1 píxel suyo = ½ píxel lógico = 1 píxel real del canvas */
const itemSize = id => { const r = L.ITEMS[id].hd.rows[0]; return { w: Math.ceil(r[0].length / 2), h: Math.ceil(r.length / 2) }; };
/* los muebles grandes se apoyan en el suelo (y = 34 − alto) aunque cambie su dibujo */
/* lámpara: al fondo junto al cabecero de la cama, más pequeña (k) y apoyada en y = 26 */
const LAMP = { x: 21, y: 26, k: 0.8 };
const ROOM = { bed: { x: 0, y: 34 - itemSize('bed').h }, sofa: { x: 26, y: 34 - itemSize('sofa').h }, tv: { x: 2, y: 11 }, lamp: { x: 27, y: 34 - itemSize('lamp').h }, plant: { x: 19, y: 34 - itemSize('plant').h }, picture: { x: 5, y: 2 }, rug: { x: 12, y: 24 } };
/* dos cuartos: salón (sofá, tele, planta, alfombra, pelota, peluche) y habitación (cama, lámpara, cuadro) */
const ROOMOF = { sofa: 'salon', tv: 'salon', plant: 'salon', rug: 'salon', ball: 'salon', plush: 'salon', bed: 'bedroom', lamp: 'bedroom', picture: 'bedroom', flowers: 'garden', can: 'garden', lounger: 'garden', plot: 'garden', apple: 'garden', pool: 'garden', easel: 'studio', desk: 'studio', piano: 'studio' };
const NEXTROOM = { salon: 'bedroom', bedroom: 'garden', garden: 'studio', studio: 'kitchen', kitchen: 'salon' };
const ROOMNAME = { salon: '🛋️ Salón', bedroom: '🛏️ Cuarto', garden: '🌳 Jardín', studio: '🎨 Estudio', kitchen: '🍳 Cocina' };
const ROOMICON = { salon: '🛋️', bedroom: '🛏️', garden: '🌳', studio: '🎨', kitchen: '🍳' };
const here = () => (['bedroom', 'garden', 'studio', 'kitchen'].includes(state.room.where) ? state.room.where : 'salon');
const has = id => state.owned.includes(id) && (ROOMOF[id] === here() || (id === 'ball' && here() === 'garden'));       // la pelota va en salón y jardín
/** Peluche: en el suelo; si hay sofá, sentado encima (a la derecha del asiento). */
const teddyPos = () => { const h = itemSize('teddy').h; return state.owned.includes('sofa') ? { x: ROOM.sofa.x + itemSize('sofa').w - itemSize('teddy').w - 2, y: ROOM.sofa.y + 9 - h } : { x: 38, y: 34 - h }; };

/* rama por dieta dominante × cuidado (0-1 · 2-5 · 6+ errores) */
const FORMS = { veg: ['flor', 'brote', 'marchita'], meat: ['guerrera', 'grunona', 'rebelde'], candy: ['piruleta', 'glotona', 'gominola'] };
const STAGE_NAMES = { egg: 'Huevo', baby: 'Bebé', child: 'Niño', teen: 'Adolescente', adult: 'Adulto', dead: 'Fallecido' };
const SHELLS = ['#7ed957', '#ff8fb1', '#6ec6ff', '#ffd84d', '#b99cff'];

/* ============================== UTILIDADES ============================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
/** 75 → «1 h 15 min» · 3000 → «2 d 2 h» */
const fmtDur = m => {
  m = Math.max(0, Math.round(m));
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${Math.floor(m / 1440)} d ${Math.floor(m % 1440 / 60)} h`;
};
const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

/* ============================== ESTADO ================================== */
function newState() {
  return {
    v: 2,
    stage: 'egg', form: null,
    ageMin: 0, stageMin: 0, wear: 0,
    weight: 3,
    hunger: 70, happy: 70, energy: 80, discipline: 30,
    poops: 0, poopTimer: 0, nextPoop: rand(CFG.poopEvery[0], CFG.poopEvery[1]),
    sick: false, medicine: 0, sickMin: 0, sickMistake: false,
    sleeping: false,
    call: false, callMin: 0, callsN: 0,
    preSick: false, oldIn: 1440,               // enfermedad previa a evolucionar · cuenta atrás de la enfermedad de vejez
    taste: 20, refuseN: 0, refuseCap: 0,        // paladar (0–100) · rechazos seguidos de comida sana y su tope (3–5)
    mess: null, art: [], messIn: 120,           // travesuras: {kind:'shout'|'paint', min} · garabatos en pantalla · minutos hasta la próxima
    mistakes: 0, neglect: 0, sweetLoad: 0,
    flags: { hunger: false, poop: false, energy: false },
    food: { veg: 0, meat: 0, candy: 0 },
    lp: 0, inv: {}, owned: [], bg: 'none',
    casino: { day: '', lost: 0, spins: 0, free: '' },                       // límites del casino por día
    garden: { plot: [null, null, null, null, null, null], apple: null },   // huerto (6 huecos) y manzano
    skills: {}, words: {}, cause: '', track: { play: 0, hug: 0, sleep: 0 },       // lo que hace de niño (decide la forma de adolescente)
    talent: L.studio.blank(), kitchen: L.kitchen.blank(), sch: L.school.blank(),                                             // talentos: pintura, escritura y música
    study: { n: 0, fat: 0, tired: false },     // lecciones de voz: inteligencia ganada y cansancio
    dirt: 10,                                  // suciedad 0–100 (se limpia con la ducha)
    hat: null,                                 // gorro de recuerdo elegido (id de evento)
    room: { use: null, tv: false, min: 0, auto: false, hug: 0, ball: 0, lamp: false, water: 0 },   // casa: dónde está (sit|lie|bed|tv), tele encendida
    pause: null,                               // {since} mientras está de vacaciones (el tiempo se detiene)
    stayUp: 0,                                 // hasta cuándo (ms) se le deja despierto de noche
    meta: L.progress.blankMeta(),            // álbum, logros y estadísticas (sobreviven a un huevo nuevo)
    born: Date.now(), lastSeen: Date.now()
  };
}

/** Convierte una partida guardada (v1/v2, posiblemente incompleta) en un estado válido, o null. */
function normalize(d) {
  if (!d || typeof d !== 'object' || (d.v !== 1 && d.v !== 2)) return null;
  const b = newState();
  const s = Object.assign(b, d, {
    v: 2,
    flags: Object.assign(b.flags, d.flags), food: Object.assign(b.food, d.food),
    inv: d.inv || {}, owned: d.owned || [], skills: d.skills || {}, words: d.words || {},
    study: Object.assign(b.study, d.study), room: Object.assign(b.room, d.room), garden: Object.assign(b.garden, d.garden), casino: Object.assign(b.casino, d.casino), talent: L.studio.fix(d.talent), kitchen: L.kitchen.fix(d.kitchen), sch: L.school.fix(d.sch),
    meta: L.progress.fixMeta(d.meta)
  });
  ['hunger', 'happy', 'energy', 'discipline', 'dirt', 'taste'].forEach(k => { if (!Number.isFinite(s[k])) s[k] = k === 'dirt' ? 20 : 60; });   // repara valores rotos (NaN)
  if (!Number.isFinite(s.weight)) s.weight = 10;
  const V1 = { bueno: 'child_good', travieso: 'child_naughty', normal: 'brote' };   // formas de la versión 1
  if (V1[s.form]) s.form = V1[s.form];
  return s;
}

const Store = {
  load() {
    try {
      const raw = localStorage.getItem(CFG.saveKey);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch { return null; }
  },
  save() {
    try { state.lastSeen = Date.now(); localStorage.setItem(CFG.saveKey, JSON.stringify(state)); } catch { /* sin storage */ }
  }
};

let state = newState();
let diedNow = false;
let vacHud = false, awayHud = false;
const busEl = $('#busBtn');
let evo = null;               // animación de evolución en curso
let simT = null;              // reloj simulado (ms) al recuperar una ausencia; null = tiempo real
const clockNow = () => (simT === null ? Date.now() : simT);
let quiet = false;            // true mientras se simula la ausencia (sin sonidos ni avisos)

/* ============================== DOM ===================================== */
const screenEl = $('#screen');
const canvas = $('#lcd');                              // lo que se ve (96×72 clásico o 192×144 fino)
const draw = document.createElement('canvas'); draw.width = 96; draw.height = 72;      // donde se dibuja todo el juego
const g = draw.getContext('2d', { willReadFrequently: true });
const vctx = canvas.getContext('2d');
const W = 48, H = 36;                                  // coordenadas lógicas (canvas 96x72 a 2x)
g.setTransform(2, 0, 0, 2, 0, 0);
g.imageSmoothingEnabled = false;

/* --- «píxel fino»: copia el dibujo al lienzo visible al doble de resolución, suavizando las diagonales (algoritmo EPX / Scale2x) --- */
let fine = false, inBuf = null, outImg = null, out32 = null, in32 = null;
function setFine(v) {
  fine = !!v;
  canvas.width = fine ? 192 : 96; canvas.height = fine ? 144 : 72;
  stageEl.classList.toggle('fine', fine);
  if (fine) { inBuf = g.getImageData(0, 0, 96, 72); in32 = new Uint32Array(inBuf.data.buffer); outImg = vctx.createImageData(192, 144); out32 = new Uint32Array(outImg.data.buffer); }
  present();
}
function present() {
  if (!fine) { vctx.imageSmoothingEnabled = false; vctx.drawImage(draw, 0, 0); return; }
  const id = g.getImageData(0, 0, 96, 72); in32.set(new Uint32Array(id.data.buffer));
  const w = 96, h = 72, s = in32, o = out32;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, P = s[i];
      const A = y > 0 ? s[i - w] : P, B = x < w - 1 ? s[i + 1] : P, C = x > 0 ? s[i - 1] : P, D = y < h - 1 ? s[i + w] : P;
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      const j = y * 2 * 192 + x * 2;
      o[j] = e0; o[j + 1] = e1; o[j + 192] = e2; o[j + 193] = e3;
    }
  }
  vctx.putImageData(outImg, 0, 0);
}
const hintEl = $('#hint'), msgEl = $('#msg'), hudEl = $('#hud'), alertEl = $('#alert'), panel = $('#panel');
const roomPickEl = $('#roomPick'), chipsEl = $('#chips'), chipName = $('#chipName'), chipGo = $('#chipGo'), stageEl = $('.stage');
const iconBtns = $$('#icons button');
const meterEls = $$('.meter');

/* ============================== LÓGICA ================================== */
const minW = () => CFG.minWeight[state.stage] || 3;
const need = () => CFG.needMult[state.stage] || { hunger: 1, happy: 1 };
const poopRange = () => CFG.poopByStage[state.stage] || CFG.poopEvery;
const isObese = () => state.weight > (CFG.obese[state.stage] || 99);
/** Posición 0..1 en la barra de gordura: 0 = delgadísimo, 0,5 = equilibrado, 1 = obeso (límite de obesidad de su etapa). */
const fatPos = () => { const lo = minW(), hi = CFG.obese[state.stage] || 99; return Math.max(0, Math.min(1, (state.weight - lo) / Math.max(1, hi - lo))); };
const formName = id => (META[id] && META[id].name) || '—';

function spriteId() {
  const s = state;
  if (s.stage === 'egg') return 'egg';
  if (s.stage === 'baby') return 'baby';
  if (s.stage === 'dead') return null;
  if (s.stage === 'teen') return s.form || 'teen_good';
  return s.form || 'child_good';
}

const cycleOn = () => !!L.settings.get('cycle');
/** Descanso del dueño (por defecto 00:00-06:00, máx. 8 h): las barras bajan despacio y no hay cacas, enfermedades ni errores. */
function restAt(t) {
  if (!L.settings.get('rest')) return false;
  const from = Number(L.settings.get('restFrom')) || 0;
  let len = (Number(L.settings.get('restTo')) - from + 24) % 24;
  if (len === 0) return false;
  len = Math.min(8, len);
  const d = new Date(t), h = d.getHours() + d.getMinutes() / 60;
  return (h - from + 24) % 24 < len;
}
let restPrev = null;

function mistake() { state.mistakes = Math.min(99, state.mistakes + 1); }

function flag(name, on, off) {
  const f = state.flags;
  if (on && !f[name]) { f[name] = true; mistake(); }
  else if (off) f[name] = false;
}

function makeSick(reason) {
  const s = state;
  s.sick = true; s.medicine = 2; s.sickMin = 0; s.sickMistake = false;
  if (!quiet) { setMsg(reason || '¡Limagochi se ha puesto enfermo!', 3500); Sound.play('sad'); }
}

function adultForm() {
  const s = state, f = s.food, tot = f.veg + f.meat + f.candy;
  const share = k => (tot ? f[k] / tot : 0);
  const balanced = Math.max(share('veg'), share('meat'), share('candy')) <= 0.5;
  const tf = L.forms.talentForm(s); if (tf) return tf;                         // destaca en un talento
  if (s.mistakes <= 1 && s.discipline >= 80 && balanced && tot >= 8) return 'estrella';
  let diet = 'veg';
  if (f.meat > f[diet]) diet = 'meat';
  if (f.candy > f[diet]) diet = 'candy';
  const care = s.mistakes <= 1 ? 0 : s.mistakes <= 5 ? 1 : 2;
  return FORMS[diet][care];
}

function toStage(st, text, from) {
  state.stage = st; state.stageMin = 0; state.callsN = 0; state.preSick = false;
  if (st === 'child') state.track = { play: 0, hug: 0, sleep: 0 };
  state.nextPoop = rand(poopRange()[0], poopRange()[1]); state.poopTimer = 0;
  state.weight = Math.max(state.weight, CFG.minWeight[st]);
  if (st !== 'egg') L.progress.record(spriteId());
  if (st !== 'egg' && st !== 'baby' && L.mail) L.mail.on('evolve', { name: formName(state.form) });
  if (quiet) return;
  evo = { start: Date.now(), dur: 3800, from: from || 'egg', to: spriteId() };       // animación de evolución
  fx('happy', 3800 + 1800); peek(3800); setMsg(text, 5500); Sound.play('evolve');
  L.notify && L.notify.event('¡Limagochi ha evolucionado!', text);
}

function evolve() {
  const s = state, from = spriteId();
  if (s.stage === 'egg' && s.stageMin >= CFG.stageMin.egg) toStage('baby', '¡El huevo ha eclosionado!', from);
  else if (s.stage === 'baby' && s.stageMin >= CFG.stageMin.baby) {
    s.form = s.mistakes <= 1 ? 'child_good' : 'child_naughty';
    toStage('child', `¡Ha crecido! Ahora es ${formName(s.form)}`, from);
  } else if (s.stage === 'child' && s.stageMin >= CFG.stageMin.child) {
    s.form = L.forms.teenForm(s);
    toStage('teen', `¡Ya es adolescente! Ahora es ${formName(s.form)}`, from);
  } else if (s.stage === 'teen' && s.stageMin >= CFG.stageMin.teen) {
    s.form = adultForm();
    toStage('adult', `¡Evolución! Es ${formName(s.form)}`, from);
  }
}

function die(cause) {
  state.diedAs = state.stage;
  state.stage = 'dead'; state.sleeping = false; state.cause = cause; diedNow = true;
  logLife(cause);
}

/** Apunta la vida de este Limagochi en el historial (una sola vez, al morir o al cambiar de huevo). */
function logLife(cause) {
  const s = state, m = s.meta;
  if (s.logged || s.stage === 'egg') return;
  s.logged = true;
  const t = s.talent || {}, ex = t.extra || {};
  const mx = k => Math.round(((t[k] && t[k].mx) || (ex[k] && ex[k].mx) || 0));
  m.history = m.history || [];
  m.lives = (m.lives || 0) + 1;
  m.history.push({
    n: m.lives, form: s.form || 'baby', stage: s.diedAs || (s.stage === 'dead' ? 'adult' : s.stage), born: s.born, end: Date.now(), age: Math.round(s.ageMin),
    cause, lp: Math.max(0, ((m.stats && m.stats.lpEarned) || 0) - (s.lpAt || 0)), mistakes: s.mistakes || 0,
    books: (t.stats && t.stats.books) || 0,
    tricks: Object.values(s.skills || {}).filter(v => v >= 100).length + Object.values(s.words || {}).filter(v => v >= 100).length,
    tal: { painting: mx('painting'), writing: mx('writing'), music: mx('music'), cooking: mx('cooking'), gardening: mx('gardening'), fishing: mx('fishing'), sport: mx('sport') }
  });
  if (m.history.length > 30) m.history.splice(0, m.history.length - 30);
}

/** Travesuras ocasionales: gritar por el altavoz o pintar las paredes. Cuanto menos disciplina, más a menudo.
    Sin castigo si las ignoras: los gritos se acaban solos y los garabatos esperan a la 🧹. */
function mischief(dt, night) {
  const s = state;
  if (quiet) return;
  if (s.mess) { s.mess.min = (s.mess.min || 0) + dt; if (s.mess.kind === 'shout' && s.mess.min > 20) s.mess = null; return; }
  if (!['child', 'teen', 'adult'].includes(s.stage) || s.sleeping || s.sick || s.pause || night || s.call) return;
  s.messIn -= dt;
  if (s.messIn > 0) return;
  s.messIn = rand(120, 180);
  if (Math.random() > clamp(1.3 - s.discipline / 70, 0.15, 1)) return;                      // con disciplina alta casi nunca
  if (!s.art.length && Math.random() < 0.5) {
    s.art = scribble();
    s.mess = { kind: 'paint', min: 0 };
    setMsg('🖍️ ¡Está pintando la pared! Regáñalo', 4500); Sound.play('alert');
  } else {
    s.mess = { kind: 'shout', min: 0 };
    setMsg('📢 ¡Está gritando por el altavoz! Regáñalo', 4500); Sound.play('shout'); Sound.vibrate && Sound.vibrate([80, 40, 80]);
  }
  fx('refuse', 1500);
}
/** Garabatos: trazos de 1 píxel (x, y, ancho, alto) repartidos por pared y suelo. */
function scribble() {
  const out = [], n = 5 + Math.floor(Math.random() * 2);
  for (let k = 0; k < n; k++) {
    let x = 3 + Math.floor(Math.random() * 40), y = 3 + Math.floor(Math.random() * 22);
    for (let i = 0; i < 6; i++) {
      const horiz = Math.random() < 0.5, len = 2 + Math.floor(Math.random() * 5) * (Math.random() < 0.5 ? 1 : -1);
      out.push(horiz ? [Math.min(x, x + len), y, Math.abs(len) + 1, 1] : [x, Math.min(y, y + len), 1, Math.abs(len) + 1]);
      if (horiz) x = Math.max(1, Math.min(46, x + len)); else y = Math.max(1, Math.min(32, y + len));
    }
  }
  return out;
}

/** Avanza `dt` minutos de juego (dt ≤ 1). */
function tick(dt) {
  const s = state, R = CFG.rate;
  if (s.stage === 'dead') return;
  s.ageMin += dt; s.stageMin += dt;
  if (s.stage === 'egg') { evolve(); return; }

  const obese = isObese();

  const ph = cycleOn() ? L.world.phaseAt(clockNow()) : 'day', night = ph === 'night';
  const rest0 = s.stage !== 'egg' && restAt(clockNow());
  if (restPrev !== null && rest0 !== restPrev && !quiet) { setMsg(rest0 ? '🌙 Descanso: todo va más despacio mientras duermes' : '☀️ Buenos días: vuelve el ritmo normal', 4500); }
  restPrev = rest0;
  const away = L.school.tick(dt, clockNow(), quiet);
  const rest = rest0 || away;                                                    // fuera (cole/trabajo) cuenta como descanso: sin cacas, errores ni enfermedades
  if (away && s.sick) { s.sick = false; s.sickMin = 0; s.preSick = false; }       // en el cole o el trabajo no enferma (si iba a crecer, el aviso llega al volver)
  if (s.sleeping) {
    s.energy = clamp(s.energy + R.sleep * dt);
    if (cycleOn() && L.world.isMorningAt(clockNow()) && s.energy >= 50) {            // amanece: se despierta solo
      s.sleeping = false;
      if (!quiet) setMsg('☀️ ¡Ha amanecido! Se despierta');
    } else if (s.energy >= 100 && !night) {                                         // de noche sigue durmiendo hasta que amanezca
      s.sleeping = false; s.happy = clamp(s.happy + 5);
      if (!quiet) setMsg('¡Buenos días! Ha descansado');
    }
  } else {
    s.energy = clamp(s.energy - R.energy * L.studio.stress().energy * (rest ? 0.35 : 1) * dt);
    if (night && s.energy < 70 && clockNow() > (s.stayUp || 0)) {                 // de noche se duerme solo
      s.sleeping = true;
      if (!quiet) { setMsg('🌙 Se ha quedado dormido'); Sound.play('lightOff'); }
    }
  }

  const k = s.sleeping || rest ? 0.35 : 1;
  const toy = s.owned.includes('plush') ? 0.7 : s.owned.includes('ball') ? 0.85 : 1;
  const nd = need();
  s.hunger = clamp(s.hunger - R.hunger * nd.hunger * L.studio.stress().hunger * dt * k);
  const st = L.studio.stress();
  s.happy = clamp(s.happy - (R.happy * nd.happy * k * toy * st.happy + s.poops * 0.05 + (s.sick ? 0.1 : 0) + (s.dirt > 70 ? 0.03 : 0)) * dt);
  s.dirt = clamp(s.dirt + (R.dirt * k + s.poops * 0.02) * dt);
  s.discipline = clamp(s.discipline - R.discipline * st.disc * dt);
  s.sweetLoad = Math.max(0, s.sweetLoad - 0.02 * dt);
  if (s.sleeping || s.room.use === 'lie' || s.room.use === 'bed') s.track.sleep += dt;
  if (!s.sleeping) s.taste = Math.max(0, s.taste - 0.02 * dt);                  // el paladar se reeduca solo (~30 al día)
  if (s.hunger < 20) s.weight = Math.max(minW(), s.weight - 0.008 * dt);
  if (!s.sleeping) s.weight = Math.max(minW(), s.weight - (CFG.weightLossH / 60) * dt);      // quema pasiva despierto (0,25 g/h)

  if (!s.sleeping && !rest) {
    s.poopTimer += dt;
    if (s.poopTimer >= s.nextPoop) {
      s.poopTimer = 0; s.nextPoop = rand(poopRange()[0], poopRange()[1]);
      if (s.poops < 4) { s.poops++; if (!quiet) { setMsg('💩 ¡Ha hecho caca! Límpiala pronto o enfermará', 3500); Sound.play('alert'); } }    // un aviso por caca
    }
  }

  if (rest) { /* durante el descanso no enferma por descuido ni se cuentan errores */ }
  else if (!s.sick) {
    const risk = CFG.sickRisk + s.poops * 0.0008 + (s.hunger < 10 ? 0.002 : 0) + (s.energy <= 0 ? 0.001 : 0) + (obese ? 0.0012 : 0) + (s.dirt > 85 ? 0.0006 : 0);
    if (Math.random() < risk * dt) makeSick();
  } else {
    s.sickMin += dt;
    if (s.sickMin > CFG.sickMistakeMin && !s.sickMistake) { s.sickMistake = true; mistake(); }
  }

  /* se pone malito poco antes de evolucionar (como el original): un aviso de que va a crecer, sin contar como error */
  const left = (CFG.stageMin[s.stage] || Infinity) - s.stageMin;
  if (!quiet && !away && !s.sick && !s.preSick && !s.sleeping && CFG.preSickMin[s.stage] && left > 0 && left <= CFG.preSickMin[s.stage]) {
    s.preSick = true; makeSick('🤒 Se encuentra raro… ¡va a crecer! Cúralo'); s.sickMistake = true;
  }
  /* vejez: en el último tramo de su vida enferma cada día y necesita dosis doble */
  if (!quiet && !away && s.stage === 'adult' && s.wear >= CFG.oldAgeAt * CFG.lifespanMin) {
    s.oldIn -= dt;
    if (s.oldIn <= 0) { s.oldIn = 1440; if (!s.sick) { makeSick('👴 Los años pesan: se ha puesto enfermo'); s.medicine = 4; s.sickMistake = true; } }
  }

  gardenTick(dt);
  L.studio.tick(dt, quiet);
  L.kitchen.tick(dt, quiet);
  roomTick(dt);
  flag('hunger', s.hunger <= 0 && !rest, s.hunger > 20);
  flag('poop', s.poops >= 3 && !rest, s.poops === 0);
  flag('energy', s.energy <= 0 && !s.sleeping && !rest, s.energy > 30);
  flag('dirty', s.dirt >= 95 && !rest, s.dirt < 60);

  mischief(dt, night || rest);
  if (s.call) {
    if (!rest) s.callMin += dt;
    if (s.callMin > CFG.callWindowMin) { s.call = false; mistake(); if (!quiet) setMsg('Ignoraste su llamada de atención'); }
  } else if (!s.sleeping && !rest && s.callsN < (CFG.callMax[s.stage] || 0) && Math.random() < CFG.callChance * dt * (s.discipline < 50 ? 1.5 : 1)) { s.call = true; s.callMin = 0; s.callsN++; }

  if (rest) { /* el descuido se congela mientras duermes */ }
  else if (s.hunger <= 0 || s.sick || s.poops >= 4) s.neglect += dt; else s.neglect = Math.max(0, s.neglect - dt);
  if (s.neglect >= CFG.deathNeglectMin) { die('descuido'); return; }

  if (s.stage === 'adult') {
    s.wear += dt * (obese ? 2.5 : 1);
    if (s.wear >= CFG.lifespanMin) { die('vejez'); return; }
  }

  L.voice && L.voice.decay(dt);
  evolve();
}

function step(dtMin) {
  if (state.pause) return;                                // de vacaciones: el tiempo no corre
  let left = Math.min(dtMin, CFG.maxOfflineMin), guard = 0;
  while (left > 0 && guard++ < 25000) {
    const d = Math.min(1, left);
    if (simT !== null) simT += d * 60000;
    tick(d); left -= d;
    if (state.stage === 'dead') break;
  }
  if (diedNow) { diedNow = false; onDeath(); }
}

function attention() {
  const s = state, a = [];
  if (s.stage === 'dead' || s.stage === 'egg' || s.sleeping || s.pause || L.school.isAway()) return a;
  if (s.hunger < 25) a.push({ key: 'hunger', text: 'Tiene hambre' });
  if (s.happy < 25) a.push({ key: 'sad', text: 'Está triste: ¡juega con él!' });
  if (s.energy < 15) a.push({ key: 'sleepy', text: 'Tiene sueño: apaga la luz' });
  else if (cycleOn() && L.world.isNight() && s.energy < 60) a.push({ key: 'night', text: '🌙 Es de noche: apaga la luz para que duerma' });
  if (s.sick) a.push({ key: 'sick', text: 'Está enfermo: cúralo' });
  if (s.poops > 0) a.push({ key: 'poop', text: 'Hay que limpiar' });
  if (s.dirt >= 60) a.push({ key: 'dirty', text: '🧼 Está sucio: dale una ducha' });
  if (s.mess && s.mess.kind === 'shout') a.push({ key: 'shout', text: '📢 Grita por el altavoz: ¡regáñalo!' });
  if (s.mess && s.mess.kind === 'paint') a.push({ key: 'paint', text: '🖍️ Pinta la pared: ¡regáñalo!' });
  if (s.call) a.push({ key: 'call', text: 'Te llama… ¿regañarlo?' });
  if (s.neglect >= CFG.dangerMin) a.push({ key: 'danger', text: '¡Está en peligro! Atiéndelo ya' });
  return a;
}

function onDeath() {
  const old = state.cause === 'vejez';
  if (!quiet) Sound.play('die');
  setMsg(old ? 'Limagochi ha vivido una larga vida… 🌈' : 'Limagochi se ha ido al cielo de las limas…', 7000);
  L.notify && L.notify.event('Limagochi', old ? 'Ha fallecido de vejez.' : 'Ha fallecido por descuido…');
  L.progress.check();
  Store.save();
  openStatus();
}

/* ============================== ACCIONES ================================ */
function canInteract() {
  if (L.school.isAway()) { setMsg(L.school.hudText().replace(' · vuelve', ' · vuelve'), 3000); return false; }
  if (state.stage === 'dead') { setMsg('Limagochi ya no está…'); return false; }
  if (state.stage === 'egg') { setMsg('El huevo aún no ha eclosionado'); return false; }
  return true;
}
function awake() {
  if (state.sleeping) { setMsg('Zzz… duerme. Enciende la luz'); return false; }
  return true;
}
function refuse(text) { fx('refuse', 1400); Sound.play('refuse'); setMsg(text); }

/* ---- comida: comidas sacian, snacks suben el ánimo (y engordan) ---- */
/** El icono 🍔 lleva a la cocina y abre la nevera (básica o mejorada). */
function openFeed() {
  if (!canInteract() || !awake()) return;
  if (state.pause) { setMsg('Está de vacaciones'); return; }
  if (here() !== 'kitchen') setRoom('kitchen');
  openFridge();
}
function openFridge() {
  if (!state.owned.includes('fridge2')) { L.kitchen.basicMenu(); return; }
  L.kitchen.sync();
  const gour = FOODS.filter(f => f.gourmet && state.inv[f.id] > 0);
  const nGour = gour.reduce((n, f) => n + state.inv[f.id], 0);
  openPanel([
    p('¿Qué le das?'),
    btn('🥗 Sanas', () => feedList('healthy')),
    btn('🍔 Comida rápida', () => feedList('fast')),
    btn('🍬 Snacks', () => feedList('snack')),
    ...(nGour ? [btn(`🎒 Gourmet (${nGour})`, () => feedList('gourmet'))] : []),
    ...(state.kitchen.plates.length ? [btn(`🍽️ Platos cocinados (${state.kitchen.plates.length})`, () => L.kitchen.openPlates())] : []),
    btn('Cancelar', closePanel, 'ghost')
  ]);
}

function feedList(cat) {
  const list = cat === 'gourmet' ? FOODS.filter(f => f.gourmet && state.inv[f.id] > 0)
                                 : FOODS.filter(f => !f.gourmet && f.grp === cat && (!f.stock || state.inv[f.id] > 0));
  const title = { healthy: 'Sanas · dan energía y disciplina', fast: 'Rápida · anima, pero ensucia y engorda', snack: 'Snacks · animan, pero engordan', gourmet: 'Gourmet' }[cat];
  const ev = L.world.event();
  const seasonal = ev && (cat === 'healthy' || cat === 'snack') ? L.world.EVENT_FOODS.filter(f => f.event === ev.id && f.cat === (cat === 'snack' ? 'snack' : 'meal')) : [];
  openPanel([
    p(title),
    ...seasonal.map(f => btn(`${ev.icon} ${f.name} (temporada)`, () => feed(f))),
    ...list.map(f => btn(`${f.icon} ${f.name}${f.gourmet || f.stock ? ' ×' + state.inv[f.id] + ' ' + L.kitchen.fresh(f.id) : ''}`, () => feed(f))),
    btn('Atrás', openFridge, 'ghost')
  ], { full: true });
}

function feed(f) {
  closePanel();
  const s = state;
  if (s.sick) { refuse('Está enfermo: cúralo primero'); return; }
  if (f.cat === 'meal' && s.hunger >= 98) { refuse('No quiere más, está lleno'); return; }
  if (f.cat === 'snack' && s.happy >= 98) { refuse('Ya está muy feliz'); return; }
  const old = (f.gourmet || f.stock) ? L.kitchen.oldest(f.id) : -1;
  if (f.gourmet || f.stock) { if (!(s.inv[f.id] > 0)) return; s.inv[f.id]--; }
  else if (f.fromBasic) { if (!(s.kitchen.basic[f.id] > 0)) return; s.kitchen.basic[f.id]--; }
  else if (f.plate !== undefined) { L.kitchen.eatPlate(f.plate); }
  if (f.grp === 'healthy' && s.taste >= 40 && s.hunger >= 10) {                // acostumbrado a la rápida: puede rechazar lo sano
    if (!s.refuseCap) s.refuseCap = 3 + Math.floor(Math.random() * 3);          // aguanta de 3 a 5 rechazos seguidos
    const pRefuse = Math.min(0.8, (s.taste - 40) / 60) * (1 - s.discipline / 200);
    if (s.refuseN < s.refuseCap && Math.random() < pRefuse) {
      s.refuseN++; s.happy = clamp(s.happy - 4); s.taste = Math.max(0, s.taste - 8);
      refuse(`😠 ¡No quiere ${f.name.toLowerCase()}! Está acostumbrado a la comida rápida`); Store.save(); render(); return;
    }
  }
  if (f.grp === 'healthy') { s.refuseN = 0; s.refuseCap = 0; }
  s.hunger = clamp(s.hunger + f.hunger);
  s.happy = clamp(s.happy + f.happy);
  if (f.energy) s.energy = clamp(s.energy + f.energy);
  if (f.dirt) s.dirt = clamp(s.dirt + f.dirt);
  if (f.grp === 'fast') s.taste = clamp(s.taste + 12); else if (f.grp === 'snack') s.taste = clamp(s.taste + 6); else if (f.grp === 'healthy') s.taste = Math.max(0, s.taste - 6);
  s.discipline = clamp(s.discipline + f.disc);
  s.weight = clamp(s.weight + f.weight * (f.grp === 'healthy' ? CFG.healthyWeightK : 1), minW(), 99);
  s.food[f.diet]++;
  L.first && L.first.did('feed');
  L.progress.stat('fed'); if (f.cat === 'snack') L.progress.stat('snacks'); if (f.gourmet) L.progress.stat('gourmet');
  s.sweetLoad += f.sweet || 0;
  fx('eat', 2600, { food: f }); Sound.play('eat');
  if (old > 0.85 && !s.sick && Math.random() < 0.35) makeSick('🤢 La comida estaba pasada: se ha puesto malo');
  else if (s.sweetLoad >= 3 && !s.sick) makeSick('¡Caries! Demasiados dulces');
  else if (isObese()) setMsg('🚨 ¡Obeso! Índice peligroso: hazlo jugar', 5000);
  else if (fatPos() > 0.5) setMsg('⚠️ Índice de obesidad peligroso: toma medidas', 4500);
  else setMsg(`¡Ñam! ${f.name}`);
  Store.save(); render();
}

function clean() {
  if (!canInteract()) return;
  if (!state.poops && !state.art.length) { setMsg('Todo está limpio'); return; }
  state.art = []; state.poops = 0; state.flags.poop = false; L.progress.stat('cleans'); L.first && L.first.did('clean');
  state.happy = clamp(state.happy + 5);
  fx('clean', 1400); Sound.play('clean'); setMsg('¡Limpio y reluciente!');
  Store.save();
}

/* ---- ducha: se frota con el dedo para quitar la suciedad ---- */
function startShower() {
  if (!canInteract() || !awake()) return;
  if (state.dirt < 15) { setMsg('Ya está limpísimo ✨'); return; }
  if (state.sick) { setMsg('Está enfermo: mejor no mojarlo'); return; }
  L.mini.start('shower');
}
/** frac = parte de la suciedad que se ha quitado (0–1). */
function showered(frac) {
  const s = state, before = s.dirt;
  s.dirt = clamp(s.dirt * (1 - frac));
  if (frac > 0.5) { s.happy = clamp(s.happy + 10); L.progress.stat('showers'); }
  fx('happy', 1800); Sound.play(frac > 0.5 ? 'clean' : 'click');
  setMsg(frac > 0.9 ? '🚿 ¡Reluciente!' : frac > 0.5 ? '🚿 ¡Mucho mejor!' : 'Aún queda suciedad…', 3000);
  L.progress.check(); Store.save(); render();
  return before - s.dirt;
}

function heal() {
  if (!canInteract()) return;
  const s = state;
  if (!s.sick) { setMsg('No está enfermo'); return; }
  s.medicine--;
  fx('heal', 1500); Sound.play('heal');
  if (s.medicine <= 0) {
    s.sick = false; s.sickMin = 0; s.sickMistake = false; s.happy = clamp(s.happy + 5);
    L.progress.stat('heals');
    setMsg('¡Curado!');
  } else setMsg('Necesita otra dosis');
  Store.save();
}

function toggleLight() {
  if (!canInteract()) return;
  const s = state;
  if (!s.sleeping && cycleOn() && L.world.phase() === 'day' && s.energy >= 25) {      // de día solo se echa la siesta si está agotado
    refuse('☀️ Es de día: aún no tiene sueño. Duerme de noche');
    return;
  }
  s.sleeping = !s.sleeping;
  if (!s.sleeping) s.stayUp = Date.now() + 45 * 60000;          // si lo despiertas de noche, se queda un rato levantado
  if (s.sleeping && cycleOn() && L.world.isNight()) L.progress.stat('nightSleeps');
  if (s.sleeping) { setMsg('Luz apagada: a dormir… Zzz'); Sound.play('lightOff'); }
  else {
    Sound.play('lightOn');
    const missing = 100 - s.energy;                                                // lo despiertas sin haber descansado: se enfada
    if (missing >= 10) {
      const pen = Math.min(15, Math.ceil(missing / 8));
      s.happy = clamp(s.happy - pen);
      fx('refuse', 1400); setMsg(`😠 ¡Quería dormir más! −${pen} felicidad`, 3200);
    } else setMsg('Luz encendida');
  }
  roomTick(0);
  Store.save(); render();
}

function scold() {
  if (!canInteract() || !awake()) return;
  const s = state;
  if (s.mess) {
    const m = s.mess; s.mess = null;
    s.discipline = clamp(s.discipline + 25); s.happy = clamp(s.happy - 5);
    L.progress.stat('scolds'); Sound.play('click');
    setMsg(m.kind === 'paint' ? 'Ha entendido la lección. Limpia los garabatos con 🧹' : 'Ha entendido la lección. ¡Silencio!');
  } else if (s.call) {
    s.call = false; s.callMin = 0;
    s.discipline = clamp(s.discipline + 25); s.happy = clamp(s.happy - 5);
    L.progress.stat('scolds'); setMsg('Ha entendido la lección'); Sound.play('click');
  } else {
    s.happy = clamp(s.happy - 10);
    refuse('¡No había hecho nada malo!');
  }
  Store.save();
}

function openStatus() {
  const s = state;
    const left = CFG.stageMin[s.stage] ? Math.max(0, Math.ceil(CFG.stageMin[s.stage] - s.stageMin)) : null;
  const form = s.stage === 'dead' ? '—' : s.stage === 'child' || s.stage === 'teen' || s.stage === 'adult' ? formName(s.form) : STAGE_NAMES[s.stage];
  const rows = [
    ['Etapa', STAGE_NAMES[s.stage]], ['Forma', form], ['Edad', fmtDur(s.ageMin)],
    ['Peso', `${s.weight.toFixed(1)} g${isObese() ? ' (obeso)' : ''}`],
    ['Disciplina', `${Math.round(s.discipline)}%`], ['Higiene', `${Math.round(100 - s.dirt)}%`], ['Errores', String(s.mistakes)],
    ['Lima Points', `${s.lp} 🪙`]
  ];
  if (L.voice && s.stage !== 'egg' && s.stage !== 'dead') rows.push(['Inteligencia', `${L.voice.iqPct()}%`]);
  if (s.stage !== 'egg' && s.stage !== 'dead') rows.push(['Paladar', tasteLabel(s.taste)]);
  if (s.stage === 'adult') rows.push(['Vida restante', `${Math.max(0, Math.round(100 - s.wear / CFG.lifespanMin * 100))}%`]);
  if (left !== null && s.stage !== 'dead') rows.push(['Evoluciona en', `~${fmtDur(left)}`]);
  if (s.stage === 'dead') rows.push(['Causa', s.cause === 'vejez' ? 'Vejez' : 'Descuido']);
  const ev = L.world.event();
  if (cycleOn()) rows.push(['Momento', { day: '☀️ Día', dusk: '🌅 Atardecer', night: '🌙 Noche' }[L.world.phase()]]);
  if (ev) rows.push(['Evento', L.world.eventLabel(ev)]);

  openPanel([
    ...rows.map(([k, v]) => line(k, v)),
    row(btn('☰ Menú', openMenu), btn('Cerrar', closePanel, 'ghost'))
  ], { full: true });
}

/** Imagen del icono (negro con fondo transparente) o, si se desactiva, el emoji de siempre. */
const monoOn = () => L.settings.get('mono') !== false;
function menuBtn(name, emoji, label, right, onClick) {
  const b = btn('', onClick, 'mrow');
  const ic = document.createElement('span'); ic.className = 'mi'; ic.dataset.ico = name; ic.dataset.emo = emoji; ic.textContent = emoji;
  const t = document.createElement('span'); t.className = 'mt'; t.textContent = label;
  b.append(ic, t);
  if (right) { const r = document.createElement('span'); r.className = 'mr'; r.textContent = right; b.append(r); }
  paintIcons(b);
  return b;
}
function openMenu() {
  const s = state, m = s.meta, un = L.mail && L.mail.unread ? L.mail.unread() : 0;
  openPanel([
    p('☰ Menú'),
    menuBtn('logros', '🏆', 'Logros', `${Object.keys(m.ach).length}/${L.progress.ACH.length}`, () => L.progress.openAchievements(openMenu)),
    menuBtn('album', '📖', 'Álbum', `${Object.keys(m.album).length}/${L.progress.ALBUM.length}`, () => L.progress.openAlbum(openMenu)),
    menuBtn('bugs', '🦋', 'Insectos', '', () => L.progress.openBugs(openMenu)),
    menuBtn('mail', '✉️', 'Buzón', un ? `(${un})` : '', () => L.mail.open(openMenu)),
    menuBtn('visit', '🤝', 'Visitas', '', () => L.visit.open(openMenu)),
    menuBtn('voice', '🎓', 'Trucos y palabras', '', () => L.voice && L.voice.open()),
    ...(L.first && L.first.active() ? [menuBtn('logros', '🌟', 'Primeros pasos', `${L.first.count()}/${L.first.steps.length}`, () => L.first.open(openMenu))] : []),
    menuBtn('guide', '❓', 'Guía', '', () => L.guide.open(openMenu)),
    menuBtn('settings', '⚙️', 'Ajustes', '', () => L.backup.openSettings(openMenu)),
    menuBtn(state.stage === 'adult' ? 'work' : 'school', state.stage === 'adult' ? '💼' : '🏫', state.stage === 'adult' ? 'Trabajo' : 'Colegio', '', () => L.school.open(openMenu)),
    menuBtn('history', '📜', 'Historial', `${(m.history || []).length}`, () => openHistory(openMenu)),
    menuBtn('egg', '🥚', 'Nuevo huevo', '', openNewEgg),
    btn('Cerrar', closePanel, 'ghost')
  ], { full: true });
}

const CAUSES = { vejez: '🕊️ Vejez', descuido: '💔 Descuido', huevo: '🥚 Cambio de huevo' };
const TALICONS = { painting: '🎨 Pintura', writing: '✍️ Escritura', music: '🎵 Música', cooking: '🍳 Cocina', gardening: '🌱 Jardinería', fishing: '🎣 Pesca', sport: '⚽ Deporte' };
const fmtDate = ts => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
function openNewEgg() {
  const dead = state.stage === 'dead';
  openPanel([
    p('🥚 Nuevo huevo'),
    p(dead ? 'Tu Limagochi ya no está. Su vida quedará en el historial.' : 'Tu Limagochi actual se despide: su vida quedará en el historial.'),
    p('Las habilidades y los trucos empiezan siempre en 0.'),
    btn('📦 Conservar bienes', () => newEgg('keep')),
    p('Guardas monedas, muebles y todo lo que compraste.'),
    btn('🌱 Empezar desde 0', () => { if (confirm('Perderás monedas y compras. Se guardan álbum, logros e historial. ¿Seguro?')) newEgg('zero'); }),
    p('Pierdes monedas y compras; se guardan álbum, logros e historial.'),
    btn('Cancelar', () => openMenu(), 'ghost')
  ], { full: true });
}
function openHistory(back) {
  const m = state.meta, h = (m.history || []).slice().reverse();
  const nodes = [p('📜 Historial de Limagochis')];
  if (!h.length) nodes.push(p('Aún no hay vidas anotadas. Cuando tu Limagochi muera o empieces otro huevo, aparecerá aquí.'));
  else {
    const best = h.reduce((a, b) => (b.age > a.age ? b : a));
    nodes.push(p(`Criados: ${m.lives || h.length} · vida más larga: ${fmtDur(best.age)} (${formName(best.form)})`));
    h.forEach(x => nodes.push(btn(`#${x.n} ${formName(x.form)} · ${fmtDur(x.age)} · ${(CAUSES[x.cause] || '').split(' ')[0]}`, () => openLife(x, back))));
  }
  nodes.push(btn('Atrás', back || closePanel, 'ghost'));
  openPanel(nodes, { full: true });
}
function openLife(x, back) {
  const tal = Object.keys(TALICONS).filter(k => x.tal && x.tal[k] >= 1).map(k => `${TALICONS[k]} ${x.tal[k]}`).join(' · ') || 'Sin talentos';
  openPanel([
    p(`#${x.n} ${formName(x.form)}`),
    line('Nació', fmtDate(x.born)), line('Terminó', fmtDate(x.end)), line('Edad', fmtDur(x.age)),
    line('Etapa', STAGE_NAMES[x.stage] || '—'), line('Final', CAUSES[x.cause] || '—'),
    line('🪙 ganadas', String(x.lp)), line('Errores', String(x.mistakes)), line('Libros', String(x.books)), line('Trucos y palabras', String(x.tricks)),
    p(tal),
    btn('Atrás', () => openHistory(back), 'ghost')
  ], { full: true });
}

/** Pone (o quita) los iconos negros en todo lo marcado con data-ico dentro de `root`. */
function paintIcons(root = document) {
  const on = monoOn();
  $$('[data-ico]', root).forEach(el => {
    if (el.dataset.emo === undefined) el.dataset.emo = el.textContent.trim();
    if (on) { el.textContent = ''; const i = document.createElement('img'); i.className = 'ic'; i.alt = ''; i.src = `ico/${el.dataset.ico}.png`; i.draggable = false; el.append(i); }
    else el.textContent = el.dataset.emo;
  });
  if (L.glyphs) L.glyphs.sync(on);
}

/* ---- vacaciones: el tiempo se detiene (no crece, no pasa hambre, no enferma ni muere) ---- */
function openVacation() {
  const s = state;
  openPanel([
    p('🏖️ Limagochi está de vacaciones'),
    p(`Lleva ${fmtDur((Date.now() - s.pause.since) / 60000)} descansando. Mientras tanto no crece ni necesita cuidados.`),
    btn('☀️ Volver de vacaciones', endVacation),
    row(btn('📘 Guía', () => L.guide.open(openVacation)), btn('⚙️ Ajustes', () => L.backup.openSettings(openVacation))),
    btn('Cerrar', closePanel, 'ghost')
  ], { full: true });
}
function startVacation() {
  const s = state;
  if (s.stage === 'dead') { setMsg('Limagochi ya no está…'); return; }
  if (s.pause) { openVacation(); return; }
  if (!confirm('¿Mandar a Limagochi de vacaciones? El tiempo se detiene (no crece ni necesita cuidados) hasta que lo recojas.')) return;
  L.mini && L.mini.stop(false);
  s.pause = { since: Date.now() };
  closePanel(); Store.save(); setMsg('🏖️ ¡Felices vacaciones!', 3500); render();
}
function endVacation() {
  const s = state;
  if (!s.pause) return;
  s.pause = null; s.lastSeen = Date.now(); lastTick = Date.now();
  lastKeys = new Set(attention().map(r => r.key));
  closePanel(); Sound.play('happy'); fx('happy', 1800); setMsg('☀️ ¡Bienvenido de vuelta!'); Store.save(); render();
}

/** mode 'keep': conserva monedas y compras · 'zero': empieza de cero (solo se guardan álbum, logros, historial y amigos). Las habilidades siempre empiezan en 0. */
function newEgg(mode = 'keep') {
  closePanel();
  logLife(state.stage === 'dead' ? state.cause : 'huevo');
  const keep = mode === 'zero' ? { meta: state.meta } : { lp: state.lp, owned: state.owned.slice(), bg: state.bg, hat: state.hat, meta: state.meta };
  state = newState();
  Object.assign(state, keep);
  state.lpAt = (state.meta.stats && state.meta.stats.lpEarned) || 0;
  if (state.owned.includes('apple')) state.garden.apple = { m: 0, wet: WET, fruits: 0, fm: 0 };      // el manzano comprado vuelve a empezar como brote
  Store.save(); setMsg('¡Un huevo nuevo!'); render();
}

/* ============================== TIENDA ================================== */
/* ============================== LA CASA ================================= */
/** Efectos de usar los muebles y entradas/salidas automáticas (cama de noche). */
function roomTick(dt) {
  const s = state, r = s.room;
  if (s.stage === 'dead' || s.stage === 'egg' || s.pause) { r.use = null; r.tv = false; r.lamp = false; return; }
  if (s.sleeping) {
    r.tv = false; r.lamp = false;
    if (s.owned.includes('bed') && !s.sick && r.where !== 'bedroom') r.where = 'bedroom';       // a dormir: se va a la habitación
    else if (r.where === 'garden' || r.where === 'studio' || r.where === 'kitchen') r.where = 'salon';                                            // y sin cama, entra en casa
    if (s.owned.includes('bed') && !s.sick) { r.use = 'bed'; r.auto = true; s.energy = clamp(s.energy + CFG.rate.sleep * 0.2 * dt); }
    else if (r.use) r.use = null;
    return;
  }
  if (r.auto) { r.auto = false; if (r.use === 'bed') r.use = null; }              // se despierta: se levanta de la cama
  if (r.use && (s.sick || s.call || s.hunger <= 0)) { r.use = null; r.min = 0; if (!quiet) setMsg('Se ha levantado'); return; }
  if (r.lamp) s.happy = clamp(s.happy + 0.03 * dt);
  if ((r.use === 'tv' || r.use === 'fit') && !r.tv) r.use = null;
  if (!r.use) { r.min = 0; return; }
  r.min += dt;
  if (r.use === 'sit') { s.happy = clamp(s.happy + 0.08 * dt); s.energy = clamp(s.energy + 0.04 * dt); }
  else if (r.use === 'lie') { s.energy = clamp(s.energy + 0.22 * dt); s.happy = clamp(s.happy + 0.03 * dt); }
  else if (r.use === 'bed') { s.energy = clamp(s.energy + 0.4 * dt); }
  else if (r.use === 'fit') { s.energy = clamp(s.energy - 0.16 * (1 - L.studio.extraLv('sport') / 200) * dt); s.happy = clamp(s.happy + 0.12 * dt); s.hunger = clamp(s.hunger - 0.08 * dt); s.discipline = clamp(s.discipline + 0.02 * dt); L.studio.xp('sport', 0.03 * dt, quiet); }
  else if (r.use === 'tv') { s.happy = clamp(s.happy + 0.3 * dt); s.discipline = clamp(s.discipline - 0.01 * dt); }
  else if (r.use === 'sun') { s.energy = clamp(s.energy + 0.22 * dt); s.happy = clamp(s.happy + 0.05 * dt); }
  else if (r.use === 'pool') { s.happy = clamp(s.happy + 0.9 * dt); s.dirt = clamp(s.dirt - 1.0 * dt); s.energy = clamp(s.energy - 0.12 * dt); }
  const done = ((r.use === 'lie' || r.use === 'bed') && s.energy >= 100) || (r.use === 'sit' && r.min > 40) || (r.use === 'tv' && r.min > 45) || (r.use === 'fit' && (r.min > 20 || s.energy < 15)) || (r.use === 'sun' && r.min > 40) || (r.use === 'pool' && (r.min > 15 || s.energy < 12));
  if (done) {
    if (r.use === 'pool') { if (s.energy < 25 && !s.sick && !quiet) makeSick('🤧 Se ha resfriado en la piscina'); else if (!quiet) setMsg('🏊 Sale de la piscina, ¡refrescado!'); r.use = null; r.min = 0; return; }
    if (r.use === 'tv' || r.use === 'fit') r.tv = false;
    r.use = null; r.min = 0;
    if (!quiet) setMsg('Ya ha tenido bastante: se levanta');
  }
}

function setUse(u, text) {
  const r = state.room;
  r.use = u; r.min = 0; r.auto = false;
  if (u === 'sit' || u === 'lie') state.track.hug += 0.5;
  if (text) setMsg(text);
  Sound.play('click'); Store.save(); render(); closePanel();
}

function setRoom(w) {
  const r = state.room;
  if (r.where === w) return;
  r.where = w; r.use = null; r.min = 0; r.auto = false; r.lamp = w === 'bedroom' ? r.lamp : false;
  hugUntil = 0; ballUntil = 0; bug = null; nextBug = Date.now() + 5000 + Math.random() * 8000; closePanel();
  Sound.play('click'); Store.save(); render();
}

function openObject(id) {
  if (!canInteract()) return;
  if (id === 'bug') { catchBug(); return; }
  if (id.startsWith('k_')) { if (state.pause) { setMsg('Está de vacaciones'); return; } if (state.sleeping) { setMsg('Zzz… duerme'); return; } L.kitchen.open(id); return; }
  if (id.startsWith('st_')) { if (state.pause) { setMsg('Está de vacaciones'); return; } if (state.sleeping) { setMsg('Zzz… duerme'); return; } L.studio.open(id); return; }
  const s = state, r = s.room;
  const night = cycleOn() && L.world.phase() === 'night';
  const ask = (title, ...opts) => openPanel([p(title), row(...opts), btn('Cerrar', closePanel, 'ghost')]);
  if (s.pause) { setMsg('Está de vacaciones'); return; }
  if (id === 'teddy') {
    if (s.sleeping) { setMsg('Zzz… duerme'); return; }
    ask('🧸 Peluche', btn('Abrazar', () => {
      closePanel();
      if (Date.now() - (r.hug || 0) < 15 * 60000) { setMsg('Ya se ha abrazado hace poco 🧸'); return; }
      r.hug = Date.now(); s.track.hug++; hugUntil = Date.now() + 3500; s.happy = clamp(s.happy + 5);
      Sound.play('happy'); setMsg('🧸 ¡Qué abrazo! +felicidad'); Store.save(); render();
    }));
    return;
  }
  if (id === 'bed') {
    if (s.sleeping) { ask('🛏️ Está durmiendo', btn('Despertar', () => { closePanel(); toggleLight(); })); return; }
    if (r.use === 'bed') { ask('🛏️ Cama', btn('Levantarse', () => setUse(null, 'Se levanta de la cama'))); return; }
    const opts = [btn('Tumbarse', () => setUse('bed', '🛏️ Se tumba a descansar'))];
    if (night) opts.push(btn('Dormir', () => { closePanel(); toggleLight(); }));
    ask('🛏️ Cama', ...opts);
    return;
  }
  if (!awake()) return;
  if (id === 'lamp') {
    ask('💡 Lámpara', btn(r.lamp ? 'Apagar' : 'Encender', () => { r.lamp = !r.lamp; Sound.play(r.lamp ? 'lightOn' : 'lightOff'); setMsg(r.lamp ? '💡 Lámpara encendida: se siente a gusto' : '💡 Lámpara apagada'); Store.save(); render(); closePanel(); }));
    return;
  }
  if (id === 'plant') {
    ask('🪴 Planta', btn('Regar', () => {
      closePanel();
      if (Date.now() - (r.water || 0) < 30 * 60000) { setMsg('La planta ya está regada 🪴'); return; }
      r.water = Date.now(); s.happy = clamp(s.happy + 4);
      Sound.play('happy'); setMsg('🪴 Riega la planta: +felicidad'); Store.save(); render();
    }));
    return;
  }
  if (id === 'ball') {
    ask('⚽ Pelota', btn('Jugar con la pelota', () => {
      closePanel();
      if (Date.now() - (r.ball || 0) < 10 * 60000) { setMsg('Ya ha jugado hace poco ⚽'); return; }
      r.ball = Date.now(); ballUntil = Date.now() + 5000; s.happy = clamp(s.happy + 6); s.energy = clamp(s.energy - 3); L.studio.xp('sport', here() === 'garden' ? 1.2 : 0.8); s.track.play++;
      Sound.play('happy'); setMsg('⚽ ¡Qué divertido! +felicidad'); Store.save(); render();
    }));
    return;
  }
  if (id === 'lounger') {
    if (r.use === 'sun') { ask('🪑 Tumbona', btn('Levantarse', () => setUse(null, 'Se levanta de la tumbona'))); return; }
    if (night) { setMsg('🌙 Hace fresquito: mejor dentro'); return; }
    ask('🪑 Tumbona', btn('Tomar el sol', () => setUse('sun', '☀️ Toma el sol')));
    return;
  }
  if (id === 'pool') {
    if (r.use === 'pool') { ask('🏊 Piscina', btn('Salir', () => setUse(null, 'Sale de la piscina'))); return; }
    if (night) { setMsg('🌙 De noche el agua está helada'); return; }
    if (s.energy < 20) { setMsg('Está demasiado cansado para nadar'); return; }
    ask('🏊 Piscina', btn('Darse un chapuzón', () => { L.progress.stat('swims'); setUse('pool', '🏊 ¡Chapuzón!'); }));
    return;
  }
  if (id === 'plot') { openPlot(); return; }
  if (id === 'apple') { openApple(); return; }
  if (id === 'sofa') {
    const opts = [];
    if (r.use === 'sit' || r.use === 'lie') {
      opts.push(btn('Levantarse', () => setUse(null, 'Se levanta del sofá')));
      opts.push(r.use === 'sit' ? btn('Tumbarse', () => setUse('lie', '🛋️ Se tumba en el sofá')) : btn('Sentarse', () => setUse('sit', '🛋️ Se sienta')));
    } else opts.push(btn('Sentarse', () => setUse('sit', '🛋️ Se sienta')), btn('Tumbarse', () => setUse('lie', '🛋️ Se tumba en el sofá')));
    ask('🛋️ Sofá', ...opts);
    return;
  }
  if (id === 'tv') {
    const opts = [];
    if (!r.tv) opts.push(btn('Encender', () => { r.tv = true; Sound.play('lightOn'); setMsg('📺 Tele encendida'); Store.save(); render(); closePanel(); }));
    else {
      opts.push(r.use === 'tv' || r.use === 'fit' ? btn('Dejar de ver', () => setUse(null, 'Deja de ver la tele')) : btn('Ver la tele', () => setUse('tv', '📺 Ve la tele')));
      if (r.use !== 'fit') opts.push(btn('🏋️ Programa de ejercicio', () => { if (s.energy < 30) { closePanel(); setMsg('Está muy cansado para hacer ejercicio'); return; } setUse('fit', '🏋️ Hace ejercicio con la tele'); }));
      opts.push(btn('Apagar', () => { r.tv = false; if (r.use === 'tv') r.use = null; Sound.play('lightOff'); setMsg('📺 Tele apagada'); Store.save(); render(); closePanel(); }));
    }
    ask('📺 Tele', ...opts);
  }
}

/** ¿Qué objeto hay en el punto (x, y) de la pantalla lógica? */
function hitObject(x, y) {
  if (here() === 'studio') return L.studio.hit(x, y);
  if (here() === 'kitchen') return L.kitchen.hit(x, y);
  if (here() === 'garden') {
    const b = bugBox(); if (b && x >= b.x - 2 && x < b.x + b.w + 2 && y >= b.y - 2 && y < b.y + b.h + 2) return 'bug';
  }
  const o = { includes: has }, inside = (id, p) => { const z = itemSize(id); return x >= p.x && x < p.x + z.w && y >= p.y && y < p.y + z.h; };
  if (o.includes('plush') && inside('teddy', teddyPos())) return 'teddy';
  if (o.includes('ball') && inside('ball', { x: 2, y: 34 - itemSize('ball').h })) return 'ball';      // la pelota va por delante de la cama
  if (o.includes('tv') && inside('tv', ROOM.tv)) return 'tv';
  if (o.includes('sofa') && inside('sofa', ROOM.sofa)) return 'sofa';
  if (o.includes('bed') && inside('bed', ROOM.bed)) return 'bed';
  if (o.includes('lamp') && x >= LAMP.x && x < LAMP.x + itemSize('lamp').w * LAMP.k && y >= LAMP.y - itemSize('lamp').h * LAMP.k && y < LAMP.y) return 'lamp';
  if (o.includes('plant') && inside('plant', ROOM.plant)) return 'plant';
  if (o.includes('lounger') && x >= 33 && x < 44 && y >= 27 && y < 34) return 'lounger';
  if (o.includes('pool') && x >= 29 && x < 45 && y >= 18 && y < 28) return 'pool';
  if (o.includes('plot') && x >= 13 && x < 26 && y >= 20 && y < 29) return 'plot';
  if (o.includes('apple') && x >= 0 && x < 12 && y >= 10 && y < 25) return 'apple';
  return null;
}

function itemThumb(id) {
  const c = document.createElement('canvas'), it = L.ITEMS[id].lg, rows = it.rows[0];
  c.width = rows[0].length; c.height = rows.length; c.className = 'thumb';
  const k = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { k.fillStyle = it.pal[ch.charCodeAt(0) - 97]; k.fillRect(i, j, 1, 1); } }));
  return c;
}

let shopCat = null;
const SHOP_CATS = [
  ['food', '🍣 Comida gourmet'], ['bg', '🖼️ Fondos'], ['furn', '🛋️ Muebles y juguetes'],
  ['garden', '🌳 Jardín y semillas'], ['kitchen', '🍳 Cocina'], ['studio', '🎨 Estudio (talentos)'], ['gifts', '🎁 Flores para regalar']
];
function shopOwnBtn(i, where) {
  const own = state.owned.includes(i.id);
  return btn(own ? `${i.icon} ${i.name} ✓ ${where}` : `${i.icon} ${i.name} · ${i.cost}🪙 — ${i.desc}`, () => { if (!own) buy(i); }, own ? 'ghost' : '', own ? false : state.lp < i.cost);
}
function shopNodes(cat) {
  const s = state, nodes = [];
  if (cat === 'food') {
    nodes.push(p('Sin nevera mejorada, la comida gourmet se estropea en 1 día'));
    FOODS.filter(f => f.gourmet).forEach(f =>
      nodes.push(btn(`${f.icon} ${f.name} · ${f.cost}🪙 (tienes ${s.inv[f.id] || 0})`, () => buy(f), '', s.lp < f.cost)));
  } else if (cat === 'bg') {
    SHOP_EXTRAS.filter(i => i.type === 'bg').forEach(i => {
      if (s.owned.includes(i.id)) nodes.push(btn(`${i.icon} ${i.name} · ${s.bg === i.key ? 'quitar' : 'usar'}`, () => { s.bg = s.bg === i.key ? 'none' : i.key; Store.save(); render(); openShop(cat); }));
      else nodes.push(btn(`${i.icon} ${i.name} · ${i.cost}🪙`, () => buy(i), '', s.lp < i.cost));
    });
  } else if (cat === 'furn') {
    SHOP_EXTRAS.filter(i => i.img).forEach(i => {
      const own = s.owned.includes(i.id);
      const b = btn(own ? `${i.name} ✓ en casa` : `${i.name} · ${i.cost}🪙`, () => { if (!own) buy(i); }, own ? 'ghost' : '', own ? false : s.lp < i.cost);
      const wrap = document.createElement('div'); wrap.className = 'shopitem';
      const info = document.createElement('div'); info.className = 'shopdesc'; info.textContent = i.desc || '';
      const right = document.createElement('div'); right.className = 'shopcol'; right.append(b, info);
      wrap.append(itemThumb(i.img), right);
      nodes.push(wrap);
    });
  } else if (cat === 'garden') {
    GARDEN_ITEMS.forEach(i => nodes.push(shopOwnBtn(i, 'en el jardín')));
    if (s.owned.includes('plot')) Object.keys(CROPS).filter(cropOpen).forEach(k =>
      nodes.push(btn(`${CROPS[k].icon} Semillas de ${CROPS[k].name} · ${SEED_COST}🪙 (tienes ${s.inv['seed_' + k] || 0})`, () => buySeed(k), '', s.lp < SEED_COST)));
  } else if (cat === 'kitchen') {
    L.kitchen.ITEMS.forEach(i => nodes.push(shopOwnBtn(i, 'en la cocina')));
  } else if (cat === 'studio') {
    L.studio.ITEMS.forEach(i => nodes.push(shopOwnBtn(i, 'en el estudio')));
  } else if (cat === 'gifts') {
    nodes.push(p('Se regalan por enlace desde ☰ Menú → Visitas → 🎁. Alegran mucho a tu amigo.'));
    Object.entries(L.visit.FLOWERS).forEach(([id, f]) =>
      nodes.push(btn(`${f.icon} ${f.name} · ${f.cost}🪙 (tienes ${s.inv[id] || 0})`, () => buy({ id, name: f.name, cost: f.cost, inv: true }), '', s.lp < f.cost)));
  }
  return nodes;
}
/** Tienda: primero eliges sección; al comprar te quedas en ella (con el mismo desplazamiento). */
function openShop(cat) {
  if (state.stage === 'dead') { setMsg('Limagochi ya no está…'); return; }
  const s = state, keep = (cat && cat === shopCat && !panel.hidden) ? panel.scrollTop : 0;
  shopCat = cat || null;
  if (!cat) {
    openPanel([
      p(`🪙 ${s.lp} Lima Points`), p('¿Qué quieres comprar?'),
      ...SHOP_CATS.map(([k, name]) => btn(name, () => openShop(k))),
      p('Gana 🪙 en los minijuegos y aprendiendo trucos'),
      btn('Cerrar', closePanel, 'ghost')
    ], { full: true });
    return;
  }
  const name = SHOP_CATS.find(c => c[0] === cat)[1];
  openPanel([
    p(`${name} · 🪙 ${s.lp}`), ...shopNodes(cat),
    row(btn('← Secciones', () => openShop()), btn('Cerrar', closePanel, 'ghost'))
  ], { full: true });
  panel.scrollTop = keep;
}

function buy(item) {
  const s = state;
  if (s.lp < item.cost) { setMsg('Te faltan Lima Points'); return; }
  s.lp -= item.cost;
  if (item.gourmet || item.inv) s.inv[item.id] = (s.inv[item.id] || 0) + 1;
  else { s.owned.push(item.id); if (item.type === 'bg') s.bg = item.key; if (item.id === 'apple') s.garden.apple = { m: 0, wet: WET, fruits: 0, fm: 0 }; }
  Sound.play('coin'); setMsg(`Comprado: ${item.name}`); L.first && L.first.did('buy');
  Store.save(); render(); openShop(shopCat);
}

function buySeed(k) {
  const s = state;
  if (s.lp < SEED_COST) { setMsg('Te faltan Lima Points'); return; }
  s.lp -= SEED_COST; s.inv['seed_' + k] = (s.inv['seed_' + k] || 0) + 1;
  Sound.play('coin'); setMsg(`Semilla de ${CROPS[k].name}`); L.first && L.first.did('buy'); Store.save(); render(); openShop(shopCat);
}

/* ============================== MINIJUEGOS ============================== */
function canPlay() {
  if (!canInteract() || !awake()) return false;
  if (state.sick) { setMsg('Está enfermo: no puede jugar'); return false; }
  if (state.energy < 15) { setMsg('Está demasiado cansado para jugar'); return false; }
  return true;
}

function startPlay() {
  if (!canPlay()) return;
  openPanel([
    p('¿A qué jugamos?'),
    btn('🎯 Adivina', startGuess),
    btn('🐦 Lima Vuela', () => launch('flappy')),
    btn('⚽ Penaltis', () => launch('penalty')),
    btn('☄️ Esquiva', () => launch('dodge')),
    btn('🧠 Eco Lima', () => launch('memory')),
    btn('🎣 Pesca', () => launch('fishing')),
    btn('✊ Piedra, papel o tijera', () => launch('rps')),
    btn('🏃 Carrera', () => launch('race')),
    btn('🎰 Casino', () => L.casino.open(startPlay)),
    btn('Cancelar', closePanel, 'ghost')
  ], { full: true });
}
function launch(kind) { closePanel(); if (canPlay()) L.mini.start(kind); }

function reward({ happy = 0, energy = 0, hunger = 0, weight = 0, lp = 0, game, win = false, score = 0 } = {}, msg = '') {
  const s = state;
  const ev = L.world.event();
  if (lp > 0 && ev) lp *= 2;                                             // en temporada los premios se duplican
  s.track.play++;
  s.happy = clamp(s.happy + happy); s.energy = clamp(s.energy + energy); s.hunger = clamp(s.hunger + hunger);
  s.weight = Math.max(minW(), s.weight + weight); s.lp += lp;
  fx('happy', 1800);
  Sound.play(lp > 0 ? 'win' : 'sad');
  setMsg(`${msg}${lp ? ` +${lp} 🪙${ev ? ' ×2' : ''}` : ''}`, 3500);
  if (game) { L.progress.game(game, win, score, lp); L.first && L.first.did('play'); }
  Store.save(); render();
}

/* ---- Adivina: 5 rondas, ¿hacia dónde mirará? (juego de menú) ---- */
const guess = { active: false, round: 0, wins: 0, look: 0, locked: false, text: '' };

function startGuess() {
  Object.assign(guess, { active: true, round: 0, wins: 0, look: 0, locked: false, text: '¿Hacia dónde mirará?' });
  renderGuess();
}
function renderGuess() {
  // panel compacto (una línea + 3 botones) para que la mascota se vea encima
  openPanel([
    p(`Ronda ${Math.min(guess.round + 1, 5)}/5 · ✔ ${guess.wins} · ${guess.text}`),
    row(btn('◀ Izq.', () => pick(-1), '', guess.locked), btn('✕', closePanel, 'ghost'), btn('Der. ▶', () => pick(1), '', guess.locked))
  ]);
  guess.active = true;
}
function pick(dir) {
  if (guess.locked) return;
  guess.locked = true;
  guess.look = Math.random() < 0.5 ? -1 : 1;
  const win = dir === guess.look;
  if (win) { guess.wins++; Sound.play('coin'); } else Sound.play('refuse');
  guess.round++;
  guess.text = win ? '¡Acertaste! ✔' : '¡Fallaste! ✘';
  renderGuess(); render();
  setTimeout(() => {
    if (!guess.active) return;
    guess.look = 0; guess.locked = false;
    if (guess.round >= 5) {
      const w = guess.wins; guess.active = false; closePanel();
      reward({ happy: w >= 3 ? 35 : 12, energy: -12, hunger: -8, weight: -0.5, lp: w >= 3 ? 4 : 1, game: 'guess', win: w >= 3, score: w },
             w >= 3 ? `¡Ganaste ${w}/5!` : `Perdiste (${w}/5)`);
    } else { guess.text = '¿Hacia dónde mirará?'; renderGuess(); render(); }
  }, 900);
}

/* ============================== RENDER ================================== */
const C = { ink: '#1d2a12', dark: '#3f5a28', mid: '#7d9f45', light: '#b8d474', bg: '#d4e5a4', poop: '#6b4a1f' };
const SICK = { l: 'N', g: 'm', G: 'M', f: 'N', q: 'm', Q: 'M' };
const tint = c => c;                                   // (antes pasaba los colores al modo LCD; ya no existe, se deja como identidad)
const colorOf = (ch, sick) => { if (sick && SICK[ch]) ch = SICK[ch]; return PAL[ch]; };

function drawSprite(rows, x, y, o = {}) {
  const sc = o.scale || 1;
  for (let j = 0; j < 24; j++) {
    const r = rows[j];
    for (let i = 0; i < 24; i++) {
      const c = r[i];
      if (c === '.') continue;
      g.fillStyle = o.solid || colorOf(c, o.sick);
      g.fillRect(x + (o.flip ? 23 - i : i) * sc, y + j * sc, sc, sc);
    }
  }
}

const topRow = rows => { const i = rows.findIndex(r => /[^.]/.test(r)); return i < 0 ? 0 : i; };

function petRows(face) {
  const id = spriteId() || 'baby';
  const set = SPR[id] || SPR.baby;
  return set[face] || set.idle;
}

let current = null;                       // efecto visual activo
function fx(type, dur = 1500, data = null) { current = { type, start: Date.now(), dur, data }; render(); }

const R1 = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

function drawWallpaper(over) {                          // over: dibujado encima del fondo ilustrado (trazo blanco suave)
  const lt = over ? 'rgba(255,255,255,.4)' : C.light, md = over ? 'rgba(255,255,255,.55)' : C.mid;
  switch (state.bg) {
    case 'dots':   for (let y = 2; y < 31; y += 5) for (let x = (y / 5 | 0) % 2 ? 2 : 0; x < W; x += 5) R1(x, y, 1, 1, lt); break;
    case 'clouds': [[4, 5], [28, 9], [18, 15]].forEach(([x, y]) => { R1(x, y + 2, 10, 3, lt); R1(x + 2, y, 6, 2, lt); }); break;
    case 'stars':  [[5, 4], [14, 10], [26, 5], [38, 12], [9, 19], [33, 22], [42, 4]].forEach(([x, y]) => { R1(x, y - 1, 1, 3, md); R1(x - 1, y, 3, 1, md); }); break;
    case 'bricks': for (let y = 0; y < 33; y += 6) { R1(0, y, W, 1, lt); for (let x = (y / 6 | 0) % 2 ? 4 : 0; x < W; x += 8) R1(x, y, 1, 6, lt); } break;
  }
}

function drawPoop(x, y, frame) {
  R1(x + 3, y, 1, 1, C.poop); R1(x + 2, y + 1, 3, 1, C.poop); R1(x + 1, y + 2, 5, 1, C.poop); R1(x, y + 3, 7, 1, C.poop);
  R1(x + 1, y - 3 - frame, 1, 2, C.dark); R1(x + 5, y - 2 + frame, 1, 2, C.dark);
}
function drawZ(x, y, big) {
  const n = big ? 5 : 3;
  R1(x, y, n, 1, C.ink); R1(x, y + n - 1, n, 1, C.ink);
  for (let i = 1; i < n - 1; i++) R1(x + n - 1 - i, y + i, 1, 1, C.ink);
}

/* ---- iconos de comida (7x7) para la animación de comer ---- */
const ICON_COL = { k: '#1d2a12', g: '#3f7a35', G: '#7ed957', n: '#6b4a1f', R: '#a8362b', o: '#d27a3c', w: '#f7fbe6', p: '#ff8fb1', P: '#d95f86', y: '#ffd84d' };
const FOOD_ICON = {
  veg:    ['..gGg..', '.gGGGg.', 'gGgGgGg', 'kkkkkkk', '.kwwwk.', '..kkk..', '.......'],
  meat:   ['..nnn..', '.noooR.', '.noooR.', '..nRn..', '...w...', '..www..', '...w...'],
  candy:  ['.......', 'p.ppp.p', 'pppPppp', '.pPPPp.', 'pppPppp', 'p.ppp.p', '.......'],
  gourmet:['..yyy..', '.yyyyy.', 'yyyyyyy', 'kkkkkkk', 'wwwwwww', '.kkkkk.', '.......']
};
function drawIcon(rows, x, y, cols = 7) {
  rows.forEach((r, j) => { for (let i = 0; i < Math.min(cols, r.length); i++) if (r[i] !== '.') R1(x + i, y + j, 1, 1, tint(ICON_COL[r[i]])); });
}
const HEART = ['.pp.pp.', 'ppppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'];
function drawHeart(x, y) { HEART.forEach((r, j) => [...r].forEach((c, i) => c !== '.' && R1(x + i, y + j, 1, 1, tint('#ff6fa8')))); }

/** Barra de gordura sobre el Limagochi al comer: izquierda delgado · centro equilibrado · derecha obeso. */
function drawFatBar(x, y, rows) {
  const bx = x, by = Math.max(5, y + topRow(rows) - 9), pos = fatPos();
  R1(bx - 2, by - 3, 28, 10, C.ink); R1(bx - 1, by - 2, 26, 8, C.bg);          // recuadro con fondo propio (no se confunde con la sala)
  R1(bx, by, 24, 4, C.ink);                                                     // marco de la barra
  R1(bx + 1, by + 1, 22, 2, C.light);                                           // zona delgado-equilibrado
  for (let i = 12; i < 23; i += 2) R1(bx + i, by + 1, 1, 2, C.dark);            // zona de riesgo rayada (mitad derecha)
  if (pos >= 1) R1(bx + 12, by + 1, 11, 2, C.dark);                             // obeso: toda la zona de riesgo se oscurece
  R1(bx + 11, by - 2, 2, 2, C.ink); R1(bx + 11, by + 4, 2, 2, C.ink);           // marca del centro (equilibrado)
  const px = bx + 1 + Math.round(pos * 19);
  R1(px, by - 1, 2, 6, C.ink);                                                  // marcador
}

/** La comida vuela hacia la boca, se mastica a bocados y sale un corazón. p = progreso 0..1 */
function drawEating(f, now, p, x, y, rows) {
  const food = f.data && f.data.food; if (!food) return;
  const ic = FOOD_ICON[food.gourmet ? 'gourmet' : food.diet] || FOOD_ICON.veg;
  const top = topRow(rows), mx = x + 12, my = y + top + Math.round((22 - top) * 0.55);
  if (p < 0.3) {
    const q = p / 0.3;
    drawIcon(ic, Math.round(mx + 22 * (1 - q) - 3), Math.round(my - 3 - Math.sin(q * Math.PI) * 8 * (1 - q * 0.3)));
  } else if (p < 0.88) {
    const bite = (p - 0.3) / 0.58;
    drawIcon(ic, mx - 3, my - 1, Math.max(1, Math.ceil(7 * (1 - bite))));
    for (let i = 0; i < 3; i++) {                                          // migas
      const ph = ((now / 400) + i * 0.33) % 1;
      R1(mx - 4 + i * 4 + Math.round(Math.sin(now / 150 + i) * 1), my + 3 + Math.round(ph * 8), 1, 1, C.dark);
    }
  } else drawHeart(mx + 6, y + top - 4 - Math.round((p - 0.88) * 30));
}

/** Pijama: manta a rayas sobre la mitad inferior del cuerpo. */
function drawBlanket(x, y, rows) {
  const top = topRow(rows), h = 22 - top, by = y + top + Math.round(h * 0.55), bh = Math.ceil(h * 0.45) + 1;
  R1(x + 3, by, 18, bh, C.ink);
  for (let i = 0; i < 16; i++) for (let j = 0; j < bh - 1; j++) R1(x + 4 + i, by + 1 + j, 1, 1, tint((i >> 2) % 2 ? '#f7fbe6' : '#6ec6ff'));
}
/** Zzz que suben flotando y crecen. */
function drawZzz(now, x, y) {
  for (let i = 0; i < 3; i++) {
    const ph = ((now / 1500) + i / 3) % 1;
    drawZ(Math.round(x + 22 + ph * 6 + Math.sin(now / 400 + i) * 1), Math.round(y + 4 - ph * 16), ph > 0.5);
  }
}
/** Enfermo: termómetro, gota de sudor y estornudo ocasional. */
function drawSickness(now, x, y, rows) {
  const top = topRow(rows);
  R1(x + 19, y + top - 1, 3, 8, C.ink); R1(x + 20, y + top, 1, 5, tint('#f7fbe6')); R1(x + 20, y + top + 3, 1, 2, tint('#e0523f'));
  R1(x + 19, y + top + 7, 3, 3, C.ink); R1(x + 20, y + top + 8, 1, 1, tint('#e0523f'));
  R1(x + 3, y + top + 2 + Math.floor((now / 220) % 7), 1, 2, tint('#6ec6ff'));          // sudor
  const sn = (now / 1000) % 8;
  if (sn > 6.4) {                                                                       // ¡achís!
    const q = (sn - 6.4) / 1.6;
    for (let i = 0; i < 3; i++) R1(x + 24 + Math.round(q * 6) + i * 2, y + top + 8 + (i - 1) * 2 - Math.round(q * 2), 2, 1, C.dark);
  }
}

/** Manchas y moscas según la suciedad (posiciones fijas por mascota). */
const dirtCache = {};
function drawDirt(now, x, y, rows) {
  const top = topRow(rows), key = spriteId() + top;
  if (!dirtCache[key]) {                                              // píxeles del cuerpo, elegidos con una semilla estable
    let seed = (state.born % 9973) + 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const cells = [];
    rows.forEach((r, j) => { if (j > top + 1 && j < 22) [...r].forEach((c, i) => { if (c !== '.' && c !== 'K' && i > 3 && i < 20) cells.push([i, j]); }); });
    dirtCache[key] = Array.from({ length: 9 }, () => cells[Math.floor(rnd() * cells.length)] || [12, 14]);
  }
  const n = Math.min(9, Math.floor((state.dirt - 20) / 9));
  for (let i = 0; i < n; i++) { const [px, py] = dirtCache[key][i]; R1(x + px, y + py, 2, 1, tint('#6b4a1f')); R1(x + px + 1, y + py + 1, 1, 1, tint('#6b4a1f')); }
  if (state.dirt >= 60) for (let i = 0; i < 2; i++) {                 // moscas
    const a = now / (160 + i * 70) + i * 3;
    R1(Math.round(x + 12 + Math.cos(a) * 13), Math.round(y + top - 1 + Math.sin(a * 1.3) * 5), 1, 1, C.ink);
  }
  if (state.dirt >= 80) for (let i = 0; i < 2; i++) {                 // olor
    const q = (now / 700 + i * 0.5) % 1;
    R1(x + 5 + i * 14 + Math.round(Math.sin(now / 200 + i) * 1), y + top - Math.round(q * 6), 1, 3, C.dark);
  }
}

/** Playa de vacaciones: arena, sombrilla y olas. */
function drawBeach(now) {
  R1(0, 30, W, 6, tint('#ecd49a'));
  for (let x = 0; x < W; x += 6) R1((x + Math.floor(now / 500)) % W, 33, 3, 1, tint('#6ec6ff'));
  const rowsC = [[8, 25, 31], [9, 23, 33], [10, 21, 35]];                                // sombrilla centrada en x=28
  rowsC.forEach(([yy, a, b]) => { for (let xx = a; xx <= b; xx++) R1(xx, yy, 1, 1, tint(((xx - a) >> 1) % 2 ? '#f7fbe6' : '#e0523f')); });
  R1(28, 11, 1, 19, tint('#6b4a1f'));
}

/** Animación de evolución: parpadeo cada vez más rápido (viejo ↔ silueta nueva), destello y reaparición. */
function drawEvo(now) {
  const p = (now - evo.start) / evo.dur;
  const oldS = SPR[evo.from] || SPR.baby, newS = SPR[evo.to] || SPR.baby;
  const oldRows = oldS[evo.from === 'egg' ? 'crack' : 'idle'] || oldS.idle, newRows = newS.happy || newS.idle;
  const sparkle = (rad, n, col) => {
    for (let i = 0; i < n; i++) {
      const a = now / 350 + i * Math.PI * 2 / n;
      R1(Math.round(24 + Math.cos(a) * rad * 1.5), Math.round(21 + Math.sin(a) * rad), 2, 2, col);
    }
  };
  if (p < 0.7) {
    const period = 380 - 320 * (p / 0.7);
    const showNew = Math.floor((now - evo.start) / period) % 2 === 1;
    const jx = Math.round(Math.sin(now / 40) * (p * 2));
    drawSprite(showNew ? newRows : oldRows, 12 + jx, 11, showNew ? { solid: C.ink } : {});
    sparkle(6 + p * 12, 6, tint('#ffd84d'));
  } else if (p < 0.85) {
    const q = (p - 0.7) / 0.15;
    g.fillStyle = Math.floor(now / 60) % 2 ? C.bg : C.light; g.fillRect(0, 0, W, 33);
    const r = Math.round(q * 30);
    R1(24 - r, 20, r * 2, 2, tint('#ffd84d')); R1(23, 21 - Math.round(r / 2), 2, r, tint('#ffd84d'));
  } else {
    const q = (p - 0.85) / 0.15;
    drawSprite(newRows, 12, 11 - Math.round(Math.abs(Math.sin(q * Math.PI * 2)) * 4 * (1 - q)));
    sparkle(8 + q * 12, 8, tint('#ffd84d'));
  }
}
function drawTomb() {
  R1(18, 15, 12, 18, C.ink); R1(19, 14, 10, 1, C.ink); R1(19, 16, 10, 17, C.light);
  R1(23, 19, 2, 8, C.ink); R1(21, 21, 6, 2, C.ink);
}
function drawNote(x, y) { R1(x + 2, y, 1, 4, C.ink); R1(x, y + 3, 2, 2, C.ink); R1(x + 2, y, 2, 1, C.ink); }

let hugUntil = 0, ballUntil = 0, moving = false;
const pos = { x: 12, y: 11, ok: false };
function drawPet(now, frame, f) {
  const s = state;
  if (s.stage === 'dead') { drawTomb(); return; }
  if (evo) { if (now > evo.start + evo.dur) evo = null; else { drawEvo(now); return; } }
  const id = spriteId(), set = SPR[id];
  const avg = (s.hunger + s.happy) / 2;
  const p = f ? Math.min(1, (now - f.start) / f.dur) : 0;
  const t = f ? f.type : '';

  if (s.stage === 'egg') {
    const wob = s.stageMin > CFG.stageMin.egg * 0.5 ? (frame ? 1 : -1) : 0;
    drawSprite(set[s.stageMin > CFG.stageMin.egg * 0.8 ? 'crack' : 'idle'], 12 + wob, 11);
    return;
  }

  let face = 'idle';
  if (s.sleeping) face = 'sleep';
  else if (t === 'eat') face = p < 0.3 ? 'eat' : p < 0.88 ? (Math.floor(now / 160) % 2 ? 'eat' : 'idle') : 'happy';
  else if ((s.room.use === 'lie' || s.room.use === 'bed') && !t.startsWith('t_')) face = 'sleep';
  else if ((s.room.use === 'sun' || s.room.use === 'pool') && !t) face = 'happy';
  else if (t === 'refuse' || t === 'confused') face = 'sad';
  else if (t === 't_dead') face = 'sleep';
  else if (t === 't_zen') face = 'sleep';
  else if (t === 't_yawn') face = 'eat';
  else if (t === 'happy' || t.startsWith('t_') || t === 'heal' || s.pause) face = 'happy';
  else if (s.sick || avg < 30) face = 'sad';
  else if (avg > 78) face = 'happy';
  const rows = set[face] || set.idle;
  if (s.pause && s.stage !== 'dead' && bgOk('playa')) { drawBeachPet(now, rows); return; }      // vacaciones: tumbado en la tumbona con gafas

  let flip = false, rot = false, inv = false;
  const u = s.room.use;
  let bx = 12, by = 11, slot = null;
  if (guess.active) by = 1;                                                   // arriba, para que el panel de Adivina no lo tape
  else if (here() === 'kitchen' && L.kitchen.cooking()) { const sp = L.kitchen.petPos(); bx = sp.x; by = sp.y; }
  else if (here() === 'studio' && L.studio.working()) { const sp = L.studio.petPos(); bx = sp.x; by = sp.y; }
  else if (u === 'sit') { bx = ROOM.sofa.x - 3; by = ROOM.sofa.y - 13; slot = 'sofa'; }
  else if (u === 'lie') { bx = ROOM.sofa.x - 1; by = ROOM.sofa.y - 8; slot = 'sofa'; }
  else if (u === 'bed' || (s.sleeping && has('bed') && !s.sick)) { bx = ROOM.bed.x + 10 - 12; by = ROOM.bed.y + 3 - topRow(rows); slot = 'bed'; }
  else if (u === 'tv' || u === 'fit') { bx = 20; by = 11 - (u === 'fit' ? Math.floor(now / 250) % 2 * 2 : 0); }
  else if (u === 'sun') { bx = 31; by = 19; slot = 'sun'; }
  else if (u === 'pool') { bx = 30; by = 12 - frame; slot = 'pool'; }
  else if (now < hugUntil) { const t = teddyPos(); bx = Math.max(0, t.x - 15); by = 11; }
  else if (now < ballUntil) { bx = 14 + Math.round(Math.sin(now / 260) * 3); by = 11 - (Math.floor(now / 130) % 2); }
  else if (!s.sleeping && !f) { bx += Math.round(Math.sin(now / 1800) * (s.sick ? 2 : 8)); by -= frame; }   // pasea
  if (!pos.ok) { pos.x = bx; pos.y = by; pos.ok = true; }
  const ddx = bx - pos.x, ddy = by - pos.y;
  pos.x += Math.max(-2, Math.min(2, ddx)); pos.y += Math.max(-2, Math.min(2, ddy));
  moving = Math.abs(ddx) > 0.5 || Math.abs(ddy) > 0.5;
  const arrived = slot && Math.abs(ddx) < 1.5 && Math.abs(ddy) < 1.5;
  let x = Math.round(pos.x), y = Math.round(pos.y);
  if (s.sick && !s.sleeping && !f && !u && !guess.active && !s.pause) x += Math.floor(now / 90) % 2;   // enfermo: tiembla
  if (s.sleeping) y += Math.floor(now / 900) % 2;                           // respira
  if (t === 'happy') y -= (Math.floor(now / 150) % 2) * 3;
  if (t === 'refuse') x += frame ? 2 : -2;
  if (t === 't_jump') y -= Math.round(Math.abs(Math.sin(p * Math.PI * 3)) * 9);
  if (t === 't_spin') { flip = Math.floor(now / 110) % 2 === 1; y -= Math.round(Math.abs(Math.sin(p * Math.PI * 2)) * 3); }
  if (t === 't_dance') { x += Math.round(Math.sin(now / 130) * 5); y -= (Math.floor(now / 130) % 2) * 2; flip = Math.floor(now / 260) % 2 === 1; }
  if (t === 't_dead') rot = p > 0.12 && p < 0.88;
  if (t === 't_kiss') x -= 2;
  if (t === 't_zen') y -= 3 + Math.round(Math.sin(now / 380) * 1);
  if (t === 't_yawn') y += Math.floor(now / 300) % 2;
  if (t === 't_pino') { inv = true; x += Math.round(Math.sin(now / 140) * 1); y -= Math.round(Math.abs(Math.sin(p * Math.PI * 3)) * 2); }
  if (t === 'confused') x += Math.round(Math.sin(now / 90) * 1);

  if (inv) {                                                                // pino: boca abajo
    g.save(); g.translate(x + 12, y + topRow(rows) + 11); g.scale(1, -1);
    drawSprite(rows, -12, -12, { sick: s.sick });
    g.restore();
  } else if (rot) {
    g.save(); g.translate(x + 1, y + 11); g.rotate(Math.PI / 2);
    drawSprite(rows, -12, -22, { sick: s.sick });
    g.restore();
  } else {
    const small = u === 'sun' || u === 'pool';                               // en la tumbona y la piscina se ve más pequeña
    drawSprite(rows, x, y, { flip, sick: s.sick, scale: small ? 0.6 : 1 });
    if (!small) {
      const ev = L.world.event(), hatId = ev ? ev.id : s.hat;
      if (hatId) L.world.hat(g, hatId, x, y + topRow(rows) + 1);
      if (s.dirt >= 30 && !s.pause) drawDirt(now, x, y, rows);
    }
    if (u === 'pool') gPoolFront(now);
  }

  if (s.sleeping && !rot) { if (!(arrived && slot === 'bed')) drawBlanket(x, y, rows); drawZzz(now, x, y); }
  else if ((u === 'lie' || u === 'bed') && !rot) drawZzz(now, x, y);
  if (arrived && slot === 'sofa') drawItem('sofa', ROOM.sofa.x, ROOM.sofa.y, 0, u === 'lie' ? 4 : 7);     // el sofá tapa sus piernas
  if (arrived && slot === 'bed') drawItem('bed', ROOM.bed.x, ROOM.bed.y, 0, 8);                          // y la manta, el cuerpo
  if ((u === 'tv' || u === 'fit') && s.room.tv && Math.floor(now / 700) % 2) R1(31, 8, 1, 1, tint('#f7fbe6'));
  if (now < hugUntil) { const t = teddyPos(); for (let i = 0; i < 2; i++) { const q = ((now / 600) + i * 0.5) % 1; drawHeart(t.x + 2 + i * 4, Math.round(t.y - 2 - q * 8)); } }
  if (s.sick && !s.sleeping && !rot) drawSickness(now, x, y, rows);
  if (t === 'eat') { drawEating(f, now, p, x, y, rows); drawFatBar(x, y, rows); }
  if (t === 'heal' && frame) { R1(x + 21, y + 2, 1, 5, C.ink); R1(x + 19, y + 4, 5, 1, C.ink); }
  if (t === 'confused') { R1(x + 20, y, 3, 1, C.ink); R1(x + 22, y + 1, 1, 2, C.ink); R1(x + 21, y + 3, 1, 1, C.ink); R1(x + 21, y + 5, 1, 1, C.ink); }
  if (t === 't_wave') {
    const up = Math.floor(now / 160) % 2;
    R1(x + 21, y + (up ? 7 : 12), 3, 3, C.ink); R1(x + 22, y + (up ? 8 : 13), 1, 1, C.light);
  }
  if (t === 't_clap') {
    const k = Math.abs(Math.sin(now / 110)), hy = y + topRow(rows) + Math.round((22 - topRow(rows)) * 0.5);
    const lx = x + 4 + Math.round(k * 7), rx = x + 19 - Math.round(k * 7);
    R1(lx, hy, 3, 3, C.ink); R1(lx + 1, hy + 1, 1, 1, C.light); R1(rx, hy, 3, 3, C.ink); R1(rx + 1, hy + 1, 1, 1, C.light);
    if (k < 0.15) { R1(x + 11, hy - 3, 1, 2, C.ink); R1(x + 8, hy - 2, 1, 1, C.ink); R1(x + 14, hy - 2, 1, 1, C.ink); }
  }
  if (t === 't_kiss') for (let i = 0; i < 2; i++) { const q = ((now / 700) + i * 0.5) % 1; drawHeart(Math.round(x + 22 + q * 12), Math.round(y + topRow(rows) + 3 - q * 8)); }
  if (t === 't_zen') for (let i = 0; i < 3; i++) { const a = now / 500 + i * 2.1; R1(Math.round(x + 12 + Math.cos(a) * 14), Math.round(y + 12 + Math.sin(a) * 6), 2, 2, tint('#ffd84d')); }
  if (t === 't_yawn') { const q = (now / 600) % 1; R1(x + 13, y + topRow(rows) + 6, 1, 1, C.dark); drawZ(Math.round(x + 22 + q * 3), Math.round(y + 4 - q * 6), false); }
  if (t === 't_sing') {
    drawNote(x + 24 + Math.round(Math.sin(now / 200) * 2), Math.round(y + 8 - p * 12));
    drawNote(x - 5 + Math.round(Math.cos(now / 220) * 2), Math.round(y + 12 - ((p * 12 + 5) % 12)));
  }
}

function drawGuessArrow() {
  if (!guess.look) return;
  const x = guess.look < 0 ? 3 : 41, d = guess.look;
  R1(x + 2, 17, 3, 5, C.ink);
  for (let i = 0; i < 3; i++) R1(d < 0 ? x - i + 1 : x + 5 + i, 17 + 2 - i, 1, 1 + i * 2, C.ink);
}

/** Dibuja un objeto de la casa (variant 0/1 = tele apagada/encendida). fromRow: solo las filas desde ahí (para «meter» a la mascota). */
function drawItem(id, x, y, variant = 0, fromRow = 0) {
  const it = L.ITEMS[id].hd, rows = it.rows[variant] || it.rows[0];
  for (let j = fromRow * 2; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const c = rows[j][i];
    if (c === '.') continue;
    g.fillStyle = tint(it.pal[c.charCodeAt(0) - 97]);
    g.fillRect(x + i / 2, y + j / 2, 0.5, 0.5);
  }
}
/** La tele: apagada es estática; encendida, la imagen «tiembla» (filas de píxeles que se desplazan) y una franja de luz la recorre. */
function drawTv(x, y, on, now) {
  const it = L.ITEMS.tv.hd, rows = it.rows[on ? 1 : 0], n = rows.length, w = rows[0].length;
  const s0 = Math.round(n * 0.08), s1 = Math.round(n * 0.86), tk = Math.floor(now / 130), roll = s0 + (tk % (s1 - s0));
  for (let j = 0; j < n; j++) {
    const inScr = on && j >= s0 && j < s1;
    const dx = inScr && ((tk * 7 + j * 13) % 9 === 0) ? ((tk + j) % 2 ? 1 : -1) : 0;
    for (let i = 0; i < w; i++) {
      const c = rows[j][i]; if (c === '.') continue;
      let di = i;
      if (dx && i >= 2 && i < w - 2) { di = i + dx; if (di < 2 || di >= w - 2) continue; }
      g.fillStyle = it.pal[c.charCodeAt(0) - 97];
      g.fillRect(x + di / 2, y + j / 2, 0.5, 0.5);
      if (inScr && j === roll && i >= 2 && i < w - 2) { g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x + di / 2, y + j / 2, 0.5, 0.5); }
    }
  }
}
function drawHouse(now) {
  const s = state, o = { includes: has };
  if (here() === 'garden') drawGarden(now);
  if (here() === 'studio') { L.studio.drawItems(now); return; }
  if (here() === 'kitchen') { L.kitchen.drawItems(now); return; }
  if (o.includes('rug')) drawItem('rug', ROOM.rug.x, ROOM.rug.y);
  if (o.includes('picture')) drawItem('picture', ROOM.picture.x, ROOM.picture.y);
  if (o.includes('lamp')) { const lh = itemSize('lamp').h; g.save(); g.translate(LAMP.x, LAMP.y - lh * LAMP.k); g.scale(LAMP.k, LAMP.k); drawItem('lamp', 0, 0, s.room.lamp ? 1 : 0); g.restore(); }
  if (o.includes('plant')) drawItem('plant', ROOM.plant.x, ROOM.plant.y);
  if (o.includes('bed')) drawItem('bed', ROOM.bed.x, ROOM.bed.y);
  if (o.includes('sofa')) drawItem('sofa', ROOM.sofa.x, ROOM.sofa.y);
  if (o.includes('tv')) {
    const t = ROOM.tv, w = itemSize('tv').w;
    const th = itemSize('tv').h; R1(t.x - 1, t.y + th, w + 2, 1, C.ink); R1(t.x, t.y + th + 1, w, 1, C.dark);              // estante
    drawTv(t.x, t.y, !!s.room.tv, now);
  }
  if (o.includes('plush')) { const t = teddyPos(); drawItem('teddy', t.x, t.y); }
  if (o.includes('ball')) {
    const bh = itemSize('ball').h, bw = itemSize('ball').w;
    if (now < ballUntil) {                                                  // rebota entre la mascota y la esquina
      const k = now / 260, bxx = Math.round(8 + Math.sin(k) * 6), up = Math.round(Math.abs(Math.sin(k * 2)) * 8);
      drawItem('ball', bxx, 34 - bh - up);
      if (up < 2) R1(bxx + 1, 35, Math.max(1, bw - 2), 1, C.dark);
    } else drawItem('ball', 2, 34 - bh);
  }
}


/* ============================== JARDÍN ================================== */
/* Se dibuja en una rejilla doble (96×72): P(x, y, w, h, color) usa medios píxeles lógicos */
let bug = null, nextBug = 0;
const P = (x, y, w, h, c) => { g.fillStyle = tint(c); g.fillRect(x / 2, y / 2, w / 2, h / 2); };
const gdisc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r + r * 0.6 - y * y)); P(cx - hw, cy + y, hw * 2 + 1, 1, c); } };
const gspr = (rows, pal, x, y, outline) => {
  const h = rows.length, w = rows[0].length, at = (i, j) => i >= 0 && j >= 0 && i < w && j < h && rows[j][i] !== '.';
  if (outline) for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (!at(i, j) && (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1))) P(x + i, y + j, 1, 1, '#2a2433');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') P(x + i, y + j, 1, 1, pal[ch]); }));
};
const seeded = n => { let s = 7; return Array.from({ length: n }, () => [(s = (s * 16807) % 2147483647) / 2147483647, (s = (s * 16807) % 2147483647) / 2147483647]); };
const GRASS = seeded(70).map(([a, b]) => [Math.floor(a * 96), 40 + Math.floor(b * 30)]);
const LEAVES = seeded(30);

function gardenTick(dt) {
  const G = state.garden, k = (state.owned.includes('can') ? 1.3 : 1) * (1 + gLv() * 0.006);
  G.plot.forEach(pl => { if (pl && pl.wet > 0) { pl.m += dt * k; pl.wet = Math.max(0, pl.wet - dt); } });
  const A = G.apple;
  if (A && A.wet > 0) {
    A.wet = Math.max(0, A.wet - dt); A.m += dt * k;
    if (A.m >= APPLE.adult) { A.fm += dt * k; while (A.fm >= APPLE.every) { A.fm -= APPLE.every; if (A.fruits < APPLE.max) A.fruits++; } }
  }
}
const plantStage = pl => { const f = pl.m / CROPS[pl.k].need; return f >= 1 ? 3 : f >= 0.5 ? 2 : f >= 0.2 ? 1 : 0; };
const appleStage = A => (A.m < APPLE.young ? 1 : A.m < APPLE.adult ? 2 : 3);

function drawGardenBack(now) {
  const ph = L.world.phase();
  if (ph !== 'night') {                                                     // el cielo del jardín (de noche vale el del juego, con estrellas)
    const dusk = ph === 'dusk';
    P(0, 0, 96, 68, dusk ? '#f6b27a' : '#9fd8ff'); P(0, 40, 96, 16, dusk ? '#f59a7c' : '#bfe6ff'); P(0, 56, 96, 12, dusk ? '#e87f7f' : '#d5efff');
    gdisc(78, dusk ? 26 : 9, 4, dusk ? '#ffe08a' : '#ffe45c');
    [[10, 7], [36, 4], [56, 10]].forEach(([x, y], i) => { const cx = Math.floor(x + now / 1500 * (1 + i * 0.3)) % 110 - 14; P(cx, y, 12, 2, '#fff'); P(cx + 2, y - 1, 7, 1, '#fff'); P(cx + 3, y + 2, 7, 1, '#e8f4ff'); });
  }
  for (let x = 0; x < 96; x++) { const h = Math.round(3 + 2 * Math.sin(x / 9) + 1.5 * Math.sin(x / 4.3)); P(x, 32 - h, 1, h + 2, '#7bc06a'); }
  P(0, 31, 96, 1, '#fff8e6'); P(0, 35, 96, 1, '#fff8e6');
  for (let x = 1; x < 96; x += 6) { P(x, 29, 3, 9, '#fff8e6'); P(x, 29, 3, 1, '#fffdf2'); P(x + 3, 30, 1, 1, '#d6c9a6'); P(x + 3, 31, 1, 7, '#d6c9a6'); }
  P(0, 38, 96, 34, '#6cc24a');
  for (let y = 38; y < 72; y += 4) P(0, y, 96, 2, '#62b844');
  GRASS.forEach(([x, y]) => { P(x, y, 1, 1, '#8fdc66'); P(x, y - 1, 1, 1, '#8fdc66'); });
}

function gDrop(x, y, now) { if (Math.floor(now / 500) % 2) return; P(x, y, 1, 1, '#4aa8e0'); P(x - 1, y + 1, 3, 2, '#4aa8e0'); P(x, y + 1, 1, 1, '#cfeeff'); }   // 💧 pide agua

function gTree(x, y, A) {
  const stage = appleStage(A), apples = stage === 3 ? A.fruits : 0;
  P(x - 9, y - 1, 22, 2, '#3e8f3a88');
  if (stage === 1) { P(x, y - 5, 1, 5, '#5a9a3c'); gspr(['.g.g.', 'ggggg', '.ggg.'], { g: '#4fb04a' }, x - 2, y - 8); return; }
  const th = stage === 2 ? 10 : 14, cr = stage === 2 ? 7 : 10;
  P(x - 2, y - th, 4, th, '#8a5a2c'); P(x - 2, y - th, 1, th, '#a8713a'); P(x + 1, y - th, 1, th, '#6b4a1f');
  P(x - 4, y - 1, 2, 1, '#6b4a1f'); P(x + 2, y - 1, 2, 1, '#6b4a1f');
  const cy = y - th - cr + 4;
  gdisc(x, cy, cr, '#2f7d32'); gdisc(x - (cr / 2 | 0), cy - 1, cr - 3, '#3f9a3c'); gdisc(x + (cr / 2 | 0), cy + 1, cr - 3, '#3f9a3c'); gdisc(x - 2, cy - 3, cr - 5, '#58b84a');
  LEAVES.forEach(([a, d]) => P(Math.round(x + Math.cos(a * 6.28) * d * cr * 0.8), Math.round(cy + Math.sin(a * 6.28) * d * cr * 0.7), 1, 1, '#7ad266'));
  [[-6, -2], [3, -6], [6, 1]].slice(0, apples).forEach(([dx, dy]) => { P(x + dx, cy + dy, 2, 2, '#e0392f'); P(x + dx, cy + dy + 1, 1, 1, '#b02620'); P(x + dx, cy + dy - 1, 1, 1, '#3a2a14'); });
}

function gPlant(x, y, kind, stage) {
  if (stage === 0) { P(x, y, 1, 1, '#3a2a14'); return; }
  if (stage === 1) { P(x, y - 2, 1, 2, '#3f9a3c'); P(x - 1, y - 3, 1, 1, '#58b84a'); P(x + 1, y - 3, 1, 1, '#58b84a'); return; }
  if (kind === 'zanahoria') {
    P(x, y - 4, 1, 3, '#3f9a3c'); P(x - 1, y - 5, 3, 1, '#58b84a');
    if (stage === 3) { P(x - 1, y - 1, 3, 1, '#f29a3c'); P(x - 1, y - 2, 1, 1, '#ff8a2a'); P(x + 1, y - 2, 1, 1, '#ff8a2a'); }
  } else if (kind === 'tomate') {
    P(x, y - 6, 1, 6, '#2f7d32'); P(x - 1, y - 5, 1, 1, '#3f9a3c'); P(x + 1, y - 3, 1, 1, '#3f9a3c'); P(x - 1, y - 2, 1, 1, '#3f9a3c');
    if (stage === 3) [[-1, -4], [1, -2], [0, -6]].forEach(([dx, dy]) => { P(x + dx, y + dy, 2, 2, '#e0392f'); P(x + dx, y + dy, 1, 1, '#ff6a5a'); });
    else P(x + 1, y - 3, 1, 1, '#9ccf5a');
  } else if (kind === 'fresa') {
    P(x - 1, y - 3, 3, 3, '#2f7d32'); P(x, y - 4, 1, 1, '#58b84a');
    if (stage === 3) [[-1, -1], [1, -2], [0, 0]].forEach(([dx, dy]) => { P(x + dx, y + dy, 1, 1, '#e0392f'); });
  } else {
    gdisc(x, y - 2, stage === 2 ? 2 : 3, stage === 3 ? '#8fdc66' : '#58b84a'); P(x, y - 3, 1, 1, '#c9f2a0'); P(x - 1, y - 2, 1, 1, '#3f9a3c');
  }
}

function gPlot(now) {
  const x = 27, y = 41, w = 23, h = 15, G = state.garden;
  P(x - 1, y - 1, w + 2, h + 2, '#c8a86a'); P(x - 1, y - 1, w + 2, 1, '#e6cd92'); P(x - 1, y + h, w + 2, 1, '#8a6a3a');
  P(x, y, w, h, '#8a5a2c');
  for (let j = 0; j < 2; j++) P(x, y + 5 + j * 6, w, 1, '#6b4a1f');
  let thirsty = false;
  G.plot.forEach((pl, n) => {
    if (!pl) return;
    const i = n % 3, j = Math.floor(n / 3);
    gPlant(x + 4 + i * 7, y + 5 + j * 6, pl.k, plantStage(pl));
    if (pl.wet <= 0 && pl.m < CROPS[pl.k].need) thirsty = true;
  });
  if (thirsty) gDrop(x + w - 3, y - 5, now);
}

function gPool(now) {
  const x = 58, y = 41, w = 32, h = 12;
  P(x - 2, y - 2, w + 4, h + 4, '#e9e4d6'); P(x - 2, y - 2, w + 4, 1, '#fffdf2'); P(x - 2, y + h + 1, w + 4, 1, '#bdb49c');
  P(x, y, w, h, '#3b9be0'); P(x, y, w, 3, '#2b7fc4');
  const off = Math.floor(now / 600) % 2;
  for (let j = 3; j < h; j += 3) for (let i = ((j / 3) % 2) * 3 + off; i < w - 3; i += 7) P(x + i + 1, y + j, 3, 1, '#8fd3ff');
  P(x + 3, y - 5, 1, 6, '#cfd6de'); P(x + 6, y - 5, 1, 6, '#cfd6de'); P(x + 3, y - 5, 4, 1, '#cfd6de'); P(x + 3, y - 2, 4, 1, '#9aa5b1');
  if (state.room.use !== 'pool') { gdisc(x + 16, y + 8, 3, '#ff8fb1'); gdisc(x + 16, y + 8, 1, '#3b9be0'); }
}
/** Agua por delante de la mascota mientras se baña (solo se ve de la cintura para arriba). */
function gPoolFront(now) {
  const x = 58, y = 41, w = 32, off = Math.floor(now / 500) % 2;
  P(x, y + 7, w, 5, '#3b9be0'); P(x, y + 7, w, 1, '#8fd3ff');
  for (let i = off * 3; i < w - 3; i += 6) P(x + i + 1, y + 9, 3, 1, '#8fd3ff');
  for (let i = 0; i < 3; i++) { const q = ((now / 500) + i * 0.33) % 1; P(x + 8 + i * 8, Math.round(y + 5 - q * 5), 1, 1, '#dff3ff'); }       // salpicaduras
}

function gLounger() {
  const x = 66, y = 57;
  P(x + 1, y + 9, 22, 2, '#3e8f3a88');
  P(x + 1, y + 8, 2, 2, '#cfd6de'); P(x + 18, y + 8, 2, 2, '#cfd6de');
  P(x + 6, y + 5, 15, 3, '#2b7fc4'); P(x + 6, y + 5, 15, 1, '#6ec6ff');
  for (let i = 7; i < 21; i += 3) P(x + i, y + 6, 1, 2, '#fff');
  for (let i = 0; i < 7; i++) P(x + i, y + 4 - Math.floor(i * 0.6), 2, 3, '#2b7fc4');
  P(x, y + 1, 3, 2, '#fff8e6'); P(x + 19, y + 3, 3, 3, '#e0523f');
}
function gFlowers(x, y, n) {
  const cols = ['#ff8fb1', '#ffd84d', '#fff', '#b99cff', '#ff7a5c'];
  for (let i = 0; i < n; i++) {
    const fx = x + i * 4 + (i % 2), fy = y - (i % 3), c = cols[i % 5];
    P(fx, fy + 1, 1, 3, '#2f7d32'); P(fx - 1, fy + 2, 1, 1, '#3f9a3c');
    P(fx, fy, 1, 1, '#ffd84d'); P(fx - 1, fy, 1, 1, c); P(fx + 1, fy, 1, 1, c); P(fx, fy - 1, 1, 1, c); P(fx, fy + 1, 1, 1, c);
  }
}
function gCan(x, y) { P(x, y, 6, 5, '#6ec6ff'); P(x, y, 6, 1, '#cfeeff'); P(x + 6, y + 1, 3, 1, '#4aa8e0'); P(x + 8, y, 2, 1, '#4aa8e0'); P(x + 1, y - 2, 4, 1, '#4aa8e0'); P(x, y - 1, 1, 1, '#4aa8e0'); P(x + 5, y - 1, 1, 1, '#4aa8e0'); }

function drawGarden(now) {
  const G = state.garden;
  if (has('flowers')) { gFlowers(22, 62, 3); gFlowers(50, 42, 2); }
  if (has('apple') && G.apple) { gTree(12, 47, G.apple); if (G.apple.wet <= 0 && (appleStage(G.apple) < 3 || G.apple.fruits < APPLE.max)) gDrop(12, 14, now); }
  if (has('plot')) gPlot(now);
  if (has('pool')) gPool(now);
  if (has('lounger')) gLounger();
  if (has('can')) gCan(50, 57);
}

/* ---- bichos: aparecen solos en el jardín y se tocan para atraparlos ---- */
const BUGS = L.BUGS;
function bugPos(now) {
  const b = bug, t = (now - b.t0) / 1000, d = BUGS[b.kind];
  const x = d.v ? b.x0 + t * d.v : b.x0 + Math.sin(t * 0.5 + b.ph) * 30;
  const y = d.v ? b.y0 : b.y0 + Math.sin(t * 1.3 + b.ph) * 6;
  return { x: Math.max(2, Math.min(94 - d.w9, Math.round(x))), y: Math.round(y) };
}
function bugBox() {                                                         // en píxeles lógicos
  if (!bug) return null;
  const q = bugPos(Date.now()), d = BUGS[bug.kind];
  return { x: q.x / 2, y: q.y / 2, w: d.w9 / 2, h: d.h9 / 2 };
}
function drawBug(now) {
  const s = state;
  if (s.sleeping || s.pause || s.stage === 'egg' || s.stage === 'dead') { bug = null; return; }
  if (bug && now > bug.t0 + bug.dur) { bug = null; nextBug = now + 30000 + Math.random() * 45000; }
  if (!bug && now > nextBug && panel.hidden) {
    const kind = L.pickBug(cycleOn() && L.world.isNight()), d = BUGS[kind];
    bug = { kind, t0: now, dur: d.v && d.v < 2 ? 35000 : 22000, ph: Math.random() * 6, x0: d.v ? 8 + Math.random() * 30 : 46, y0: d.v ? 62 + Math.random() * 4 : 36 + Math.random() * 12 };
  }
  if (!bug) return;
  const q = bugPos(now), d = BUGS[bug.kind];
  if (bug.kind === 'luciernaga' || bug.kind === 'dorada') {                  // brillo
    const k = Math.floor(now / 400) % 2, c = bug.kind === 'dorada' ? '#fff4a8' : '#fff7a0';
    if (k) { P(q.x - 2, q.y + 2, 1, 1, c); P(q.x + d.w9 + 1, q.y + 3, 1, 1, c); P(q.x + (d.w9 >> 1), q.y - 3, 1, 1, c); }
  }
  gspr(d.fr[Math.floor(now / 250) % d.fr.length], d.pal, q.x, q.y, true);
}
function catchBug() {
  const s = state, k = bug && bug.kind;
  if (!k) return;
  bug = null; nextBug = Date.now() + 40000 + Math.random() * 60000;
  L.progress.stat('bugs');
  const m = s.meta, first = !m.bugs[k], d = BUGS[k];
  m.bugs[k] = (m.bugs[k] || 0) + 1;
  let msg = '', lp = 0;
  if (k === 'mariposa') { s.happy = clamp(s.happy + 6); msg = '🦋 ¡Atrapada! +felicidad'; }
  else if (k === 'mariposaazul') { s.happy = clamp(s.happy + 8); lp = 3; msg = '🦋 ¡Mariposa azul! +3 🪙'; }
  else if (k === 'abeja') {
    if (Math.random() < 0.3) { s.happy = clamp(s.happy - 6); msg = '🐝 ¡Ay! Te ha picado'; Sound.play('alert'); }
    else { s.inv.miel = (s.inv.miel || 0) + 1; msg = '🐝 ¡Miel! Está en Snacks'; }
  }
  else if (k === 'mariquita') { lp = 3; msg = '🐞 ¡Da suerte! +3 🪙'; }
  else if (k === 'caracol') { s.happy = clamp(s.happy + 3); lp = 1; msg = '🐌 Caracol atrapado: +1 🪙'; }
  else if (k === 'saltamontes') { lp = 2; msg = '🦗 ¡Atrapado al vuelo! +2 🪙'; }
  else if (k === 'hormiga') { lp = 2; msg = '🐜 La hormiga trae +2 🪙'; }
  else if (k === 'escarabajo') { lp = 4; msg = '🪲 ¡Qué brillante! +4 🪙'; }
  else if (k === 'luciernaga') { s.happy = clamp(s.happy + 10); lp = 2; msg = '✨ Luciérnaga: +felicidad y +2 🪙'; }
  else if (k === 'libelula') { s.happy = clamp(s.happy + 10); lp = 10; msg = '✨ ¡Una libélula rara! +10 🪙'; }
  else { s.happy = clamp(s.happy + 20); lp = 20; msg = '🌟 ¡¡MARIPOSA DORADA!! +20 🪙'; }
  if (first) { lp += 3; msg = `📖 ¡Nuevo en el álbum! ${d.name}. ${msg} (+3 🪙 por la primera)`; }
  s.lp += lp;
  Sound.play(k === 'dorada' ? 'win' : lp || s.happy > 0 ? 'coin' : 'alert');
  if (L.progress.bugAlbumCheck()) msg = '🏆 ¡Álbum de insectos completo! +100 🪙';
  setMsg(msg, k === 'dorada' || first ? 5000 : 2600);
  Store.save(); render();
}

/* ---- menús del huerto y el manzano ---- */
function openPlot() {
  const s = state, plots = s.garden.plot;
  const empty = plots.filter(x => !x).length, plants = plots.filter(Boolean), ready = plants.filter(x => x.m >= CROPS[x.k].need);
  const nodes = [p(`🥕 Huerto · ${plants.length}/6 plantas · ${ready.length} listas`)];
  if (ready.length) nodes.push(btn(`Cosechar (${ready.length})`, () => {
    let extra = 0;
    plots.forEach((x, i) => { if (x && x.m >= CROPS[x.k].need) { const n = 1 + (Math.random() < gLv() / 200 ? 1 : 0); extra += n - 1; s.inv[x.k] = (s.inv[x.k] || 0) + n; plots[i] = null; L.progress.stat('harvest'); } });
    L.studio.xp('gardening', 0.7 * ready.length);
    Sound.play('coin'); setMsg(`🧺 Cosechado: ${ready.length}${extra ? ` (+${extra} extra 🌟)` : ''}. Está en la nevera`); Store.save(); render(); closePanel();
  }));
  if (plants.some(x => x.m < CROPS[x.k].need)) nodes.push(btn('💧 Regar', () => {
    plants.forEach(x => { x.wet = WET; }); L.studio.xp('gardening', 0.3); Sound.play('happy'); setMsg('💧 Regado'); Store.save(); render(); closePanel();
  }));
  Object.keys(CROPS).filter(cropOpen).forEach(k => {
    const n = s.inv['seed_' + k] || 0;
    if (n && empty) nodes.push(btn(`${CROPS[k].icon} Plantar ${CROPS[k].name} (${n} semillas)`, () => {
      let c = 0;
      plots.forEach((x, i) => { if (!x && s.inv['seed_' + k] > 0) { plots[i] = { k, m: 0, wet: WET }; s.inv['seed_' + k]--; c++; } });
      L.studio.xp('gardening', 0.4 * c); Sound.play('click'); setMsg(`🌱 Plantadas: ${c}`); Store.save(); render(); closePanel();
    }));
  });
  if (!plants.length && !Object.keys(CROPS).filter(cropOpen).some(k => s.inv['seed_' + k])) nodes.push(p('Compra semillas en la 🛒 tienda'));
  nodes.push(btn('Cerrar', closePanel, 'ghost'));
  openPanel(nodes, { full: true });
}
function openApple() {
  const s = state, A = s.garden.apple;
  if (!A) return;
  const st = appleStage(A), dry = A.wet <= 0 ? ' · sedienta 💧' : '';
  const nodes = [p(st === 1 ? `🌱 Manzano (brote)${dry}` : st === 2 ? `🌳 Manzano joven${dry}` : `🍎 Manzano · ${A.fruits} manzanas${dry}`)];
  if (A.fruits > 0) nodes.push(btn(`Recoger manzanas (${A.fruits})`, () => {
    L.studio.xp('gardening', 0.7 * A.fruits); s.inv.manzana = (s.inv.manzana || 0) + A.fruits; for (let i = 0; i < A.fruits; i++) L.progress.stat('harvest'); A.fruits = 0;
    Sound.play('coin'); setMsg('🍎 Manzanas recogidas. Están en Sanas'); Store.save(); render(); closePanel();
  }));
  if (A.wet < WET * 0.9) nodes.push(btn('💧 Regar', () => { A.wet = WET; L.studio.xp('gardening', 0.3); Sound.play('happy'); setMsg('💧 Regado'); Store.save(); render(); closePanel(); }));
  nodes.push(btn('Cerrar', closePanel, 'ghost'));
  openPanel(nodes);
}


/* ============================ FONDOS ILUSTRADOS ============================ */
/* Imágenes de docs/bg/ (96×72, hechas con tools/build_bg.py). Si una no carga, se usa el dibujo de código. */
const BG = {};
['salon', 'cuarto', 'estudio', 'cocina', 'jardin', 'jardin_k', 'playa', 'playa_k'].forEach(n => {
  const im = new Image(); im.onload = () => { try { render(); } catch { /* aún sin partida */ } }; im.src = 'bg/' + n + '.png'; BG[n] = im;
});
const bgOk = n => !!(BG[n] && BG[n].complete && BG[n].naturalWidth);
/** Interior: la imagen (con el papel de la tienda por encima en salón y cuarto) y el tinte de atardecer/noche. */
function bgIndoor(name, wall) {
  if (!bgOk(name)) return false;
  g.drawImage(BG[name], 0, 0, W, H);
  if (wall) drawWallpaper(true);
  const ph = cycleOn() ? L.world.phase() : 'day';
  if (ph === 'night') { g.fillStyle = 'rgba(14,22,70,.66)'; g.fillRect(0, 0, W, H); }
  else if (ph === 'dusk') { g.fillStyle = 'rgba(240,140,80,.22)'; g.fillRect(0, 0, W, H); }
  return true;
}
LIMA.bgIndoor = bgIndoor;
/** Exterior: de día la imagen entera; al atardecer y de noche manda el cielo del juego (la imagen sin cielo va encima). */
function bgOutdoor(name, now) {
  if (!bgOk(name) || !bgOk(name + '_k')) return false;
  const ph = L.world.phase(), dusk = ph === 'dusk';
  if (ph === 'day') g.drawImage(BG[name], 0, 0, W, H);
  else { if (dusk) { P(0, 0, 96, 68, '#f6b27a'); P(0, 40, 96, 16, '#f59a7c'); P(0, 56, 96, 12, '#e87f7f'); gdisc(78, 26, 4, '#ffe08a'); } g.drawImage(BG[name + '_k'], 0, 0, W, H); }
  if (ph !== 'night') {
    if (!dusk) gdisc(78, 9, 4, '#ffe45c');
    [[10, 7], [36, 4], [56, 10]].forEach(([x, y], i) => { const cx = Math.floor(x + now / 1500 * (1 + i * 0.3)) % 110 - 14; P(cx, y, 12, 2, '#fff'); P(cx + 2, y - 1, 7, 1, '#fff'); P(cx + 3, y + 2, 7, 1, '#e8f4ff'); });
  }
  return true;
}

/* ------------------------- playa: sombrilla y tumbona ------------------------- */
const LOUNGE = { x: 6, y: 26 };
function drawBeachLounge() {
  const x0 = LOUNGE.x, y0 = LOUNGE.y, ux = 25;
  R1(ux, 11, 1, 16, '#6b4a1f');                                                            // sombrilla
  [[8, ux - 7, ux + 7], [9, ux - 9, ux + 9], [10, ux - 11, ux + 11]].forEach(([yy, a, b]) => { for (let xx = a; xx <= b; xx++) R1(xx, yy, 1, 1, ((xx - a) >> 1) % 2 ? '#f7fbe6' : '#e0523f'); });
  R1(x0 + 2, y0 + 7, 31, 1, '#d9bd7c');                                                    // sombra en la arena
  R1(x0 + 6, y0 + 3, 1, 4, '#cfd6de'); R1(x0 + 28, y0 + 3, 1, 4, '#cfd6de');             // patas
  for (let i = 0; i < 8; i++) { const hh = Math.round((8 - i) * 0.5); R1(x0 + i, y0 - hh, 1, 3 + hh, '#2b7fc4'); R1(x0 + i, y0 - hh, 1, 1, '#6ec6ff'); }   // respaldo
  R1(x0 + 8, y0, 24, 3, '#2b7fc4'); R1(x0 + 8, y0, 24, 1, '#6ec6ff');                     // asiento
  for (let i = 11; i < 31; i += 3) R1(x0 + i, y0 + 1, 1, 2, '#fff');
  R1(x0 - 1, y0 - 6, 4, 3, '#fff8e6'); R1(x0 - 1, y0 - 4, 4, 1, '#e6d8b8');                // almohada
}
/** Gafas de sol: una banda oscura a la altura de los ojos (se detectan en el dibujo de cada forma). */
function eyeBand(rows) {
  let top = topRow(rows), bot = top, minI = 24, maxI = 0;
  rows.forEach((r, j) => { if (/[^.]/.test(r)) { bot = j; for (let i = 0; i < 24; i++) if (r[i] !== '.') { minI = Math.min(minI, i); maxI = Math.max(maxI, i); } } });
  const h = bot - top + 1; let ey = -1, ex0 = 99, ex1 = -1;
  for (let j = top + Math.floor(h * 0.25); j <= top + Math.ceil(h * 0.6) && j <= bot; j++) {
    for (let i = 1; i < 23; i++) if (rows[j][i] === 'K' && rows[j][i - 1] !== '.' && rows[j][i - 1] !== 'K' && rows[j][i + 1] !== '.' && rows[j][i + 1] !== 'K') {
      if (ey < 0) ey = j;
      if (j <= ey + 1) { ex0 = Math.min(ex0, i); ex1 = Math.max(ex1, i); }
    }
    if (ey >= 0) break;
  }
  if (ey < 0 || ex1 - ex0 < 2) { const w = maxI - minI + 1; ey = top + Math.round(h * 0.42); ex0 = minI + Math.round(w * 0.28); ex1 = maxI - Math.round(w * 0.28); }
  return { x: ex0 - 1, y: ey, w: ex1 - ex0 + 3, minI, maxI, top, bot };
}
/** Vacaciones: el Limagochi tumbado en la tumbona (aplastado y reclinado hacia el respaldo), con gafas de sol. */
function drawBeachPet(now, rows) {
  const e = eyeBand(rows), ratio = 0.72, K = Math.round((e.bot - e.top + 1) * ratio), lift = Math.floor(now / 900) % 2 ? 1 : 0;
  const y0 = LOUNGE.y - K + 1 - lift, xb = LOUNGE.x + 20 - 12, sick = state.sick;
  const sh = k => -Math.round((K - 1 - k) * 0.3);
  for (let k = 0; k < K; k++) {
    const r = rows[e.top + Math.min(e.bot - e.top, Math.floor(k / ratio))];
    for (let i = 0; i < 24; i++) if (r[i] !== '.') R1(xb + i + sh(k), y0 + k, 1, 1, colorOf(r[i], sick));
  }
  const gk = Math.min(K - 1, Math.round((e.y - e.top) * ratio)), gx = xb + e.x + sh(gk);
  R1(gx, y0 + gk, e.w, 1, '#15151f'); R1(gx + 1, y0 + gk, 1, 1, '#8a9ac0'); R1(gx + e.w - 2, y0 + gk, 1, 1, '#8a9ac0');   // gafas
  if (Math.floor(now / 700) % 2) { R1(LOUNGE.x + 29, LOUNGE.y - 12, 1, 1, '#fff8c0'); R1(LOUNGE.x + 28, LOUNGE.y - 11, 3, 1, '#fff8c0'); R1(LOUNGE.x + 29, LOUNGE.y - 10, 1, 1, '#fff8c0'); }   // destello de sol
}

/** Ventana: salón (centro) y habitación (con luna de noche). */
function drawWindow(now) {
  const bed = here() === 'bedroom', x = bed ? 31 : 22, y = 3, w = 11, h = 10;
  R1(x - 1, y - 1, w + 2, h + 2, C.ink);
  const ph0 = cycleOn() ? L.world.phase() : 'day';
  R1(x, y, w, h, ph0 === 'night' ? '#16224d' : ph0 === 'dusk' ? '#f2a56a' : '#8fc8ff');
  R1(x + w / 2 - 0.5, y, 1, h, C.ink); R1(x, y + h / 2 - 0.5, w, 1, C.ink);
  if (bed && cycleOn() && L.world.isNight()) { R1(x + 2, y + 1, 2, 2, C.bg); }
}

function drawScene(now) {
  const s = state, frame = Math.floor(now / 500) % 2;
  if (current && now > current.start + current.dur) current = null;
  const f = current;

  const gar = here() === 'garden';
  L.world.sky(g, W, H, now);
  const stu = here() === 'studio' || here() === 'kitchen';
  const bgDone = s.pause ? bgOutdoor('playa', now) : gar ? bgOutdoor('jardin', now) : stu ? false : bgIndoor(here() === 'bedroom' ? 'cuarto' : 'salon', true);
  if (!bgDone) { if (gar) drawGardenBack(now); else if (here() === 'studio') L.studio.drawBack(); else if (here() === 'kitchen') L.kitchen.drawBack(); else drawWallpaper(); }
  L.world.decor(g, L.world.event(), now, W, H);
  if (s.pause) { if (bgDone) drawBeachLounge(); else drawBeach(now); } else if (!gar && !stu) drawWindow(now);
  if (!gar && !stu && !s.pause && !bgDone) for (let x = 0; x < W; x += 2) R1(x, 33, 1, 1, C.dark);

  if (!gar && !stu) for (const [x, y, w, h] of state.art) R1(x, y, w, h, C.dark);       // garabatos (los muebles quedan por delante)
  if (!s.pause) drawHouse(now);
  if ((gar || s.pause) && cycleOn() && L.world.isNight()) { g.fillStyle = 'rgba(10,20,60,.38)'; g.fillRect(0, 0, W, H); }
  if (here() === 'studio') L.studio.drawFx(now);
  if (s.stage !== 'egg') for (let i = 0; i < s.poops; i++) drawPoop([6, 35, 14, 27][i], 29, frame);
  if (!L.school.isAway()) drawPet(now, frame, f);
  if (gar) drawBug(now);
  drawGuessArrow();

  if (f && f.type === 'clean') {
    const p = (now - f.start) / f.dur;
    R1(Math.round(p * 56) - 6, 0, 4, H, C.light); R1(Math.round(p * 56) - 9, 0, 1, H, C.mid);
  }
  if (L.voice && L.voice.isListening()) {                 // ondas de «te escucho»
    const ph = Math.floor(now / 250) % 3;
    for (let i = 0; i < 3; i++) { R1(5 + i * 2, 12 - (i === ph ? 2 : 0), 1, 8 + (i === ph ? 4 : 0), C.ink); R1(42 - i * 2, 12 - (i === ph ? 2 : 0), 1, 8 + (i === ph ? 4 : 0), C.ink); }
  }
  if (s.sleeping) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, H); }
}

function render() {
  const s = state;
  screenEl.classList.toggle('dark', s.sleeping);
  renderMeters();
  const reasons = attention();
  alertEl.hidden = reasons.length === 0;
  alertEl.dataset.reason = reasons[0] ? reasons[0].text : '';
  if (s.pause) { if (!(L.mini && L.mini.active())) hud('🏖️ Vacaciones · el tiempo está detenido'); vacHud = true; }
  else if (vacHud) { hud(null); vacHud = false; }
  if (L.school.isAway()) { if (!(L.mini && L.mini.active())) hud(L.school.hudText()); awayHud = true; }
  else if (awayHud) { hud(null); awayHud = false; }
  const bo = L.school.hasOffer() && !s.pause;
  busEl.hidden = !bo;
  if (bo) busEl.textContent = L.school.kind(s) === 'work' ? '🚌 ¡El bus del trabajo espera! Ir' : '🚌 ¡El bus del cole espera! Ir';
  $('#lp').textContent = `🪙 ${s.lp}`;
  const mini = !!(L.mini && L.mini.active());
  chipsEl.hidden = mini || s.stage === 'egg' || s.stage === 'dead';
  const hintTxt = (!mini && !s.pause && !s.sleeping && !L.school.isAway() && s.stage !== 'egg' && s.stage !== 'dead' && L.first) ? L.first.hint() : '';
  hintEl.hidden = !hintTxt; hintEl.textContent = hintTxt;
  chipName.textContent = ROOMNAME[here()];
  chipGo.textContent = '→ ' + ROOMICON[NEXTROOM[here()]];
  chipGo.setAttribute('aria-label', 'Ir a: ' + ROOMNAME[NEXTROOM[here()]]);
  chipName.textContent = ROOMNAME[here()] + ' ▾'; chipName.setAttribute('aria-label', 'Elegir cuarto');
  if (!roomPickEl.hidden) drawRoomPick();
  if (L.mini && L.mini.active()) return;               // los minijuegos dibujan su propia escena
  drawScene(Date.now());
}

/** ¿Hay algo pendiente en este cuarto? (punto de aviso en el selector) */
function roomAlert(w) {
  const s = state, k = s.kitchen, t = s.talent;
  if (w === 'garden') return s.garden.plot.some(x => x && x.m >= CROPS[x.k].need) || !!(s.garden.apple && s.garden.apple.fruits > 0);
  if (w === 'studio') return !!(t.practice || t.works.length || t.book.length);
  if (w === 'kitchen') return !!(k.cook || k.plates.length);
  return false;
}
function closeRoomPick() { roomPickEl.hidden = true; chipName.setAttribute('aria-expanded', 'false'); }
function drawRoomPick() {
  roomPickEl.textContent = '';
  Object.keys(ROOMICON).forEach(w => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rp' + (w === here() ? ' on' : ''); b.setAttribute('role', 'menuitem');
    b.setAttribute('aria-label', ROOMNAME[w]); b.title = ROOMNAME[w];
    b.textContent = ROOMICON[w];
    if (roomAlert(w) && w !== here()) { const d = document.createElement('i'); d.className = 'rp-dot'; b.append(d); }
    b.addEventListener('click', e => { e.stopPropagation(); closeRoomPick(); if (w !== here() && canInteract()) setRoom(w); });
    roomPickEl.append(b);
  });
}

function renderMeters() {
  meterEls.forEach(m => {
    const n = Math.ceil((m.dataset.stat === 'clean' ? 100 - state.dirt : state[m.dataset.stat]) / 20);
    $$('i', m).forEach((h, i) => h.classList.toggle('on', i < n));
    m.classList.toggle('low', n <= 1 && state.stage !== 'dead' && state.stage !== 'egg');
  });
}

/* ============================== UI ====================================== */
let msgTimer;
function setMsg(text, ms = 2600) {
  msgEl.textContent = text; msgEl.classList.add('on');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => msgEl.classList.remove('on'), ms);
}
const skillEl = $('#skillbar');
/** Barra superior con el nivel de un talento (o de la voz): {icon,label,pct,sub} o null para ocultarla. */
function skillBar(d) {
  if (!skillEl) return;
  skillEl.hidden = !d;
  if (!d) return;
  skillEl.querySelector('.sk-l').textContent = `${d.icon} ${d.label}`;
  skillEl.querySelector('.sk-f').style.width = Math.max(2, Math.min(100, d.pct)) + '%';
  skillEl.querySelector('.sk-s').textContent = d.sub || '';
}
function hud(text) { hudEl.hidden = !text; hudEl.textContent = text || ''; }

const p = text => { const e = document.createElement('p'); e.textContent = text; return e; };
const line = (k, v) => {
  const e = document.createElement('div'); e.className = 'line';
  const a = document.createElement('span'); a.textContent = k;
  const b = document.createElement('strong'); b.textContent = v;
  e.append(a, b); return e;
};
const btn = (label, onClick, cls = '', disabled = false) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = `pbtn ${cls}`.trim(); b.textContent = label; b.disabled = disabled;
  b.addEventListener('click', () => { Sound.play('click'); onClick(); });
  return b;
};
const row = (...kids) => { const e = document.createElement('div'); e.className = 'row'; e.append(...kids); return e; };

let panelBtns = [], panelSel = -1;
function openPanel(nodes, { full = false } = {}) {
  panel.replaceChildren(...nodes);
  panel.className = 'panel' + (full ? ' full' : '');
  panel.hidden = false; panel.scrollTop = 0;
  panelBtns = $$('button', panel); panelSel = -1;
}
let peekTimer;
/** Oculta el panel `ms` milisegundos para que se vea la animación de debajo. */
function peek(ms) {
  panel.classList.add('peek');
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => panel.classList.remove('peek'), ms + 150);
}
function closePanel() {
  guess.active = false;
  panel.hidden = true; panel.replaceChildren(); panelBtns = []; panelSel = -1;
}

const ACTIONS = { feed: openFeed, play: startPlay, heal, clean, shower: startShower, light: toggleLight, scold,
                  teach: () => L.voice ? L.voice.talk() : setMsg('Voz no disponible'), shop: openShop, status: openStatus };
function runAction(name) {
  if (L.mini && L.mini.active()) L.mini.stop(false);
  closePanel();
  Sound.play('click');
  if (state.pause) { openVacation(); render(); return; }                  // de vacaciones: solo se puede volver
  if (L.school.isAway()) { setMsg(L.school.hudText(), 3000); return; }       // en el cole o trabajando
  (ACTIONS[name] || (() => {}))();
  render();
}

let selIcon = -1;
function setSelIcon(i) { selIcon = i; iconBtns.forEach((b, k) => b.classList.toggle('sel', k === i)); }
function keyA() {
  if (L.mini.active()) { L.mini.key('left'); return; }
  if (!panel.hidden && panelBtns.length) {
    panelSel = (panelSel + 1) % panelBtns.length;
    panelBtns.forEach((b, i) => b.classList.toggle('sel', i === panelSel));
    panelBtns[panelSel].scrollIntoView({ block: 'nearest' });
  } else setSelIcon((selIcon + 1) % iconBtns.length);
}
function keyB() {
  if (L.mini.active()) { L.mini.key('right'); return; }
  if (!panel.hidden) { const b = panelBtns[panelSel]; if (b && !b.disabled) b.click(); }
  else if (selIcon >= 0) runAction(iconBtns[selIcon].dataset.action);
}
function keyM() {
  if (L.mini.active()) return;
  if (state.pause) { runAction('status'); return; }
  closePanel(); Sound.play('click'); openMenu();
}
function keyC() {
  if (L.mini.active()) { L.mini.stop(); return; }
  if (!panel.hidden) closePanel(); else setSelIcon(-1);
}

/** Letras de los botones dibujadas en píxeles (se ven igual en todos los móviles). */
const KEYPIX = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['..#......', '.##......', '#########', '.##.....#', '..#.....#', '........#', '....#####']   // ↩ volver
};
function pixSvg(rows) {
  let r = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">${r}</svg>`;
}
function drawKeys() { ['A', 'B', 'C'].forEach(k => { $('#key' + k).innerHTML = pixSvg(KEYPIX[k]); }); }

function setToolIcons() {
  $('#btnSound').textContent = Sound.enabled() ? '🔊' : '🔇';
  $('#btnNotify').textContent = L.notify && L.notify.enabled() ? '🔔' : '🔕';
}

function bindUI() {
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  iconBtns.forEach(b => b.addEventListener('click', () => { setSelIcon(iconBtns.indexOf(b)); runAction(b.dataset.action); }));
  $('#keyA').addEventListener('click', keyA);
  $('#keyB').addEventListener('click', keyB);
  $('#keyC').addEventListener('click', keyC);
  $('#keyM').addEventListener('click', keyM);
  busEl.addEventListener('click', () => { if (L.school.accept()) { Store.save(); render(); } });
  drawKeys();
  alertEl.addEventListener('click', () => setMsg(alertEl.dataset.reason || '…'));

  const pt = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  canvas.addEventListener('click', e => {                                   // tocar un mueble abre su menú
    if (L.mini.active() || guess.active || !panel.hidden) return;
    const [fx, fy] = pt(e), id = hitObject(fx * W, fy * H);
    if (id) openObject(id);
  });
  canvas.addEventListener('pointerdown', e => {
    if (!L.mini.active()) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* */ }
    const [fx, fy] = pt(e);
    L.mini.pointer(fx, fy);
  });
  canvas.addEventListener('pointermove', e => {
    if (!L.mini.active() || !(e.buttons || e.pointerType === 'touch')) return;
    e.preventDefault();
    const [fx, fy] = pt(e);
    L.mini.drag(fx, fy);
  });
  canvas.addEventListener('pointerup', () => { if (L.mini.active()) L.mini.up(); });

  document.addEventListener('keydown', e => {
    if (L.mini.active()) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { e.preventDefault(); L.mini.key('action'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); L.mini.key('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); L.mini.key('right'); }
      else if (/^[1-4]$/.test(e.key)) L.mini.key(e.key);
      else if (e.key === 'Escape') L.mini.stop();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); keyA(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setSelIcon((selIcon - 1 + iconBtns.length) % iconBtns.length); }
    else if (e.key === 'Escape') keyC();
    else if ((e.key === 'm' || e.key === 'M') && e.target === document.body) keyM();
    else if (e.key === 'Enter' && e.target === document.body) keyB();
  });

  meterEls.forEach(m => { $('.hearts', m).innerHTML = '<i>♥</i>'.repeat(5); });
  $('#speed').addEventListener('change', e => { speed = Number(e.target.value) || 1; });

  $('#btnSound').addEventListener('click', () => { Sound.toggle(); setToolIcons(); });
  $('#btnGuide').addEventListener('click', () => { Sound.play('click'); if (L.mini && L.mini.active()) L.mini.stop(false); L.guide.open(closePanel); });
  chipGo.addEventListener('click', () => { closeRoomPick(); if (canInteract()) setRoom(NEXTROOM[here()]); });
  chipName.addEventListener('click', e => { e.stopPropagation(); if (roomPickEl.hidden) { if (!canInteract()) return; drawRoomPick(); roomPickEl.hidden = false; chipName.setAttribute('aria-expanded', 'true'); } else closeRoomPick(); });
  document.addEventListener('click', e => { if (!roomPickEl.hidden && !roomPickEl.contains(e.target)) closeRoomPick(); });
  let gridOn = true; try { gridOn = localStorage.getItem('limagochi.grid') !== '0'; } catch { /* */ }
  const applyGrid = () => { stageEl.classList.toggle('grid', gridOn); $('#btnGrid').textContent = gridOn ? '▦' : '▢'; };
  applyGrid();
  $('#btnGrid').addEventListener('click', () => { gridOn = !gridOn; try { localStorage.setItem('limagochi.grid', gridOn ? '1' : '0'); } catch { /* */ } applyGrid(); });
  $('#btnNotify').addEventListener('click', async () => {
    if (!L.notify) return;
    const r = await L.notify.toggle();
    setMsg(!r.ok ? r.reason : r.on ? 'Avisos activados (con la pestaña abierta)' : 'Avisos desactivados', 4000);
    setToolIcons();
  });

  const sw = $('#swatches');
  SHELLS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', `Carcasa ${c}`);
    b.addEventListener('click', () => { document.documentElement.style.setProperty('--shell', c); try { localStorage.setItem(CFG.shellKey, c); } catch { /* */ } });
    sw.append(b);
  });
  try { const c = localStorage.getItem(CFG.shellKey); if (c) document.documentElement.style.setProperty('--shell', c); } catch { /* */ }
  setToolIcons();
}

/* ============================== API (para los módulos) =================== */
/** Anota la forma actual en el álbum (partidas anteriores o importadas) y revisa los logros, sin avisos. */
function recordCurrent() {
  quiet = true;
  if (['baby', 'child', 'teen', 'adult'].includes(state.stage)) L.progress.record(spriteId());
  L.progress.check();
  quiet = false;
}

/** Sustituye la partida (importar copia). Devuelve false si los datos no valen. */
function replaceState(raw) {
  const s = normalize(raw);
  if (!s) return false;
  L.mini && L.mini.stop(false);
  guess.active = false; current = null;
  state = s; diedNow = false; lastTick = Date.now();
  recordCurrent();
  lastKeys = new Set(attention().map(r => r.key));
  closePanel(); Store.save(); render();
  return true;
}

/** Próximos avisos si nadie cuida a la mascota: [{at, tag, title, body}] (para el Web Push con la app cerrada). */
function predictSchedule() {
  const s = state, R = CFG.rate, out = [], now = Date.now();
  if (s.stage === 'dead' || s.pause) return out;
  const add = (min, tag, body, title = 'Limagochi te necesita') => { if (isFinite(min)) out.push({ at: now + Math.max(1, min) * 60000, tag, title, body }); };
  if (s.stage === 'egg') { add(CFG.stageMin.egg - s.stageMin, 'event-hatch', '¡Tu huevo está a punto de eclosionar!', 'Limagochi'); return out; }
  if (CFG.stageMin[s.stage]) add(CFG.stageMin[s.stage] - s.stageMin, 'event-evolve', '¡Limagochi está a punto de evolucionar!', 'Limagochi');
  const pr = s.talent && s.talent.practice;
  if (s.kitchen && s.kitchen.cook) add(s.kitchen.cook.total - s.kitchen.cook.min, 'event-cook', 'Ha terminado de cocinar: ¡a la mesa!', 'Limagochi');
  const bus = L.school.nextOfferAt(now);
  if (bus) out.push({ at: bus, tag: 'bus', title: 'Limagochi', body: '🚌 ¡El bus espera! Abre la app para que vaya.' });
  if (pr) add(pr.total - pr.min, 'event-practice', 'Ha terminado de practicar: ¡ve su obra!', 'Limagochi');
  if (s.sleeping) return out;                                               // dormido: no avisamos
  const toy = s.owned.includes('plush') ? 0.7 : s.owned.includes('ball') ? 0.85 : 1;
  const Hn = R.hunger * need().hunger, hungerIn = s.hunger / Hn;
  add((s.hunger - 25) / Hn, 'hunger', 'Tiene hambre');
  add((s.happy - 25) / (R.happy * need().happy * toy + s.poops * 0.25 + (s.sick ? 0.5 : 0)), 'sad', 'Está triste: ¡juega con él!');
  add((s.energy - 15) / R.energy, 'sleepy', 'Tiene sueño: apaga la luz');
  if (!s.poops) add(s.nextPoop - s.poopTimer, 'poop', 'Hay que limpiar');
  if (s.sick) add(0, 'sick', 'Está enfermo: cúralo');
  if (s.dirt < 60) add((60 - s.dirt) / R.dirt, 'dirty', '🧼 Está sucio: dale una ducha');
  add(hungerIn + Math.max(0, CFG.dangerMin - s.neglect), 'danger', '¡Está en peligro! Atiéndelo ya');
  // sin molestar de 23:00 a 08:00 (si el ciclo día/noche está activo)
  if (cycleOn()) out.forEach((o, i) => {
    const d = new Date(o.at), h = d.getHours();
    if (h >= 23) { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); o.at = d.getTime() + i * 120000; }     // los avisos del descanso salen escalonados a las 8:00
    else if (h < 8) { d.setHours(8, 0, 0, 0); o.at = d.getTime() + i * 120000; }
  });
  const seen = new Set();
  return out.filter(o => o.at < now + 24 * 3600e3 && !seen.has(o.tag) && seen.add(o.tag)).sort((a, b) => a.at - b.at).slice(0, 8);
}

/** Solo para las pruebas automáticas: avanza `min` minutos de juego en silencio a partir de la hora `fromTs`. Devuelve la hora final. */
function sim(min, fromTs) {
  simT = Number.isFinite(fromTs) ? fromTs : Date.now();
  quiet = true;
  try { step(min); } finally { quiet = false; }
  const t = simT; simT = null; lastTick = Date.now();
  return t;
}

L.api = {
  ctx: g, W, H, colors: C, S: () => state, setMsg, fx, peek, hud, reward, render, canPlay,
  openPanel, closePanel, p, btn, row, line, clamp, rand, save: Store.save, sound: Sound, drawSprite, petRows,
  tint, isQuiet: () => quiet, startVacation, showered, drawHeart, getSave: () => JSON.stringify(state), replaceState,
  sim, newEgg, CFG,
  speed: () => speed, predictSchedule, restAt, setFine, paintIcons, openMenu, isHere: here, skillBar, feed, FOODS, openFeed, makeSick, openFridge
};

/* ============================== INIT ==================================== */
let speed = 1, lastTick = Date.now(), lastKeys = new Set();

function watch() {
  const reasons = attention();
  const fresh = reasons.filter(r => !lastKeys.has(r.key));
  lastKeys = new Set(reasons.map(r => r.key));
  if (fresh.length && !document.hidden) { Sound.play('alert'); Sound.vibrate([100, 60, 100]); }
  L.notify && L.notify.check(reasons.filter(r => r.key !== 'night'));      // de noche no molestamos con avisos locales
  trackEvent();
  L.mail && L.mail.poll();
  L.progress.check();
  document.title = reasons.length ? '❗ Limagochi' : 'Limagochi';
}

let eventShown = false;
function trackEvent() {
  const ev = L.world.event();
  if (!ev) return;
  const evs = state.meta.stats.events;
  if (!evs[ev.id]) evs[ev.id] = Date.now();
  if (!eventShown && !quiet) { eventShown = true; setTimeout(() => setMsg(`${ev.icon} ¡${ev.name}! Comida especial, gorro y premios ×2`, 5000), 4500); }
}

/** Envía al servidor los próximos avisos (solo si el usuario activó el Web Push y el juego va a velocidad normal). */
function syncPush(beacon = false) {
  if (!L.push || !L.push.on() || speed !== 1) return;
  L.push.sync(predictSchedule(), beacon);
}

function init() {
  bindUI();
  paintIcons();
  setFine(L.settings.get('fine') !== false);
  setInterval(() => { if (!document.hidden) present(); }, 50);
  let tvStep = 0;
  setInterval(() => {                                    // la tele encendida suena bajito (solo si la ves en el salón)
    const s = state; if (!s || quiet || !s.room || !s.room.tv || s.sleeping || s.pause || document.hidden || here() !== 'salon' || !Sound.enabled()) return;
    Sound.play('tvNote', tvStep++);
  }, 600);
  const saved = Store.load();
  if (saved) {
    state = saved;
    const away = (Date.now() - state.lastSeen) / 60000;
    if (away >= 1 && state.stage !== 'dead' && !state.pause) {
      const gone = Math.min(away, CFG.maxOfflineMin);
      simT = Date.now() - gone * 60000;                  // simula la ausencia con las horas reales (de noche duerme)
      quiet = true; step(away); quiet = false; simT = null;
      if (state.stage !== 'dead') {
        const txt = fmtDur(away);
        setMsg(`Has vuelto tras ${txt}`, 4000);
      }
    } else if (state.stage === 'dead') openStatus();
  }
  lastTick = Date.now();
  lastKeys = new Set(attention().map(r => r.key));
  recordCurrent();
  L.mail && L.mail.poll();
  if (!saved && L.first) L.first.welcome();              // partida nueva: regalo de bienvenida y primeros pasos
  if (!saved) {                                          // primera vez: abre la guía
    let seen = false;
    try { seen = localStorage.getItem('limagochi.guide') === '1'; localStorage.setItem('limagochi.guide', '1'); } catch { /* */ }
    if (!seen) L.guide.open(closePanel);
  }                                       // formas ya conseguidas por una partida anterior
  render();
  setTimeout(() => L.visit && L.visit.checkHash(), 600);

  setInterval(() => {                                   // simulación (1 s)
    const now = Date.now();
    step((now - lastTick) / 60000 * speed);
    lastTick = now;
    watch();
  }, 1000);
  let lastRender = 0;                                   // animación: rápida mientras hay efecto, lenta en reposo
  setInterval(() => { const n = Date.now(); if (evo || current || moving || n - lastRender >= 250) { lastRender = n; render(); } }, 100);
  setInterval(Store.save, 5000);                        // autoguardado
  setInterval(() => syncPush(), 60000);                 // renueva los avisos del servidor
  setTimeout(() => syncPush(), 3000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Store.save(); syncPush(true); } });
  window.addEventListener('pagehide', () => { Store.save(); syncPush(true); });
}

init();
})();
