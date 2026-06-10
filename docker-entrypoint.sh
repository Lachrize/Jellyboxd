#!/bin/sh
set -e

mkdir -p /app/data

# --- Zero-config secrets -----------------------------------------------------
# Jellyboxd needs two secrets: AUTH_SECRET (encrypts stored Jellyfin API keys +
# signs sessions) and JELLYBOXD_SYNC_KEY (shared bearer the Jellyfin plugin uses).
# If they aren't provided via the environment we generate them once and persist
# them in the data volume, so `docker compose up` works with no setup and the
# values stay stable across restarts (changing AUTH_SECRET would orphan stored
# secrets; changing the sync key would unpair the plugin).
SECRETS_FILE=/app/data/.secrets.env
[ -f "$SECRETS_FILE" ] && . "$SECRETS_FILE"

if [ -z "$AUTH_SECRET" ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  echo "AUTH_SECRET='$AUTH_SECRET'" >> "$SECRETS_FILE"
fi
export AUTH_SECRET

if [ -z "$JELLYBOXD_SYNC_KEY" ]; then
  JELLYBOXD_SYNC_KEY=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
  echo "JELLYBOXD_SYNC_KEY='$JELLYBOXD_SYNC_KEY'" >> "$SECRETS_FILE"
fi
export JELLYBOXD_SYNC_KEY

echo "----------------------------------------------------------------------"
echo " Jellyboxd is starting."
echo " Plugin sync key (paste it into the Jellyfin plugin, or copy it from"
echo " Jellyboxd -> Parametres -> Jellyfin):"
echo "   $JELLYBOXD_SYNC_KEY"
echo "----------------------------------------------------------------------"

if [ -n "$DATABASE_URL" ]; then
  echo "Generating Prisma client..."
  npx prisma generate
  echo "Applying Prisma schema..."
  npx prisma db push --skip-generate
fi

echo "Starting Jellyboxd on port ${PORT:-3000}..."
exec npm run start -- --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}"
