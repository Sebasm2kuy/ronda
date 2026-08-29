# RONDA

> **30 segundos para presentarte. 5 minutos para conocerte.**
> **NO VENIMOS A BUSCAR PERFILES. VENIMOS A CONOCER PERSONAS.**

RONDA es una plataforma social de encuentro basada en contacto humano real: nada de deslizar perfiles. Te presentás con un video de 30 segundos, entrás a una ronda, tenés una conversación de 5 minutos con rompehielos y, si la química existe, los dos deciden.

## Flujo completo

```
LANDING → REGISTRO → PERFIL → VIDEO DE PRESENTACIÓN (30s)
   → SALA DE ESPERA → RONDA (5 min) → EVALUACIÓN
   → MATCH → CHAT → EVENTOS → PERFIL
```

## Tecnologías

| Capa | Elección |
|------|----------|
| Framework | Next.js 16 (App Router, doble modo: export estático / standalone) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui + framer-motion |
| Datos (MVP público) | Backend simulado en el navegador: IndexedDB (`src/lib/browser-api.ts`) con los mismos 10 usuarios demo — desplegado en GitHub Pages |
| Datos (servidor, referencia) | SQLite vía Prisma ORM — `src/server/api-reference/` conserva el contrato de API real para el futuro |
| Video | getUserMedia + MediaRecorder (grabación directa en el navegador), videollamada simulada con arquitectura lista para WebRTC |
| Auth | En el MVP estático la sesión vive en el navegador. Preparado para OAuth real (Google) — los botones Google/TikTok hoy muestran su estado honesto de integración pendiente, nunca simulan autenticación |

## Requisitos

- Node.js 20+ o Bun 1.2+
- El MVP público (GitHub Pages) no requiere ningún servicio externo

## Puesta en marcha

```bash
# 1. Instalar dependencias
bun install        # o npm install

# 2. Configurar variables (opcional, hay defaults)
cp .env.example .env

# 3. Crear la base de datos y generar el cliente
bun run db:generate
bun run db:push

# 4. Cargar datos demo (10 usuarios, 4 eventos, 12 rompehielos, 1 ronda activa)
bun scripts/seed.ts

# 5. Desarrollo
bun run dev        # http://localhost:3000

# 6. Producción
bun run build
bun run start
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ADMIN_PIN` | `ronda2026` | Pin del panel `/admin` |
| `UPLOAD_DIR` | `./uploads` | Directorio de fotos/videos subidos |
| `DATABASE_URL` | `file:./db/custom.db` | Ruta de la base SQLite |

## Estructura

```
src/
  app/
    page.tsx              # Landing (identidad RONDA)
    registro/             # Registro wizard (5 pasos, +18, términos)
    onboarding/video/     # Grabación de presentación (30s, MediaRecorder)
    (app)/                # Shell con bottom-nav móvil + sidebar desktop
      inicio/ ronda/ eventos/ conexiones/ perfil/
    cita/                 # Videollamada (?id=; timer 5:00, rompehielos rotativo)
    cita/fin/             # Evaluación de la ronda
    match/                # ¡Hay conexión!
    chat/                 # Chat de conexiones
    admin/                # Panel administrador
    terminos/ privacidad/
  components/             # cita/, video/, shell/, ui/
  lib/                    # client (router), browser-api (backend simulado),
                          # idb (IndexedDB), demo-data, auth de referencia,
                          # constants, types
  server/api-reference/   # Contrato de API del backend real (futuro)
prisma/schema.prisma      # Modelo de datos (User, Round, Connection, Message,
                          # Event, Report, Block, Icebreaker…)
public/avatars/           # Fotos demo
public/demo-videos/       # Videos demo de presentación
scripts/deploy.sh         # Deploy del modo servidor desde GitHub
scripts/seed.ts           # Datos demo reproducibles (modo servidor)
```

## Datos demo

10 usuarios ficticios de Uruguay (Sofía 38, Martina 41, Carolina 36, Lucía 43, Valentina 39, Federico, Diego, Martín, Andrés, Rodrigo) con foto, video de presentación, bio, intereses y estado (`disponible / esperando / en ronda / terminó ronda / conexión`). El seed crea además 4 eventos y 12 preguntas rompehielos.

Para restablecer la base al estado demo:

```bash
bun scripts/cleanup_test_users.ts   # elimina usuarios reales de prueba
bun run db:push && bun scripts/seed.ts   # reset total
```

## Seguridad (desde el día uno)

- Exclusivamente +18 (confirmación en registro)
- Reportar y bloquear usuario desde la ronda y el chat
- Todo contacto pasa por el sistema de conexiones: nadie puede escribirte sin pasar por una ronda
- Consentimiento de cámara/micrófono explícito antes de grabar
- Términos y política de privacidad en la app

## Preparado para el futuro (arquitectura)

- **OAuth real (Google / TikTok)**: los botones existen y están marcados como integración pendiente; el modelo `User.provider` ya lo soporta.
- **WebRTC / proveedor de videollamada real**: la pantalla de cita encapsula la capa de video; reemplazar la simulación no toca el resto del flujo.
- **IA**: generación de rompehielos personalizados, mejor matching, moderación asistida, recomendación de eventos. La IA nunca habla por el usuario — solo facilita que dos humanos se conozcan.
- **Segunda oportunidad**: “Quizás quedó algo pendiente…” — el modelo de datos permite reintroducir conexiones pasadas.

## Deploy — únicamente desde GitHub

### 🌐 Sitio público: GitHub Pages (canónico)

Cada push a `main` dispara `.github/workflows/deploy-pages.yml`: compila el export estático (`NEXT_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/ronda`), lo empaqueta bajo `/ronda` con redirect raíz y lo publica automáticamente.

> **URL pública: https://sebasm2kuy.github.io/ronda/**

En este modo todo el MVP corre en el navegador: matching demo, rondas, chat, eventos y los datos del usuario viven en IndexedDB del dispositivo (privados de cada navegador). La grabación de la presentación de 30 segundos usa la cámara real vía getUserMedia/MediaRecorder y queda guardada localmente.

### CI (GitHub Actions)

`.github/workflows/ci.yml` corre en cada push/PR a `main`: instala dependencias con lockfile congelado, genera el cliente Prisma, crea la base con seed, pasa el lint y compila. Si el CI falla, el código no se considera deployable.

### Modo servidor (opcional, para VPS o backend real)

El mismo repo también compila modo servidor standalone (`bun run build:server`), pensado para cuando se conecte un backend real (`src/server/api-reference/` tiene el contrato completo).

```bash
# Deploy del servidor desde GitHub (idempotente)
bash scripts/deploy.sh          # solo actúa si hay cambios nuevos en origin/main
bash scripts/deploy.sh --force  # rebuild forzado
```

### Hosting externo (opcional, futuro)

- **Vercel/Railway/Render**: conectar este mismo repo como fuente; setear `ADMIN_PIN`, `DATABASE_URL` (volumen persistente para SQLite o cambiar a Postgres) y `UPLOAD_DIR`.
- **VPS propio**: `scripts/deploy.sh` detrás de un reverse proxy (se incluye `Caddyfile` de ejemplo).
