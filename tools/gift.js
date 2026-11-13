/* Genera un REGALO ESPECIAL firmado: node tools/gift.js "MENSAJE" ENERGIA FELICIDAD MONEDAS [REMITENTE]
   Usa la clave privada de .git/gift_key.json (no se versiona). La clave pública vive en docs/visit.js. */
const fs = require('fs'), path = require('path'), { webcrypto: c } = require('crypto');
const [msg = '', e = '0', h = '0', l = '0', nick = 'Limagochi'] = process.argv.slice(2);
const b64 = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
(async () => {
  const jwk = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.git', 'gift_key.json'), 'utf8'));
  const key = await c.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const o = { v: 1, t: 'g', c: 'autor' + Math.random().toString(36).slice(2, 8), n: nick, k: 'special', i: 'f_bouquet', u: Math.random().toString(36).slice(2, 11).padEnd(9, 'x'), ts: Date.now(), m: msg, e: +e, h: +h, l: +l };
  o.s = b64(await c.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${o.c}|${o.u}|${o.ts}|${o.m}|${o.e}|${o.h}|${o.l}`)));
  console.log('https://daniblancorodriguez-boop.github.io/limagochi/#gift=' + b64(Buffer.from(JSON.stringify(o))));
})();
