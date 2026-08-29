# API de referencia (backend real, futuro)

Estas rutas implementaron el backend del MVP cuando corría con servidor
(Next.js API routes + Prisma/SQLite). Hoy el MVP estático usa el backend
simulado en el navegador (`src/lib/local-api.ts`) y estas rutas quedan
**fuera del router** como contrato de referencia.

Para volver a un backend real:
1. Mover estas rutas a `src/app/api/`
2. Enrutar `src/lib/client.ts` hacia `fetch()` en vez de `handleApi()`
3. Reemplazar `saveMediaBlob()` por subidas a `/api/media/upload`
