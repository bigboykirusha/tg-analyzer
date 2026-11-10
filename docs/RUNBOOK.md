# Runbook

## Недоступен Redis

Считайте auth rate limit, очереди BullMQ, leases и временное Telegram-состояние недоступными. API readiness должен вернуть `503`; вход fail-closed. Не переключайте eviction на `allkeys-*`: для текущего единичного Redis включены AOF/everysec и `noeviction`. Production должен разделить критичные queue/auth/lease keys и вытесняемые кэши по разным инстансам или лимитам памяти.

После восстановления Redis запустите worker: reconciliation найдёт `pending`/`running` parse_jobs в PostgreSQL и заново поставит отсутствующие BullMQ jobs с тем же UUID и сохранёнными chatIds. Проверьте логи событий `parse_job_reconciled` и статус задач.

## WebSocket ticket в логах proxy

Если access-log сохраняет query string, немедленно ограничьте доступ к логам и измените формат proxy logging так, чтобы использовался URI без query. Одноразовые tickets короткоживущие, но запись URL до expiry позволяет подключиться от имени пользователя.

## Миграция 0008

Миграция намеренно остановится при дублях Telegram-сессий, active parse jobs или Bull job id. Не удаляйте записи автоматически. Сначала исследуйте владельца и состояние задач, вручную завершите лишние записи и повторите миграцию. Откат описан в [`migrations/0008-down.sql`](migrations/0008-down.sql); перед ним остановите API и worker.

## Ошибка при сохранении Telegram-сессии после входа

Если после ввода кода или пароля Telegram вход завершается `INTERNAL_ERROR`, проверьте, что миграции текущего релиза применены. Сохранение сессии использует `ON CONFLICT (user_id)`, для которого требуется уникальный индекс `telegram_sessions_user_id_idx`, созданный миграцией 0008. Примените миграции до запуска нового API:

```sh
pnpm --filter @tg-analyzer/api migrate
```

Проверьте индекс в целевой БД:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = current_schema()
  AND tablename = 'telegram_sessions'
  AND indexname = 'telegram_sessions_user_id_idx';
```

Если миграция останавливается на preflight из-за дублей, не удаляйте сессии автоматически: разрешите конфликт по правилам раздела 0008 и повторите миграцию. В обращении передавайте только `requestId`; не копируйте в тикет тело SQL, параметры, cookie или Telegram session data.

## Анализ «завис»

Проверьте `/ready`: поле `worker` показывает heartbeat. Если worker жив, найдите задачу в `parse_jobs` (status `running`) и логи worker по её `id`. Задача, у которой пропала BullMQ-запись, будет переставлена reconciliation при старте worker. Пользователь всегда может нажать «Отменить анализ».

## Демо-режим

`TELEGRAM_MODE=fake` подходит для разработки, e2e и демонстрации интерфейса. В production API с этим режимом не стартует.

## Мониторинг и алерты

Внешних сервисов нет, всё идёт через логи API и необязательный алерт.

**Что пишется в лог (уровень `error`):**

- `request failed` с полями `event=request_failed`, `requestId`, `statusCode` — каждый ответ 5xx. `requestId` тот же, что в заголовке `x-request-id` и в теле ошибки, который видит пользователь: по нему находится запись.
- `client_error` с полем `clientError` — необработанная ошибка в браузере (`POST /api/v1/client-errors`). Внутри: `kind` (`vue`, `app`, `window`, `promise`), шаблон маршрута (`/chat/:id()`, без адреса и ID), сообщение до 300 и стек до 2000 символов, `build`, `ua`. Текстов переписок, телефонов и cookie там нет, в базу ничего не пишется. Браузер шлёт каждую ошибку один раз и не больше 10 за страницу, API принимает до 30 в минуту с одного адреса и тело до 6 КБ.
- Ошибки worker (`analysis worker error`, `unhandled rejection`).

Поиск в логах Railway: `client_error` (фронт), `request_failed` (бэк). Версию сборки `build` сверяйте с последним деплоем web: старая сборка в кэше браузера даёт ошибки, которых в новой уже нет.

**Алерт.** Включается переменными `ALERT_WEBHOOK_URL` или парой `ALERT_TELEGRAM_BOT_TOKEN` + `ALERT_TELEGRAM_CHAT_ID` (см. [ENVIRONMENT.md](ENVIRONMENT.md)); без них тихо выключен. Поводы:

1. Worker молчит: API каждые 30 с смотрит heartbeat (тот же, что в `/ready`), три промаха подряд (~90 с, чтобы не будить на перезапуске и деплое) дают «worker has stopped answering»; когда heartbeat вернулся, приходит «processing jobs again». Что делать: раздел «Анализ „завис“» ниже, затем перезапуск сервиса worker.
2. Всплеск: `ALERT_ERROR_THRESHOLD` (20) ошибок одного вида за `ALERT_WINDOW_MINUTES` (5): ответы 5xx API, ошибки браузера или ошибки worker. Что делать: открыть логи по `request_failed` / `client_error`, сопоставить время со свежим деплоем, при необходимости откатить (`RELEASE.md`).

Один и тот же алерт уходит не чаще раза в `ALERT_THROTTLE_MINUTES` (30). Проверка канала: временно поставьте `ALERT_ERROR_THRESHOLD=1` и отправьте `curl -X POST $API/api/v1/client-errors -H 'content-type: application/json' -d '{"kind":"window","route":"/","message":"alert test"}'`, потом верните значение. Если алерт не пришёл, ищите в логах `alert delivery failed`.

## Локальная среда: задания пропадают, «Чат больше недоступен»

**Симптом.** Анализ в демо-режиме падает с «Чат больше недоступен», хотя чат есть в списке; или прогресс не двигается.

**Причина.** Зависшие dev-процессы прошлых сессий (`api`, `worker`, `tsx watch`, `nuxt dev`) живут на том же Redis (`REDIS_URL`, база 0 по умолчанию). Очередь BullMQ общая, поэтому чужой worker забирает задание, а у него другая БД, другой `TELEGRAM_MODE` или старый код: он не находит чат и завершает задание ошибкой. Свой worker при этом простаивает.

**Как проверить.**

```sh
# кто слушает порты стенда и что запущено из репозитория (PowerShell)
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | Select-Object LocalPort, OwningProcess
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'tganalizer' } | Select-Object ProcessId, CommandLine
# соединения с Redis: каждый worker держит блокирующее чтение (cmd=bzpopmin), своих должно быть столько, сколько вы запускали
docker exec tganalizer-redis-1 redis-cli client list | findstr bzpopmin
```

Если процессов `worker.ts` или `tsx` больше одного, часть из них чужая.

**Как вылечить.**

1. Остановите лишние процессы по PID (`Stop-Process -Id <PID>`); если не уверены, чей процесс, закройте все `node.exe` из каталога проекта и запустите стенд заново: `pnpm dev`.
2. Сбросьте очередь, пока worker остановлен: `docker exec tganalizer-redis-1 redis-cli --scan --pattern 'bull:analysis:*' | xargs docker exec -i tganalizer-redis-1 redis-cli del`. Зависшие `pending` задачи в БД переставит reconciliation при старте worker.
3. Запустите один worker и проверьте `/ready`: `worker: ok`.

**Как не допустить.** Для параллельных сессий используйте отдельный номер Redis-базы (`redis://127.0.0.1:6379/N`) и отдельную БД на каждую; перед стартом нового стенда проверьте список процессов по команде выше. Не запускайте fake-worker против облачных `DATABASE_URL`/`REDIS_URL` из `.env`.

## Локальная среда: `services:test` сносит dev-контейнеры

`pnpm services:test` поднимает `docker-compose.test.yml` под тем же именем compose-проекта (`tganalizer`), что и dev. Docker Compose считает сервисы `postgres` и `redis` теми же и пересоздаёт их: dev-Postgres и dev-Redis исчезают вместе с данными (у тестовых tmpfs вместо тома).

Правильно запускать тестовые сервисы отдельным проектом:

```sh
docker compose -p tganalizer-test -f docker-compose.test.yml up -d --wait
# ... pnpm test ...
docker compose -p tganalizer-test -f docker-compose.test.yml down
```

Тестовые Postgres и Redis слушают `55432` и `56379`, dev — `5432` и `6379`. Если dev-контейнеры уже снесены: `docker compose up -d postgres redis`, затем `pnpm db:migrate` (только против локальной БД: `DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/tganalyzer`).
