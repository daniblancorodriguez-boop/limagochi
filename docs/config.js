/* LIMAGOCHI · configuración
   pushServer: dirección del servidor de avisos (el Worker de Cloudflare, carpeta worker/).
   Déjala vacía ('') para usar el mismo servidor que sirve la app (node server.js). */
window.LIMA = window.LIMA || {};
LIMA.CONFIG = { pushServer: 'https://limagochi-push.daniblancorodriguez.workers.dev' };
