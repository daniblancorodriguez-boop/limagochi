/* Guion de clips del vídeo promocional (ver tools/record_clips.js) */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ST = (fn) => `(${fn.toString()})()`;
const base = (st, extra = '') => `(() => { const s = LIMA.api.S(); ${st} ${extra} LIMA.api.render(); })()`;
const click = (p, sel) => p.click(sel);
module.exports = [
  { name: '01_huevo', setup: base("s.stage='egg';s.form=null;s.stageMin=4.2;s.poops=0;s.hunger=80;s.happy=80;"),
    run: async p => { await sleep(2200); await p.evaluate(() => { LIMA.api.S().stageMin = 4.985; }); await sleep(3800); } },
  { name: '02_bebe', setup: base("s.stage='baby';s.form=null;s.stageMin=10;s.poops=0;s.hunger=60;s.happy=70;"),
    run: async p => { await sleep(3000); } },
  { name: '03_creciendo', setup: base("s.stage='baby';s.form=null;s.stageMin=64.97;s.poops=0;s.hunger=80;s.happy=80;s.discipline=60;"),
    run: async p => { await sleep(6000); } },
  { name: '04_caca', setup: base("s.stage='child';s.form='child_good';s.stageMin=10;s.poops=3;s.hunger=70;s.happy=70;"),
    run: async p => { await sleep(1800); await p.click('[data-action=clean]'); await sleep(2800); } },
  { name: '05_comiendo', setup: base("s.stage='child';s.form='child_good';s.stageMin=10;s.poops=0;s.hunger=25;s.happy=55;"),
    run: async p => { await p.click('[data-action=feed]'); await sleep(1400); await p.evaluate(() => { const f = LIMA.api.FOODS.find(x => x.id === 'pizza'); LIMA.api.feed(f); }); await sleep(3000); } },
  { name: '06_pescando', setup: base("s.stage='child';s.form='child_good';s.stageMin=10;s.poops=0;s.energy=90;s.hunger=70;s.happy=60;"),
    run: async p => { await p.evaluate(() => { Math.random = () => 0.01; LIMA.api.closePanel(); LIMA.mini.start('fishing'); }); await sleep(900);
      const box = await (await p.$('#lcd')).boundingBox(); const tap = () => p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await tap(); await sleep(2100); await tap(); await sleep(1900); await tap(); await sleep(2100); await tap(); await sleep(1500); } },
  { name: '07_jugando', setup: base("s.stage='child';s.form='child_good';s.stageMin=10;s.poops=0;s.energy=90;s.hunger=70;s.happy=50;"),
    run: async p => { await p.evaluate(() => { LIMA.api.closePanel(); LIMA.mini.start('race'); }); await sleep(900);
      const box = await (await p.$('#lcd')).boundingBox(); for (let i = 0; i < 12; i++) { await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(240); } await sleep(800); } },
  { name: '08_enfermo', setup: base("s.stage='child';s.form='child_good';s.stageMin=10;s.poops=0;s.hunger=60;s.happy=40;", "LIMA.api.makeSick('Se ha puesto malito', true);"),
    run: async p => { await sleep(2200); await p.click('[data-action=heal]'); await sleep(3000); } },
  /* ---- personalizados: nombre propio + aspecto + carcasa ---- */
  ...[['09_javigotchi', 'kid', 'JAVIGOTCHI', 'base:blue', 'pizza'], ['10_bobbygotchi', 'dog', 'BOBBYGOTCHI', 'base:yellow', 'cookie'], ['11_gatigotchi', 'cat', 'GATIGOTCHI', 'base:pink', 'fish']].map(([name, look, nm, skin, food]) => ({
    name, setup: base(`s.stage='child';s.form='child_good';s.stageMin=10;s.poops=0;s.hunger=30;s.happy=60;LIMA.custom.set({look:'${look}',name:'${nm}'});LIMA.skins.set('${skin}');`),
    run: async p => { await sleep(2000); await p.evaluate(f => { LIMA.api.feed(LIMA.api.FOODS.find(x => x.id === f)); }, food); await sleep(3200); } })),
  ...[['12_javigotchi_dragonball', 'kid', 'JAVIGOTCHI', 'dragonball'], ['13_bobbygotchi_navidad', 'dog', 'BOBBYGOTCHI', 'navidad'], ['14_gatigotchi_pokemon', 'cat', 'GATIGOTCHI', 'pokemon']].map(([name, look, nm, skin]) => ({
    name, setup: base(`s.stage='child';s.form='child_good';s.stageMin=10;s.poops=0;s.hunger=70;s.happy=80;LIMA.custom.set({look:'${look}',name:'${nm}'});LIMA.skins.set('${skin}');`),
    run: async p => { await p.evaluate(() => { if (LIMA.fondos.on() === false) LIMA.fondos.toggle(); }); await sleep(6200); } })),
  { name: '15_carcasas', setup: base("s.stage='child';s.form='child_good';s.stageMin=10;s.poops=0;s.hunger=70;s.happy=80;"),
    run: async p => { await p.evaluate(() => { LIMA.fondos.toggle(); });
      for (const k of ['naruto', 'pokemon', 'dragonball', 'pesadilla', 'sakura', 'navidad']) { await p.evaluate(id => LIMA.skins.set(id), k); await sleep(1700); } } }
];
