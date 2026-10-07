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

Общие типы и валидируемые request/query-схемы находятся в `packages/shared`; endpoint map задаёт пары method/path, request и response, а page-level JSON API вызовы используют `useApiEndpoint` без ручных response generics. OpenAPI описывает auth, stats и все parse routes. Экран истории использует `page/limit`, показывает общее число запусков и позволяет переключать страницы. Сквозной пользовательский сценарий ещё нужно проверить и автоматизировать.

Добавлены `@fastify/swagger` и `@fastify/swagger-ui` для контрактной документации API; `zod` добавлен в shared как runtime-схема запросов. Новые зависимости оправданы требованиями фазы 2 и уже используемым Zod runtime. Проверки текущего среза: `check`, `lint`, unit 27/27, integration 15/15 и `build` прошли. Изменённые файлы прошли выборочный Prettier check. Общий `format:check` сейчас находит форматирование в незакоммиченном `docs/DESIGN_TASK.md`; файл оставлен без изменений. Фаза 2 остаётся незавершённой: большая часть аналитики по-прежнему находится в `apps/api/src/services/stats.service.ts`; UI-пагинация, оставшиеся generic call sites и сквозной пользовательский сценарий предстоят.

Код API foundation зафиксирован `8b562bd` (`feat(api): add versioned contracts and pagination`). Auth routes дополнены OpenAPI request/response и security-схемами, единый обработчик нормализует ошибки JSON Schema и Zod validation; изменение `19a9de1` (`feat(api): document auth routes in OpenAPI`) прошло проверки. Все parse routes и web query contract завершены в `947560d` (`feat(api): complete parse route contracts`). В `21d9211` (`refactor(analytics): extract pure shared calculations`) в `packages/shared` вынесены общие статистические примитивы, дневные/месячные ряды, тренд и вычисление активных серий дней с независимостью от локального DST; критичные границы покрыты чистыми unit-тестами. Основная агрегация сообщений и сборка аналитических DTO пока не выделены из API service. UI-пагинация истории сделана в `7cd4924` (`feat(web): paginate analysis history`), а оставшиеся page calls мигрированы на endpoint map в `cdd4c6f` (`refactor(web): use typed API operations`). `check`, `lint`, unit 27/27, integration 15/15, выборочный Prettier и `build` прошли на соответствующих изменениях.

## Актуализация проверки (2026-10-07)

После предыдущей записи Фаза 2 продвинулась: чистые функции расчёта текста/emoji, групповых оценок и отчёта, сессий, insights и временной линии вынесены в `packages/shared`; API auth/profile/report/top request-схемы централизованы в shared; прогресс-события WebSocket используют pure reducer. Добавлен тестовый сквозной API-сценарий с подменённым Telegram adapter. Последний завершённый прогон: unit 52/52, Docker-backed integration 17/17, `lint`, `check` и `build` прошли. Это не означает завершения всей Фазы 2: потоковый accumulator и часть DTO остаются в API, общее упрощение composables не закончено, production-browser/real-Telegram сценарий не выполнялся.

Повторный `pnpm audit --prod` оставляет 2 high в web build/CI-графе (`node-forge@1.4.0` и `braces@3.0.3`); upstream patched version для текущих advisories отсутствует. API production-граф чистый. Поэтому Фазы 1a–1c реализованы и основные проверки зелёные, однако dependency audit не зелёный. Корневой `format:check` также сообщает о форматировании в пользовательском незакоммиченном `docs/DESIGN_TASK.md`; этот файл и пользовательские изменения не менялись, затронутые проектные файлы проверялись отдельно.

Повторная `docker compose build api worker web` завершилась успешно после того, как Docker Engine стал доступен; Nuxt оставил предупреждения о большом клиентском чанке, ineffective dynamic imports и длительных plugin callbacks. Реальный Telegram, Redis outage под production-нагрузкой и браузер с выбранными production-доменами требуют отдельной ручной проверки.

## Итоговый срез (2026-10-07)

Фазы 1a–1c реализованы; фаза 2 доведена до API/analytics foundation. Production artifacts прошли smoke-запуск: API `/health` и `/documentation/json` вернули 200; web `/login` вернул 200, SSR-разметку и CSP. Docker собрал `api`, `worker`, `web` с frozen lockfile. Последние проверки: `lint`, `check`, unit 54/54, integration 18/18 на отдельном PostgreSQL/Redis, `build` — успешно.

Заключительная проверка выявила три runtime-проблемы, не видимые typecheck: shared code отсутствовал в API bundle; OpenAPI задавал недопустимый Zod target; Zod 4.4.x конфликтовал с Nitro SSR по идентификатору `process`. Исправлены API bundle/Docker context, target `draft-7`, Zod закреплён на 4.1.5. Production smoke после исправлений прошёл.

Фаза 2 не является полным рефакторингом по исходному TASK.md. Реализованы `/api/v1`, OpenAPI, shared request/response contracts, типизированный web endpoint map, пагинация истории, выделенные чистые метрики и API inject flow с fake Telegram. Потоковый accumulator, часть сборки DTO, широкая декомпозиция composables и production-browser E2E остаются.

Ограничения проверки: `format:check` падает только на незакоммиченном пользовательском `docs/DESIGN_TASK.md`; этот файл не менялся. `pnpm audit --prod` остаётся красным из-за 2 high в web build graph (`node-forge`, `braces`) без upstream patched version. Nuxt build успешен с предупреждениями о client chunk 696 kB, ineffective middleware dynamic imports, долгих callbacks и deprecated Vue shared export mapping. Production domain, настоящий Telegram и Redis outage требуют ручной проверки.
