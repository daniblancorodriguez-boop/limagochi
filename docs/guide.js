/* ==========================================================================
   LIMAGOCHI · Guía básica para cuidar tu Limagochi
   Resumen de todas las instrucciones del juego. Las palabras clave se leen de voice.js,
   así que la guía siempre está al día con lo que entiende la mascota.
   ========================================================================== */
(() => {
'use strict';
window.LIMA = window.LIMA || {};
const L = LIMA;
const A = () => L.api;

const el = (cls, text) => { const e = document.createElement('div'); e.className = cls; e.textContent = text; return e; };
const H = t => el('gh', t);
const P = t => el('gp', t);
const LI = t => el('gp gli', '• ' + t);

function keywords() {
  const v = L.voice;
  if (!v) return [];
  return [
    H('🎯 Trucos (di la palabra y repítela)'),
    ...v.tricks.map(t => LI(`${t.icon} ${t.name}: «${[...new Set(t.keys)].join('», «')}»`)),
    H('🗣 Palabras que puede aprender a decir'),
    ...v.words.map(w => LI(`${w.icon} «${w.say}»: di «${[...new Set(w.keys)].join('», «')}»`))
  ];
}

const TOPICS = [
  { icon: '🦋', title: 'Insectos y álbum', body: () => [
    H('11 bichos en el jardín'),
    LI('Aparecen solos mientras estás en el 🌳 jardín. Tócalos para atraparlos y ganar monedas o felicidad.'),
    LI('Álbum de insectos: ✨ Estado → 🦋 Insectos. +3 🪙 por cada especie nueva y 100 🪙 al completarlo.'),
    LI('Algunos salen solo de noche (la luciérnaga) y hay una legendaria, la mariposa dorada, que casi nunca aparece.')
  ] },
  { icon: '🎰', title: 'Casino y más juegos', body: () => [
    H('🎮 Jugar → 🎰 Casino (dinero ficticio)'),
    LI('Tragaperras y ruleta de apuestas: apuesta máxima 10 🪙, 60 jugadas al día y el casino cierra si pierdes 50 🪙 en un día.'),
    LI('🎁 Ruleta del día: un giro gratis cada día con premio de 0 a 15 🪙.'),
    H('Otros juegos'),
    LI('🎣 Pesca: toca justo cuando pique. Los peces van a Sanas.'),
    LI('✊ Piedra, papel o tijera: gana 2 de 3 contra Limagochi.'),
    LI('🏃 Carrera: toca para saltar las vallas y llegar antes que el rival.')
  ] },
  { icon: '🌳', title: 'El jardín', body: () => [
    H('Tercer cuarto: el botón → de la esquina recorre salón, cuarto y jardín'),
    LI('🪑 Tumbona: tómala para tomar el sol (recupera energía). 🏊 Piscina: chapuzón de día (mucha felicidad y se limpia); cansado, puede resfriarse.'),
    LI('🌳 Manzano: riégalo (💧 cuando lo pide). Crece por fases y da hasta 3 manzanas a la vez; recógelas tocándolo.'),
    LI('🥕 Huerto: compra semillas en la tienda, plántalas, riégalas y cosecha. Lo cosechado sale en 🥗 Sanas.'),
    LI('🦋 Bichos: aparecen solos en el jardín; tócalos para atraparlos (felicidad, monedas o miel 🍯; la abeja a veces pica).'),
    LI('⚽ La pelota también se puede usar en el jardín.')
  ] },
  { icon: '🛋️', title: 'Muebles de la casa', body: () => [
    H('Compra muebles en la 🛒 tienda'),
    LI('Hay dos cuartos: 🛋️ Salón (sofá, tele, planta, alfombra, pelota, peluche) y 🛏️ Cuarto (cama, lámpara, cuadro). Cambia con el botón de la esquina inferior derecha de la pantalla. Al dormir con cama, se va solo al cuarto.'),
    LI('El botón ▦ de abajo muestra u oculta la rejilla de píxeles.'),
    LI('Una vez en casa, TOCA el mueble en la pantalla para usarlo.'),
    LI('🛋️ Sofá: Sentarse (sube la felicidad) o Tumbarse (recupera energía). Se levanta solo al rato.'),
    LI('📺 Tele: Encender, Ver la tele (mucha felicidad, pero baja un poco la disciplina) y Apagar.'),
    LI('🛏️ Cama: Tumbarse de día para descansar. De noche, al apagar la luz (o al irse a dormir solo) se acuesta en ella y descansa mejor.'),
    LI('🧸 Peluche: toca para Abrazar (+felicidad, cada 15 min).'),
    LI('⚽ Pelota: toca para jugar con ella (+felicidad, cada 10 min).'),
    LI('💡 Lámpara: enciéndela y sube la felicidad poco a poco (se apaga al dormir).'),
    LI('🪴 Planta: toca para regarla (+felicidad, cada 30 min).'),
    LI('🖼️ Cuadro y 🟣 alfombra: solo decoran la casa.')
  ] },
  { icon: '🚿', title: 'Higiene y ducha', body: () => [
    H('La barra 🧼 de higiene'),
    LI('Con el tiempo (y con cada caquita sin limpiar) se ensucia. A partir del 60% te avisa.'),
    LI('Si la higiene llega a casi 0 baja la felicidad y aumenta el riesgo de enfermar.'),
    H('Cómo se ducha'),
    LI('Pulsa 🚿 y FROTA con el dedo (o el ratón) las manchas marrones con la esponja. Cuanto más limpies, mejor.'),
    LI('Una ducha al día es lo ideal. No se puede duchar enfermo, dormido ni si ya está limpio.')
  ] },
  { icon: '✉️', title: 'Buzón e historias', body: () => [
    LI('📊 Estado → ✉️ Buzón: tu Limagochi te escribe cuando evoluciona, aprende algo o recibe visitas.'),
    LI('Durante cada evento de temporada llega una historia de 3 capítulos (días 1, 3 y 5).'),
    LI('Al leer el capítulo final ganas 10 🪙 y un 🎩 recuerdo: elige gorro en Buzón → Recuerdos.')
  ] },
  { icon: '🤝', title: 'Visitas de amigos', body: () => [
    LI('📊 Estado → 🤝 Visitas: enseña tu QR o manda tu enlace. Tu amigo lo abre y tu Limagochi irá a visitarle.'),
    LI('Para recibir una visita pega el enlace de tu amigo, o ábrelo directamente.'),
    LI('Cada amigo da premio una vez cada 20 horas. Hay logros por tener amigos.')
  ] },
  { icon: '🍔', title: 'Cuidados básicos', body: () => [
    H('Los 4 medidores'),
    LI('🍖 Hambre: corazones llenos = saciado. Dale de comer antes de que se vacíen.'),
    LI('⏱ De bebé y de niño los corazones se vacían MUCHO más deprisa (y hace más caca) que de adulto.'),
    LI('🤒 Poco antes de crecer se pone malito (no cuenta como error). De viejo enferma cada día y necesita dosis doble.'),
    LI('😊 Felicidad: juega con él y dale snacks de vez en cuando.'),
    LI('⚡ Energía: se gasta despierto y se recupera durmiendo.'),
    LI('🎓 Disciplina: sube regañándolo (📢) cuando te llama sin motivo; baja sola con el tiempo.'),
    H('Las acciones'),
    LI('🍔 Alimentar, tres tipos: 🥗 SANAS (lentejas, pollo, arroz…: dan energía y disciplina, pero animan poco), 🍔 RÁPIDA (perrito, pizza, patatas…: animan mucho, pero bajan la disciplina, ensucian y engordan) y 🍬 SNACKS (engordan y dan caries).'),
    LI('👅 Paladar (📊 Estado): si come mucha rápida o dulces se acostumbra y puede RECHAZAR la comida sana y enfadarse (de 3 a 5 veces seguidas como mucho, menos si tiene disciplina alta). Insiste con la sana y se reeduca.'),
    LI('🎓 Cada cosa que aprende al hablarle sube un poquito su disciplina.'),
    LI('🎮 Jugar: minijuegos que dan felicidad y 🪙, gastan energía y hacen adelgazar.'),
    LI('💊 Curar: si se enferma (cara triste y pálida) hacen falta 2 dosis.'),
    LI('🧹 Limpiar: quita las caquitas; si se acumulan enferma.'),
    LI('💡 Luz: apaga la luz para que duerma.'),
    LI('📢 Regañar: solo cuando te llama (❗). Si lo regañas sin motivo se pone triste.'),
    LI('😈 Travesuras: de vez en cuando (más si tiene poca disciplina) grita por el altavoz o pinta la pared. Regáñalo con 📢 (+disciplina) y quita los garabatos con 🧹. No hay castigo si tardas.'),
    LI('🎤 Hablarle: ver «Hablarle y enseñar».'),
    H('Avisos'),
    P('El ❗ de la esquina y el título de la pestaña avisan de que algo falla. Pulsa el ❗ para saber qué.'),
    P('Cada regaño acertado sube la disciplina un 25%. Un error de cuidado es: dejar que el hambre llegue a 0, 3 caquitas sin limpiar, enfermo sin curar durante 1 hora o ignorar una llamada 45 minutos. Los errores afectan a la evolución.')
  ] },
  { icon: '📈', title: 'Crecimiento y evolución', body: () => [
    H('Tiempos (como el Tamagotchi original)'),
    LI('🥚 Huevo: 5 minutos.'),
    LI('👶 Bebé: ~65 minutos.'),
    LI('🧒 Niño: hasta el día 3 de vida.'),
    LI('😎 Adolescente: hasta el día 6.'),
    LI('🌟 Adulto: unos 12 días de vida (menos si está obeso).'),
    H('Qué forma tendrá'),
    LI('De bebé a niño: con 0–1 errores sale Niño bueno; con más, Niño travieso.'),
    LI('De niño a adolescente: con 0–2 errores sale Lima Joven; con más, Lima Macarra.'),
    LI('De adolescente a adulto cuenta su dieta dominante (verduras, carne o dulces) y los errores: 0–1 errores = forma excelente, 2–5 = normal, 6 o más = descuidada.'),
    LI('⭐ Estrella: ≤1 error, disciplina ≥80% y dieta variada. ¡La más difícil!'),
    P('Mira 📊 Estado → 📖 Álbum para ver todas las formas y cómo conseguir cada una.'),
    H('Peligros'),
    P('Si pasa mucho tiempo con hambre a cero, enfermo o con 4 caquitas, acaba muriendo (unas 12 horas seguidas de descuido). Con el peso por encima del límite está obeso: enferma más y vive menos.')
  ] },
  { icon: '🎓', title: 'Hablarle y enseñar', body: () => [
    H('Cómo funciona'),
    LI('Pulsa 🎤 en la pantalla principal y dile una palabra clave en voz alta (necesitas permitir el micrófono; funciona mejor en Chrome).'),
    LI('Cada vez que lo repites aprende un poco más. Los trucos y palabras aprendidos al 100% los hace a la primera.'),
    LI('Cuanto más lo entrenas con palabras clave, más listo se vuelve y más rápido aprende (🧠 en Estado).'),
    LI('Pero estudiar cansa: cada lección le quita diversión. Tras unas 8 lecciones seguidas se cansa y no querrá escuchar durante aproximadamente una hora. Si insistes, se enfada.'),
    LI('Un bebé solo balbucea; un adulto bien criado pronuncia perfecto. También olvida poco a poco lo que no practica.'),
    LI('Si tu navegador no tiene reconocimiento de voz, mira el progreso en 📊 Estado → 🎓 Trucos y palabras (también sirve para practicar con botones).'),
    ...keywords(),
    P('Puedes decir varias en una frase: «salta y baila».')
  ] },
  { icon: '🌙', title: 'Día, noche y eventos', body: () => [
    H('Ciclo día/noche (tu hora real)'),
    LI('De 22:00 a 07:00 es de noche: se duerme solo cuando está cansado y no se le molesta con avisos.'),
    LI('De día solo echa la siesta si está agotado. Se despierta solo al amanecer.'),
    LI('Si lo despiertas de noche, se queda levantado unos 45 minutos.'),
    LI('Puedes desactivarlo en ⚙️ Ajustes.'),
    H('Eventos de temporada'),
    LI('🎃 Halloween (24 oct–2 nov) · 🎄 Navidad (15 dic–6 ene) · 💝 San Valentín (10–15 feb)'),
    LI('🌸 Primavera (20 mar–20 abr) · ☀️ Verano (21 jun–31 ago)'),
    P('Durante un evento hay fondo especial, gorro, comida de temporada y los premios en 🪙 se duplican.')
  ] },
  { icon: '🪙', title: 'Juegos, tienda y logros', body: () => [
    H('Minijuegos'),
    LI('🎯 Adivina: ¿hacia dónde mirará? · 🐦 Lima Vuela: toca para volar · ☄️ Esquiva: esquiva rocas y recoge estrellas · ⚽ Penaltis: 5 tiros, toca cuando la mira esté sobre la portería · 🧠 Eco Lima: repite la secuencia.'),
    LI('Ganar da Lima Points (🪙). Necesita estar despierto, sano y con energía.'),
    H('Tienda 🛒'),
    P('Con 🪙 compras comida gourmet, fondos y juguetes (la pelota y el peluche le aburren menos).'),
    H('Logros y álbum'),
    P('📊 Estado → 🏆 Logros y 📖 Álbum. Cada logro da 🪙. El álbum y los logros se conservan al empezar un huevo nuevo.')
  ] },
  { icon: '💾', title: 'Copia, avisos y manejo', body: () => [
    H('Controles'),
    LI('Toca los iconos de arriba, o usa los botones físicos: A cambia de opción, B acepta, C cancela.'),
    LI('Botones de abajo: 🔊 sonido · 🔔 avisos · 🎨 color/LCD · colores de la carcasa.'),
    H('Vacaciones 🏖️'),
    LI('⚙️ Ajustes → Vacaciones detiene el tiempo: no crece, no pasa hambre ni enferma. Vuelve cuando quieras con «Volver de vacaciones».'),
    H('No pierdas tu Limagochi'),
    LI('Se guarda solo en este dispositivo. Sigue viviendo (y envejeciendo) aunque cierres la app.'),
    LI('📊 Estado → ⚙️ Ajustes → Exportar para guardar una copia; Importar para recuperarla en otro móvil.'),
    LI('📡 Avisos con la app cerrada: solo si el juego está alojado con servidor de avisos.')
  ] }
];

function openTopic(i) {
  const a = A(), t = TOPICS[i];
  const box = document.createElement('div'); box.className = 'guide';
  box.append(...t.body());
  a.openPanel([a.p(`${t.icon} ${t.title}`), box, a.btn('Atrás', () => open(), 'ghost')], { full: true });
}

function open(back) {
  const a = A();
  back = back || open._back;
  open._back = back;
  a.openPanel([
    a.p('📘 Guía básica para cuidar tu Limagochi'),
    ...TOPICS.map((t, i) => a.btn(`${t.icon} ${t.title}`, () => openTopic(i))),
    a.btn('Cerrar', back || a.closePanel, 'ghost')
  ], { full: true });
}

L.guide = { open, topics: TOPICS };
})();
