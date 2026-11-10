/* ==========================================================================
   LIMAGOCHI · pruebas automáticas
   Arranca un servidor local, abre el juego en un navegador sin pantalla y simula días de juego.
   Uso:  npm test            (todas)        ·        npm test -- vida        (solo las que contengan «vida»)
   ========================================================================== */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..'), DOCS = path.join(ROOT, 'docs');
const PORT = 3190 + Math.floor(Math.random() * 500);
const URL = `http://localhost:${PORT}/index.html`;
const CLOUD = 'https://limagochi-push.daniblancorodriguez.workers.dev';
const only = process.argv[2] || '';
const DAY = 1440;

/* ------------------------------ utilidades ------------------------------ */
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function ok(cond, msg) { if (!cond) throw new Error(msg); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg}: esperaba ${JSON.stringify(b)} y salió ${JSON.stringify(a)}`); }

/** Azar con semilla (para que cada ejecución sea igual) y, si se pide, un reloj falso. */
const SEED = `(() => { let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();`;

let browser, server;
function post(pathname, body) {                               // reenvía las llamadas «a la nube» al servidor local
  return new Promise(resolve => {
    const r = http.request({ host: 'localhost', port: PORT, path: pathname, method: 'POST', headers: { 'Content-Type': 'text/plain' } }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c) }));
    });
    r.on('error', () => resolve({ status: 502, body: Buffer.from('{}') }));
    r.end(body || '');
  });
}
async function open() {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 420, height: 900 } });
  await ctx.addInitScript(SEED);
  await ctx.route(CLOUD + '/**', async route => {
    const q = route.request(), r = await post(new (require('url').URL)(q.url()).pathname, q.postData());
    route.fulfill({ status: r.status, body: r.body, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.goto(URL);
  await page.waitForFunction(() => window.LIMA && LIMA.api && LIMA.api.S());
  await page.evaluate(() => LIMA.api.closePanel());
  return page;
}
const noErrors = page => ok(page.errs.length === 0, 'errores de JavaScript: ' + page.errs.join(' | '));

/* Funciones que se ejecutan DENTRO de la página (se inyectan con cada prueba). */
const HELPERS = `
  window.T = {
    /** ¿Hay algún número roto (NaN/Infinity) en la partida? Devuelve la lista de rutas. */
    broken(o = LIMA.api.S(), p = 's', out = []) {
      if (typeof o === 'number') { if (!Number.isFinite(o)) out.push(p); }
      else if (o && typeof o === 'object') for (const k of Object.keys(o)) T.broken(o[k], p + '.' + k, out);
      return out;
    },
    bars() { const s = LIMA.api.S(); return ['hunger', 'happy', 'energy', 'discipline', 'dirt'].filter(k => !(s[k] >= 0 && s[k] <= 100)); },
    click(sel) { const b = document.querySelector(sel); if (b) b.click(); },
    /** Un cuidador razonable: cura, limpia, da de comer, juega y regaña cuando toca. */
    care() {
      const a = LIMA.api, s = a.S();
      if (s.stage === 'egg' || s.stage === 'dead' || s.sleeping || LIMA.school.isAway()) return;
      if (s.sick) { T.click('[data-action=heal]'); T.click('[data-action=heal]'); T.click('[data-action=heal]'); T.click('[data-action=heal]'); }
      if (s.poops) T.click('[data-action=clean]');
      if (s.call || s.mess) T.click('[data-action=scold]');
      const min = a.CFG.minWeight[s.stage] || 3, heavy = s.weight > min + 4;
      if (s.hunger < 60 && !s.sick) a.feed(a.FOODS.find(f => f.id === (heavy ? 'lime' : 'rice')));      // si engorda, comida ligera
      if ((s.happy < 55 || heavy) && s.energy > 20) a.reward({ happy: 30, energy: -6, hunger: -4, weight: -0.4 });   // como una partida a un minijuego
      if (s.dirt > 60) s.dirt = 10;
      a.closePanel();
    },
    /** Simula «days» días a partir de «from» (ms), cuidando (o no) cada 30 min. Devuelve un resumen. */
    life(days, from, care) {
      const a = LIMA.api, seen = [a.S().stage], bad = [];
      let t = from, peakPoops = 0;
      for (let i = 0; i < days * 48; i++) {
        t = a.sim(30, t);
        const s = a.S();
        if (seen[seen.length - 1] !== s.stage) seen.push(s.stage);
        peakPoops = Math.max(peakPoops, s.poops);
        const b = T.broken().concat(T.bars());
        if (b.length && bad.length < 5) bad.push('min ' + (i * 30) + ': ' + b.join(','));
        if (s.stage === 'dead') break;
        if (care) T.care();
      }
      const s = a.S();
      return { seen, bad, age: s.ageMin, cause: s.cause, stage: s.stage, mistakes: s.mistakes, form: s.form, weight: s.weight, hist: (s.meta.history || []).length, peakPoops };
    },
    at(h, m = 0) { const d = new Date(2026, 2, 2, h, m, 0, 0); return d.getTime(); }      // lunes 2 de marzo de 2026 (sin eventos de temporada)
  };`;
async function fresh() { const p = await open(); await p.evaluate(HELPERS); return p; }

/* ------------------------------- pruebas -------------------------------- */
test('archivos: todo lo que usa la página está en la lista sin conexión', async () => {
  const html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  const listed = [...sw.matchAll(/'([^']+\.(?:js|css|png|json|html))'/g)].map(m => m[1]);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const icons = fs.readdirSync(path.join(DOCS, 'ico')).map(f => 'ico/' + f);
  for (const f of [...scripts, ...icons, 'style.css']) ok(listed.includes(f), `falta «${f}» en la lista FILES de sw.js`);
  for (const f of listed) ok(fs.existsSync(path.join(DOCS, f)), `sw.js lista «${f}» pero no existe`);
});

test('carga: arranca sin errores y con todos los módulos', async () => {
  const p = await fresh();
  const miss = await p.evaluate(() => ['api', 'studio', 'kitchen', 'school', 'visit', 'backup', 'progress', 'voice', 'mini', 'mail', 'world', 'settings', 'forms'].filter(k => !LIMA[k]));
  eq(miss.join(','), '', 'módulos que faltan');
  eq(await p.evaluate(() => LIMA.api.S().stage), 'egg', 'una partida nueva empieza en huevo');
  noErrors(p);
});

test('vida cuidada: pasa por todas las etapas y muere de vejez', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => T.life(25, T.at(8), true));
  eq(r.seen.join('>'), 'egg>baby>child>teen>adult>dead', 'orden de etapas');
  eq(r.bad.join(' | '), '', 'números rotos o barras fuera de 0–100');
  eq(r.cause, 'vejez', 'causa de la muerte');
  const days = r.age / DAY, life = await p.evaluate(() => (LIMA.api.CFG.stageMin.egg + LIMA.api.CFG.stageMin.baby + LIMA.api.CFG.stageMin.child + LIMA.api.CFG.stageMin.teen + LIMA.api.CFG.lifespanMin) / 1440);
  ok(Math.abs(days - life) < 0.5, `edad al morir ${days.toFixed(1)} días (se esperaban ~${life.toFixed(1)}; peso final ${r.weight.toFixed(1)})`);
  eq(r.hist, 1, 'vidas apuntadas en el historial');
  ok(r.mistakes <= 30, `demasiados errores de cuidado con un cuidador atento: ${r.mistakes}`);
  noErrors(p);
});

test('vida abandonada: muere por descuido y queda en el historial', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => T.life(8, T.at(8), false));
  eq(r.stage, 'dead', 'sin cuidados acaba muriendo');
  eq(r.cause, 'descuido', 'causa de la muerte');
  eq(r.bad.join(' | '), '', 'números rotos');
  eq(r.hist, 1, 'vidas apuntadas en el historial');
  ok(r.peakPoops <= 4, 'nunca más de 4 cacas');
  noErrors(p);
});

test('comida y café: ningún alimento rompe las barras', async () => {
  const p = await fresh();
  const bad = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), out = [];
    s.stage = 'adult'; s.form = 'flor'; s.owned.push('coffee', 'fridge2', 'stove');
    const foods = a.FOODS.concat(LIMA.world.EVENT_FOODS || []);
    for (const f of foods) {
      s.hunger = 40; s.happy = 40; s.sick = false; s.taste = 0; s.inv[f.id] = 2; LIMA.kitchen.sync();
      a.feed(f);
      const b = T.broken().concat(T.bars());
      if (b.length) out.push(f.id + ': ' + b.join(','));
    }
    for (let i = 0; i < 7; i++) {                       // café: más de los 5 permitidos al día
      s.energy = 30; s.sick = false; s.sleeping = false; LIMA.kitchen.open('k_coffee');
      const b = [...document.querySelectorAll('#panel button')].find(x => /caf/i.test(x.textContent) && !x.disabled);
      if (b) b.click();
      a.closePanel();
    }
    if (s.kitchen.cof.n !== 5) out.push('cafés tomados: ' + s.kitchen.cof.n + ' (el tope es 5)');
    out.push(...T.broken(), ...T.bars());
    a.sim(120, T.at(10));
    return out.concat(T.broken()).concat(T.bars());
  });
  eq(bad.join(' | '), '', 'valores rotos');
  noErrors(p);
});

test('cocina: todas las recetas se cocinan y los platos se comen', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), K = LIMA.kitchen, out = [];
    s.stage = 'adult'; s.form = 'flor'; s.owned.push('fridge2', 'stove');
    s.talent.extra.cooking.lv = 99;
    for (const rc of K.RECIPES) {
      Object.keys(rc.need).forEach(i => { s.inv[i] = (s.inv[i] || 0) + rc.need[i]; }); K.sync();
      s.kitchen.plates = []; s.kitchen.cook = null;
      K.openStove();
      const b = [...document.querySelectorAll('#panel button')].find(x => x.textContent.includes(rc.name) && !x.disabled);
      if (!b) { out.push('no se puede elegir ' + rc.name); a.closePanel(); continue; }
      b.click();
      const c = [...document.querySelectorAll('#panel button')].find(x => /cocinar|empezar|s[ií]/i.test(x.textContent) && !x.disabled);
      if (c) c.click();
      a.closePanel();
      a.sim(240, T.at(10));
      if (s.kitchen.cook) out.push(rc.name + ' no termina');
      if (T.broken().length) out.push(rc.name + ' rompe: ' + T.broken().join(','));
    }
    return out;
  });
  eq(r.join(' | '), '', 'recetas');
  noErrors(p);
});

test('colegio: va, no enferma ni hace caca fuera y aprende al volver', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), S = LIMA.school;
    s.stage = 'child'; s.form = 'child_good'; s.happy = 80; s.discipline = 70; s.energy = 90; s.hunger = 90; s.sleeping = false; s.poops = 0;
    let t = a.sim(6, T.at(8, 52));                                   // 8:52 → 8:58: llega el bus
    const offer = S.hasOffer();
    S.accept(t);
    const away = S.isAway(), to = s.sch.away && s.sch.away.to;
    a.makeSick(); t = a.sim(2, t);
    const sickAway = s.sick;
    s.stageMin = a.CFG.stageMin.child - 20;                           // a punto de crecer: tampoco debe enfermar fuera
    t = a.sim(15, t);
    const sick2 = s.sick; s.stageMin = 100;
    t = a.sim(200, t);
    const poops = s.poops, blocked = !a.canPlay();
    t = a.sim(120, t);
    return { offer, away, end: new Date(to).getHours() + ':' + new Date(to).getMinutes(), sickAway, sick2, poops, blocked, back: !S.isAway(), days: s.sch.schoolDays, cook: s.talent.extra.cooking.lv, bad: T.broken().concat(T.bars()) };
  });
  ok(r.offer, 'el bus debía ofrecerse a las 8:58');
  ok(r.away, 'tras aceptar debe estar fuera');
  eq(r.end, '14:0', 'hora de vuelta');
  ok(!r.sickAway && !r.sick2, 'no debe estar enfermo mientras está en el cole');
  eq(r.poops, 0, 'cacas mientras está fuera');
  ok(r.back, 'a las 14:00 ya ha vuelto');
  eq(r.days, 1, 'días de cole');
  ok(r.cook > 0, 'debe aprender algo de cada habilidad');
  eq(r.bad.join(','), '', 'valores rotos');
  noErrors(p);
});

test('trabajo: cobra cada día y asciende', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), S = LIMA.school;
    s.stage = 'adult'; s.form = 'flor'; s.talent.extra.cooking.lv = 30; s.lp = 0;
    s.sch.job = 'chef';
    const pay = [];
    for (let d = 0; d < 3; d++) {
      s.sleeping = false; s.sick = false; s.energy = 90; s.hunger = 90; s.happy = 80;
      const day = T.at(8, 52) + d * 864e5;
      let t = a.sim(6, day);
      if (!S.hasOffer()) return { err: 'día ' + d + ': no llega el bus' };
      S.accept(t); const before = s.lp;
      a.sim(320, t);
      pay.push(s.lp - before);
    }
    return { pay, rank: s.sch.ranks.chef.r, days: s.sch.workDays, away: S.isAway() };
  });
  ok(!r.err, r.err);
  ok(r.pay.every(x => x >= 8 && x <= 80), 'sueldos fuera de rango: ' + r.pay);
  eq(r.rank, 1, 'rango tras 3 días con nivel 30');
  eq(r.days, 3, 'días trabajados');
  ok(r.pay[2] > r.pay[0], 'tras el ascenso debe cobrar más');
  noErrors(p);
});

test('horario: el cole nunca coincide con el descanso del dueño', async () => {
  const p = await fresh();
  const bad = await p.evaluate(() => {
    const S = LIMA.settings, out = [];
    for (let from = 0; from < 24; from++) for (let len = 1; len <= 8; len++) {
      S.set('rest', true); S.set('restFrom', from); S.set('restTo', (from + len) % 24);
      for (let j = 0; j < 24; j++) {
        S.set('jobFrom', j); LIMA.school.fixSlot();
        const h = LIMA.school.hourStart();
        for (let m = -5; m < 300; m += 5) if (LIMA.api.restAt(new Date(2026, 2, 2, h, 0).getTime() + m * 60000)) { out.push(`descanso ${from}+${len}, cole ${h}`); break; }
      }
    }
    return out.slice(0, 5);
  });
  eq(bad.join(' | '), '', 'solapes');
});

test('descanso del dueño: sin cacas y las barras bajan menos', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S();
    LIMA.settings.set('cycle', false);                                // sin sueño nocturno, para comparar solo el descanso
    const run = from => { s.stage = 'child'; s.form = 'child_good'; s.hunger = 100; s.poops = 0; s.poopTimer = 0; s.sick = false; s.sleeping = false; s.stageMin = 100; s.energy = 100; a.sim(300, from); return { hunger: 100 - s.hunger, poops: s.poops }; };
    return { night: run(T.at(0, 30)), day: run(T.at(15)) };
  });
  eq(r.night.poops, 0, 'cacas durante el descanso');
  ok(r.night.hunger < r.day.hunger * 0.6, `el hambre debe bajar menos en el descanso (${r.night.hunger.toFixed(1)} frente a ${r.day.hunger.toFixed(1)})`);
});

test('huevo nuevo: conservar bienes, empezar de cero e historial', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api;
    let s = a.S(); s.stage = 'adult'; s.form = 'flor'; s.ageMin = 9000; s.lp = 200; s.owned.push('sofa', 'apple'); s.talent.extra.cooking.lv = 50;
    a.newEgg('keep'); s = a.S();
    const keep = { lp: s.lp, owned: s.owned.join(), apple: !!s.garden.apple, cook: s.talent.extra.cooking.lv, hist: s.meta.history.length, stage: s.stage };
    s.stage = 'teen'; s.form = 'teen_good'; s.ageMin = 5000;
    a.newEgg('zero'); s = a.S();
    const zero = { lp: s.lp, owned: s.owned.length, hist: s.meta.history.length, lives: s.meta.lives };
    a.newEgg('keep');                                                   // un huevo sin eclosionar no cuenta como vida
    return { keep, zero, eggs: a.S().meta.history.length };
  });
  eq(JSON.stringify(r.keep), JSON.stringify({ lp: 200, owned: 'sofa,apple', apple: true, cook: 0, hist: 1, stage: 'egg' }), 'conservar bienes');
  eq(JSON.stringify(r.zero), JSON.stringify({ lp: 0, owned: 0, hist: 2, lives: 2 }), 'empezar de cero');
  eq(r.eggs, 2, 'un huevo sin eclosionar no se apunta');
});

test('guardado: ida y vuelta, partidas antiguas y reparación de valores rotos', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S();
    s.stage = 'teen'; s.form = 'teen_good'; s.lp = 55; s.inv.manzana = 2; s.sch.schoolDays = 3; s.meta.history = [{ n: 1, form: 'flor', stage: 'adult', born: 1, end: 2, age: 3, cause: 'vejez', lp: 4, mistakes: 5, books: 0, tricks: 0, tal: {} }]; s.meta.lives = 1; s.meta.gifts = { abc123: 5 };
    const raw = a.getSave();
    const ok1 = a.replaceState(JSON.parse(raw)), b = a.S();
    const same = [b.stage === 'teen', b.lp >= 55 && b.lp < 80, b.inv.manzana === 2, b.sch.schoolDays === 3, b.meta.history.length === 1, b.meta.gifts.abc123 === 5].join();
    const old = a.replaceState({ v: 1, stage: 'child', form: 'bueno', hunger: 50, happy: 50, energy: 50, discipline: 50, ageMin: 100, stageMin: 10, born: 1, lastSeen: Date.now() });
    const o = a.S(), oldOk = old && o.form === 'child_good' && !!o.sch && !!o.kitchen && !!o.talent && T.broken().length === 0;
    const d = JSON.parse(raw); d.hunger = null; d.energy = 'x'; d.weight = undefined;
    a.replaceState(d);
    const fixed = T.broken().concat(T.bars());
    const junk = [a.replaceState(null), a.replaceState({}), a.replaceState({ v: 9 })];
    return { ok1, same, oldOk, fixed, junk };
  });
  ok(r.ok1, 'la partida debe poder cargarse'); eq(r.same, 'true,true,true,true,true,true', 'etapa, monedas, despensa, cole, historial y regalos se conservan');
  ok(r.oldOk, 'una partida antigua (v1) debe cargarse y completarse');
  eq(r.fixed.join(','), '', 'los valores rotos se reparan al cargar');
  eq(r.junk.join(), 'false,false,false', 'los datos inválidos se rechazan');
  noErrors(p);
});

test('ausencia: al volver tras 6 horas la partida ha avanzado y sigue coherente', async () => {
  const p = await fresh();
  const save = await p.evaluate(() => { const a = LIMA.api, s = a.S(); s.stage = 'child'; s.form = 'child_good'; s.hunger = 90; s.lastSeen = Date.now() - 6 * 3600e3; return a.getSave(); });
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.addInitScript(`${SEED} if (!localStorage.getItem('limagochi.v1')) localStorage.setItem('limagochi.v1', ${JSON.stringify(save)});`);
  const q = await ctx.newPage(); q.errs = []; q.on('pageerror', e => q.errs.push(String(e)));
  await q.goto(URL); await q.waitForFunction(() => window.LIMA && LIMA.api && LIMA.api.S());
  await q.evaluate(HELPERS);
  const r = await q.evaluate(() => ({ bad: T.broken().concat(T.bars()), stage: LIMA.api.S().stage, age: LIMA.api.S().ageMin }));
  eq(r.bad.join(','), '', 'valores rotos tras la ausencia');
  ok(r.age > 340 && r.age < 380, 'la edad debe avanzar las 6 horas: ' + r.age);
  eq(r.stage, 'child', 'sigue vivo');
  noErrors(q);
});

test('regalos: se envían por enlace y solo se abren una vez', async () => {
  const a = await fresh(), b = await fresh();
  const link = await a.evaluate(() => {
    const s = LIMA.api.S(); s.stage = 'adult'; s.form = 'flor'; s.inv.manzana = 1; s.inv.f_tulip = 1; LIMA.kitchen.sync();
    LIMA.visit.openGift();
    [...document.querySelectorAll('#panel button')].find(x => x.textContent.includes('Tulipán')).click();
    [...document.querySelectorAll('#panel button')].find(x => x.textContent.includes('crear regalo')).click();
    return { url: s.meta.lastGift.url, left: s.inv.f_tulip };
  });
  eq(link.left, 0, 'la flor sale del inventario');
  const r = await b.evaluate(url => {
    const V = LIMA.visit, s = LIMA.api.S(); s.stage = 'adult'; s.form = 'flor'; s.happy = 30;
    const first = V.receiveGift(V.parseGift(url)), happy = s.happy, again = V.receiveGift(V.parseGift(url));
    const old = JSON.parse(atob(url.split('gift=')[1].replace(/-/g, '+').replace(/_/g, '/'))); old.ts -= 8 * 864e5; old.u = 'zzzzzz99';
    const stale = V.receiveGift(V.parseGift('gift=' + btoa(JSON.stringify(old))));
    return { first, happy, again, stale, junk: V.parseGift('gift=abc') };
  }, link.url);
  ok(r.first && r.happy > 30, 'el amigo recibe el regalo y sube la felicidad');
  ok(!r.again, 'el mismo regalo no se abre dos veces');
  ok(!r.stale, 'un regalo de hace 8 días está caducado');
  eq(r.junk, null, 'un enlace inventado se rechaza');
  ok(!(await a.evaluate(url => LIMA.visit.receiveGift(LIMA.visit.parseGift(url)), link.url)), 'no puedes abrir tu propio regalo');
  noErrors(a); noErrors(b);
});

test('nube: guardar, recuperar en otro móvil y aviso de conflicto', async () => {
  const a = await fresh(), b = await fresh();
  await a.evaluate(() => { const s = LIMA.api.S(); s.stage = 'adult'; s.form = 'flor'; s.lp = 321; s.owned.push('pool'); LIMA.backup.openCloud(); [...document.querySelectorAll('#panel button')].find(x => x.textContent.includes('Activar')).click(); });
  await a.waitForFunction(() => LIMA.settings.get('cloudAt') > 0);
  const code = await a.evaluate(() => LIMA.settings.get('cloudCode'));
  ok(/^[a-hjkmnp-z2-9]{12}$/.test(code), 'código con formato correcto');
  await b.evaluate(() => LIMA.backup.cloudRestore('zzzz-zzzz-zzzz'));
  await b.waitForTimeout(400);
  eq(await b.evaluate(() => LIMA.api.S().stage), 'egg', 'un código inventado no cambia nada');
  await b.evaluate(c => LIMA.backup.cloudRestore(c.toUpperCase().replace(/(.{4})(?=.)/g, '$1-')), code);
  await b.waitForFunction(() => LIMA.api.S().stage === 'adult');
  ok(await b.evaluate(() => LIMA.api.S().owned.includes('pool') && LIMA.api.S().lp >= 321), 'la partida recuperada trae monedas y compras');
  ok((await b.evaluate(() => LIMA.backup.cloudSave())).ok, 'el móvil nuevo pasa a guardar');
  const c = await a.evaluate(() => LIMA.backup.cloudSave());
  ok(!c.ok && c.conflict, 'el móvil antiguo recibe el aviso en vez de pisar la copia');
  noErrors(a); noErrors(b);
});

test('tienda: se puede comprar en todas las secciones', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), out = [];
    s.stage = 'adult'; s.form = 'flor'; s.lp = 9999; s.owned.push('plot');
    T.click('[data-action=shop]');
    const cats = [...document.querySelectorAll('#panel button')].map(b => b.textContent).filter(t => !/Cerrar/.test(t));
    for (const c of cats) {
      a.closePanel(); T.click('[data-action=shop]');
      [...document.querySelectorAll('#panel button')].find(b => b.textContent === c).click();
      const before = s.lp, buy = [...document.querySelectorAll('#panel button')].find(b => /🪙/.test(b.textContent) && !b.disabled);
      if (!buy) { out.push('nada que comprar en ' + c); continue; }
      buy.click();
      if (!(s.lp < before)) out.push('no cobra en ' + c);
      if (!document.querySelector('#panel p').textContent.includes(c.split(' ').slice(1, 2)[0])) out.push('tras comprar sale de ' + c);
    }
    return { out, n: cats.length, bad: T.broken() };
  });
  ok(r.n >= 7, 'secciones de la tienda: ' + r.n);
  eq(r.out.join(' | '), '', 'compras');
  eq(r.bad.join(','), '', 'valores rotos');
  noErrors(p);
});

test('pantallas: todos los botones y menús se abren sin errores', async () => {
  const p = await fresh();
  const n = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(); let n = 0;
    for (const st of ['child', 'adult']) {
      s.stage = st; s.form = st === 'adult' ? 'flor' : 'child_good'; s.sleeping = false; s.sick = false; s.energy = 90; s.hunger = 60; s.happy = 60;
      for (const b of document.querySelectorAll('#icons button')) { if (b.dataset.action === 'teach') continue; b.click(); n++; if (LIMA.mini.active()) LIMA.mini.stop(false); a.closePanel(); s.sleeping = false; }
      T.click('#keyM');
      const items = document.querySelectorAll('#panel button').length;
      for (let i = 0; i < items; i++) {
        a.closePanel(); T.click('#keyM');
        const b = document.querySelectorAll('#panel button')[i];
        if (!b || /Nuevo huevo/.test(b.textContent)) continue;
        b.click(); n++;
        [...document.querySelectorAll('#panel button')].slice(0, 12).forEach(x => { if (!/huevo|Importar|Exportar|Compartir|Instalar|Vacaciones|Activar|Recuperar|Avisos|aviso|Copiar|Enviar|Guardar/i.test(x.textContent) && document.body.contains(x)) { try { x.click(); n++; } catch (e) { throw e; } } });
      }
      a.closePanel();
      for (const room of ['salon', 'bedroom', 'garden', 'studio', 'kitchen']) { s.room.where = room; a.render(); n++; }
    }
    return n;
  });
  ok(n > 40, 'pantallas recorridas: ' + n);
  await p.waitForTimeout(600);
  noErrors(p);
});


test('cole: no se le pueden enseñar palabras mientras está fuera y el cole paga', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), S = LIMA.school;
    s.meta.first.on = false;                                          // sin la misión «ir al cole»: aquí se mide solo la paga
    s.stage = 'child'; s.form = 'child_good'; s.happy = 80; s.discipline = 70; s.energy = 90; s.hunger = 90; s.sleeping = false; s.poops = 0;
    let t = a.sim(6, T.at(8, 52));
    S.accept(t);
    const away = S.isAway(), w0 = JSON.stringify(s.words), k0 = JSON.stringify(s.skills), lp0 = s.lp;
    LIMA.voice.open();
    const panel = !!document.querySelector('#panel button');
    LIMA.voice.talk();
    const msgAway = (document.querySelector('#msg') || {}).textContent || '';
    const same = JSON.stringify(s.words) === w0 && JSON.stringify(s.skills) === k0;       // antes de volver (al volver el propio cole sí enseña)
    t = a.sim(330, t);
    return { away, panel, same, back: !S.isAway(), pay: s.lp - lp0, msgAway };
  });
  ok(r.away, 'debía estar fuera');
  ok(!r.panel, 'el menú de trucos y palabras no debe abrirse mientras está en el cole');
  ok(r.same, 'no debe aprender palabras ni trucos desde el menú mientras está fuera');
  ok(r.back, 'tras el cole vuelve');
  eq(r.pay, 3, 'paga del cole');
  noErrors(p);
});

test('peso: barra de obesidad al comer, aviso de obesidad, sana engorda la mitad y quema pasiva', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), out = {};
    s.stage = 'adult'; s.form = 'flor'; s.sleeping = false; s.hunger = 30; s.happy = 50; s.taste = 0; s.sick = false;
    const lo = a.CFG.minWeight.adult, hi = a.CFG.obese.adult;
    s.weight = lo; s.hunger = 30; a.feed(a.FOODS.find(f => f.id === 'rice'));
    out.rice = +(s.weight - lo).toFixed(2);                                    // arroz: 1 g × 0,5
    out.msgLight = (document.querySelector('#msg') || {}).textContent || '';
    s.weight = (lo + hi) / 2 + 2; s.hunger = 30; s.sick = false; a.feed(a.FOODS.find(f => f.id === 'pizza'));
    out.msgRisk = (document.querySelector('#msg') || {}).textContent || ''; const sb = document.getElementById('skillbar'); out.bar = !sb.hidden && /Obesidad/.test(sb.textContent) && parseFloat(sb.querySelector('.sk-f').style.width) > 50;
    s.weight = hi + 1; s.hunger = 30; s.sick = false; a.feed(a.FOODS.find(f => f.id === 'burger'));
    out.msgObese = (document.querySelector('#msg') || {}).textContent || '';
    s.weight = 25; s.sleeping = false; s.hunger = 100; s.happy = 100; s.energy = 100; const w = s.weight; a.sim(180, T.at(10));       // 3 h despierto y saciado
    out.loss = +(w - s.weight).toFixed(2);
    out.bad = T.broken().concat(T.bars());
    return out;
  });
  eq(r.rice, 0.5, 'el arroz engorda la mitad');
  ok(r.bar, 'barra fina de obesidad por encima de la mitad');
  ok(/obesidad peligroso/i.test(r.msgRisk), 'aviso de obesidad al pasar de la mitad: ' + r.msgRisk);
  ok(/obeso/i.test(r.msgObese) && /peligroso/i.test(r.msgObese), 'aviso de obeso: ' + r.msgObese);
  ok(!/obesidad peligroso/i.test(r.msgLight), 'sin aviso por debajo de la mitad');
  ok(r.loss > 0.6 && r.loss < 0.9, 'quema pasiva de ~0,25 g/h en 3 h (~0,75): ' + r.loss);
  eq(r.bad.join(','), '', 'valores rotos');
  noErrors(p);
});

test('economía: vida adulta de 16 días y sueldos nuevos', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => ({ life: LIMA.api.CFG.lifespanMin / 1440 }));
  eq(r.life, 16, 'días de vida adulta');
  noErrors(p);
});


test('primeros pasos: regalo de 20 🪙, 5 misiones con premio y una pista a la vez', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(), F = LIMA.first, out = {};
    out.gift = s.lp; out.on = F.active(); out.n0 = F.count();
    s.stage = 'child'; s.form = 'child_good'; s.sleeping = false; s.sick = false;
    s.hunger = 40; s.poops = 0; s.happy = 90;
    out.hintHungry = F.hint();                                             // pendiente «comer» y tiene hambre
    a.feed(a.FOODS.find(f => f.id === 'rice'));
    out.afterFeed = [s.lp, F.count()];
    s.poops = 1; out.hintPoop = F.hint();
    document.querySelector('[data-action=clean]').click();
    s.happy = 40; s.energy = 80; out.hintBored = F.hint();
    a.reward({ happy: 10, energy: -5, game: 'guess', win: true, score: 3, lp: 0 });
    out.hintShop = F.hint();
    s.lp = Math.max(s.lp, 40);
    a.closePanel();
    document.querySelector('[data-action=shop]').click();
    const cat = [...document.querySelectorAll('#panel button')].find(b => !/Cerrar|Cancelar/.test(b.textContent));
    if (cat) cat.click();
    const buyBtn = [...document.querySelectorAll('#panel button')].find(b => /\d+🪙/.test(b.textContent) && !b.disabled);
    if (buyBtn) buyBtn.click();
    a.closePanel();
    out.n4 = F.count();
    const lp4 = s.lp;
    let t = a.sim(6, T.at(8, 52)); LIMA.school.accept(t); a.sim(330, t);   // ir al cole
    out.final = [F.count(), F.active(), s.lp - lp4];
    out.hintEnd = F.hint(); out.menu = (() => { a.closePanel(); a.openMenu(); return [...document.querySelectorAll('#panel button')].some(b => /Primeros pasos/.test(b.textContent)); })();
    out.bad = T.broken().concat(T.bars());
    return out;
  });
  eq(r.gift, 20, 'regalo de bienvenida'); ok(r.on, 'primeros pasos activos en partida nueva'); eq(r.n0, 0, 'misiones al empezar');
  ok(/hambre/i.test(r.hintHungry), 'pista de hambre: ' + r.hintHungry);
  eq(r.afterFeed[1], 1, 'misión de comer'); eq(r.afterFeed[0], 25, 'regalo 20 + 5 de la misión de comer');
  ok(/caca/i.test(r.hintPoop), 'pista de caca: ' + r.hintPoop);
  ok(/aburrido/i.test(r.hintBored), 'pista de jugar: ' + r.hintBored);
  ok(/tienda|🛒|🪙/.test(r.hintShop), 'pista de comprar: ' + r.hintShop);
  eq(r.n4, 4, 'cuatro misiones antes del cole');
  eq(r.final[0], 5, 'las 5 misiones'); eq(r.final[1], false, 'terminado: ya no está activo');
  ok(r.final[2] >= 5 + 10 + 3, 'premio de la misión + bonus + paga del cole: ' + r.final[2]);
  eq(r.hintEnd, '', 'sin pista al terminar'); ok(!r.menu, 'el botón del menú desaparece al terminar');
  eq(r.bad.join(','), '', 'valores rotos');
  noErrors(p);
});

test('primeros pasos: una partida que ya existía no recibe regalo ni misiones', async () => {
  const p = await fresh();
  const save = await p.evaluate(() => { const o = JSON.parse(LIMA.api.getSave()); o.lp = 0; delete o.meta.first; return JSON.stringify(o); });
  await p.context().addInitScript(`localStorage.setItem('limagochi.v1', ${JSON.stringify(save)});`);     // se aplica al recargar, después de que la página vieja guarde
  await p.reload(); await p.waitForFunction(() => window.LIMA && LIMA.api && LIMA.api.S()); await p.evaluate(() => LIMA.api.closePanel());
  const r = await p.evaluate(() => ({ lp: LIMA.api.S().lp, on: LIMA.first.active(), hint: LIMA.first.hint() }));
  eq(r.lp, 0, 'sin regalo en una partida existente'); eq(r.on, false, 'sin misiones'); eq(r.hint, '', 'sin pistas');
  noErrors(p);
});

test('fondos: cada cuarto se dibuja con su imagen y ya no existe el modo LCD', async () => {
  const p = await fresh();
  for (const f of ['salon', 'cuarto', 'estudio', 'cocina', 'jardin', 'jardin_k', 'playa', 'playa_k']) {
    const r = await p.evaluate(n => fetch('bg/' + n + '.png').then(x => x.status), f);
    eq(r, 200, 'bg/' + f + '.png');
  }
  const r = await p.evaluate(async () => {
    const a = LIMA.api, s = a.S(); LIMA.settings.set('cycle', false);
    s.stage = 'adult'; s.sleeping = false; s.meta.first.on = false;
    const load = n => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = 'bg/' + n + '.png'; });
    const px = (c, x, y) => Array.from(c.getImageData(x, y, 1, 1).data).slice(0, 3);
    const out = {};
    for (const [where, img] of [['salon', 'salon'], ['bedroom', 'cuarto'], ['studio', 'estudio'], ['kitchen', 'cocina'], ['garden', 'jardin']]) {
      s.room.where = where; a.render();
      const im = await load(img), cv = document.createElement('canvas'); cv.width = 96; cv.height = 72;
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0);
      const got = px(a.ctx, 2, 2), want = px(x, 2, 2);
      out[where] = got.every((v, i) => Math.abs(v - want[i]) <= 3);
    }
    out.noLcd = !document.getElementById('btnLcd') && typeof a.setLcd === 'undefined';
    return out;
  });
  for (const k of ['salon', 'bedroom', 'studio', 'kitchen', 'garden']) ok(r[k], 'fondo ilustrado en ' + k);
  ok(r.noLcd, 'sin botón ni función de modo LCD');
  noErrors(p);
});

test('playa: tumbado en la tumbona con gafas de sol y sin muebles', async () => {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const a = LIMA.api, s = a.S(); LIMA.settings.set('cycle', false);
    s.stage = 'adult'; s.sleeping = false; s.meta.first.on = false; s.owned.push('sofa', 'tv', 'bed');
    s.pause = { since: Date.now() }; s.room.where = 'salon'; a.render();
    const d = a.ctx.getImageData(0, 0, 96, 72).data;
    let glasses = 0, red = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i] === 21 && d[i + 1] === 21 && d[i + 2] === 31) glasses++; if (d[i] === 224 && d[i + 1] === 82 && d[i + 2] === 63) red++; }   // gafas y franjas rojas de la sombrilla
    s.pause = null; s.room.where = 'salon'; a.render();
    return { glasses, red };
  });
  ok(r.glasses >= 6, 'gafas de sol dibujadas: ' + r.glasses);
  ok(r.red > 20, 'sombrilla: ' + r.red);
  noErrors(p);
});

test('tele: apagada es estática y encendida se anima', async () => {
  const p = await fresh();
  const grab = () => p.evaluate(() => { LIMA.api.render(); return Array.from(LIMA.api.ctx.getImageData(2, 12, 42, 26).data); });
  const setup = on => p.evaluate(on => {
    const a = LIMA.api, s = a.S(); LIMA.settings.set('cycle', false);
    s.stage = 'adult'; s.sleeping = false; s.meta.first.on = false; s.owned.push('tv', 'sofa'); s.room.where = 'salon'; s.room.tv = on; s.room.use = on ? 'tv' : 'sit';
    for (let i = 0; i < 30; i++) a.render();                                            // la mascota llega a su sitio (fuera del recuadro de la tele)
    LIMA.sound.play('tvNote', 0);
  }, on);
  const diff = (a, b) => a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0);
  await setup(false); const o1 = await grab(); await p.waitForTimeout(700); const o2 = await grab();
  eq(diff(o1, o2), 0, 'apagada: no cambia');
  await setup(true); let max = 0, prev = await grab();
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(140); const n = await grab(); max = Math.max(max, diff(prev, n)); prev = n; }
  ok(max > 15, 'encendida: los píxeles se mueven (' + max + ')');
  noErrors(p);
});

test('estudio: la sesión se guarda (con aviso) al cambiar de sala, dormir o enseñar, y se continúa', async () => {
  const p = await fresh();
  const r = await p.evaluate(async () => {
    const a = LIMA.api, s = a.S(), T = () => s.talent, out = {};
    LIMA.settings.set('cycle', false);
    s.stage = 'adult'; s.sleeping = false; s.meta.first.on = false; s.owned.push('easel', 'piano', 'desk'); s.room.where = 'studio';
    s.hunger = s.happy = s.energy = 90; T().painting.lv = 30;
    const start = () => { T().practice = { k: 'painting', total: 40, min: 10, seed: 123 }; };
    const panel = () => document.getElementById('panel');
    const clickText = t => [...panel().querySelectorAll('button')].find(b => b.textContent.includes(t)).click();
    // 1) cambiar de sala: avisa y no cambia hasta confirmar
    start(); document.getElementById('chipGo').click();
    out.askRoom = !panel().hidden && panel().textContent.includes('Guardar sesión'); out.stillHere = s.room.where === 'studio' && !!T().practice;
    clickText('Seguir practicando'); out.keep = !!T().practice && s.room.where === 'studio';
    document.getElementById('chipGo').click(); clickText('Guardar sesión');
    out.saved1 = !T().practice && T().saved.painting && T().saved.painting.min === 10 && T().saved.painting.seed === 123; out.moved = s.room.where !== 'studio';
    // 2) dormir
    s.room.where = 'studio'; start(); delete T().saved.painting;
    document.querySelector('[data-action=light]').click();
    out.askSleep = panel().textContent.includes('Guardar sesión') && !s.sleeping; clickText('Guardar sesión');
    out.sleeping = s.sleeping && !T().practice && !!T().saved.painting;
    // 3) dormido no se enseña: el panel de trucos y palabras no se abre
    a.closePanel(); LIMA.voice.open(); out.noTeach = panel().hidden;
    s.sleeping = false;
    // 4) interrupción automática: se guarda en vez de terminar el cuadro
    start(); delete T().saved.painting; const works = T().works.length; s.sleeping = true; LIMA.studio.tick(1, false);
    out.auto = !T().practice && !!T().saved.painting && T().works.length === works;
    s.sleeping = false;
    // 5) continuar la sesión guardada: mismo cuadro y mismos minutos
    a.closePanel(); LIMA.studio.open('st_easel'); clickText('Continuar');
    out.resume = !!T().practice && T().practice.seed === 123 && T().practice.min === 10 && !T().saved.painting;
    // 6) terminar: la obra conserva la semilla de la sesión
    T().practice.min = 39.9; LIMA.studio.tick(0.5, true);
    out.work = T().works.length === works + 1 && T().works[T().works.length - 1].seed === 123;
    return out;
  });
  for (const k of Object.keys(r)) ok(r[k], k + ' ' + JSON.stringify(r));
  noErrors(p);
});

test('iconos propios: los emojis se cambian por iconos, el texto no cambia y se pueden desactivar', async () => {
  const p = await fresh();
  const r = await p.evaluate(async () => {
    const a = LIMA.api; LIMA.settings.set('mono', true); a.paintIcons();
    a.closePanel(); document.querySelector('[data-action=shop]').click();
    await new Promise(r => setTimeout(r, 100));
    const on = document.querySelectorAll('#panel .gi').length, txt = document.querySelector('#panel').textContent;
    const m = document.querySelector('#panel .gi'), css = m ? getComputedStyle(m).maskImage || getComputedStyle(m).webkitMaskImage : '';
    LIMA.settings.set('mono', false); a.paintIcons();
    const off = document.querySelectorAll('#panel .gi').length, txt2 = document.querySelector('#panel').textContent;
    const files = await Promise.all(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'].map(n => fetch('ico/' + n + '.png').then(x => x.status)));
    return { on, off, same: txt === txt2, css, files, map: Object.keys(LIMA.GLYPHS.sheet).length };
  });
  ok(r.on > 0, 'iconos puestos: ' + r.on); eq(r.off, 0, 'sin iconos al desactivar'); ok(r.same, 'el texto es el mismo con y sin iconos');
  ok(/url/.test(r.css), 'máscara del icono: ' + r.css); eq(r.files.join(','), '200,200,200,200,200,200,200,200,200,200', 'hojas de iconos');
  ok(r.map >= 140, 'emojis cubiertos: ' + r.map);
  noErrors(p);
});

/* ------------------------------- ejecución ------------------------------ */
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'limagochi-test-'));
  server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), PUSH_DRY_RUN: '1', DATA_DIR: data, SAVE_GAP_MS: '1' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { if ((await post('/api/none', '{}')).status !== 502) break; await new Promise(r => setTimeout(r, 100)); }
  const chrome = process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
  let fail = 0;
  for (const t of tests.filter(t => t.name.includes(only))) {
    const t0 = Date.now();
    try { await t.fn(); console.log(`  ✓ ${t.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
    catch (e) { fail++; console.log(`  ✗ ${t.name}\n      ${String(e.message || e).split('\n')[0]}`); }
    for (const c of browser.contexts()) await c.close();
  }
  await browser.close(); server.kill();
  console.log(fail ? `\n${fail} prueba(s) fallan` : '\nTodas las pruebas pasan');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); try { server.kill(); } catch { /* */ } process.exit(2); });
