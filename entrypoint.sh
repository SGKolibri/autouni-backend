#!/bin/sh
set -e

echo "🔄 Waiting for database to be ready..."
# Tenta conectar usando prisma migrate status (mais confiável)
MAX_RETRIES=10
RETRY_COUNT=0
until npx prisma migrate status > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Database is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to database after $MAX_RETRIES attempts"
  exit 1
fi

echo "✅ Database is up - executing migrations"
npx prisma migrate deploy

echo "🌱 Running seed"
npx prisma db seed || echo "No seed script found or seed failed"

echo "🚀 Starting application..."
exec node dist/src/main.js