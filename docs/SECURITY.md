# Безопасность

## Сессии приложения

Access-token действует 15 минут и существует только в памяти браузера. Refresh-token находится только в `HttpOnly` cookie и привязан к отзываемой семье в PostgreSQL. Операции с cookie требуют разрешённый `Origin`; Redis rate limit для входа работает fail-closed (`skipOnError: false`): при недоступном Redis вход не должен обходить защиту.

В production сайт и API живут на одном адресе: Caddy отдаёт сайт, а сайт сам проксирует `/api` в API (WebSocket `/ws` Caddy передаёт API напрямую). Refresh-cookie поэтому first-party при `SameSite=Lax`; разносить web и API по разным сайтам нельзя — cookie станет third-party, и Safari/Firefox могут заблокировать тихий refresh.

## WebSocket

WebSocket не принимает JWT. Клиент получает короткоживущий одноразовый ticket у authenticated API; ticket передаётся в query handshake из-за ограничений браузерного WebSocket API. API redacts query string, но reverse proxy и hosting тоже обязаны исключать query из access/error logs. Ticket нельзя помещать в referer, метрики, трассировки или логи CDN.

## Telegram

Постоянные и временные Telegram session strings шифруются AES-GCM. При `SESSION_REVOKED` сессия деактивируется и задача не повторяется. Ротация ключа шифрования пока не реализована: перед сменой `SESSION_ENCRYPTION_KEY` нужен versioned envelope, чтение старого ключа и backfill ciphertext.
