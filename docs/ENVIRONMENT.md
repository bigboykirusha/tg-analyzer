# Переменные окружения

Локально всё читается из корневого `.env` (шаблон — `.env.example`). В деплое задавайте значения в секретах платформы; API и worker используют одинаковые серверные переменные.

## API и worker

| Переменная                                      | Обязательна           | Назначение                                                             |
| ----------------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                                  | да                    | PostgreSQL.                                                            |
| `REDIS_URL`                                     | да                    | Redis (очереди, лимиты, прогресс). Политика памяти — `noeviction`.     |
| `SESSION_ENCRYPTION_KEY`                        | да                    | 64 hex-символа (`openssl rand -hex 32`), шифрует Telegram-сессии.      |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`              | да                    | Разные случайные строки ≥ 32 символов.                                 |
| `TELEGRAM_MODE`                                 | нет (`live`)          | `fake` — демо-аккаунт без Telegram; в production запрещён.             |
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`          | при `live`            | Ключи приложения с my.telegram.org.                                    |
| `CORS_ORIGIN`                                   | да                    | Точные origin веб-клиента через запятую; в production только `https`.  |
| `COOKIE_SECURE`                                 | нет                   | По умолчанию `true` в production.                                      |
| `COOKIE_SAME_SITE`                              | нет (`lax`)           | `none` требует `COOKIE_SECURE=true`.                                   |
| `COOKIE_DOMAIN`                                 | нет                   | Обычно не задаётся: cookie остаётся host-only.                         |
| `API_HOST`, `API_PORT` / `PORT`                 | нет                   | Адрес и порт API; платформы обычно задают `PORT`.                      |
| `LOG_LEVEL`                                     | нет (`info`)          | Уровень логов pino.                                                    |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW` | нет (`5`, `1 minute`) | Лимит попыток входа.                                                   |
| `CHAT_REPARSE_COOLDOWN_MINUTES`                 | нет (`60`)            | Пауза перед повторным анализом того же чата.                           |
| `DATA_RETENTION_DAYS`                           | нет (`365`)           | Сколько хранить историю запусков.                                      |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`   | нет                   | Свой бот для «Отчёт готов» (@BotFather). Без токена бот выключен.      |
| `FREE_ANALYSES_PER_DAY`                         | нет                   | Бесплатный лимит: анализов на человека за 24 часа. Пусто — без лимита. |
| `APP_URL`                                       | нет                   | Адрес сайта для кнопок в сообщениях бота; иначе первый `CORS_ORIGIN`.  |

В production API отказывается стартовать с `TELEGRAM_MODE=fake`, http-origin в `CORS_ORIGIN`, выключенным `COOKIE_SECURE` или секретами-заглушками.

## Web

| Переменная              | Когда читается | Назначение                                                                            |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `NUXT_API_PROXY_TARGET` | runtime        | Адрес API, на который web-сервер проксирует `/api/*`.                                 |
| `NUXT_PUBLIC_WS_URL`    | build          | Прямой `wss://` адрес API для прогресса. Попадает в CSP, поэтому задаётся при сборке. |
| `NUXT_PUBLIC_SITE_URL`  | build          | Канонический адрес сайта (SEO).                                                       |

Переменные `NUXT_PUBLIC_*` видны в браузере — секретов в них быть не должно.
