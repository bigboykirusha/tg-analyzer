# Промежуточный отчёт по фазам 1a–1c

Дата: 2026-10-07. Ветка: `refactor/production-readiness`.

## Результат

После 1a завершена реализация 1b: миграция 0008 предотвращает дубли Telegram-сессий и параллельные активные задачи, отчёт и агрегаты сохраняются одной транзакцией под блокировкой пользователя, а worker восстанавливает непоставленные задачи, корректно различает retry/terminal ошибки, отменяет FLOOD_WAIT и безопасно работает с compare-and-set Redis lease. Повторная интеграционная проверка 1b остаётся недоступной, пока Docker Engine не запущен.

В 1c включены `noUncheckedIndexedAccess`, ESLint и Prettier. API и web получили CSP, anti-framing и Permissions-Policy. Dependency audit уменьшен с 9 critical / 58 high до 0 critical / 2 high: обновлены `@fastify/jwt`, Fastify, Drizzle ORM, Nuxt 4.5.1 и WebSocket plugin, а совместимые транзитивные исправления закреплены pnpm overrides. Deprecated `lucide-vue-next` заменён совместимым alias на `@lucide/vue`; 1c пока не закрыта из-за оставшихся advisory.

Фаза 1a завершена коммитом `a100228` (`feat(auth): harden sessions and websocket access`). Старые access/refresh/WS-токены отклоняются, миграция 0007 отзывает прежние refresh-сессии и требует разовый повторный вход. Новые access-токены живут 15 минут, связаны с отзываемой refresh-family и остаются только в памяти браузера. Приложение восстанавливает сессию через HttpOnly refresh-cookie.

WebSocket использует одноразовый Redis ticket с TTL 30 секунд и атомарным `GETDEL`; Origin и активность session family проверяются до подписки. Auth-маршруты защищены точным Origin и общим Redis rate limit. Временный Telegram/auth-state шифруется AES-256-GCM. Logout отзывает текущую семью, а удаление аккаунта удаляет пользователя и сессии, останавливает активные задания через cancellation marker и планирует повторяемую очистку очереди/Redis.

Конфигурация проверяет boolean, порты, URL, origins, cookie и секреты; небезопасный production-конфиг не запускается. Ошибки возвращают `message`, `code`, `requestId`, а журналы не содержат query-параметры, cookie, токены, телефон, код, пароль или Telegram-сессию. События worker структурированы по BullMQ job id и внутреннему job id. Создание Fastify отделено от открытия порта.

## Проверки

- `pnpm check` — успешно для API и web.
- `pnpm test` — 23/23 unit-тестов.
- `pnpm lint` и `pnpm format:check` — успешно.
- `pnpm test:integration` — 6/6 на изолированных PostgreSQL 16 и Redis 7.
- `pnpm build` — успешно на Nuxt 4.5.1; остаются предупреждения Nuxt о sourcemap, чанке около 825 kB и deprecated module resolution.
- Миграции — чистая установка, повторный запуск и upgrade с активной legacy refresh-сессией успешны; 0007 корректно отзывает старую сессию.
- Playwright/Edge — `/login`, `/dashboard`, `/history`, `/chat/sample` на 360, 390, 768, 1024 и 1280 px; silent refresh и logout успешны, access-токен в localStorage отсутствует.

## Ограничения

Реальная интеграция Telegram не запускалась: browser-тест использует синтетического пользователя и тестовую зашифрованную сессию. Docker Engine сейчас недоступен, поэтому после изменений 1b не были повторены integration-тесты restart/reconciliation, миграции 0008 и production-compose. Ранее исправленные Dockerfile'ы используют lockfile и успешно собирали API/web images; это нужно повторно подтвердить после восстановления Engine.

Остаются 2 high, 15 moderate и 8 low dependency advisory без исправленных релизов, runtime smoke-проверка web CSP и Docker-зависимые интеграционные проверки. Пользовательские изменения в `chat/[id].vue`, `dashboard.vue`, `history.vue` и `docs/TASK.md` не включены в коммиты.
