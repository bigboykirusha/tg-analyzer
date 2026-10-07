# План и прогресс фаз 1a–1c

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
- [ ] Тесты конкурентности, rollback, retry/cancel и fail-closed policy проходят; нужен повтор integration-теста рестарта/reconciliation и реального Redis outage после восстановления Docker Engine.

## Фаза 1c — типы, стиль и зависимости

- [ ] `noUncheckedIndexedAccess` для API/shared/web без подавления ошибок.
- [ ] ESLint для TypeScript/Vue и Prettier; команды `lint` и `format:check`.
- [ ] Добавить и проверить security headers/CSP (с production-safe политикой для Nuxt/API).
- [ ] Аудит зависимостей, удаление неиспользуемого кода и пакетов; новые инструменты только в devDependencies.
- [ ] Полный `lint`, `format:check`, `check`, tests и `build`.

## Журнал выполнения

- [x] 2026-10-06: опубликован первичный аудит — commit `c074076`.
- [x] 2026-10-07: `8c4db4a` — добавлены категории эксплуатации/Telegram/cookies, решения WS-ticket и silent refresh, разбивка 1a–1c.
- [x] 2026-10-07: `4d335a4` — зафиксирован промежуточный прогресс и ограничения первичных проверок.
- [x] 2026-10-07: `a100228` — реализована 1a: purpose-bound токены и cutover, отзываемые семейства, WS-ticket, Origin/rate limit, AES-GCM для временного auth-state, очистка аккаунта, безопасные ошибки/логи, валидация конфига и тестируемый server builder.
- [x] 2026-10-07: `check`, локальный `build`, 16 unit- и 6 интеграционных тестов прошли; Playwright/Edge подтвердил 20 viewport-снимков, silent refresh и logout. Чистая установка, повтор миграций и upgrade 0007 прошли на отдельном PostgreSQL/Redis.
- [x] Фаза 1a завершена. Реальный Telegram-вход не запускался; API Docker image собирается, web Docker image не собирается из-за подтверждённых проблем Dockerfile/lockfile. Фазы 1b и 1c не начаты.
- [x] 2026-10-07: `5d1fe62` — Docker-сборки API/web используют зафиксированный lockfile и полный web build-context; обе image успешно собраны с Nuxt 4.4.4.
- [x] 2026-10-07: `05fea57` — БД атомарно допускает одну активную задачу, её UUID стал BullMQ jobId, параметры запуска сохраняются; миграция 0008 добавила preflight/индексы/rollback, отмена больше не доверяет чужому Redis marker.
- [x] 2026-10-07: `6d58561` — chat report, daily/global aggregates сохраняются и удаляются одной транзакцией под user row lock; повторная обработка не удваивает итоги, отменённая/удалённая задача не может записать результат. Добавлены rollback/concurrency/cancellation integration-тесты.
- [x] 2026-10-07: `6da4144` — worker восстанавливает зарезервированные, но не поставленные задачи по UUID и сохранённым параметрам; retry сохраняет активность, terminal cases не перезапускаются. Lease Redis стал compare-and-set, FLOOD_WAIT прерывается отменой, SESSION_REVOKED типизирован, shutdown закрывает обработчики до инфраструктуры.
- [x] 2026-10-07: `5265c2d` — зафиксированы fail-closed Redis rate limit, требования к first-party refresh-cookie, proxy logging WS-ticket, AOF/noeviction и migration/Redis runbook.
- [ ] Документировать для production: собственные sibling-домены web/API для first-party refresh-cookie; запрет query string в access-логах reverse proxy из-за WS-ticket. Наличие домена остаётся вопросом к владельцу.
