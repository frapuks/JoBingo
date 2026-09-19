# Construit depuis la racine du dépôt (voir docker-compose.yml) pour inclure packages/shared.
FROM node:22-alpine

# tzdata : Alpine n'embarque aucun fuseau, TZ serait ignorée et tout tournerait en UTC.
# postgresql16-client : pg_dump avant chaque migration. Même version majeure que le
# serveur, sinon pg_dump refuse de sauvegarder.
RUN apk add --no-cache tzdata postgresql16-client

WORKDIR /app

# Tous les package.json sont copiés : npm ci vérifie le lockfile de l'ensemble des workspaces.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace apps/api --include-workspace-root=false --no-audit --no-fund \
  && npm cache clean --force

COPY packages/shared packages/shared
COPY apps/api apps/api

USER node
WORKDIR /app/apps/api
EXPOSE 3000

# exec : node devient le processus 1 et reçoit directement le SIGTERM de docker stop.
CMD ["sh", "-c", "node --import tsx src/migrate.ts && exec node --import tsx src/server.ts"]
