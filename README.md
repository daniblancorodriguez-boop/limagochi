# Limagochi 3.0

Mascota virtual retro (HTML5 + CSS + JS vanilla). PWA instalable, funciona offline, con Web Push opcional.

## Probar en local
```bash
npm install          # solo para el servidor de avisos (web-push)
node server.js       # http://localhost:3000
```
Sin servidor también vale cualquier servidor estático sobre `public/` (p. ej. `python3 -m http.server -d public`):
todo funciona salvo el Web Push. `limagochi-single.html` se abre con doble clic (sin PWA ni push).

## Qué trae
| Función | Dónde |
|---|---|
| PWA (icono, offline, instalar) | `public/manifest.json`, `public/sw.js`, `public/icons/` |
| Exportar / importar partida | ⚙️ Ajustes (📊 Estado → Ajustes) · `public/backup.js` |
| Logros y álbum de las 13 formas | 📊 Estado → 🏆 / 📖 · `public/progress.js` |
| Día/noche con tu hora real | `public/world.js` (de noche se cansa antes; de día solo echa siesta si está agotado) |
| Eventos de temporada | Halloween, Navidad, San Valentín, Primavera, Verano: fondo, gorro, comida y premios ×2 |
| Eco Lima (memoria) | 🎮 Jugar → 🧠 · toca los cuadros, teclas 1–4, o A (siguiente casilla) + B (pulsar) |
| Web Push con la app cerrada | `server.js` + `public/notify.js` (`LIMA.push`) |

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
public/   app (index.html, style.css, sprites.js, audio.js, world.js, notify.js, progress.js, backup.js,
          minigames.js, voice.js, game.js, sw.js, manifest.json, icons/)
server.js servidor estático + Web Push
tools/    build_sprites.py · build_icons.py · bundle.py
data/     claves VAPID y suscripciones (se crea sola; no distribuir)
```
Al cambiar archivos de `public/`, sube `VERSION` en `public/sw.js` para que los móviles actualicen la caché.
