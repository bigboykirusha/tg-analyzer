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

`railway.json` описывает сборку API, pre-deploy миграции и запуск через `scripts/start-from-env.mjs`. Создайте сервисы `api` и `worker` из одного репозитория и задайте каждому `START_SERVICE=api|worker` (или назовите сервисы `api`/`worker`). Web разверните отдельно (Vercel, Railway с командой `pnpm --filter @tg-analyzer/web build` и `START_SERVICE=web` или Docker-образ).

## Чек-лист релиза

1. Секреты заданы в платформе, `.env` не деплоится.
2. Применены миграции (см. [0009](migrations/0009-chat-reports.md) — перед ней сделайте бэкап).
3. API `/ready` возвращает `ok` по Postgres, Redis и worker.
4. В браузере на боевом домене проверены вход, перезагрузка страницы (тихий refresh), прогресс анализа и выход.
