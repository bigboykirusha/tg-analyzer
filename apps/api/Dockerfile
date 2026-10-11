FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/drizzle.config.ts apps/api/tsup.config.ts ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN mkdir -p packages/shared/src apps/api/src

COPY packages/shared/src ./packages/shared/src
COPY apps/api/src ./apps/api/src

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tg-analyzer/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=base --chown=app:app /app/node_modules ./node_modules
COPY --from=base --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=base --chown=app:app /app/apps/api/package.json ./apps/api/package.json

USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "--experimental-specifier-resolution=node", "apps/api/dist/index.js"]
