# Безопасность

## Сессии приложения

Access-token действует 15 минут и существует только в памяти браузера. Refresh-token находится только в `HttpOnly` cookie и привязан к отзываемой семье в PostgreSQL. Операции с cookie требуют разрешённый `Origin`; Redis rate limit для входа работает fail-closed (`skipOnError: false`): при недоступном Redis вход не должен обходить защиту.

Для production web и API должны быть на sibling-доменах одного зарегистрированного сайта, например `app.example.com` и `api.example.com`. Тогда refresh-cookie остаётся first-party при `SameSite=Lax` или `Strict` по фактическому flow. Размещение web на `*.vercel.app` вместе с API на другом сайте создаёт third-party cookie: Safari/Firefox могут заблокировать тихий refresh даже при верном CORS. До выбора собственного домена это не считается production-ready конфигурацией.

## WebSocket

WebSocket не принимает JWT. Клиент получает короткоживущий одноразовый ticket у authenticated API; ticket передаётся в query handshake из-за ограничений браузерного WebSocket API. API redacts query string, но reverse proxy и hosting тоже обязаны исключать query из access/error logs. Ticket нельзя помещать в referer, метрики, трассировки или логи CDN.

## Telegram

Постоянные и временные Telegram session strings шифруются AES-GCM. При `SESSION_REVOKED` сессия деактивируется и задача не повторяется. Ротация ключа шифрования пока не реализована: перед сменой `SESSION_ENCRYPTION_KEY` нужен versioned envelope, чтение старого ключа и backfill ciphertext.
