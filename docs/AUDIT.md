# Аудит TG Analyzer — фаза 0

Дата: 2026-10-06. Исходная точка: `main`, локальные изменения трёх страниц сохранены. Номера строк ниже относятся к исходному коду до исправлений.

## Архитектура и границы доверия

```mermaid
flowchart LR
  Browser[Браузер: Nuxt / Pinia] -->|Bearer access / refresh cookie| API[Fastify API]
  Browser -->|JWT в URL WebSocket| WS[WebSocket прогресса]
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis: кэши / auth / BullMQ)]
  API --> TG[Telegram MTProto]
  Redis --> Worker[BullMQ worker]
  Worker --> TG
  Worker --> DB
  Worker -->|PubSub| WS
```

API доверяет подписанному JWT, выборки статистики ограничены userId. Access хранится в localStorage на 30 дней, refresh — HttpOnly cookie на 90 дней; семейства refresh хранятся в PostgreSQL. Постоянные Telegram-сессии шифруются AES-256-GCM, временные сохраняются в Redis открытым JSON. В PostgreSQL записываются агрегаты, слова/эмодзи и имена участников, а не исходные тексты. Worker постранично читает по 100 сообщений, но хранит временную шкалу сообщений в памяти.

## Проверки исходного состояния

- Node 22.14.0, pnpm 10.12.1. `check`, `build`, 8 unit-тестов: успешно (проверено при подготовке плана).
- Сборка: sourcemap warning nuxt:module-preload-polyfill, чанк 825.20 kB (285.79 kB gzip), DEP0155 в зависимостях Nuxt/Vue.
- Docker CLI установлен, Engine первоначально недоступен. Проверка чистой БД, EXPLAIN и полный запуск пока не выполнены. Предпринят запуск Docker Desktop; результаты последующей проверки будут в REPORT.
- README предлагает запускать worker/web дополнительно к `pnpm dev`, хотя scripts/dev.mjs уже запускает все три процесса; это приводит к дублированию.
- `pnpm audit --json`: 9 critical, 58 high, 45 moderate, 15 low (счётчики registry, не число подтверждённых эксплуатируемых путей). Есть advisories без patched_versions. Требуется обновление и анализ достижимости оставшихся.

## Проблемы

| ID / категория | Severity | Источник | Проблема и риск | Исправление / этап |
| --- | --- | --- | --- | --- |
| B1 Безопасность | High | apps/api/src/middleware/auth.middleware.ts:6 | HTTP принимает подписанный WS JWT без проверки назначения | Проверять version/kind/claims/algorithm и живую семью сессии; фаза 1 |
| B2 Безопасность | High | apps/api/src/services/jwt.service.ts:89; apps/web/app/stores/auth.ts:32 | 30-дневный access в localStorage, logout не отзывает его | 15 минут, память браузера, отзыв семьи, разовый перевход; фаза 1 |
| B3 Безопасность | High | apps/api/src/services/telegram.service.ts:99 | Временный sessionString в Redis без шифрования | AES-GCM для всего временного контекста; фаза 1 |
| B4 Безопасность | High | apps/api/src/index.ts:22; apps/api/src/routes/ws.ts:6 | URL с JWT и сырые ошибки могут попадать в лог; нет общего безопасного сериализатора | Редакция, безопасные ошибки, requestId; фаза 1 |
| B5 Безопасность | High | apps/api/src/routes/auth.ts:111; apps/api/src/index.ts:53 | Нет явного CSRF guard для cookie-операций; rate limit только в памяти процесса | Origin guard, Redis rate limit; фаза 1 |
| B6 Приватность | High | apps/api/src/routes/auth.ts:306 | Удаление аккаунта не координируется с worker, очередью и Redis-кэшами | Отзыв и остановка, транзакционная защита записи, очистка; фаза 1 |
| B7 Зависимости | High | pnpm-lock.yaml | Registry сообщает critical/high в Fastify, ORM, Nuxt, Vue и транзитивных зависимостях | Обновить совместимые версии, проверить оставшиеся пути; фаза 1 |
| C1 Конфигурация | High | apps/api/src/config.ts:18 | Boolean coercion превращает строку false в true; нет проверки URL и небезопасных production secrets | Чистый parser, ранний отказ без вывода значений; фаза 1 |
| A1/D1 Данные | High | apps/api/src/services/stats.service.ts:1750,1918,1973 | Отчёт, дневная и общая статистика записываются отдельно; сбой/гонка оставляет рассогласование | Транзакция и блокировка пользователя для save/delete; фаза 1 |
| A2/D2 Очереди | High | apps/api/src/routes/parse.ts:174; apps/api/src/services/session.service.ts:150 | Проверка активной задачи и создание не атомарны; enqueue не восстанавливается после падения | Уникальная активная задача, устойчивые параметры в БД, UUID queue id, reconciliation; фаза 1 |
| A3/F1 Надёжность | High | apps/api/src/workers/parse.worker.ts:288 | failed помечает задачу окончательно неуспешной и снимает блокировку перед retry; отмена может повториться | Терминальные переходы отдельно от попыток; фаза 1 |
| A4/F2 Надёжность | High | apps/api/src/services/telegram.service.ts:255 | GET+DEL/PEXPIRE не атомарны; потеря lease не останавливает клиент | Compare-and-delete/extend Lua, остановка при потере владения; фаза 1 |
| D3 БД | Medium | apps/api/src/db/schema.ts:31,43,372 | Нет уникальности Telegram-сессии и индексов истории/refresh families | Новая миграция с preflight и rollback; фаза 1 |
| F3 Shutdown | High | apps/api/src/workers/index.ts:19 | Redis/PG закрываются одновременно с worker, незавершённые операции теряют хранилище | Последовательное закрытие, ограниченный deadline; фаза 1 |
| A5 Аналитика | Medium | apps/api/src/workers/parse.worker.ts:190; apps/api/src/services/stats.service.ts:1898 | Лимит 500 диалогов; общий top из усечённых top чатов приблизителен | Явный отказ при неполном full parse; точные глобальные top — фаза 2 |
| C2 Качество | Medium | tsconfig.base.json:9; package.json:9 | strict включён, noUncheckedIndexedAccess отсутствует; lint/format отсутствуют; shared не имеет отдельного check | Строгие проверки, ESLint/Prettier, shared check; фаза 1 |
| C3 Архитектура | Medium | apps/api/src/services/stats.service.ts:1; apps/web/app/pages/chat/[id].vue:1 | Крупные модули, аналитика связана с БД; дублирование shared DTO в schema | Только необходимая декомпозиция фазы 1; полноценное разделение — фаза 2 |
| E1 Производительность | Medium | apps/api/src/services/stats.service.ts:509,714; apps/web/app/plugins/echarts.client.ts:1 | Timeline O(n) и сортировка; тяжёлый клиентский чанк | Нагрузочная проверка и потоковая аналитика — фазы 2/5, lazy charts — фаза 3 |
| F4 Эксплуатация | Medium | apps/api/Dockerfile:1; apps/web/Dockerfile:1; docker-compose.yml:1 | Root images, install без frozen lock; dev ports опубликованы; нет CI/backup/runbook | Привязать dev-хранилища к loopback; production упаковка и CI — фаза 4 |
| G1 Тесты | High | apps/api/src/services/session.service.test.ts:1 | Всего 8 тестов, нет интеграционных сценариев auth/queue/rollback | Node test + изолированные PG/Redis + browser сценарий; фаза 1 |
| H1 UI/a11y | Medium | apps/web/nuxt.config.ts:14 | user-scalable=no блокирует zoom; нет подтверждённых viewport/axe/Lighthouse результатов | Дизайн-аудит и исправления фазы 3; текущая фаза не заявляет визуальную приёмку |

Проверены маршруты auth/parse/stats/ws: статистика обычно фильтруется по userId; запасной путь отмены по Redis marker требует дополнительной проверки владельца. Числовые параметры должны быть целыми и безопасными, даты — календарными, с from <= to. Пустые чаты и timezone покрыты частично; DST, повтор страницы и сервисные сообщения требуют регрессий. XSS через v-html в просмотренных компонентах не обнаружен; это не заменяет браузерную проверку.

## Открытые вопросы и безопасные решения

- Production-домены, reverse proxy, резервное копирование неизвестны: не доверять proxy по умолчанию, запрещать wildcard origin в production.
- Telegram-креды не использовать для автоматических тестов: адаптеры только в тестовом окружении, реальный вход проверяется вручную.
- Полный перечень сообщений отсутствует в БД; TTL сейчас очищает историю задач, не отчёты. Не удалять отчёты автоматически без продуктовой политики; задокументировать фактическую политику.
- Для существующих дублей Telegram-сессий миграция должна остановиться с понятным preflight, а не молча удалять данные.

## Порядок работ

1. Опубликовать этот аудит; сохранить пользовательские изменения.
2. Падающие регрессионные тесты, env/auth/приватность и безопасные логи.
3. Миграции, атомарные агрегаты и жизненный цикл задач.
4. Строгая типизация, линтинг, форматирование, проверка зависимостей.
5. Unit/integration/browser, check/build; отчёт с доказательствами и честными ограничениями. К фазам 2–5 не переходить.
