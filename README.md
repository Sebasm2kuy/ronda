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
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui + framer-motion |
| Base de datos | SQLite vía Prisma ORM |
| Video | getUserMedia + MediaRecorder (grabación directa en el navegador), videollamada simulada con arquitectura lista para WebRTC |
| Auth | Sesiones con cookie httpOnly. Preparado para OAuth real (Google) — los botones Google/TikTok hoy muestran su estado honesto de integración pendiente, nunca simulan autenticación |

## Requisitos

- Node.js 20+ o Bun 1.2+
- No requiere servicios externos para funcionar (SQLite embebido)

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
    cita/[id]/            # Videollamada (timer 5:00, rompehielos rotativo)
    cita/[id]/fin/        # Evaluación de la ronda
    match/[id]/           # ¡Hay conexión!
    chat/[id]/            # Chat de conexiones
    admin/                # Panel administrador
    terminos/ privacidad/
  components/             # cita/, video/, shell/, ui/
  lib/                    # auth, db, matching, media, constants, types
  app/api/                # auth, users, rounds, connections, events,
                          # icebreakers, media, reports, blocks, stats, admin
prisma/schema.prisma      # User, Session, Round, Connection, Message,
                          # Event, EventAttendee, Report, Block, Icebreaker
public/avatars/           # Fotos demo
public/demo-videos/       # Videos demo de presentación
scripts/seed.ts           # Datos demo reproducibles
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

El deploy de RONDA nace **exclusivamente de este repositorio**: el servidor no se toca a mano, todo cambia vía `git push` a `main`.

### Flujo

```
git push → GitHub (main)
             │
             ├── GitHub Actions CI: lint + build validan el push
             │
             └── servidor: bash scripts/deploy.sh
                   git fetch + reset --hard origin/main
                   → bun install → prisma → build → restart
```

### CI (GitHub Actions)

`.github/workflows/ci.yml` corre en cada push/PR a `main`: instala dependencias con lockfile congelado, genera el cliente Prisma, crea la base con seed, pasa el lint y compila la build de producción. Si el CI falla, el código no se considera deployable.

### Deploy en el servidor

```bash
# Primera vez: clonar el repo y configurar .env
git clone https://github.com/Sebasm2kuy/ronda.git
cd ronda
cp .env.example .env   # editar DATABASE_URL (absoluta) y ADMIN_PIN

# Deploy (idempotente: solo actúa si hay cambios nuevos en GitHub)
bash scripts/deploy.sh

# Rebuild forzado
bash scripts/deploy.sh --force
```

El script garantiza que lo que corre en el servidor es **exactamente** `origin/main`: hace `git reset --hard`, recrea la build y reinicia con verificación de salud. La base de datos SQLite vive fuera del repo y se siembra con el seed demo la primera vez.

### Hosting externo (opcional, futuro)

- **Vercel/Railway/Render**: conectar este mismo repo como fuente; setear `ADMIN_PIN`, `DATABASE_URL` (volumen persistente para SQLite o cambiar a Postgres) y `UPLOAD_DIR`.
- **VPS propio**: `scripts/deploy.sh` detrás de un reverse proxy (se incluye `Caddyfile` de ejemplo).
