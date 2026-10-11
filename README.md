# TG Analyzer

Dashboard for analyzing Telegram chats: Nuxt web app, Fastify API, PostgreSQL, Redis, BullMQ worker.

## Requirements

- Node.js 22+
- Corepack
- Docker and Docker Compose
- Telegram API credentials from `https://my.telegram.org`

## Setup

```bash
corepack enable
corepack pnpm install
cp .env.example .env
```

Fill `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and replace auth/session secrets in `.env`.

Start storage:

```bash
docker compose up -d postgres redis
```

Apply database schema:

```bash
corepack pnpm db:migrate
```

For local schema iteration you can use:

```bash
corepack pnpm db:push
```

Run the app:

```bash
corepack pnpm dev
corepack pnpm dev:worker
corepack pnpm dev:web
```

The web app runs on `http://localhost:3000`, the API on `http://localhost:3001`.

Optional queue dashboard:

```bash
docker compose --profile tools up -d bull-board
```

## Checks

```bash
corepack pnpm check
corepack pnpm build
corepack pnpm test
corepack pnpm --filter @tg-analyzer/web test:e2e
```

## Documentation

- [Environment reference](docs/ENVIRONMENT.md)
- [Deployment](docs/DEPLOY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security and data handling](docs/SECURITY.md)
- [Operations runbook](docs/RUNBOOK.md)

The web client exposes draft Privacy Policy and Terms pages at `/privacy` and `/terms`. Account deletion is available from the authenticated account settings and removes application data and stored Telegram authorization material.

## Production Notes

- Do not reuse values from `.env.example` for secrets.
- Run migrations with `corepack pnpm db:migrate`.
- Keep `COOKIE_SECURE=true` behind HTTPS.
- Restrict `CORS_ORIGIN` to the deployed web origin.
