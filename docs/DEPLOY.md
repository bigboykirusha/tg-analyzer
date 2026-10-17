# Деплой

Три процесса из одного репозитория:

| Процесс | Команда                                  | Примечание                               |
| ------- | ---------------------------------------- | ---------------------------------------- |
| API     | `node apps/api/dist/index.js`            | HTTP + WebSocket, healthcheck `/health`  |
| Worker  | `node apps/api/dist/worker.js`           | без HTTP; живость видна в `/ready` у API |
| Web     | `node apps/web/.output/server/index.mjs` | Nuxt SSR + прокси `/api`                 |

Миграции перед выкладкой: `pnpm --filter @tg-analyzer/api migrate` (`dist/migrate.js`, нужен только `DATABASE_URL`).

## Домены и cookie

Web и API должны быть на поддоменах одного сайта, например `app.example.com` и `api.example.com`:

- браузер ходит в API только через `/api` на домене web, поэтому refresh-cookie остаётся first-party (Safari блокирует сторонние cookie);
- WebSocket подключается напрямую к `wss://api.example.com` с одноразовым ticket — задайте `NUXT_PUBLIC_WS_URL` при сборке web;
- `CORS_ORIGIN=https://app.example.com`, `COOKIE_DOMAIN` не задавайте.

Ticket передаётся в query handshake, поэтому на всех прокси/CDN отключите запись query string в логи.

## Docker

```bash
docker compose up --build        # postgres, redis, migrate, api, worker, web
```

Образ `apps/api/Dockerfile` общий для API, worker и миграций (`node dist/worker.js`, `node dist/migrate.js`). Образ web получает `NUXT_PUBLIC_WS_URL` как build-arg, а `NUXT_API_PROXY_TARGET` — в runtime.

## Railway

`railway.json` общий для всех сервисов: сборка, миграции и запуск идут через `scripts/service.mjs`, который выбирает процесс так:

1. переменная `START_SERVICE=api|worker|web` (надёжнее всего — задайте её в каждом сервисе);
2. иначе по имени сервиса Railway: `worker` в имени → worker, `web`/`front`/`app` → web, `api`/`back`/`server` → api.

Миграции (pre-deploy) выполняются только у api. Healthcheck `/health` включайте в настройках сервиса api — у worker нет HTTP.

## Чек-лист релиза

1. Секреты заданы в платформе, `.env` не деплоится.
2. Применены миграции (см. [0009](migrations/0009-chat-reports.md) — перед ней сделайте бэкап).
3. API `/ready` возвращает `ok` по Postgres, Redis и worker.
4. В браузере на боевом домене проверены вход, перезагрузка страницы (тихий refresh), прогресс анализа и выход.
