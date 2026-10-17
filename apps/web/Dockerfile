FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

# The WebSocket URL is public and also feeds the CSP, so it is fixed at build time.
ARG NUXT_PUBLIC_WS_URL
ARG NUXT_PUBLIC_SITE_URL
ENV NUXT_PUBLIC_WS_URL=$NUXT_PUBLIC_WS_URL NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter @tg-analyzer/web...
RUN pnpm --filter @tg-analyzer/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build --chown=app:app /app/apps/web/.output ./.output

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
