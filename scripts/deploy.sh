#!/usr/bin/env bash
# ============================================================
# RONDA — Deploy exclusivamente desde GitHub
#
# Este script es la ÚNICA vía de deploy del servidor:
#   1. Trae siempre la última versión de origin/main (GitHub)
#   2. Resetea el working tree exactamente a lo publicado
#   3. Instala, prepara base de datos, compila y reinicia
#
# Uso:
#   bash scripts/deploy.sh          # deploy solo si hay cambios nuevos
#   bash scripts/deploy.sh --force  # rebuild completo aunque no haya cambios
# ============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="main"
cd "$APP_DIR"

echo "→ RONDA deploy desde GitHub ($(git remote get-url origin))"

# 1. Traer la última versión publicada
git fetch origin "$BRANCH"
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ] && [ "${1:-}" != "--force" ]; then
  echo "✓ Ya estás en la última versión de GitHub ($LOCAL). Nada que hacer."
  echo "  Usá --force para forzar un rebuild completo."
  exit 0
fi

echo "→ Actualizando código: $LOCAL → $REMOTE"
git reset --hard "origin/$BRANCH"

# 2. Dependencias
echo "→ Instalando dependencias..."
bun install --frozen-lockfile

# 3. Base de datos (SQLite local; seed solo la primera vez)
echo "→ Generando cliente Prisma..."
bun run db:generate

if [ ! -f db/custom.db ]; then
  echo "→ Base de datos nueva: creando esquema y cargando seed demo..."
  bun run db:push
  bun scripts/seed.ts
else
  echo "→ Base de datos existente: sincronizando esquema..."
  bun run db:push
fi

# 4. Build de producción (modo servidor standalone)
echo "→ Compilando producción (esto puede tardar un poco)..."
bun run build:server

# 5. Reiniciar servidor
echo "→ Reiniciando servidor..."
pkill -f "standalone/server.js" 2>/dev/null || true
sleep 2
rm -f server.log
NODE_ENV=production nohup bun .next/standalone/server.js >> server.log 2>&1 &

# 6. Verificación de salud
for i in $(seq 1 15); do
  sleep 2
  if curl -sf -o /dev/null http://localhost:3000/; then
    echo "✓ RONDA desplegada y saludable desde GitHub ($REMOTE)"
    echo "  Deploy = commit $(git rev-parse --short HEAD) · rama $BRANCH"
    exit 0
  fi
done

echo "✗ El servidor no respondió después del deploy. Revisá server.log"
exit 1
