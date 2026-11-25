/* Graba clips verticales (1080×1920) del juego para vídeos promocionales: node tools/record_clips.js SALIDA_DIR [nombre ...]
   Usa el protocolo de depuración de Chrome (screencast) a resolución real; no graba sonido. */
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const OUT = path.resolve(process.argv[2] || 'clips'), ONLY = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(__dirname, '..', 'docs', q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.end(d); }); }).listen(8150);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function session(setup) {
  const b = global.__b;
  const ctx = await b.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1080 / 405, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(() => { localStorage.setItem('limagochi.guide', '1'); localStorage.setItem('limagochi.dynbg', '0'); });
  await p.goto('http://localhost:8150/'); await sleep(700);
  await p.evaluate(() => { LIMA.api.closePanel(); const s = LIMA.api.S(); s.owned = s.owned || []; ['skin_naruto', 'skin_pokemon', 'skin_dragonball', 'skin_navidad', 'skin_pesadilla', 'skin_sakura'].forEach(k => s.owned.includes(k) || s.owned.push(k)); s.lp = 90; });
  await p.addStyleTag({ content: '#msg,#hint,#chips{visibility:hidden!important}' });
  if (setup) await p.evaluate(setup);
  await sleep(500);
  return { p, ctx };
}
async function record(name, setup, script, tail = 800) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const { p, ctx } = await session(setup);
  const cdp = await ctx.newCDPSession(p), frames = [];
  cdp.on('Page.screencastFrame', async f => {
    const i = frames.length; fs.writeFileSync(path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
    frames.push(f.metadata.timestamp); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await script(p); await sleep(tail);
  await cdp.send('Page.stopScreencast'); await ctx.close();
  let list = '';
  frames.forEach((t, i) => { const d = i < frames.length - 1 ? frames[i + 1] - t : 0.4; list += `file 'f${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(0.01, d).toFixed(4)}\n`; });
  list += `file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', 'fps=30,scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', path.join(OUT, name + '.mp4')]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('✓', name, frames.length, 'fotogramas');
}
module.exports = { record, sleep, srv, OUT };

if (require.main === module) (async () => {
  global.__b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const clips = require('./promo_clips.js');
  for (const c of clips) await record(c.name, c.setup, c.run, c.tail);
  await global.__b.close(); srv.close();
})();
