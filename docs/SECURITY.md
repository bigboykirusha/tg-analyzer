# Безопасность

## Сессии приложения

Access-token действует 15 минут и существует только в памяти браузера. Refresh-token находится только в `HttpOnly` cookie и привязан к отзываемой семье в PostgreSQL. Refresh-token меняется при каждом обновлении; сменённый токен живой семьи, пришедший снова, кражей не считается: если преемника ещё не использовали, токен получает его же (ответ потерялся, телефон усыпил вкладку), иначе — свою ветку в той же семье (iOS с 17.2 копирует cookie Safari в приложение на экране «Домой», и у двух хранилищ один токен). «Выйти» отзывает всю семью и стирает cookie; отказ в обновлении cookie не стирает (с 14.11: на телефоне запрос со старой или пустой cookie может обогнать запрос, уже принёсший свежую, и стёр бы её) и пишет в журнал причину — `refresh refused` с `reason` (`no_cookie`, `bad_token`, `unknown`, `mismatch`, `revoked`, `expired`, `successor_gone`, `no_user`), именами cookie (без значений) и браузером; отзыв сеанса Telegram пишется как `telegram session lost`, а браузер сам сообщает о выходе строкой `session_ended` (в работе или при загрузке, Safari или приложение, видна ли вкладка, сколько длился сеанс). Операции с cookie требуют разрешённый `Origin`; Redis rate limit для входа работает fail-closed (`skipOnError: false`): при недоступном Redis вход не должен обходить защиту.

В production сайт и API живут на одном адресе: Caddy отдаёт сайт, а сайт сам проксирует `/api` в API (WebSocket `/ws` Caddy передаёт API напрямую). Refresh-cookie поэтому first-party при `SameSite=Lax`; разносить web и API по разным сайтам нельзя — cookie станет third-party, и Safari/Firefox могут заблокировать тихий refresh.

## WebSocket

WebSocket не принимает JWT. Клиент получает короткоживущий одноразовый ticket у authenticated API; ticket передаётся в query handshake из-за ограничений браузерного WebSocket API. API redacts query string, но reverse proxy и hosting тоже обязаны исключать query из access/error logs. Ticket нельзя помещать в referer, метрики, трассировки или логи CDN.

## Telegram

Постоянные и временные Telegram session strings шифруются AES-GCM. При `SESSION_REVOKED` сессия деактивируется и задача не повторяется. Ротация ключа шифрования пока не реализована: перед сменой `SESSION_ENCRYPTION_KEY` нужен versioned envelope, чтение старого ключа и backfill ciphertext.
