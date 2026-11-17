// Dibuja el decorado navideño (tools/fondos/navidad_decor.js) en PNG transparentes 96x72. Uso: node tools/make_navidad_bgs.js DIR
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const pg = await b.newPage(); await pg.setContent('<canvas id=c width=96 height=72></canvas>');
  await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'fondos/navidad_decor.js'), 'utf8') });
  for (const room of ['cuarto', 'salon', 'cocina', 'estudio', 'jardin']) {
    const d = await pg.evaluate(r => { const c = document.getElementById('c'), g = c.getContext('2d'); g.clearRect(0, 0, 96, 72); window.__decor(r, g); return c.toDataURL('image/png'); }, room);
    fs.writeFileSync(path.join(out, 'decor_' + room + '.png'), Buffer.from(d.split(',')[1], 'base64'));
  }
  await b.close();
})();
