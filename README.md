# TG Analyzer

Веб-приложение, которое превращает Telegram-чат в понятный отчёт: баланс переписки, скорость и доля ответов, ритм по часам и дням, словарь и эмодзи, сессии общения; для групп — роли участников, динамика, связи и общий словарь. Тексты сообщений не сохраняются: в базе лежит только агрегированный отчёт.

Стек: Nuxt 4 (web) · Fastify 5 (API) · BullMQ worker · PostgreSQL · Redis · gramjs.

```text
apps/api         API (src/index.ts), worker (src/worker.ts), миграции (src/migrate.ts)
apps/web         Nuxt-клиент
packages/shared  контракт API, типы и вся аналитика отчёта (чистые функции + тесты)
```

## Быстрый старт (без Telegram)

Нужны Node.js 22, Corepack и Docker.

```bash
corepack enable
pnpm install
cp .env.example .env          # заполните три секрета: openssl rand -hex 32
docker compose up -d postgres redis
pnpm db:migrate
pnpm dev                      # web :3000, API :3001, worker
```

В `.env.example` стоит `TELEGRAM_MODE=fake`: встроенный демо-аккаунт с готовыми чатами. Войти можно с любым номером, код `12345` (номер на `9` дополнительно спросит пароль `secret`). Для настоящего Telegram задайте `TELEGRAM_MODE=live`, `TELEGRAM_API_ID` и `TELEGRAM_API_HASH` с https://my.telegram.org.

## Проверки

```bash
pnpm lint && pnpm format:check && pnpm check   # ESLint, Prettier, TypeScript
pnpm services:test                             # Postgres :55432 и Redis :56379 для тестов
pnpm test                                      # аналитика + API (интеграционные)
pnpm test:e2e                                  # Playwright; полный сценарий требует API и worker в fake-режиме
pnpm build
```

## Документация

- [Roadmap](docs/ROADMAP.md) — что сделано и что дальше
- [UX-ревизия](docs/UX-REVIEW.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [Переменные окружения](docs/ENVIRONMENT.md)
- [Деплой](docs/DEPLOY.md)
- [Безопасность](docs/SECURITY.md)
- [Runbook](docs/RUNBOOK.md)
- [Миграция 0009](docs/migrations/0009-chat-reports.md)
