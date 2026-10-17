# Архитектура

```text
Браузер ──HTTPS──> Nuxt (web) ──/api proxy──> Fastify API ──> PostgreSQL
   │                                              │
   └──────────── WSS (одноразовый ticket) ────────┤──> Redis ──> BullMQ worker ──> Telegram
```

## Поток анализа

1. Пользователь входит по номеру телефона (код, при необходимости пароль 2FA). Строка Telegram-сессии шифруется AES-256-GCM и хранится в `telegram_sessions`.
2. Дашборд показывает диалоги (`GET /parse/dialogs`, кэш в Redis) и уже готовые отчёты (`GET /reports`). Аватары подгружаются пачками (`POST /parse/avatars`).
3. `POST /parse/start` создаёт запись в `parse_jobs` и задачу BullMQ. Одновременно у пользователя может идти только один анализ; повторный анализ того же чата ограничен `CHAT_REPARSE_COOLDOWN_MINUTES`.
4. Worker берёт lease на Telegram-сессию пользователя (чтобы API и worker не открыли её одновременно — иначе Telegram отвечает `AUTH_KEY_DUPLICATED`), читает историю и передаёт каждое сообщение в `ChatReportBuilder` из `packages/shared`. Текст сразу сводится к счётчикам, сам текст нигде не сохраняется.
5. Прогресс (`phase`, `scannedMessages / totalMessages`) пишется в Redis и уходит в браузер по WebSocket; при обрыве сокета клиент опрашивает `GET /parse/status`.
6. Готовый отчёт сохраняется одним JSON-документом в `chat_reports` (версия схемы `ChatReport.version`) в одной транзакции с завершением задачи. Производные метрики (здоровье, предсказуемость и т. п.) вычисляются при чтении (`deriveReportMetrics`), поэтому их можно улучшать без перепарсинга.

## Модули API

| Модуль     | Ответственность                                                               |
| ---------- | ----------------------------------------------------------------------------- |
| `auth`     | вход через Telegram, JWT access + ротируемые refresh-семьи, WS-tickets        |
| `account`  | пользователи, зашифрованные Telegram-сессии, удаление аккаунта                |
| `parse`    | диалоги, очередь, прогресс, анализ, восстановление задач после сбоя Redis     |
| `reports`  | чтение/удаление отчётов, отправка PDF в «Избранное»                           |
| `system`   | `/health`, `/ready` (Postgres, Redis, heartbeat worker), очистка по retention |
| `telegram` | шлюз к Telegram: `live` (gramjs) и `fake` (детерминированный демо-аккаунт)    |

Контракт эндпоинтов (`ApiEndpointMap`) и zod-схемы лежат в `packages/shared/src/api`, клиент вызывает их типобезопасно через `api('GET /api/v1/...')`.

## Веб-клиент

- Страницы: `/login`, `/dashboard`, `/chat/:id`, `/history`, `/privacy`, `/terms`.
- Access-token живёт только в памяти; при загрузке страницы клиент обновляет его по HttpOnly refresh-cookie. Вкладки синхронизируют обновление через Web Locks.
- Стили — CSS-переменные (`assets/styles/tokens.css`), светлая и тёмная тема, без UI-фреймворка. Тексты интерфейса — `app/i18n/{en,ru}.ts`, ключи проверяются TypeScript.
