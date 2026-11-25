/* Enlace de Limagotchi personalizado: node tools/custom.js NOMBRE kid|dog|cat [#cuerpoClaro #cuerpoMedio #cuerpoOscuro]
   Quien abre el enlace ve su mascota con ese nombre y aspecto (se guarda en su dispositivo). */
const [name = '', look = 'kid', ...body] = process.argv.slice(2);
const o = { look, name }; if (body.length === 3) o.body = body;
const b64 = Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log('https://daniblancorodriguez-boop.github.io/limagochi/#custom=' + b64);
