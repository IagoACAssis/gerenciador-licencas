FROM node:26-alpine AS base
RUN npm install -g pnpm@11.0.9
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS dependencias-producao
RUN pnpm install --frozen-lockfile --prod

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencias-producao /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json next.config.ts ./
COPY drizzle ./drizzle
COPY scripts/migrar.ts ./scripts/migrar.ts
COPY src/banco/migrar.ts ./src/banco/migrar.ts
USER node
EXPOSE 3000
# Aplica as migrações pendentes e só então sobe a aplicação.
CMD ["sh", "-c", "node scripts/migrar.ts && exec node_modules/.bin/next start -p 3000"]
