# TG Analyzer: подробная карта проекта

## 1. Что это за проект

`tg-analyzer` это `pnpm`-монорепозиторий для анализа Telegram-переписок.

Основная продуктовая идея:

- пользователь авторизуется через Telegram;
- сервер сохраняет зашифрованную Telegram-сессию;
- пользователь выбирает один чат;
- воркер асинхронно выгружает историю сообщений этого чата или набора чатов;
- из истории считаются агрегаты;
- агрегаты сохраняются в PostgreSQL;
- веб-интерфейс показывает отчет по конкретному чату.

Ключевая продуктовая особенность текущей версии:

- приложение сознательно ориентировано не на “всю жизнь аккаунта”, а на анализ отдельных диалогов;
- в UI это видно по странице `dashboard`, где выбирается один чат, и по отдельной странице отчета `/chat/[id]`.

---

## 2. Технологический стек

### Backend

- `Fastify`
- `@fastify/jwt`
- `@fastify/cookie`
- `@fastify/websocket`
- `@fastify/rate-limit`
- `Drizzle ORM`
- `PostgreSQL`
- `Redis`
- `BullMQ`
- `GramJS` через пакет `telegram`
- `Zod`

### Frontend

- `Nuxt 4`
- `Vue 3`
- `Pinia`
- `Tailwind CSS`
- `ECharts`
- `vue-echarts`

### Monorepo

- `pnpm workspaces`
- общий пакет типов `@tg-analyzer/shared`

---

## 3. Корневая структура репозитория

```text
/
  apps/
    api/        -> backend API + workers
    web/        -> Nuxt frontend
  packages/
    shared/     -> общие DTO и типы
  .env.example  -> пример переменных окружения
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

### Назначение верхнего уровня

- `apps/api` содержит HTTP API, WebSocket endpoint, очередь и воркеры.
- `apps/web` содержит пользовательский интерфейс.
- `packages/shared` содержит общий контракт между фронтом и бэком.
- `docker-compose.yml` поднимает `postgres`, `redis`, `api`, `worker`, `web`, `bull-board`.

---

## 4. Команды проекта

В корневом `package.json`:

- `pnpm build` -> собрать все пакеты
- `pnpm dev` -> запустить API в watch-режиме
- `pnpm dev:web` -> запустить Nuxt
- `pnpm dev:worker` -> запустить воркер
- `pnpm check` -> type-check всех пакетов
- `pnpm db:push` -> применить схему Drizzle в БД

Что важно:

- API и воркер запускаются отдельно.
- Для полноценной работы нужны одновременно:
  - `postgres`
  - `redis`
  - `api`
  - `worker`
  - `web`

---

## 5. Переменные окружения

Проект зависит от следующих групп настроек:

### Telegram

- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`

Нужны для входа через Telegram и работы GramJS.

### Database

- `DATABASE_URL`

### Redis

- `REDIS_URL`

### Security

- `SESSION_ENCRYPTION_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECURE`

### API

- `API_HOST`
- `API_PORT`
- `NODE_ENV`
- `CORS_ORIGIN`
- `AUTH_RATE_LIMIT_MAX`
- `AUTH_RATE_LIMIT_WINDOW`
- `FULL_PARSE_COOLDOWN_HOURS`
- `DATA_RETENTION_DAYS`

### Frontend

- `NUXT_PUBLIC_API_URL`
- `NUXT_PUBLIC_WS_URL`

---

## 6. Архитектура по слоям

### 6.1. `packages/shared`

Это контрактный слой. Он нужен, чтобы фронт и API использовали один и тот же набор типов.

Основные типы:

- `UserDto`
- `AuthSuccessResponse`
- `PendingPasswordResponse`
- `ParseDialogDto`
- `ParseProgressDto`
- `ParseStatusResponse`
- `ParseHistoryItem`
- `GlobalStatsDto`
- `ChatStatsDto`
- `ActivityResponse`
- `TopResponse`
- WebSocket-события `ParseProgressWsEvent`

Смысл:

- фронт не гадает структуру API-ответов;
- backend и frontend жестко синхронизированы на уровне TypeScript.

---

### 6.2. `apps/api`

Содержит:

- Fastify-сервер
- конфиг
- доступ к БД
- middleware авторизации
- роуты
- сервисы
- BullMQ queue
- воркеры

Логическое разбиение:

- `routes/*` -> HTTP/WebSocket граница
- `services/*` -> бизнес-логика
- `db/*` -> схема и подключение к БД
- `workers/*` -> фоновая обработка

---

### 6.3. `apps/web`

Содержит:

- страницы логина
- dashboard выбора чатов и запуска парсинга
- страницу отчета по одному чату
- composables для API и auth
- Pinia stores
- визуальные компоненты

Главная UI-модель:

- `login.vue` -> пошаговый Telegram sign-in
- `dashboard.vue` -> выбор исходного чата и мониторинг run history
- `chat/[id].vue` -> отчет по уже проанализированному чату

---

## 7. Полный пользовательский сценарий

### Сценарий A: вход через Telegram

1. Пользователь вводит телефон.
2. Фронт вызывает `POST /api/auth/send-code`.
3. Backend создает временный GramJS client и отправляет код Telegram.
4. Пользователь вводит код.
5. Фронт вызывает `POST /api/auth/verify-code`.
6. Если Telegram требует 2FA:
   - backend возвращает `tempToken`;
   - фронт показывает шаг ввода пароля.
7. Если 2FA не нужна:
   - backend завершает Telegram auth;
   - получает данные пользователя;
   - сохраняет или обновляет пользователя в БД;
   - экспортирует строку Telegram-сессии;
   - шифрует ее;
   - сохраняет в `telegram_sessions`;
   - выдает `accessToken` и `refresh` cookie.
8. Если 2FA нужна:
   - фронт вызывает `POST /api/auth/verify-password`;
   - backend завершает вход и делает те же шаги сохранения сессии и выдачи токенов.

---

### Сценарий B: выбор и парсинг чата

1. Пользователь открывает `dashboard`.
2. Фронт запрашивает:
   - текущий parse status,
   - список уже проанализированных чатов,
   - историю запусков.
3. Затем фронт грузит список Telegram-диалогов из `GET /api/parse/dialogs`.
4. Пользователь выбирает чат.
5. Фронт вызывает `POST /api/parse/start` с `chatIds: [id]`.
6. Backend:
   - проверяет, нет ли активного job;
   - для полного парсинга применяет cooldown;
   - создает запись в `parse_jobs`;
   - публикует начальный progress в Redis;
   - добавляет задачу в BullMQ;
   - связывает Bull job с DB job;
   - помечает job как active в Redis.
7. Front подключает WebSocket `/ws/parse-progress?token=...`.
8. Worker берет job из очереди и начинает разбор сообщений.
9. По мере прогресса worker публикует события в Redis Pub/Sub.
10. WebSocket endpoint пересылает эти события на клиент.
11. После завершения обновляются:
   - `chat_stats`
   - `daily_activity`
   - `global_stats`
   - `parse_jobs`
12. Фронт обновляет dashboard, и чат появляется в списке analyzed chats.

---

### Сценарий C: просмотр отчета

1. Пользователь открывает `/chat/:id`.
2. Фронт запрашивает `GET /api/stats/chats/:chatId`.
3. API возвращает уже готовые агрегаты.
4. Страница строит:
   - баланс сообщений;
   - ритм по часам и дням;
   - heatmap активности;
   - топ слов и эмодзи;
   - уникальные слова по отправителю;
   - метрики ответа;
   - таймлайн активности;
   - длинные паузы;
   - тренд общения.

---

## 8. Backend: точка входа

Файл: `apps/api/src/index.ts`

Что делает:

- подключает `.env` через `load-env`
- создает Fastify server
- включает CORS с `credentials: true`
- подключает cookie
- подключает JWT
- подключает rate limit
- подключает websocket
- регистрирует роуты:
  - `/api/auth`
  - `/api/parse`
  - `/api/stats`
  - `/ws`
- поднимает `/health`

Итог:

- это тонкая точка сборки сервера;
- почти вся бизнес-логика вынесена в сервисы.

---

## 9. Конфиг backend

Файл: `apps/api/src/config.ts`

Что важно:

- конфиг валидируется через `zod`;
- `SESSION_ENCRYPTION_KEY` обязан быть 64-символьной hex-строкой;
- refresh cookie называется `tg_analyzer_refresh`;
- есть два важных продуктовых лимита:
  - `FULL_PARSE_COOLDOWN_HOURS`
  - `DATA_RETENTION_DAYS`

---

## 10. Хранилища и состояние

Проект использует три разных слоя состояния:

### PostgreSQL

Для долговременных данных:

- пользователи
- Telegram-сессии
- история parse jobs
- агрегаты по чатам
- дневная активность
- глобальные агрегаты
- refresh sessions

### Redis

Для краткоживущего и служебного состояния:

- временный контекст 2FA
- parse progress
- active parse marker
- cancel marker
- cooldown marker full parse
- pub/sub канал прогресса

### Память процесса Node.js

Используется внутри `TelegramPool`:

- подключенные Telegram clients
- pending clients на этапе входа
- cache аватаров

Это важно для анализа надежности:

- часть состояния не распределенная, а in-memory;
- при рестарте API pending auth-контекст и кеш клиентов из памяти пропадут;
- часть данных, критичных для UX, продублирована в Redis, но не все.

---

## 11. Схема базы данных

Файл: `apps/api/src/db/schema.ts`

### `users`

Поля:

- внутренний `id`
- `tgUserId`
- `tgPhone`
- `username`
- `firstName`
- `createdAt`
- `lastLogin`

Назначение:

- локальная сущность пользователя, привязанная к Telegram account.

### `telegram_sessions`

Поля:

- `userId`
- `sessionString`
- `sessionIv`
- `authTag`
- `dcId`
- `isActive`
- `createdAt`
- `expiresAt`

Назначение:

- хранение Telegram string session в зашифрованном виде.

### `parse_jobs`

Поля:

- `userId`
- `bullJobId`
- `status`
- `totalChats`
- `parsedChats`
- `totalMessages`
- `errorMessage`
- `startedAt`
- `completedAt`
- `createdAt`

Назначение:

- журнал фоновых задач.

### `chat_stats`

Главная аналитическая таблица. В ней лежит один агрегированный слепок на чат пользователя.

Ключ:

- уникальность по `(userId, tgChatId)`

Основные счетчики:

- `totalMessages`
- `sentMessages`
- `receivedMessages`
- `totalChars`
- `totalWords`
- `mediaCount`
- `voiceCount`
- `stickerCount`
- `fileCount`

Временные метрики:

- `firstMessageAt`
- `lastMessageAt`
- `avgResponseSec`
- `iWriteFirstPct`

JSON-агрегаты:

- `topWords`
- `topEmoji`
- `hourlyActivity`
- `dailyActivity`
- `weekdayActivity`
- `monthlyActivity`
- `hourlyActivitySplit`
- `topWordsBySender`
- `topEmojiBySender`
- `uniqueWordsBySender`
- `responseStats`
- `conversationFacts`
- `wordsPerMessage`

### `daily_activity`

Поля:

- `userId`
- `date`
- `sent`
- `received`

Назначение:

- отдельная таблица для агрегатов по дням, удобная для глобальной активности.

### `global_stats`

Один агрегат на пользователя:

- `totalChats`
- `totalMessages`
- `totalSent`
- `totalReceived`
- `totalChars`
- `topEmoji`
- `topWords`
- `firstEverMsg`
- `lastEverMsg`
- `mostActiveHour`
- `mostActiveDay`

### `refresh_sessions`

Серверное хранилище refresh session id:

- `userId`
- `tokenId`
- `expiresAt`
- `createdAt`

Назначение:

- refresh token делается revocable;
- при logout или refresh rotation запись удаляется и перевыпускается.

---

## 12. Авторизация и безопасность

### 12.1. Модель auth

Используется связка:

- короткий access token JWT
- долгий refresh token в `httpOnly` cookie

Access token:

- живет `15m`
- используется фронтом в `Authorization: Bearer ...`

Refresh token:

- живет `30d`
- лежит в cookie
- сервер дополнительно хранит `sessionId` в таблице `refresh_sessions`

Это дает:

- возможность silent refresh;
- возможность revoke refresh сессий.

---

### 12.2. Telegram auth

Файл: `apps/api/src/routes/auth.ts`

Роуты:

- `POST /send-code`
- `POST /verify-code`
- `POST /verify-password`
- `POST /refresh`
- `POST /logout`
- `POST /terminate-telegram`
- `DELETE /account`

Ключевая логика:

- отправка кода делает временный Telegram client;
- подтверждение кода либо логинит сразу, либо переводит в 2FA flow;
- 2FA flow хранит временный контекст в Redis;
- после успешного входа строка Telegram session шифруется и сохраняется в БД.

---

### 12.3. Шифрование Telegram session

Файл: `apps/api/src/services/crypto.service.ts`

Используется:

- `aes-256-gcm`
- ключ берется из `SESSION_ENCRYPTION_KEY`
- хранятся отдельно:
  - `encrypted`
  - `iv`
  - `authTag`

Это хорошее решение для защиты string session в БД.

---

### 12.4. JWT refresh rotation

Файл: `apps/api/src/services/jwt.service.ts`

Поведение:

- при выдаче токенов создается новая запись `refresh_sessions`
- при `refresh` старая refresh session удаляется
- затем создается новая

Следствие:

- проект использует refresh rotation, а не статичный refresh token.

---

## 13. TelegramPool и работа с Telegram

Файл: `apps/api/src/services/telegram.service.ts`

`TelegramPool` это центральная abstraction для работы с GramJS.

Он управляет тремя вещами:

### 13.1. Pending auth clients

Нужны для шага между `send-code` и `verify-code` / `verify-password`.

Хранится:

- `client`
- `phoneCodeHash`
- `phone`
- `expiresAt`

TTL:

- 5 минут

### 13.2. Authorized clients

Map `userId -> TelegramClient`

Назначение:

- не пересоздавать TelegramClient для каждого запроса;
- повторно использовать живое подключение для загрузки диалогов, аватаров и парсинга.

### 13.3. Avatar cache

Map `userId:dialogId -> Buffer`

TTL:

- 1 час

Назначение:

- не тянуть аватар чата из Telegram каждый раз.

### Важные свойства реализации

- это локальный in-memory pool;
- при горизонтальном масштабировании несколько API-инстансов будут иметь разные memory pools;
- если worker и API на разных процессах, каждый живет со своим собственным пулом;
- истины о сессии в памяти нет, истина в БД и Redis.

---

## 14. Очередь и воркеры

### Queue

Файл: `apps/api/src/queues/parse.queue.ts`

Есть две очереди:

- `parse-dialogs`
- `cleanup-old-data`

### Parse worker

Файл: `apps/api/src/workers/parse.worker.ts`

Это ключевая вычислительная часть проекта.

#### Что он делает

1. Проверяет отмену job.
2. Публикует статус “Connecting to Telegram”.
3. Поднимает авторизованный Telegram client пользователя.
4. Загружает список диалогов.
5. Фильтрует по `chatIds`, если передан выборочный запуск.
6. Обновляет `parse_jobs`:
   - `running`
   - `totalChats`
   - `parsedChats`
   - `totalMessages`
7. По каждому диалогу:
   - грузит сообщения батчами по 100;
   - двигает `offsetId`;
   - на каждом сообщении вызывает агрегатор;
   - обновляет live progress;
   - делает короткие паузы `sleep`.
8. После чата вызывает `saveAggregates`.
9. В конце:
   - помечает job `completed`;
   - публикует `completed`;
   - очищает active/cancel markers.

#### Ограничения и поведение

- concurrency worker = `2`
- rate limiter: `5` jobs / `1000ms`
- есть retry только для Telegram `FLOOD_WAIT`
- отмена реализована через Redis cancel flag

#### Что не делается

- не скачиваются медиа-файлы;
- не сохраняется сырой текст переписки;
- не создается message-level storage;
- аналитика строится сразу в агрегаты.

Это важно:

- проект privacy-friendly;
- но повторный пересчет новых метрик без репарса невозможен, если метрика требует сырые сообщения.

---

### Cleanup worker

Файл: `apps/api/src/workers/cleanup.worker.ts`

Назначение:

- удалять просроченные refresh sessions;
- удалять старые `parse_jobs` по `DATA_RETENTION_DAYS`.

Планировщик:

- cron `0 4 * * *`

Что сейчас не чистится:

- `chat_stats`
- `daily_activity`
- `global_stats`
- `telegram_sessions`

То есть retention затрагивает только часть данных.

---

## 15. Система прогресса парсинга

Прогресс размазан на три компонента:

### 15.1. Redis key-value

Хранит последний progress snapshot:

- ключ `parse:progress:${userId}`

Нужно для `GET /api/parse/status`.

### 15.2. Redis Pub/Sub

Канал:

- `parse:progress:${userId}`

Нужно для push-обновлений.

### 15.3. WebSocket gateway

Файл: `apps/api/src/routes/ws.ts`

Поведение:

- принимает JWT в query-параметре `token`
- извлекает `sub = userId`
- подписывается на Redis-канал пользователя
- пересылает сообщения в WebSocket

Это дает:

- быстрый live progress;
- отсутствие прямой связи worker -> websocket;
- worker публикует только в Redis.

---

## 16. Парсинг и вычисление метрик

Файл: `apps/api/src/services/stats.service.ts`

Это самое важное место для анализа логики.

### 16.1. Вход агрегатора

Каждое Telegram message приводится к минимальной форме:

- `message`
- `date`
- `outgoing`
- `media`
- `voice`
- `sticker`
- `file`

Источник:

- `projectTelegramMessageMetadata`

Идея:

- вытащить только то, что нужно для статистики;
- не тащить лишние данные дальше.

---

### 16.2. Базовые счетчики

Для каждого сообщения увеличиваются:

- `totalMessages`
- `sentMessages` или `receivedMessages`
- `totalChars`
- `totalWords`
- `mediaCount`
- `voiceCount`
- `stickerCount`
- `fileCount`

Также обновляются:

- `firstMessageAt`
- `lastMessageAt`

---

### 16.3. Временные распределения

Считаются:

- `hourlyActivity`
- `dailyActivity`
- `weekdayActivity`
- `monthlyActivity`
- `hourlyActivitySplit`

Расшифровка:

- `hourlyActivity` -> сколько сообщений по часам
- `dailyActivity` -> sent/received по датам
- `weekdayActivity` -> sent/received/total по дням недели
- `monthlyActivity` -> sent/received/total по месяцам
- `hourlyActivitySplit` -> sent/received/total по каждому часу суток

---

### 16.4. Текстовая аналитика

Используются regex:

- emoji: `\p{Extended_Pictographic}`
- words: `[\p{L}\p{N}_-]{2,}`

Считаются:

- `topWords`
- `topEmoji`
- `topWordsBySender`
- `topEmojiBySender`
- `uniqueWordsBySender`

Модель:

- слова нормализуются к lowercase;
- стоп-слова отфильтровываются;
- отдельно копятся “мои” и “их” слова/эмодзи.

`uniqueWordsBySender`:

- берет слова одного участника, которых нет у второго.

---

### 16.5. Метрики диалога

Считаются только для `private` и `bot` чатов:

- `responseStats`
- `avgResponseSec`
- `iWriteFirstPct`

Правило сессии:

- граница сессии = `8 часов`

Логика:

- timeline сортируется по времени;
- если два соседних сообщения от разных сторон и gap <= 8 часов:
  - gap считается response time;
- если gap > 8 часов:
  - начинается новая session;
  - сообщение считается стартом новой разговорной сессии.

`iWriteFirstPct`:

- доля сессий, в которых первым пишу я.

`responseStats`:

- медиана моих ответов;
- медиана их ответов;
- количество сэмплов.

Важно:

- `avgResponseSec` фактически записывается как `medianMineSec`, а не среднее.
- название поля “avg” не совпадает с фактической логикой.

---

### 16.6. Conversation facts

Считаются:

- `activeDays`
- `longestGap`
- `mostActiveDate`
- `maxStreakDays`
- `firstMessageAt`
- `silencePeriodsOver30Days`
- `trend`
- `mostActiveMonth`

#### `maxStreakDays`

- максимальная длина непрерывной последовательности активных дней.

#### `silencePeriodsOver30Days`

- паузы между соседними сообщениями длиннее 30 дней;
- сохраняются до 8 крупнейших.

#### `trend`

На основе `monthlyActivity`:

- если данных меньше 6 месяцев -> `unknown`
- сравниваются последние 3 месяца и предыдущие 3
- >115% -> `growing`
- <85% -> `fading`
- иначе `stable`

---

### 16.7. Глобальная статистика

Функция `recomputeGlobalStats(userId)`:

- читает все `chat_stats` пользователя;
- складывает агрегаты по чатам;
- отдельно смотрит `daily_activity`;
- считает:
  - total counts
  - top words
  - top emoji
  - first/last message
  - most active hour
  - most active weekday

Это значит:

- глобальные метрики не считаются прямо из Telegram;
- они являются вторичным агрегатом поверх `chat_stats` и `daily_activity`.

---

## 17. HTTP API

### Auth

#### `POST /api/auth/send-code`

Body:

```json
{ "phone": "+123456789" }
```

Response:

```json
{ "phoneCodeHash": "..." }
```

#### `POST /api/auth/verify-code`

Body:

```json
{ "phone": "...", "code": "...", "phoneCodeHash": "..." }
```

Response варианты:

- успешный auth: `accessToken + user`
- 2FA требуется: `isPasswordRequired + tempToken`

#### `POST /api/auth/verify-password`

Body:

```json
{ "password": "..." }
```

Header:

- `Authorization: Bearer <tempToken>`

#### `POST /api/auth/refresh`

- читает refresh cookie
- вращает refresh session
- возвращает новый access token

#### `POST /api/auth/logout`

- отзывает refresh session
- чистит cookie

#### `POST /api/auth/terminate-telegram`

- best-effort logout в Telegram
- деактивирует локальную Telegram session

#### `DELETE /api/auth/account`

- удаляет пользователя каскадно со всеми зависимыми записями

---

### Parse

#### `POST /api/parse/start`

Body:

```json
{ "chatIds": ["123"] }
```

или пустой body для full parse.

Возвращает:

```json
{ "jobId": "..." }
```

#### `GET /api/parse/status`

Возвращает:

- текущий `jobId`
- `status`
- last known `progress`

#### `GET /api/parse/dialogs`

Возвращает до 500 Telegram dialogs:

- `id`
- `title`
- `type`
- `hasAvatar`

#### `GET /api/parse/dialogs/:dialogId/avatar`

Auth:

- либо JWT через обычный auth flow
- либо `?token=...` в query

Возвращает jpeg-аватар.

#### `DELETE /api/parse/cancel`

- помечает job на отмену
- пытается удалить из очереди, если job еще не активен
- публикует `cancelled`

#### `GET /api/parse/history`

- последние 20 parse jobs пользователя

---

### Stats

#### `GET /api/stats/global`

- глобальные агрегаты пользователя

#### `GET /api/stats/chats`

Поддерживает:

- `page`
- `limit`
- `sort`
- `order`

Но по коду сортировка реально различает только:

- `sent_messages`
- иначе `total_messages`

То есть API выглядит более общим, чем фактическая реализация.

#### `GET /api/stats/chats/:chatId`

- полный агрегированный отчет по чату

#### `GET /api/stats/activity`

- дневная активность пользователя
- фильтрует по `from/to` уже после чтения строк

#### `GET /api/stats/top`

Поддерживает:

- `emoji`
- `words`
- `chats`

---

## 18. Frontend: структура и логика

### 18.1. Архитектурная модель фронта

Frontend организован по простой схеме:

- `stores` держат состояние
- `composables` инкапсулируют API-логику
- `pages` собирают сценарии
- `components` отображают визуальные блоки

Это без избыточной абстракции, но вполне прозрачно для анализа.

---

### 18.2. Auth store

Файл: `apps/web/app/stores/auth.ts`

Хранит:

- `user`
- `accessToken`
- `tempToken`
- `phoneCodeHash`

Особенности:

- access token и user сохраняются в `localStorage`;
- при reload фронт пытается восстановиться через `bootstrap()`;
- refresh cookie автоматически используется через `credentials: include`.

---

### 18.3. API wrapper

Файл: `apps/web/app/composables/useApi.ts`

Что делает:

- автоматически приклеивает `Authorization`, если есть access token;
- при `401` пытается вызвать `/api/auth/refresh`;
- если refresh успешен, повторяет исходный запрос;
- иначе очищает auth store.

Это ключевая клиентская auth-механика.

---

### 18.4. Auth composable

Файл: `apps/web/app/composables/useAuth.ts`

Инкапсулирует:

- `bootstrap`
- `sendCode`
- `verifyCode`
- `verifyPassword`
- `refresh`
- `logout`
- `terminateTelegramSession`
- `deleteAccount`

---

### 18.5. Stats composable

Файл: `apps/web/app/composables/useStats.ts`

Инкапсулирует загрузку:

- глобальных метрик
- списка чатов
- конкретного чата
- activity
- parse history
- parse status
- списка Telegram dialogs

---

### 18.6. Parse progress composable

Файл: `apps/web/app/composables/useParseProgress.ts`

Отвечает за:

- локальное progress-state
- WebSocket connection
- применение snapshot-а из `/status`
- реакцию на события:
  - `progress`
  - `completed`
  - `failed`
  - `cancelled`

---

## 19. Страницы интерфейса

### `/`

Файл: `apps/web/app/pages/index.vue`

Минимальная redirect-страница:

- делает `bootstrap`
- отправляет на `/dashboard` или `/login`

### `/login`

Файл: `apps/web/app/pages/login.vue`

Пошаговый сценарий:

- `phone`
- `code`
- `password`

UI делает акцент на:

- приватности
- простоте
- Telegram-only входе

### `/dashboard`

Файл: `apps/web/app/pages/dashboard.vue`

Это основной control panel приложения.

Функции:

- проверка авторизации
- получение parse status
- загрузка уже проанализированных чатов
- загрузка run history
- загрузка списка Telegram dialogs
- поиск по доступным чатам
- выбор одного чата
- запуск парсинга выбранного чата
- отмена активного парсинга
- просмотр краткой истории запусков
- terminate Telegram session
- delete account

Продуктовый смысл:

- dashboard это не “аналитическая витрина”, а “операционный экран”.

### `/chat/[id]`

Файл: `apps/web/app/pages/chat/[id].vue`

Это основной аналитический отчет.

Поддерживает:

- `overview`
- `rhythm`
- `words`
- `timeline`

Дополнительные возможности:

- refresh report
- re-parse этого же чата
- copy link
- native share
- share в Telegram / WhatsApp / X
- print / save PDF

---

## 20. Что именно видит пользователь в отчете по чату

### Overview

- баланс sent/received
- количество сообщений
- active days
- доля моих сообщений
- тренд
- интересные факты
- медианы ответа
- words per message
- доля сессий, где я начинаю разговор первым

### Rhythm

- heatmap по дням
- activity по дням недели
- hourly sent/received
- monthly dynamics

### Words & Emoji

- популярные слова по сторонам
- топ эмодзи у меня
- топ эмодзи у собеседника
- уникальные слова по сторонам

### Timeline

- monthly trend
- first message
- most active month
- trend
- число длинных пауз > 30 дней
- список длинных пауз

---

## 21. Ограничения текущей реализации

Ниже не “ошибки”, а реальные ограничения, которые важно понимать при анализе.

### 21.1. Нет хранения сырых сообщений

Плюс:

- лучше для privacy
- ниже объем БД

Минус:

- невозможно добавить новые сложные метрики задним числом без повторного Telegram parse

### 21.2. Ограничение списка диалогов

- `client.getDialogs({ limit: 500 })`

Если у пользователя больше 500 диалогов, UI увидит только часть.

### 21.3. In-memory части Telegram auth flow

- pending clients и authorized clients живут в памяти процесса

Риск:

- рестарт API рвет часть промежуточных auth flow;
- multi-instance deployment сложнее.

### 21.4. Full parse cooldown только на полный запуск

- выборочный parse по `chatIds` cooldown не использует

Это осознанное продуктовое решение, но его важно учитывать.

### 21.5. `avgResponseSec` не соответствует названию

Поле называется “average”, но по факту туда кладется медиана моих ответов.

### 21.6. Очистка данных неполная

Retention worker чистит только:

- просроченные refresh sessions
- старые parse_jobs

Но не очищает:

- chat_stats
- daily_activity
- global_stats

### 21.7. Аватарный endpoint использует JWT в query string

Это удобно для `<img src=...>`, но query token хуже с точки зрения секретности, чем header-based auth.

### 21.8. Stop words выглядят поврежденными для части русских слов

В `stats.service.ts` русский список стоп-слов визуально выглядит как mojibake.

Следствие:

- фильтрация русских слов может работать некорректно;
- для качества аналитики текста это один из первых кандидатов на исправление.

### 21.9. Activity range фильтруется в памяти

`GET /api/stats/activity`:

- сначала читает все строки;
- потом фильтрует по `from/to`.

Для больших объемов лучше фильтровать на SQL-уровне.

### 21.10. Сортировка списка чатов частично фиктивная

Хотя API принимает произвольный `sort`, реально поддержаны только:

- `sent_messages`
- `total_messages`

---

## 22. Сильные стороны архитектуры

### Простая разделяемость ответственности

- API отвечает за auth, orchestration и выдачу данных
- worker отвечает за тяжелый parse и aggregation
- frontend отвечает только за UX и визуализацию

### Хороший shared contract

- DTO вынесены в отдельный пакет

### Privacy-by-aggregation

- сырые сообщения не сохраняются

### Live progress

- Redis + WebSocket схема достаточно чистая

### Повторное использование Telegram session

- сессия хранится безопаснее, чем в открытом виде

---

## 23. Слабые места и потенциальные точки развития

### Масштабирование

- in-memory TelegramPool плохо масштабируется горизонтально

### Пересчет аналитики

- без raw message storage новые фичи дороже в развитии

### Полнота Telegram ingestion

- limit на dialogs
- возможные долгие parse больших чатов
- один большой parse может быть дорог по времени

### Качество лингвистики

- базовый regex и stop-word подход простой;
- нет нормализации словоформ;
- нет языка, стемминга, лемматизации, topic extraction.

### Качество метрик ответа

- current model пригодна для rough analytics;
- но для сложных групповых разговоров и нестандартных пауз она неизбежно упрощает картину.

---

## 24. Карта файлов по назначению

### Корень

- `package.json` -> workspace scripts
- `docker-compose.yml` -> локальная инфраструктура
- `.env.example` -> обязательные env vars

### `apps/api/src`

- `index.ts` -> старт Fastify
- `config.ts` -> env config
- `load-env.ts` -> загрузка env
- `db/index.ts` -> подключение Drizzle
- `db/schema.ts` -> схема БД
- `middleware/auth.middleware.ts` -> проверка JWT
- `routes/auth.ts` -> auth endpoints
- `routes/parse.ts` -> parse lifecycle endpoints
- `routes/stats.ts` -> analytics endpoints
- `routes/ws.ts` -> WebSocket bridge
- `services/crypto.service.ts` -> шифрование Telegram session
- `services/jwt.service.ts` -> access/refresh tokens
- `services/redis.service.ts` -> Redis clients
- `services/session.service.ts` -> Redis markers + DB session helpers
- `services/telegram.service.ts` -> GramJS pool и auth helpers
- `services/stats.service.ts` -> агрегация и чтение статистики
- `queues/parse.queue.ts` -> BullMQ queues
- `workers/parse.worker.ts` -> основной parse worker
- `workers/cleanup.worker.ts` -> cleanup worker
- `workers/index.ts` -> запуск воркеров

### `apps/web/app`

- `app.vue` -> корневой layout
- `pages/index.vue` -> bootstrap redirect
- `pages/login.vue` -> Telegram login
- `pages/dashboard.vue` -> выбор чата и управление parse
- `pages/chat/[id].vue` -> отчет по чату
- `stores/auth.ts` -> auth state
- `stores/stats.ts` -> stats state
- `composables/useApi.ts` -> fetch wrapper + refresh
- `composables/useAuth.ts` -> auth API facade
- `composables/useStats.ts` -> stats API facade
- `composables/useParseProgress.ts` -> websocket progress
- `components/ChatAvatar.vue` -> аватар чата
- `components/stats/ParseProgress.vue` -> progress panel

### `packages/shared/src`

- `api.ts` -> DTO и контракты API
- `stats.ts` -> вспомогательные типы
- `index.ts` -> реэкспорт

---

## 25. Как читать проект “сверху вниз”

Если нужно быстро анализировать систему, лучший порядок такой:

1. `package.json`
2. `docker-compose.yml`
3. `apps/api/src/index.ts`
4. `apps/api/src/routes/auth.ts`
5. `apps/api/src/routes/parse.ts`
6. `apps/api/src/workers/parse.worker.ts`
7. `apps/api/src/services/stats.service.ts`
8. `apps/api/src/db/schema.ts`
9. `apps/web/app/pages/dashboard.vue`
10. `apps/web/app/pages/chat/[id].vue`
11. `packages/shared/src/api.ts`

Это даст максимально быстрый вход в проект:

- сначала инфраструктура;
- потом сценарии;
- потом фоновые вычисления;
- потом данные;
- потом UI.

---

## 26. Как сформулировать суть проекта одной фразой

`tg-analyzer` это full-stack сервис, который авторизует пользователя через Telegram, асинхронно парсит выбранные чаты, считает агрегированную статистику общения и показывает отчет по конкретной переписке через веб-интерфейс.

---

## 27. Краткий вывод для внешнего AI-анализа

Если этот проект будет анализировать внешний агент или модель, полезно считать, что:

- это не universal Telegram client, а analytics product;
- ключевая бизнес-ось проекта: `Telegram auth -> parse queue -> aggregate stats -> per-chat report`;
- главное вычислительное ядро находится в `stats.service.ts` и `parse.worker.ts`;
- главная продуктовая страница это `/chat/[id]`;
- источник истины по аналитике это `chat_stats` в PostgreSQL;
- live state парсинга живет в Redis;
- безопасность завязана на шифрование Telegram session и refresh rotation;
- текущая версия оптимизирована под простоту и privacy, а не под максимальную аналитическую глубину.
