FROM node:25-slim

RUN npm install -g pnpm@9.12.2
WORKDIR /app

# Dépendances d'abord (mises en cache tant que le lockfile ne change pas)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter web build

ENV NODE_ENV=production
CMD ["node", "apps/api/src/index.ts"]
