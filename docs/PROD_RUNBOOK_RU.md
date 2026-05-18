# PROD Runbook

## 1. Обязательные env

```env
NODE_ENV=production

DATABASE_URL=postgres://...
REDIS_URL=redis://...

TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...

SESSION_ENCRYPTION_KEY=... # 64 hex chars
JWT_SECRET=...
JWT_REFRESH_SECRET=...

CORS_ORIGIN=https://your-web-domain
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

NUXT_PUBLIC_API_URL=https://your-api-domain
NUXT_PUBLIC_WS_URL=wss://your-api-domain
NUXT_PUBLIC_SITE_URL=https://your-web-domain
```

Важно:
- не использовать одни и те же `Postgres` и `Redis` для `dev` и `prod`
- не оставлять `CORS_ORIGIN=*` в production
- все секреты должны отличаться от `.env.example`

## 2. Порядок запуска

1. Поднять `Postgres`
2. Поднять `Redis`
3. Применить миграции: `corepack pnpm db:migrate`
4. Собрать проект: `corepack pnpm build`
5. Запустить API
6. Запустить worker
7. Запустить web

## 3. Что проверить сразу после деплоя

Проверить API:

```bash
curl https://your-api-domain/health
curl https://your-api-domain/ready
```

Ожидание:
- `/health` отвечает `200` и `{"status":"ok"}`
- `/ready` отвечает `200` и все проверки `ok`

Проверить web:
- открывается `/login`
- RU/EN переключаются корректно
- нет битого текста

Проверить auth flow:
- отправка кода Telegram
- вход по коду
- вход с 2FA при необходимости

Проверить parse flow:
- чат загружается на `dashboard`
- parse стартует
- прогресс двигается
- после завершения открывается отчёт

## 4. Что мониторить в первый день

- количество команд в Redis
- размер очередей BullMQ
- число активных websocket-подключений
- ошибки `401`, `409`, `429`, `5xx`
- рост времени ответа `/ready`

Особенно важно:
- не растёт ли Redis слишком быстро
- очищаются ли завершённые jobs
- жив ли worker heartbeat

## 5. Быстрый smoke checklist

- `pnpm check`
- `pnpm test`
- `pnpm build`
- `/health` ok
- `/ready` ok
- login ok
- parse ok
- websocket progress ok
- report page ok
- PDF export ok

## 6. Если что-то сломалось

Если `/ready` = `503`:
- проверить доступность `Postgres`
- проверить доступность `Redis`
- проверить, запущен ли worker

Если login не работает:
- проверить `TELEGRAM_API_ID`
- проверить `TELEGRAM_API_HASH`
- проверить cookie/env настройки

Если parse не идёт:
- проверить worker logs
- проверить BullMQ queue
- проверить Redis и heartbeat worker

Если web не подключается к progress:
- проверить `NUXT_PUBLIC_WS_URL`
- проверить websocket proxying
- проверить JWT и `/api/auth/ws-token`
