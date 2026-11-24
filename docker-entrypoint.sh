#!/bin/sh
set -e

echo "→ Migrations Prisma"
node_modules/.bin/prisma migrate deploy

exec "$@"
