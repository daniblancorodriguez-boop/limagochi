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
| Exportar / importar partida | ⚙️ Ajustes (☰ Menú → Ajustes) · `docs/backup.js` |
| Logros y álbum de las 13 formas | ☰ Menú → 🏆 / 📖 · `docs/progress.js` |
| Día/noche con tu hora real | `docs/world.js` (de noche se cansa antes; de día solo echa siesta si está agotado) |
| Eventos de temporada | Halloween, Navidad, San Valentín, Primavera, Verano: fondo, gorro, comida y premios ×2 |
| Insectos | 11 bichos en el jardín, álbum en ☰ Menú → 🦋 (+3 🪙 por especie, 100 🪙 al completar; hay una legendaria) |
| Casino | 🎮 Jugar → 🎰: tragaperras, ruleta y ruleta diaria gratis; apuesta máx. 10, pérdida máx. 50 🪙/día |
| Pesca · Piedra, papel o tijera · Carrera | 🎮 Jugar → nuevos minijuegos |
| Jardín | 3er cuarto: tumbona, piscina, manzano, huerto con semillas, bichos y pelota; el botón `→` recorre salón → cuarto → jardín |
| Estudio y talentos | 4.º cuarto: pintura, escritura y música (objetos en la tienda), sesiones según disciplina, obras vendibles en un mercado con precio variable y mecenas, libros por capítulos, barra de nivel, aviso al terminar · `docs/studio.js` |
| Cocina y habilidades | 5.º cuarto: 🍔 lleva a la nevera (básica o mejorada, con caducidad), fogón con recetas y nivel de cocina, cafetera; habilidades de jardinería, pesca y deporte · `docs/kitchen.js` |
| Selector de cuartos | Toca el nombre del cuarto: fila con los 5 cuartos y punto rojo si hay algo pendiente (cosecha, platos, obras, práctica) |
| Formas por talento y carácter | 7 adultos por talento (nivel 40+), Lima Maestra (3 talentos 50+) y 4 adolescentes por carácter · `docs/forms2.js`; álbum de 27 formas |
| Dos cuartos | Botón `→` en la esquina de la pantalla: Salón ↔ Cuarto; ▦ activa/desactiva la rejilla |
| Penaltis | 🎮 Jugar → ⚽ · toca (o cualquier tecla) para chutar cuando la mira esté dentro de la portería |
| Eco Lima (memoria) | 🎮 Jugar → 🧠 · toca los cuadros, teclas 1–4, o A (siguiente casilla) + B (pulsar) |
| Web Push con la app cerrada | `server.js` + `docs/notify.js` (`LIMA.push`) |

## Tiempos (como el Tamagotchi original)
Huevo 5 min · Bebé ~65 min · Niño hasta el día 3 · Adolescente hasta el día 6 · Adulto 16 días. Hambre vacía en ~8 h, felicidad en ~10 h.
Por la noche (22:00–07:00, tu hora real) se duerme solo. Valores en `CFG` de `docs/game.js`.
El selector «Vel.» (x10, x60) del pie acelera el tiempo para probar.

## Hablarle (🎤) y Guía
🎤 en la pantalla principal escucha palabras clave; más lecciones = más listo, pero se cansa. Las palabras están en la Guía (❓).

## Probar día/noche y eventos sin esperar
Añade parámetros a la URL: `?hour=23` (hora) y/o `?date=2026-10-31` (fecha).

## Web Push
1. El navegador exige **https** (localhost cuenta como seguro). En producción pon el servidor detrás de https
   (Caddy, Nginx, Cloudflare Tunnel, Render, Fly…).
2. Abre la app → ☰ Menú → ⚙️ Ajustes → «Avisos con la app cerrada» → permite las notificaciones.
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

## v3.21.0
- Iconos negros con fondo transparente (barra, estadísticas y menú; `docs/ico/*.png`); se pueden desactivar en ⚙️ Ajustes → «Iconos negros».
- Botón MENÚ (☰) bajo A/B/↩: logros, álbum, insectos, buzón, visitas, trucos, guía, ajustes y nuevo huevo en lista. 📊 Estado solo muestra estadísticas.
- Botones A/B en letra pixel y C ahora es ↩; todos más pequeños.
- Tienda por secciones (comida, fondos, muebles, jardín, cocina, estudio): al comprar te quedas donde estabas.

## v3.22.0
- Economía: en Lima Vuela hay una moneda cada 2 tubos, recogible, con tope de 20 🪙 por partida (antes 1 🪙 por tubo sin límite). El resto de minijuegos da ≈25 % más.
- Regalos por enlace (`#gift=`): comida de huerto, platos cocinados y flores (🛒 → 🎁, tulipán 8 🪙, ramo 20 🪙). Un solo uso por regalo, caduca a los 7 días, máx. 5 al día. Logros «Detallista» y «Amigo generoso».

## v3.23.0
- 📜 Historial de Limagochis (☰ Menú): cada vida se anota al morir o al cambiar de huevo (últimas 30).
- Nuevo huevo: «Conservar bienes» o «Empezar desde 0» (siempre se guardan álbum, logros e historial; las habilidades empiezan en 0).

## v3.24.0
- 🏫 Colegio (niño/adolescente) y 💼 trabajo (adulto): aviso diario «el bus espera», ausencia de 5 h, aprendizaje de habilidades y palabras, sueldo y 4 rangos por profesión (`docs/school.js`).
- Horario configurable en ⚙️ Ajustes, siempre 5 h y sin solaparse con el descanso del dueño; opción de ir sin preguntar; aviso push del bus con la app cerrada.

## v3.25.0
- ☁️ Copia en la nube: la partida se sube al Worker (`/api/save/put` y `/api/save/get`, tabla `saves` en D1) bajo un código secreto de 12 caracteres; subida automática cada 6 h y recuperación con el código en cualquier dispositivo. Si dos dispositivos usan el mismo código, el servidor avisa en vez de sobrescribir.

## v3.25.1
- En el cole o el trabajo ya no enferma (tampoco por el aviso de «va a crecer» ni por la vejez); si estaba enfermo al salir, se cura.
- Pruebas automáticas: `npm test` (`tools/test.js`) abre el juego en un navegador sin pantalla y comprueba 26 escenarios: una vida entera cuidada y otra abandonada, comida y café, recetas, colegio, trabajo, horarios, descanso, huevo nuevo, guardado y partidas antiguas, regalos, copia en la nube, tienda y todas las pantallas. Se ejecutan también en GitHub en cada subida.

## v3.26.0 · equilibrio de la economía
- Vida adulta de 12 a **16 días** (vida total ≈ 22 días).
- Sueldos por rango 12 / 22 / 38 / 60 🪙; el cole paga **3 🪙** al día y da **2,0** de experiencia por habilidad (antes 0,9). Monedas de flappy (20 por partida), tope diario (ninguno) y precios de la tienda, sin cambios.
- Peso: la comida sana engorda la mitad y quema pasiva de 0,25 g por hora despierto. Un cuidador que solo da arroz ya no muere obeso.
- **Barra de gordura** sobre el Limagochi al comer: izquierda delgado, centro equilibrado, derecha obeso (límite de su etapa). Pasada la mitad, cada comida avisa de «índice de obesidad peligroso».
- Mientras está en el cole o el trabajo ya no se le puede enseñar palabras ni trucos (🎓 y 🎤).
- `tools/economia.js`: simulador de vidas enteras (`node tools/economia.js`) con tablas de monedas, peso y días de cole/trabajo.
- Pruebas: 20 escenarios (nuevos: cole sin enseñanza y paga, peso y barra, vida adulta de 16 días).

## v3.27.0 · primeros pasos (punto 4, parte aprobada)
- 🎁 **Regalo de bienvenida:** 20 🪙 en la primera vida de una partida nueva.
- 🌟 **Primeros pasos:** 5 mini-misiones (dar de comer, limpiar una caca, jugar un minijuego, comprar algo, ir al cole) con 5 🪙 cada una y 10 🪙 extra al completarlas. Una única pista contextual sobre la pantalla («Tiene hambre: pulsa 🍔»), y la lista en ☰ Menú → 🌟 Primeros pasos mientras estén activos (`docs/first.js`).
- Solo para partidas nuevas: las que ya existían no reciben regalo, misiones ni pistas (`meta.first`).
- El desbloqueo de salas, juegos y menús por etapa queda aparcado.
- Pruebas: 22 escenarios (nuevos: primeros pasos y partida existente sin ellos).

## v3.28.0 · arte propio (punto 5)
- 🖼️ **Fondos ilustrados** (hechos con Nano Banana) en `docs/bg/`: salón, cuarto, estudio, cocina, jardín y playa, a 96×72. Se generan con `python3 tools/build_bg.py CARPETA` (reduce, alinea suelo y valla con los muebles y guarda el jardín y la playa también sin cielo, `*_k.png`). De día se ve la imagen; al atardecer y de noche manda el cielo del juego en los exteriores y un tinte en los interiores. El papel pintado de la tienda se dibuja encima en trazo blanco suave. Si una imagen no carga (p. ej. `limagochi-single.html`), se usa el dibujo anterior.
- 🪟 La ventana del salón y del cuarto tiene el cristal azul de día, naranja al atardecer y azul oscuro de noche.
- 🏖️ **Vacaciones:** playa con sombrilla y tumbona; el Limagochi está tumbado en ella con gafas de sol (sin los muebles de casa).
- 📺 **Tele nueva** (apagada y encendida, `python3 tools/build_tv.py tv_off.png tv_on.png`): encendida, las filas de píxeles de la pantalla se desplazan y una franja de luz la recorre; suena una melodía suave y corta mientras está encendida y la ves en el salón (respeta el botón de sonido).
- ➖ **Se elimina el modo LCD** (botón 🎨, función y guardado en las copias; las copias antiguas se importan igual). El pixel fino sigue en Ajustes.
- Pruebas: 25 escenarios (nuevos: fondos y sin modo LCD, playa con gafas, tele animada).

## v3.28.1
- El suelo del salón empieza más arriba (al 70 % de la pantalla en lugar del 92 %): los muebles quedan apoyados sobre él.

## v3.28.2
- El suelo del cuarto también empieza al 70 % de la pantalla.

## v3.34.0 · regalos especiales firmados
- Un regalo `k:'special'` lleva mensaje, energía, felicidad y monedas, y va **firmado con ECDSA P-256**: el juego solo lleva la clave pública (`docs/visit.js`), así que nadie puede fabricar monedas con un enlace. Caduca a los 30 días y se abre una sola vez.
- Se generan con `node tools/gift.js "MENSAJE" ENERGIA FELICIDAD MONEDAS [REMITENTE]` (clave privada en `.git/gift_key.json`, no se versiona).

## v3.33.2 · energía menos exigente
- Goteo base 0,12 → 0,09 por minuto (100→20 en ~14,8 h, 100→0 en ~18,5 h).
- Juegos más baratos: Esquiva, Adivina, Lima Vuela, Carrera y Bloques −6; Eco Lima y Penaltis −5; Pesca −4; Piedra, papel o tijera −2.
- Practicar en el estudio gasta 0,06 extra por minuto (antes 0,12).

## v3.33.1 · sueño nocturno
- De noche (22:00–6:59) se duerme solo únicamente si la energía baja de 20 (antes de 70); si la hay de sobra, sigue despierto hasta entonces.

## v3.33.0 · Esquiva nuevo, Bloques e iconos de manos
- **Esquiva** (`docs/arcade.js`): 6 columnas en lugar de 3, caen piedras (el dibujo de Piedra) y monedas. Como mucho 2 piedras por tanda (siempre hay hueco) y el golpe solo cuenta mientras la piedra solapa el cuerpo; tocar una columna mueve directo a ella.
- **Bloques** (tipo Arkanoid): la mascota rebota la bola; 5 ladrillos dorados sueltan moneda que hay que recoger.
- **Límites** de cada juego por separado: 5 monedas por partida y 20 al día (`s.arcade`); al llegar a cualquiera termina con «¡Bravo!». Sin monedas hoy se puede jugar igual, solo que no dan 🪙.
- Piedra, papel o tijera con iconos nuevos de 12×12 (`L.hands`) y logro «Demoledor».

## v3.32.2 · el 🍔 también pregunta antes de salir del estudio
El botón de comer lleva a la cocina sin pasar por el aviso de guardar la sesión: si estaba escribiendo, pintando o tocando, cambiaba de sala con la barra encima. Ahora pregunta igual que el resto de cambios de sala.

## v3.32.1 · amanecer
A las 7:00–7:59 el momento del día ponía «Atardecer»; ahora pone «Amanecer» y el sol del jardín sale por la izquierda (la luz naranja es la misma).

## v3.32.0 · huerto rentable, cultivos raros y disfraces de temporada
- **Huerto:** cada semilla da 2 unidades; la cosecha y los platos se venden (huerto → «🪙 Vender cosecha y platos», también desde el mercado del estudio); un plato casero deja «bien alimentado» (el hambre baja un 25 % más despacio 4 h, 2 h si es un snack).
- **Cultivos raros** por nivel de jardinería: 🍄 seta (45), 🌶 pimiento (55), 🍇 uva (65), 🎃 calabaza (75), 🌻 girasol (85) y 🏵 flor lunar (95: solo crece de noche, da 1 y se vende a 55 🪙 o se regala). Semillas de 10 a 30 🪙 y 5 recetas nuevas.
- **Disfraces de temporada** (`docs/season.js`): comer 3 platos del evento disfraza al Limagochi (bruja, Papá Noel, Cupido, corona de flores, gafas y flotador) hasta que acaba el evento; se apuntan en el álbum (32 formas).

## v3.31.1 · barra de obesidad fina y silencio en el cole
Al comer, la obesidad se muestra en la barra fina de arriba (la de las habilidades): vacía = bien, pasada la mitad avisa, llena = obeso; desaparece el recuadro grande sobre la mascota. En el cole o en el trabajo el Limagochi ya no dice palabras.

## v3.31.0 · estudio con piano y sesiones guardadas
- Piano de cola propio (`tools/build_item.py piano imagen.png 34`), caballete un poco a la izquierda y escritorio pegado a la pared. Al tocar, pintar o escribir el Limagochi se dibuja de espaldas delante del objeto (`backRows()` quita la cara) y la pantalla del escritorio se pone blanca.
- Sesiones guardadas: antes de cambiar de habitación, dormir, jugar, ducharlo, irse de vacaciones o enseñarle, si está practicando pregunta «¿Guardar la sesión y …?». La sesión se guarda (`talent.saved`) y se continúa desde el objeto con «▶ Continuar sesión»: mismo cuadro (se ve a medias en el caballete), canción o capítulo. Las interrupciones automáticas (sueño nocturno, hambre, enfermedad…) también guardan en vez de terminar la obra. «Terminar ahora» conserva la sesión corta de antes.
- El panel de trucos y palabras ya no se abre dormido (enseñar dormido ya estaba bloqueado).

## v3.30.1 · regadera y hoja 10 de iconos
Al regar (planta, huerto o manzano) la regadera (icono propio) parpadea 5 s sobre lo regado, con gotas. Hoja 10 de iconos (`ico/g10.png`: 🖤 🔲 🍄 🌶 🍇 🌻 🏵 💘 🌰 💎 y extras sin emoji propio); `tools/build_glyphs.py CARPETA 10` añade solo esa hoja al mapa existente.

## v3.30.0 · tele de pared
La tele pasa a 21×13 px y cuelga de la pared sin base (`tools/build_tv.py` recorta la peana). La ventana del salón se mueve a la derecha, la planta queda por delante de la tele y apoyada en la pared, y la alfombra baja y queda bajo el sofá.

## v3.29.1 · salón con pared lisa
Se quita el estampado de la pared del salón (`tools/build_bg.py` deja un degradado suave por filas); el papel de la tienda se sigue viendo encima.

## v3.29.0 · iconos propios
- 🎨 **143 iconos nuevos** (negro con huecos transparentes, hechos con Nano Banana) en 9 hojas `docs/ico/g1…g9.png`, y los 26 que ya había: sustituyen a los emojis del sistema en todos los menús, la tienda, la comida, los logros, los trucos, los eventos… Se generan con `python3 tools/build_glyphs.py CARPETA` (hoja1…hoja9, 4×4 celdas; el blanco pasa a transparente y cada icono se centra en 96×96) y escribe `docs/glyphs_map.js` (emoji → icono).
- `docs/glyphs.js` hace el cambio al vuelo (observa el DOM) con una máscara tintada con el color del texto; el emoji queda dentro del `<span>` (invisible), así que el texto y los lectores de pantalla no cambian. Depende del ajuste «Iconos negros»: apagado, vuelven los emojis.
- Para que cada objeto tenga su icono, la regadera, el huerto, el manzano y los fondos de nubes y estrellas usan otro emoji interno (🫗 🌿 🍏 ⛅ 🌠).
- Quedan como emoji: 🖤 y 🔲 de Ajustes y los textos tipográficos (flechas, ✓, ✕, barras).
- Pruebas: 26 escenarios (nuevo: iconos propios).
