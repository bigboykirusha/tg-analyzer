FROM node:22-alpine AS builder
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

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0

RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=builder --chown=app:app /app/apps/web/.output .output

USER app
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
