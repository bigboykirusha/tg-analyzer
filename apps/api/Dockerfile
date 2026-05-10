FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/drizzle.config.ts ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN mkdir -p packages/shared/src apps/api/src

COPY packages/shared/src ./packages/shared/src
COPY apps/api/src ./apps/api/src

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @tg-analyzer/api build

CMD ["pnpm", "--filter", "@tg-analyzer/api", "start"]
