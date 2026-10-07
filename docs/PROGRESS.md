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

- [ ] Транзакционные save/delete отчётов и агрегатов; сериализация записей пользователя; отмена/актуальность до commit.
- [ ] Новые миграции с preflight, индексами/ограничениями, повторным запуском и документированным откатом.
- [ ] Атомарная резервация задач и восстановление enqueue; retry отдельно от terminal failure; корректная отмена.
- [ ] Compare-and-set Redis lease, сверка БД/BullMQ, progress по jobId, отменяемый FLOOD_WAIT, безопасный shutdown.
- [ ] Тесты конкурентности, rollback, retry/cancel, рестарт, Redis outage и SESSION_REVOKED.

## Фаза 1c — типы, стиль и зависимости

- [ ] `noUncheckedIndexedAccess` для API/shared/web без подавления ошибок.
- [ ] ESLint для TypeScript/Vue и Prettier; команды `lint` и `format:check`.
- [ ] Аудит зависимостей, удаление неиспользуемого кода и пакетов; новые инструменты только в devDependencies.
- [ ] Полный `lint`, `format:check`, `check`, tests и `build`.

## Журнал выполнения

- [x] 2026-10-06: опубликован первичный аудит — commit `c074076`.
- [x] 2026-10-07: `8c4db4a` — добавлены категории эксплуатации/Telegram/cookies, решения WS-ticket и silent refresh, разбивка 1a–1c.
- [x] 2026-10-07: `4d335a4` — зафиксирован промежуточный прогресс и ограничения первичных проверок.
- [x] 2026-10-07: `a100228` — реализована 1a: purpose-bound токены и cutover, отзываемые семейства, WS-ticket, Origin/rate limit, AES-GCM для временного auth-state, очистка аккаунта, безопасные ошибки/логи, валидация конфига и тестируемый server builder.
- [x] 2026-10-07: `check`, локальный `build`, 16 unit- и 6 интеграционных тестов прошли; Playwright/Edge подтвердил 20 viewport-снимков, silent refresh и logout. Чистая установка, повтор миграций и upgrade 0007 прошли на отдельном PostgreSQL/Redis.
- [x] Фаза 1a завершена. Реальный Telegram-вход не запускался; API Docker image собирается, web Docker image не собирается из-за подтверждённых проблем Dockerfile/lockfile. Фазы 1b и 1c не начаты.
