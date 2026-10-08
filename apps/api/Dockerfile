# Se construye desde la raíz del repositorio: docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
RUN npm install -g pnpm@12.9.1
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN npx --yes turbo@2.11.5 prune api --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo build --filter=api
RUN pnpm --filter api deploy --prod /prod/api

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /prod/api .
USER node
CMD ["node", "dist/main.js"]
