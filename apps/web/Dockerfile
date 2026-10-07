FROM node:22-alpine
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/tsconfig.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN mkdir -p apps/web/app packages/shared/src

COPY packages/shared/src ./packages/shared/src
COPY apps/web/app ./apps/web/app
COPY apps/web/public ./apps/web/public
COPY apps/web/utils ./apps/web/utils
COPY apps/web/nuxt.config.ts ./apps/web/nuxt.config.ts
COPY apps/web/tailwind.config.ts ./apps/web/tailwind.config.ts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tg-analyzer/web build

CMD ["pnpm", "--filter", "@tg-analyzer/web", "start"]
