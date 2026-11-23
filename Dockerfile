# Image Debian (glibc) plutôt qu'Alpine : évite les soucis de binaire moteur Prisma avec musl.
FROM node:20-slim AS base
# Le moteur Prisma a besoin d'OpenSSL, absent de l'image slim par défaut.
RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Le schema doit être présent avant `pnpm install` : le postinstall lance `prisma generate`.
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS builder
# Valeur factice pour le build : la vraie arrive au runtime (variables Dokploy).
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
# Les migrations tournent au démarrage du conteneur (docker-entrypoint.sh), pas au build.
RUN pnpm exec next build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/create-admin.ts ./scripts/create-admin.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/password.ts ./src/lib/password.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --chown=nextjs:nodejs --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
# Binaires appelés directement (pas `pnpm start`) : corepack tenterait de télécharger pnpm
# au premier lancement, ce qui échoue en utilisateur non-root.
CMD ["node_modules/.bin/next", "start"]
