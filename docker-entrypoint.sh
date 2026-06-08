#!/bin/sh
set -e

mkdir -p /app/data

if [ -n "$DATABASE_URL" ]; then
  echo "Applying Prisma schema..."
  npx prisma db push --skip-generate
fi

echo "Starting Jellyboxd on port ${PORT:-3000}..."
exec npm run start -- --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}"
