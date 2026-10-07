# План и прогресс фаз 1a–1c и Фазы 2

Основа работ: [`AUDIT.md`](AUDIT.md). Рабочая ветка: `refactor/production-readiness`. Пользовательские изменения в `chat/[id].vue`, `dashboard.vue` и `history.vue` должны остаться нетронутыми и вне коммитов.

## Фаза 1a — безопасность и конфигурация

- [x] Разделить access/refresh назначения токенов, claims, алгоритм и миграционный cutover; access 15 минут, только память браузера.
- [x] Refresh-cookie: тихое восстановление при старте, logout отзывает семью, удаление аккаунта отзывает все сессии.
- [x] CSRF/Origin и Redis-backed rate limit для auth; проверить владельца ресурсов.
- [x] Одноразовый WS-ticket с коротким TTL; убрать JWT из URL, редактировать query в логах.
- [x] AES-GCM для временных Telegram-сессий; проверить удаление сессий/кэшей/задач и защиту от записи после удаления аккаунта.
- [x] Валидация production-конфига и cookie; единый безопасный контракт ошибок и редактирование логов.
- [x] API builder без открытия порта; тесты auth, refresh-гонок, CSRF, лимитов, изоляции и error contract.
- [x] `check`, `build`, unit/integration и браузерные проверки; обновить аудит/отчёт. Docker- и Telegram-проверки отмечены фактически.

## Фаза 1b — данные, очередь и worker

- [x] Восстановить воспроизводимую Docker-сборку: lockfile + `--frozen-lockfile`, полный build-context web.
- [x] Транзакционные save/delete отчётов и агрегатов; сериализация по строке пользователя; идемпотентная замена результата; отмена/актуальность до commit и координация с удалением аккаунта.
- [x] Новая миграция с отклоняющим дубли Telegram-сессий/задач preflight, индексами/ограничениями и документированным откатом; проверить upgrade/repeat/down на изолированной БД.
- [x] Атомарная резервация, восстановление enqueue и retry отделены от terminal failure; отмена не перезапускается. Проверка владельца Redis marker закрыта.
- [x] Compare-and-set Redis lease, остановка операции при потере lease, периодическая сверка БД/BullMQ, progress по jobId и последовательный shutdown worker.
- [x] Прерываемый отменой `FLOOD_WAIT`; typed `SESSION_REVOKED` с деактивацией сессии; unit-тесты Telegram-адаптера.
- [x] Compose использует AOF/everysec и `noeviction`; policy изоляции очереди/auth от вытесняемых кэшей, proxy query logging и sibling-domain cookies описаны в SECURITY/RUNBOOK.
- [x] Тесты конкурентности, rollback, retry/cancel и fail-closed policy проходят; Docker integration подтверждает рестарт/reconciliation. Реальный outage Redis остаётся отдельной ручной проверкой отказоустойчивости.

## Фаза 1c — типы, стиль и зависимости

- [x] `noUncheckedIndexedAccess` для API/shared/web без подавления ошибок; shared получил отдельный tsconfig и check.
- [x] ESLint для TypeScript/Vue и Prettier; команды `lint` и `format:check`.
- [x] API и web получают CSP, anti-framing и Permissions-Policy. Web CSP ограничивает источники текущими API/WS origins и Google Fonts; production Nitro smoke-проверка `/login` подтвердила выдачу всех заголовков.
- [x] Аудит зависимостей выполнен: устранены все 9 critical и 56 high уязвимостей обновлениями Fastify, Drizzle, Nuxt 4.5.1 и точечными lockfile overrides. В API production-графе advisory нет; два оставшихся high находятся в web build/CI-графе без upstream-патча. Deprecated `lucide-vue-next` заменён совместимым alias на `@lucide/vue`.
- [x] `lint`, `format:check`, `check`, 23 unit-теста и build проходят; Docker integration, чистая миграция 0008, повторный запуск и rollback подтверждены.

## Фаза 2 — архитектура API и аналитики

- [x] Вынести чистые расчёты метрик (временные ряды, текст/emoji, оценки групп, сессии, insights, групповой отчёт и timeline) в `packages/shared` с граничными unit-тестами. Потоковый накопитель и сборка части DTO остаются в API.
- [x] Добавить `/api/v1`, OpenAPI и общие endpoint/request-схемы из `packages/shared`; сохранить legacy routes с переходным сроком. Ответы OpenAPI типизированы DTO, но runtime Zod-валидация каждого response пока не включена.
- [x] Ввести типобезопасный web API client на shared DTO/schema; все page calls к JSON API используют endpoint map без локальных generic/cast.
- [x] Добавить пагинацию для parse history и согласовать формат `items/page/limit/total` с web; UI поддерживает переходы и сохраняет текущую страницу при refresh/удалении.
- [x] Извлечь переходы WebSocket progress-состояния в pure shared reducer; composable оставляет transport/retry. Более широкое упрощение остальных composables остаётся.
- [x] Проверить сквозной auth → выбор чата → очередь/progress → результат/удаление → logout на API inject с fake Telegram adapter. Браузерный полный сценарий на production-домене не запускался.
- [x] Финальный прогон Phase 1/2 foundation выполнен 2026-10-07: `lint`, `check`, `test` (54/54), `test:integration` (18/18), `build`, runtime smoke API/web и Docker build всех трёх образов. Общий `format:check` отдельно сообщает только о форматировании пользовательского незакоммиченного `docs/DESIGN_TASK.md`; файл не менялся.

## Журнал выполнения

- [x] 2026-10-06: опубликован первичный аудит — commit `c074076`.
- [x] 2026-10-07: `8c4db4a` — добавлены категории эксплуатации/Telegram/cookies, решения WS-ticket и silent refresh, разбивка 1a–1c.
- [x] 2026-10-07: `4d335a4` — зафиксирован промежуточный прогресс и ограничения первичных проверок.
- [x] 2026-10-07: `a100228` — реализована 1a: purpose-bound токены и cutover, отзываемые семейства, WS-ticket, Origin/rate limit, AES-GCM для временного auth-state, очистка аккаунта, безопасные ошибки/логи, валидация конфига и тестируемый server builder.
- [x] 2026-10-07: `check`, локальный `build`, 16 unit- и 6 интеграционных тестов прошли; Playwright/Edge подтвердил 20 viewport-снимков, silent refresh и logout. Чистая установка, повтор миграций и upgrade 0007 прошли на отдельном PostgreSQL/Redis.
- [x] Историческая проверка раннего этапа: реальный Telegram-вход не запускался. Docker build и integration-проверки были повторно выполнены позже; актуальные результаты записаны ниже.
- [x] 2026-10-07: `5d1fe62` — Docker-сборки API/web используют зафиксированный lockfile и полный web build-context; обе image успешно собраны с Nuxt 4.4.4.
- [x] 2026-10-07: `05fea57` — БД атомарно допускает одну активную задачу, её UUID стал BullMQ jobId, параметры запуска сохраняются; миграция 0008 добавила preflight/индексы/rollback, отмена больше не доверяет чужому Redis marker.
- [x] 2026-10-07: `6d58561` — chat report, daily/global aggregates сохраняются и удаляются одной транзакцией под user row lock; повторная обработка не удваивает итоги, отменённая/удалённая задача не может записать результат. Добавлены rollback/concurrency/cancellation integration-тесты.
- [x] 2026-10-07: `6da4144` — worker восстанавливает зарезервированные, но не поставленные задачи по UUID и сохранённым параметрам; retry сохраняет активность, terminal cases не перезапускаются. Lease Redis стал compare-and-set, FLOOD_WAIT прерывается отменой, SESSION_REVOKED типизирован, shutdown закрывает обработчики до инфраструктуры.
- [x] 2026-10-07: `5265c2d` — зафиксированы fail-closed Redis rate limit, требования к first-party refresh-cookie, proxy logging WS-ticket, AOF/noeviction и migration/Redis runbook.
- [x] 2026-10-07: `02eaf40` — включён `noUncheckedIndexedAccess`; проверки индексов и массивов добавлены в API analytics/worker/routes, shared теперь typecheck-ится самостоятельно.
- [x] 2026-10-07: `950a5fc` — добавлены ESLint flat config и Prettier, команды `lint`/`format:check`; отформатирован отслеживаемый код без трёх пользовательских незакоммиченных Vue-страниц.
- [x] 2026-10-07: API получил тестируемые CSP, anti-framing и Permissions-Policy headers; `test`, `lint`, `format:check` и `check` прошли. Полный `build` был запущен, но оболочка оборвала длительный Nuxt-процесс; артефакт `.output` создан, однако успешное завершение команды будет повторно подтверждено перед закрытием 1c.
- [x] 2026-10-07: `08f7d6a` — `@fastify/jwt` обновлён с 9 до 10, что поднимает `fast-jwt` до исправленной ветки; 3 critical в production audit устранены, тесты и typecheck прошли.
- [x] 2026-10-07: dependency overrides обновили уязвимые транзитивные зависимости Nuxt без перехода на проблемный Nuxt 4.6.0. `pnpm audit --prod` больше не содержит critical; `test`, `lint`, `format:check` и `check` прошли на реальной frozen-lockfile установке.
- [x] 2026-10-07: Nuxt обновлён до 4.5.1, Fastify до 5.12.2 и Drizzle ORM до 0.45.3. Единственная несовместимость (`keywords` в `useSeoMeta`) исправлена переносом meta-тега в `useHead`; frozen install, unit tests, lint, format и typecheck проходят. Production audit: 0 critical, 20 high, 21 moderate, 8 low.
- [x] 2026-10-07: финальный `build` успешно завершён на Nuxt 4.5.1. Остаются предупреждения Nuxt о sourcemap, chunk 825 kB и deprecated package export resolution.
- [x] 2026-10-07: обновлён `@fastify/websocket` и закреплены безопасные patch-версии `ws`, `ip-address`, PostCSS-графа. Production audit сокращён до 0 critical, 12 high, 17 moderate, 8 low; frozen install, unit tests, lint, format и typecheck проходят.
- [x] 2026-10-07: `build` повторно завершён успешно после последних dependency overrides.
- [x] 2026-10-07: web CSP добавлена через Nitro route rules; `lucide-vue-next` направлен на поддерживаемый `@lucide/vue` через совместимый npm alias, чтобы не изменять пользовательские незакоммиченные импорты. Frozen install, test, lint, format, check и build успешны.
- [x] 2026-10-07: адресные overrides `brace-expansion` исправили десять high в Nuxt/Tailwind build-графе. Audit: 0 critical, 2 high, 15 moderate, 8 low; два оставшихся high (`node-forge`, `braces`) не имеют исправленной версии.
- [x] 2026-10-07: проверен Nuxt 4.6.0 для устранения оставшихся advisory. Обновление отклонено: Node 22.14 не удовлетворяет требованию Nuxt (≥22.21), а `jiti` 2 несовместим с текущим lockfile; 4.5.1 восстановлен, frozen install и typecheck проходят.
- [x] 2026-10-07: `build` повторно успешно завершён на итоговом frozen lockfile после проверки Nuxt 4.6 и восстановления 4.5.1.
- [x] 2026-10-07: production Nitro server запущен на собранном web artifact; `/login` подтвердил CSP, X-Frame-Options, Permissions-Policy, X-Content-Type-Options и Referrer-Policy.
- [x] 2026-10-07: web Dockerfile разделён на builder/non-root runner; Nuxt build-модули перенесены в devDependencies, runner запускает только `.output/server/index.mjs`. Локальный `pnpm start` подтвердил HTTP 200 и CSP на готовом artifact; Docker build ожидает Docker Engine.
- [x] 2026-10-07: production audit API не нашёл advisory. Два оставшихся high относятся только к web build-графу и не попадают в non-root runtime artifact; риск build/CI остаётся открытым до обновления Node/Nuxt либо замены upstream-инструментов.
- [x] 2026-10-07: после восстановления Docker Engine изолированные PostgreSQL 16/Redis 7 подняты через `docker-compose.test.yml`; `test:integration` прошёл 13/13. Тестовая изоляция очищает БД и Redis перед каждым случаем, поэтому reconciliation не видит задания соседних тестов. На отдельной чистой БД миграции применены, повторный `db:migrate` успешен, а `0008-down.sql` удалил все три поля и семь индексов. `docker compose build api web` успешно собрал оба образа с frozen lockfile.
- [x] 2026-10-07: повторная проверка перед фазой 2: `test:integration` 13/13, `test` 23/23, `check`, `lint`, `format:check`, `build`, Docker images и 0008 apply/repeat/down успешны.
- [x] 2026-10-07: начата фаза 2 — добавлены `/api/v1` aliases, OpenAPI + Swagger UI, shared endpoint map и типизированный `useApiEndpoint`; web composables переведены на общие response-типы. `GET /api/v1/parse/history` теперь принимает page/limit и возвращает items/total, legacy path сохраняет старый массив. Integration проверяет версионирование, docs, ошибки статистики и страницы истории с изоляцией пользователя.
- [x] 2026-10-07: `8b562bd feat(api): add versioned contracts and pagination` — первый коммит фазы 2; `check`, unit 23/23, integration 15/15, `lint` и `build` прошли. Выборочный Prettier check затронутых файлов прошёл; общий `format:check` ограничен незакоммиченным `docs/DESIGN_TASK.md`.
- [x] 2026-10-07: `19a9de1 feat(api): document auth routes in OpenAPI` — схемы запросов/ответов и security для auth endpoints; единый текст ошибки Fastify/Zod validation. `check`, `lint`, unit 23/23, integration 15/15, выборочный Prettier и `build` прошли.
- [x] 2026-10-07: `947560d feat(api): complete parse route contracts` — общие Zod-контракты для parse requests/responses, OpenAPI для всех parse routes и типизированные query-параметры web API-клиента. `check`, `lint`, unit 27/27, integration 15/15, выборочный Prettier и `build` прошли.
- [x] 2026-10-07: `21d9211 refactor(analytics): extract pure shared calculations` — median/percentile/average/clamp, дневные и месячные ряды, trend и DST-safe active-day streak вынесены в `packages/shared`; чистые граничные случаи покрыты unit-тестами. `check`, `lint`, unit 27/27, integration 15/15, выборочный Prettier и `build` прошли. Основная агрегация сообщений и отчётов пока остаётся в API service.
- [x] 2026-10-07: `7cd4924 feat(web): paginate analysis history` — web передаёт `page/limit`, показывает общее число запусков и навигацию, после удаления последней записи страницы корректно возвращается на предыдущую. `check`, `lint`, unit 27/27, integration 15/15, выборочный Prettier и `build` прошли.
- [x] 2026-10-07: `cdd4c6f refactor(web): use typed API operations` — оставшиеся JSON API calls в dashboard/chat/sidebar переведены на общий endpoint map; ошибки распознаются type guard, без page-level API casts. Поиск не находит page-level `useApiFetch` calls; `check`, `lint`, unit 27/27, выборочный Prettier и `build` прошли.
- [ ] `format:check` для всего workspace сейчас сообщает о незакоммиченном `docs/DESIGN_TASK.md`; файл не менялся. Изменённые файлы проверяются Prettier отдельно.
- [ ] Автоматизировать сквозной auth → chat → analysis → results/delete → logout сценарий с тестовым Telegram-адаптером; реальный браузерный прогон на production-домене требует выбранного домена.
- [x] Документировать production sibling-домены web/API для first-party refresh-cookie и запрет query string в access-логах reverse proxy из-за WS-ticket (`docs/DEPLOY.md`). Наличие домена остаётся вопросом к владельцу.
- [x] 2026-10-07: `7b4cb88 refactor(analytics): extract report scoring calculations` — response rate, relationship/health scores, состав сообщений, распределение активности и профиль доступности вынесены в чистые функции `packages/shared`, добавлены unit-тесты. Проверки: `lint`, `check`, unit 31/31, Docker-backed integration 15/15, `build`, `docker compose build api worker web` прошли. Docker Engine доступен; Postgres/Redis healthy. Остальная агрегация сообщений и сборка отчётов пока остаются в API.
- [x] Повторная Docker-проверка: `docker compose build api worker web` завершилась успешно; web собирается с зафиксированным pnpm lockfile и Nuxt 4.5.1. Остались предупреждения о чанках свыше 500 kB и неэффективном dynamic import middleware; сборка успешна.
- [x] 2026-10-07: `36900ae refactor(analytics): extract Unicode message text analysis` — токенизация слов, исключение стоп-слов и выделение emoji-графем вынесены в `packages/shared`; ZWJ-семьи и emoji-модификаторы считаются одним emoji. Сначала добавлены падающие тесты, затем исправлена реализация. `test` 34/34, `test:integration` 15/15, `check`, `lint`, выборочный Prettier и `build` прошли.
- [x] 2026-10-07: `c48a265 fix(analytics): keep group finalization idempotent` — регрессионный тест сначала выявил, что повторный расчёт группового отчёта удваивал счётчики starters/replies; отчёт теперь работает с копиями участников и не портит накопитель. `test` 35/35, `test:integration` 15/15, `check`, `lint` и `build` прошли.
- [x] 2026-10-07: `c92f699 fix(auth): redact SQL errors during Telegram sign-in` — внутренние 500 всегда возвращают общий `INTERNAL_ERROR` без SQL/параметров даже в development; unit-тесты покрывают SQL leak, validation, client-safe API и plain-object ошибки Fastify. Integration проверяет повторный upsert Telegram-сессии с индексом миграции 0008. `test` 39/39, `test:integration` 16/16, `check`, `lint`, выборочный Prettier и `build` прошли. Runbook описывает проверку/применение миграции 0008; наиболее вероятная причина исходного upsert сбоя — не применённая к целевой БД 0008.
- [x] 2026-10-07: `b06c633 refactor(analytics): extract session and insight calculations` — расчёт сессий (граница паузы, длительность, night sessions в заданном timezone, highlights) и генерация insights вынесены в shared; API service стал короче примерно на 200 строк. `test` 44/44, Docker-backed integration 16/16, `check`, `lint`, выборочный Prettier и `build` прошли.

- [x] 2026-10-07: `6f3bff6 refactor(analytics): extract group report calculations` — вычисления группового отчёта перенесены в чистую функцию `packages/shared`; расчёт reply coverage теперь O(n), форматтер timezone создаётся один раз на отчёт, входные данные не мутируются. Проверки: unit 45/45, Docker-backed integration 16/16, `lint`, `check` и `build` прошли. Сохраняются известные build warnings Nuxt о чанках свыше 500 kB и ineffective dynamic imports.

- [x] 2026-10-07: `2856967 docs: define first-party production deployment` — добавлен `docs/DEPLOY.md` с production-топологией `app.<домен>`/`api.<домен>`, настройками credentialed CORS и host-only refresh-cookie, требованиями к маскированию query в логах всех proxy/CDN и порядком релиза. Домен владельцем пока не выбран; перед реальным production deployment это остаётся обязательным решением и браузерной проверкой.

- [x] 2026-10-07: `01d9a2e refactor(analytics): extract conversation timeline metrics` — response samples/percentiles, response rate, session starts, longest gap и 30-дневные паузы перенесены в чистую функцию `packages/shared`; добавлены тесты пустого/группового timeline, точной границы 8 часов и отсутствия мутаций. Проверки: unit 48/48, Docker-backed integration 16/16, `lint`, `check`, `build` прошли.

- [x] 2026-10-07: `bdb84d7 refactor(web): extract parse progress state transitions` — переходы WebSocket-событий progress/completed/failed/error/cancelled перенесены из composable в pure shared reducer; transport composable оставляет подключение, retry и синхронизацию. Unit 50/50, Docker integration 17/17, `lint`, `check`, `build` прошли.

- [x] 2026-10-07: `07bcfd2 refactor(api): centralize shared request contracts` — auth/profile/report/top query/route parameter validation теперь использует runtime Zod-схемы из `packages/shared`; endpoint map дополнен `/stats/top`. Добавлен integration-путь через fake Telegram adapter: send-code → verify → выбор чата → queue/progress → результат → удаление → logout/revocation. `test` 52/52, Docker-backed integration 17/17, `lint`, `check`, selective Prettier и `build` прошли.
- [x] 2026-10-07: повторно проверен dependency audit: API production-граф без advisory; web build-граф сохраняет 2 high (`node-forge@1.4.0`, `braces@3.0.3`), у текущих advisories нет upstream patched version. `pnpm audit --prod` не зелёный и supply-chain риск остаётся открытым.
- [x] 2026-10-07: повторная `docker compose build api worker web` после запуска Docker Engine успешно собрала все три образа с frozen lockfile. Nuxt сообщает о чанке 687 kB, ineffective dynamic imports и длительных plugin callbacks; сборка завершилась. Реальный Telegram и браузер с production sibling-доменами требуют ручной проверки.
- [x] 2026-10-07: перед закрытием обнаружены и устранены два release-дефекта: API production bundle оставлял `@tg-analyzer/shared` как runtime import при export на TypeScript source; shared теперь bundled, а Docker build копирует `tsup.config.ts`. OpenAPI schemas использовали невалидный Zod target `draft-07`; исправлено на `draft-7`. Zod закреплён на SSR-совместимом 4.1.5 после ошибки Nitro `Identifier 'process' has already been declared` на 4.4.3. Production API запущен из dist (`/health` и OpenAPI 200); production Nitro web вернул `/login` 200 с CSP и SSR-разметкой.
- [x] Итоговый прогон: unit 54/54, Docker PostgreSQL/Redis integration 18/18, `lint`, `check`, `build` успешны. Docker build `api`, `worker`, `web` повторно проходит на frozen lockfile. `pnpm audit --prod`: 0 critical, 2 high в web build graph без upstream patched version. Nuxt build: client chunk 696 kB; остаются warnings dynamic middleware imports, long plugin callbacks и deprecated Vue shared export mapping.
