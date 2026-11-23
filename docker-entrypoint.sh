#!/bin/sh
set -e

echo "→ Migrations Prisma"
node_modules/.bin/prisma migrate deploy

# Compte admin : créé (ou mot de passe remis à jour) si les variables sont définies.
if [ -n "$ADMIN_USERNAME" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "→ Compte admin \"$ADMIN_USERNAME\""
  node_modules/.bin/tsx scripts/create-admin.ts
fi

exec "$@"
