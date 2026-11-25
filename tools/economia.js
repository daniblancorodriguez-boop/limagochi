/* ==========================================================================
   LIMAGOCHI · simulador de economía (no es una prueba: imprime tablas)
   Uso:  node tools/economia.js            (escenarios por defecto)
   Simula vidas enteras con distintos cuidadores y mide monedas, peso y vida.
   ========================================================================== */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 3700 + Math.floor(Math.random() * 200);
const URL = `http://localhost:${PORT}/index.html`;
const SEED = `(() => { let a = 777; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();`;

/* Se ejecuta DENTRO de la página. cfg: { adultDays, cuidador, juegosDia, lpJuego } */
const SIM = `
  window.vida = function (cfg) {
    const a = LIMA.api, DAY = 1440, out = [];
    a.CFG.lifespanMin = cfg.adultDays * DAY; LIMA.settings.set('schoolAuto', true);
    const click = sel => { const b = document.querySelector(sel); if (b) b.click(); };
    let t = new Date(2026, 2, 2, 8, 0, 0, 0).getTime(), prevLp = 0, earnedWork = 0, play = 0, day = 0;
    const row = () => { const s = a.S(); return { d: day, stage: s.stage, lp: s.lp, w: +s.weight.toFixed(1), jobDays: s.sch.workDays || 0, cook: Math.floor(s.talent.extra.cooking ? s.talent.extra.cooking.lv : 0), job: s.sch.job || '-', schoolDays: s.sch.schoolDays || 0, earned: s.sch.earned || 0, play, mistakes: s.mistakes }; };
    for (let i = 0; i < 40 * 48; i++) {
      t = a.sim(30, t);
      const s = a.S();
      if (s.stage === 'dead') break;
      const hourIdx = i % 48;
      if (hourIdx === 0) { day++; out.push(row()); }
      if (s.stage === 'egg' || s.sleeping || LIMA.school.isAway()) continue;
      if (hourIdx === 16 && cfg.practice && (s.stage === 'teen' || s.stage === 'adult')) LIMA.studio.xp('cooking', cfg.practice * 0.17 * 40, true);     // sesiones de práctica de ~40 min
      /* trabajo: acepta la primera oferta disponible */
      if (s.stage === 'adult' && !s.sch.job) { const of = Object.keys(s.talent.extra || {}).concat(['painting','writing','music']); const PROF = { cooking:'chef', painting:'pintor', writing:'escritor', music:'musico', gardening:'jardinero', fishing:'pescador', sport:'atleta' }; for (const k of of) { const lv = s.talent[k] ? s.talent[k].lv : (s.talent.extra[k] ? s.talent.extra[k].lv : 0); if (lv >= 10 && PROF[k]) { s.sch.job = PROF[k]; break; } } }
      if (s.sick) { click('[data-action=heal]'); click('[data-action=heal]'); click('[data-action=heal]'); click('[data-action=heal]'); }
      if (s.poops) click('[data-action=clean]');
      if (s.call || s.mess) click('[data-action=scold]');
      if (s.dirt > 60) s.dirt = 10;
      const min = a.CFG.minWeight[s.stage] || 3, heavy = s.weight > min + 4;
      if (cfg.cuidador === 'arroz') { if (s.hunger < 60 && !s.sick) a.feed(a.FOODS.find(f => f.id === 'rice')); }
      else {
        if (s.hunger < 60 && !s.sick) a.feed(a.FOODS.find(f => f.id === (heavy ? 'lime' : 'rice')));
        if ((s.happy < 55 || heavy) && s.energy > 20) {
          const lp = cfg.lpJuego; a.reward({ happy: 30, energy: -10, hunger: -6, weight: -0.4, lp }); play++;
        }
      }
      a.closePanel();
    }
    const s = a.S();
    out.push(row());
    return { rows: out, cause: s.cause, ageDays: +(s.ageMin / DAY).toFixed(1), weight: +s.weight.toFixed(1), lp: s.lp, earnedTot: (s.meta.stats && s.meta.stats.lpEarned) || 0, mistakes: s.mistakes, stage: s.stage };
  };`;

function post(p) { return new Promise(r => { const q = http.request({ host: 'localhost', port: PORT, path: p, method: 'POST' }, res => { res.resume(); res.on('end', () => r(res.statusCode)); }); q.on('error', () => r(502)); q.end('{}'); }); }

(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'limagochi-eco-'));
  const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), PUSH_DRY_RUN: '1', DATA_DIR: data }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { if ((await post('/api/none')) !== 502) break; await new Promise(r => setTimeout(r, 100)); }
  const chrome = process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
  const escenarios = JSON.parse(process.argv[2] || '[{"nombre":"cuidado normal, adulto 12 d","adultDays":12,"cuidador":"normal","lpJuego":0},{"nombre":"cuidado normal, adulto 16 d","adultDays":16,"cuidador":"normal","lpJuego":0},{"nombre":"solo arroz, adulto 12 d","adultDays":12,"cuidador":"arroz","lpJuego":0}]');
  for (const e of escenarios) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 420, height: 900 } });
    await ctx.addInitScript(SEED);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => window.LIMA && LIMA.api && LIMA.api.S());
    await page.evaluate(() => LIMA.api.closePanel());
    await page.evaluate(SIM);
    const r = await page.evaluate(cfg => window.vida(cfg), e);
    console.log(`\n== ${e.nombre} ==  murió: ${r.cause || r.stage} a los ${r.ageDays} d · peso ${r.weight} g · errores ${r.mistakes} · 🪙 ganadas (stat) ${r.earnedTot} · 🪙 en mano ${r.lp}`);
    console.log('día etapa   🪙   peso  díasCole díasTrabajo  🪙trabajo  juegos  cocina');
    for (const x of r.rows) console.log(String(x.d).padStart(3), x.stage.padEnd(6), String(x.lp).padStart(5), String(x.w).padStart(6), String(x.schoolDays).padStart(7), String(x.jobDays).padStart(10), String(x.earned).padStart(9), String(x.play).padStart(7), String(x.cook).padStart(7), x.job);
    await ctx.close();
  }
  await browser.close(); server.kill();
})().catch(e => { console.error(e); process.exit(2); });
