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
