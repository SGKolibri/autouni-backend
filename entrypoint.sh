#!/bin/sh
set -e

echo "🔄 Waiting for database and applying migrations..."
# migrate deploy é idempotente, então serve como sonda de conexão e aplica as
# migrações no mesmo passo. Não usar `migrate status`: ele sai com código 1
# quando há migrações pendentes, mesmo com o banco acessível.
MAX_RETRIES=10
RETRY_COUNT=0
until npx prisma migrate deploy; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Failed to apply migrations after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "⏳ Database is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "✅ Migrations applied"

echo "🌱 Running seed"
npx prisma db seed || echo "No seed script found or seed failed"

echo "🚀 Starting application..."
exec node dist/src/main.js
