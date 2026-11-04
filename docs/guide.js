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
  { icon: '🍔', title: 'Cuidados básicos', body: () => [
    H('Los 4 medidores'),
    LI('🍖 Hambre: corazones llenos = saciado. Dale de comer antes de que se vacíen.'),
    LI('😊 Felicidad: juega con él y dale snacks de vez en cuando.'),
    LI('⚡ Energía: se gasta despierto y se recupera durmiendo.'),
    LI('🎓 Disciplina: sube regañándolo (📢) cuando te llama sin motivo; baja sola con el tiempo.'),
    H('Las acciones'),
    LI('🍔 Alimentar: las COMIDAS sacian el hambre; los SNACKS suben la felicidad pero engordan y dan caries.'),
    LI('🎮 Jugar: minijuegos que dan felicidad y 🪙, gastan energía y hacen adelgazar.'),
    LI('💊 Curar: si se enferma (cara triste y pálida) hacen falta 2 dosis.'),
    LI('🧹 Limpiar: quita las caquitas; si se acumulan enferma.'),
    LI('💡 Luz: apaga la luz para que duerma.'),
    LI('📢 Regañar: solo cuando te llama (❗). Si lo regañas sin motivo se pone triste.'),
    LI('🎤 Hablarle: ver «Hablarle y enseñar».'),
    H('Avisos'),
    P('El ❗ de la esquina y el título de la pestaña avisan de que algo falla. Pulsa el ❗ para saber qué.'),
    P('Un error de cuidado es: dejar que el hambre llegue a 0, 3 caquitas sin limpiar, enfermo sin curar durante 1 hora o ignorar una llamada 45 minutos. Los errores afectan a la evolución.')
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
    LI('Si tu navegador no tiene reconocimiento de voz, usa 📊 Estado → Ajustes… o el panel de práctica con botones.'),
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
    LI('🎯 Adivina: ¿hacia dónde mirará? · 🐦 Lima Vuela: toca para volar · ☄️ Esquiva: esquiva rocas y recoge estrellas · 🧠 Eco Lima: repite la secuencia.'),
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
