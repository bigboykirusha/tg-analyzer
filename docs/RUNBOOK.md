# Runbook

## Недоступен Redis

Считайте auth rate limit, очереди BullMQ, leases и временное Telegram-состояние недоступными. API readiness должен вернуть `503`; вход fail-closed. Не переключайте eviction на `allkeys-*`: для текущего единичного Redis включены AOF/everysec и `noeviction`. Production должен разделить критичные queue/auth/lease keys и вытесняемые кэши по разным инстансам или лимитам памяти.

После восстановления Redis запустите worker: reconciliation найдёт `pending`/`running` parse_jobs в PostgreSQL и заново поставит отсутствующие BullMQ jobs с тем же UUID и сохранёнными chatIds. Проверьте логи событий `parse_job_reconciled` и статус задач.

## WebSocket ticket в логах proxy

Если access-log сохраняет query string, немедленно ограничьте доступ к логам и измените формат proxy logging так, чтобы использовался URI без query. Одноразовые tickets короткоживущие, но запись URL до expiry позволяет подключиться от имени пользователя.

## Миграция 0008

Миграция намеренно остановится при дублях Telegram-сессий, active parse jobs или Bull job id. Не удаляйте записи автоматически. Сначала исследуйте владельца и состояние задач, вручную завершите лишние записи и повторите миграцию. Откат описан в [`migrations/0008-down.sql`](migrations/0008-down.sql); перед ним остановите API и worker.
