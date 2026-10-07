# Промежуточный отчёт по фазам 1a–1c

Дата: 2026-10-07. Ветка: `refactor/production-readiness`.

## Результат

После 1a завершена реализация 1b: миграция 0008 предотвращает дубли Telegram-сессий и параллельные активные задачи, отчёт и агрегаты сохраняются одной транзакцией под блокировкой пользователя, а worker восстанавливает непоставленные задачи, корректно различает retry/terminal ошибки, отменяет FLOOD_WAIT и безопасно работает с compare-and-set Redis lease. Docker-проверки 1b выполнены на отдельном PostgreSQL 16 и Redis 7.

В 1c включены `noUncheckedIndexedAccess`, ESLint и Prettier. API и web получили CSP, anti-framing и Permissions-Policy. Dependency audit уменьшен с 9 critical / 58 high до 0 critical / 2 high: обновлены `@fastify/jwt`, Fastify, Drizzle ORM, Nuxt 4.5.1 и WebSocket plugin, а совместимые транзитивные исправления закреплены pnpm overrides. Deprecated `lucide-vue-next` заменён совместимым alias на `@lucide/vue`; 1c пока не закрыта из-за оставшихся advisory.

Фаза 1a завершена коммитом `a100228` (`feat(auth): harden sessions and websocket access`). Старые access/refresh/WS-токены отклоняются, миграция 0007 отзывает прежние refresh-сессии и требует разовый повторный вход. Новые access-токены живут 15 минут, связаны с отзываемой refresh-family и остаются только в памяти браузера. Приложение восстанавливает сессию через HttpOnly refresh-cookie.

WebSocket использует одноразовый Redis ticket с TTL 30 секунд и атомарным `GETDEL`; Origin и активность session family проверяются до подписки. Auth-маршруты защищены точным Origin и общим Redis rate limit. Временный Telegram/auth-state шифруется AES-256-GCM. Logout отзывает текущую семью, а удаление аккаунта удаляет пользователя и сессии, останавливает активные задания через cancellation marker и планирует повторяемую очистку очереди/Redis.

Конфигурация проверяет boolean, порты, URL, origins, cookie и секреты; небезопасный production-конфиг не запускается. Ошибки возвращают `message`, `code`, `requestId`, а журналы не содержат query-параметры, cookie, токены, телефон, код, пароль или Telegram-сессию. События worker структурированы по BullMQ job id и внутреннему job id. Создание Fastify отделено от открытия порта.

## Проверки

- `pnpm check` — успешно для API и web.
- `pnpm test` — 23/23 unit-тестов.
- `pnpm lint` и `pnpm format:check` — успешно.
- `pnpm test:integration` — 13/13 на изолированных PostgreSQL 16 и Redis 7, включая reservation, отмену чужого Redis marker, транзакции агрегатов и reconciliation.
- `pnpm build` — успешно на Nuxt 4.5.1; остаются предупреждения Nuxt о sourcemap, чанке около 825 kB и deprecated module resolution.
- Миграции — чистая установка, повторный запуск и upgrade с активной legacy refresh-сессией успешны; 0007 корректно отзывает старую сессию. На отдельной чистой БД 0008 применена, повторный запуск оказался идемпотентным, а `0008-down.sql` удалил новые поля и индексы.
- `docker compose build api web` — успешно; оба образа собираются с `--frozen-lockfile`, web runtime запускается от непривилегированного пользователя.
- Playwright/Edge — `/login`, `/dashboard`, `/history`, `/chat/sample` на 360, 390, 768, 1024 и 1280 px; silent refresh и logout успешны, access-токен в localStorage отсутствует.

## Ограничения

Реальная интеграция Telegram не запускалась: browser-тест использует синтетического пользователя и тестовую зашифрованную сессию. Не выполнена ручная проверка реального отказа Redis и production deployment с reverse proxy; эти случаи требуют отдельной инфраструктуры.

Остаются 2 high, 15 moderate и 8 low dependency advisory в web build-графе; production audit API чист. Nuxt 4.6, который может изменить этот граф, требует Node ≥22.21, тогда как доступен 22.14. Web CSP и standalone runtime artifact проверены локально, Docker build и Docker-зависимые integration-проверки прошли. Пользовательские изменения в `chat/[id].vue`, `dashboard.vue`, `history.vue` и `docs/TASK.md` не включены в коммиты.

## Фаза 2 — текущий прогресс

Проверенная основа фазы 1 сохранена. Начата миграция API: ресурсы доступны под `/api/v1`, старые `/api/*` маршруты оставлены для совместимости; web client автоматически направляет legacy path callers в v1. OpenAPI и Swagger UI доступны по `/documentation`, статистические endpoints и paginated parse history описаны query/response схемами. История v1 принимает `page`/`limit` и возвращает `items`, `total`, `page`, `limit`, а legacy history сохраняет прежнюю форму массива.

Общие типы и валидируемые query-схемы начали жить в `packages/shared`; endpoint map задаёт пары method/path, request и response, а auth/progress/stats composables используют `useApiEndpoint`. Текущая UI страница истории всё ещё читает первую страницу из 20 записей; управление страницами и миграция всех generic call sites предстоят.

Добавлены `@fastify/swagger` и `@fastify/swagger-ui` для контрактной документации API; `zod` добавлен в shared как runtime-схема запросов. Новые зависимости оправданы требованиями фазы 2 и уже используемым Zod runtime. Проверки текущего среза: `check`, `lint`, unit 23/23, integration 15/15 и `build` прошли. Изменённые файлы отформатированы. Общий `format:check` сейчас находит форматирование в незакоммиченном `docs/DESIGN_TASK.md`; файл оставлен без изменений. Фаза 2 остаётся незавершённой: чистая аналитика пока находится преимущественно в `apps/api/src/services/stats.service.ts`, а OpenAPI и общие схемы нужно расширить на оставшиеся auth/parse endpoints.

Код API foundation зафиксирован `8b562bd` (`feat(api): add versioned contracts and pagination`).
