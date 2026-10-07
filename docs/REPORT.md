# Отчёт по фазе 1a

Дата: 2026-10-07. Ветка: `refactor/production-readiness`.

## Результат

Фаза 1a завершена коммитом `a100228` (`feat(auth): harden sessions and websocket access`). Старые access/refresh/WS-токены отклоняются, миграция 0007 отзывает прежние refresh-сессии и требует разовый повторный вход. Новые access-токены живут 15 минут, связаны с отзываемой refresh-family и остаются только в памяти браузера. Приложение восстанавливает сессию через HttpOnly refresh-cookie.

WebSocket использует одноразовый Redis ticket с TTL 30 секунд и атомарным `GETDEL`; Origin и активность session family проверяются до подписки. Auth-маршруты защищены точным Origin и общим Redis rate limit. Временный Telegram/auth-state шифруется AES-256-GCM. Logout отзывает текущую семью, а удаление аккаунта удаляет пользователя и сессии, останавливает активные задания через cancellation marker и планирует повторяемую очистку очереди/Redis.

Конфигурация проверяет boolean, порты, URL, origins, cookie и секреты; небезопасный production-конфиг не запускается. Ошибки возвращают `message`, `code`, `requestId`, а журналы не содержат query-параметры, cookie, токены, телефон, код, пароль или Telegram-сессию. События worker структурированы по BullMQ job id и внутреннему job id. Создание Fastify отделено от открытия порта.

## Проверки

- `pnpm check` — успешно для API и web.
- `pnpm test` — 16/16 unit-тестов.
- `pnpm test:integration` — 6/6 на изолированных PostgreSQL 16 и Redis 7.
- `pnpm build` — успешно; остаются предупреждения Nuxt о sourcemap, чанке около 825 kB и deprecated module resolution.
- Миграции — чистая установка, повторный запуск и upgrade с активной legacy refresh-сессией успешны; 0007 корректно отзывает старую сессию.
- Playwright/Edge — `/login`, `/dashboard`, `/history`, `/chat/sample` на 360, 390, 768, 1024 и 1280 px; silent refresh и logout успешны, access-токен в localStorage отсутствует.

## Ограничения

Реальная интеграция Telegram не запускалась: browser-тест использует синтетического пользователя и тестовую зашифрованную сессию. `docker compose build api web` собрал API image, но web image завершился ошибкой: Dockerfile не копирует `pnpm-lock.yaml` и `apps/web/utils`, поэтому получает другую версию Nuxt и не находит `chart-theme`. Полный production-compose не считается пройденным.

Индексы, транзакции агрегатов, атомарная резервация задач, retry/cancel/reconciliation, Redis lease, FLOOD_WAIT и shutdown worker остаются в 1b. `noUncheckedIndexedAccess`, ESLint/Prettier и аудит зависимостей остаются в 1c. Пользовательские изменения в `chat/[id].vue`, `dashboard.vue`, `history.vue` и `docs/TASK.md` не включены в коммиты.
