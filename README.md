# Limagochi 3.0

Mascota virtual retro (HTML5 + CSS + JS vanilla). PWA instalable, funciona offline, con Web Push opcional.

## Probar en local
```bash
npm install          # solo para el servidor de avisos (web-push)
node server.js       # http://localhost:3000
```
Sin servidor también vale cualquier servidor estático sobre `docs/` (p. ej. `python3 -m http.server -d docs`):
todo funciona salvo el Web Push. `limagochi-single.html` se abre con doble clic (sin PWA ni push).

## Qué trae
| Función | Dónde |
|---|---|
| PWA (icono, offline, instalar) | `docs/manifest.json`, `docs/sw.js`, `docs/icons/` |
| Exportar / importar partida | ⚙️ Ajustes (📊 Estado → Ajustes) · `docs/backup.js` |
| Logros y álbum de las 13 formas | 📊 Estado → 🏆 / 📖 · `docs/progress.js` |
| Día/noche con tu hora real | `docs/world.js` (de noche se cansa antes; de día solo echa siesta si está agotado) |
| Eventos de temporada | Halloween, Navidad, San Valentín, Primavera, Verano: fondo, gorro, comida y premios ×2 |
| Insectos | 11 bichos en el jardín, álbum en ✨ Estado → 🦋 (+3 🪙 por especie, 100 🪙 al completar; hay una legendaria) |
| Casino | 🎮 Jugar → 🎰: tragaperras, ruleta y ruleta diaria gratis; apuesta máx. 10, pérdida máx. 50 🪙/día |
| Pesca · Piedra, papel o tijera · Carrera | 🎮 Jugar → nuevos minijuegos |
| Jardín | 3er cuarto: tumbona, piscina, manzano, huerto con semillas, bichos y pelota; el botón `→` recorre salón → cuarto → jardín |
| Estudio y talentos | 4.º cuarto: pintura, escritura y música (objetos en la tienda), sesiones según disciplina, obras vendibles en un mercado con precio variable y mecenas, libros por capítulos, barra de nivel, aviso al terminar · `docs/studio.js` |
| Cocina y habilidades | 5.º cuarto: 🍔 lleva a la nevera (básica o mejorada, con caducidad), fogón con recetas y nivel de cocina, cafetera; habilidades de jardinería, pesca y deporte · `docs/kitchen.js` |
| Dos cuartos | Botón `→` en la esquina de la pantalla: Salón ↔ Cuarto; ▦ activa/desactiva la rejilla |
| Penaltis | 🎮 Jugar → ⚽ · toca (o cualquier tecla) para chutar cuando la mira esté dentro de la portería |
| Eco Lima (memoria) | 🎮 Jugar → 🧠 · toca los cuadros, teclas 1–4, o A (siguiente casilla) + B (pulsar) |
| Web Push con la app cerrada | `server.js` + `docs/notify.js` (`LIMA.push`) |

## Tiempos (como el Tamagotchi original)
Huevo 5 min · Bebé ~65 min · Niño hasta el día 3 · Adolescente hasta el día 6 · Adulto ~12 días. Hambre vacía en ~8 h, felicidad en ~10 h.
Por la noche (22:00–07:00, tu hora real) se duerme solo. Valores en `CFG` de `docs/game.js`.
El selector «Vel.» (x10, x60) del pie acelera el tiempo para probar.

## Hablarle (🎤) y Guía
🎤 en la pantalla principal escucha palabras clave; más lecciones = más listo, pero se cansa. Las palabras están en la Guía (❓).

## Probar día/noche y eventos sin esperar
Añade parámetros a la URL: `?hour=23` (hora) y/o `?date=2026-10-31` (fecha).

## Web Push
1. El navegador exige **https** (localhost cuenta como seguro). En producción pon el servidor detrás de https
   (Caddy, Nginx, Cloudflare Tunnel, Render, Fly…).
2. Abre la app → 📊 Estado → ⚙️ Ajustes → «Avisos con la app cerrada» → permite las notificaciones.
3. La app calcula cuándo tendrá hambre, tristeza, sueño, etc. si nadie lo cuida y envía ese calendario al servidor
   (cada minuto y al cerrar). El servidor lo envía a su hora. Si vuelves a abrir la app y cuidas a la mascota, el calendario se renueva.
4. No molesta de 23:00 a 08:00 (si el ciclo día/noche está activo).

Las claves VAPID se crean solas en `data/vapid.json` (¡no lo subas a git!) o usa `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`.
`PUSH_DRY_RUN=1 node server.js` no envía nada real: solo escribe en el log (útil para probar).
Sobre iPhone, el push solo funciona con la app instalada en la pantalla de inicio (iOS 16.4+).

## Estructura
```
docs/   app (index.html, style.css, sprites.js, audio.js, world.js, notify.js, progress.js, backup.js,
          lib/qrcode.js, mail.js, visit.js, minigames.js, voice.js, game.js, sw.js, manifest.json, icons/)
server.js servidor estático + Web Push
tools/    build_sprites.py · build_icons.py · bundle.py
data/     claves VAPID y suscripciones (se crea sola; no distribuir)
```
Al cambiar archivos de `docs/`, sube `VERSION` en `docs/sw.js` para que los móviles actualicen la caché.

## Publicar en GitHub Pages
Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/docs`. La app queda en `https://USUARIO.github.io/REPO/`
(solo web: PWA y offline sí; el Web Push necesita además `node server.js` en un hosting con Node).


## Novedades 3.3
- 🚿 **Ducha**: barra de higiene (🧼) y minijuego de frotar con el dedo/ratón. Ideal: una al día.
- ✉️ **Buzón**: cartas de tu Limagochi (con el tono de su forma) y mini-historias de 3 capítulos por evento, con recuerdo (gorro) y 🪙.
- 🤝 **Visitas por tarjeta**: enlace `#visit=…` y QR (sin servidor); un amigo da premio una vez cada 20 h.
- 🎤 5 trucos nuevos (aplaudir, beso, pino, meditar, bostezar) y 6 palabras (agua, amigo, jugar, buenas noches, feliz, abrazo).
- Librería QR: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT) en `docs/lib/`.

## Novedades 3.4 · la casa
- Muebles en pixel art (sofá 🛋️, cama 🛏️, tele 📺) y peluche 🧸 nuevo en la 🛒 tienda, con vista previa grande.
- Toca el mueble en la pantalla: la mascota va hasta él (sentarse/tumbarse, ver la tele, tumbarse en la cama, abrazar el peluche).
- De noche, al apagar la luz (o al dormirse solo) se acuesta en la cama.

## Avisos con la app cerrada en Cloudflare
Mira `worker/README.md`: el servidor de avisos también funciona gratis como Cloudflare Worker (D1 + cron), sin necesidad de `server.js`.
