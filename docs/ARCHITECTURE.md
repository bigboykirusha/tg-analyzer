# Архитектура

```text
Браузер ──HTTPS──> Nuxt (web) ──/api proxy──> Fastify API ──> PostgreSQL
   │                                              │
   └──────────── WSS (одноразовый ticket) ────────┤──> Redis ──> BullMQ worker ──> Telegram
```

## Поток анализа

1. Пользователь входит по номеру телефона (код, при необходимости пароль 2FA). Строка Telegram-сессии шифруется AES-256-GCM и хранится в `telegram_sessions`.
2. Дашборд показывает диалоги (`GET /parse/dialogs`, кэш в Redis) и уже готовые отчёты (`GET /reports`). Аватары подгружаются пачками (`POST /parse/avatars`).
3. `POST /parse/start` создаёт запись в `parse_jobs` и задачу BullMQ. Анализы разных чатов встают в очередь (worker обрабатывает до 4 задач параллельно); один и тот же чат не может стоять в очереди дважды, а повторный анализ ограничен `CHAT_REPARSE_COOLDOWN_MINUTES`. Если пользователь включил «Отключать Telegram после анализа», сессия удаляется, когда в очереди не остаётся его задач.
4. Worker берёт lease на Telegram-сессию пользователя (чтобы API и worker не открыли её одновременно — иначе Telegram отвечает `AUTH_KEY_DUPLICATED`), читает историю и передаёт каждое сообщение в `ChatReportBuilder` из `packages/shared`. Текст сразу сводится к счётчикам, сам текст нигде не сохраняется.
5. Прогресс (`phase`, `scannedMessages / totalMessages`) пишется в Redis и уходит в браузер по WebSocket; при обрыве сокета клиент опрашивает `GET /parse/status`.
6. Готовый отчёт сохраняется одним JSON-документом в `chat_reports` (версия схемы `ChatReport.version`) в одной транзакции с завершением задачи. Производные метрики и «Главное» (`deriveReportMetrics`, `deriveInsights`) вычисляются при чтении, а `normalizeReport` дочищает старые отчёты (стоп-слова, новые поля), поэтому аналитику можно улучшать без перепарсинга.

## Модули API

| Модуль     | Ответственность                                                               |
| ---------- | ----------------------------------------------------------------------------- |
| `auth`     | вход через Telegram, JWT access + ротируемые refresh-семьи, WS-tickets        |
| `account`  | пользователи, настройки, Telegram-сессии, отключение Telegram, удаление       |
| `parse`    | диалоги, очередь, прогресс, анализ, восстановление задач после сбоя Redis     |
| `reports`  | чтение и удаление отчётов                                                     |
| `system`   | `/health`, `/ready` (Postgres, Redis, heartbeat worker), очистка по retention |
| `telegram` | шлюз к Telegram: `live` (gramjs) и `fake` (детерминированный демо-аккаунт)    |

Контракт эндпоинтов (`ApiEndpointMap`) и zod-схемы лежат в `packages/shared/src/api`, клиент вызывает их типобезопасно через `api('GET /api/v1/...')`.

## Веб-клиент

- Страницы: `/login`, `/dashboard`, `/chat/:id`, `/account`, `/example` (публичный пример отчёта, собирается в браузере тем же `ChatReportBuilder`), `/terms`, `/offline`.
- Страницы после входа рендерятся только на клиенте (`ssr: false` в `routeRules`): Vue не исправляет расхождения классов после гидратации.
- Access-token живёт только в памяти; при загрузке страницы клиент обновляет его по HttpOnly refresh-cookie. Вкладки синхронизируют обновление через Web Locks.
- Аналитика — чистые функции в `packages/shared/src/analytics` с тестами; web и API используют один код.
- Стили — CSS-переменные (`assets/styles/tokens.css`), светлая и тёмная тема, без UI-фреймворка. Тексты интерфейса — `app/i18n/{en,ru}.ts`, ключи проверяются TypeScript.
