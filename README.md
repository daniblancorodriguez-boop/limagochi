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
| Eco Lima (memoria) | 🎮 Jugar → 🧠 · toca los cuadros, teclas 1–4, o A (siguiente casilla) + B (pulsar) |
| Web Push con la app cerrada | `server.js` + `docs/notify.js` (`LIMA.push`) |

## Tiempos (como el Tamagotchi original)
Huevo 5 min · Bebé ~65 min · Niño hasta el día 6 de vida · Adulto ~12 días. Hambre vacía en ~8 h, felicidad en ~10 h.
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
          minigames.js, voice.js, game.js, sw.js, manifest.json, icons/)
server.js servidor estático + Web Push
tools/    build_sprites.py · build_icons.py · bundle.py
data/     claves VAPID y suscripciones (se crea sola; no distribuir)
```
Al cambiar archivos de `docs/`, sube `VERSION` en `docs/sw.js` para que los móviles actualicen la caché.

## Publicar en GitHub Pages
Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/docs`. La app queda en `https://USUARIO.github.io/REPO/`
(solo web: PWA y offline sí; el Web Push necesita además `node server.js` en un hosting con Node).
