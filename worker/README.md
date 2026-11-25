# Limagochi · servidor de avisos (Cloudflare Workers)

Envía los avisos de Limagochi (hambre, caca, sueño…) aunque la app esté cerrada. Usa solo el plan gratuito de Cloudflare:
**Workers** (código) + **D1** (base de datos) + **cron** (cada minuto).

## Despliegue desde el móvil (sin instalar nada)
1. **Crear la base de datos**: cloudflare.com → *Storage & databases* → *D1 SQL database* → *Create* → nombre `limagochi`. Copia su **Database ID**.
2. Pega ese ID en `worker/wrangler.toml` (`database_id`) y haz commit (o pásaselo a Claude para que lo haga).
3. **Crear el Worker**: *Workers & Pages* → *Create* → *Import a repository* → elige `limagochi`.
   - *Root directory*: `worker`
   - *Deploy command*: `npx wrangler deploy`
4. **Clave secreta**: en el Worker → *Settings* → *Variables and secrets* → *Add* → tipo **Secret**, nombre `VAPID_PRIVATE`, valor = la clave privada que te dio Claude. Vuelve a desplegar.
5. Abre `https://limagochi-push.<tu-subdominio>.workers.dev/api/health`: debe decir `"configured":true`.
6. Escribe esa dirección en `docs/config.js` (`pushServer`) y sube el cambio.

## Probar en local
```
cd worker && npm install
# crea .dev.vars con VAPID_PRIVATE=... y VAPID_PUBLIC=...
npx wrangler dev --test-scheduled      # y prueba el cron con:  curl "localhost:8787/__scheduled?cron=*+*+*+*+*"
```

## Notas
- Las claves VAPID se generan con `node -e "console.log(require('web-push').generateVAPIDKeys())"` (la pública va en `wrangler.toml`; la privada, solo como secreto).
- En iPhone los avisos solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4+).
- Las suscripciones sin actividad durante 60 días se borran solas.
