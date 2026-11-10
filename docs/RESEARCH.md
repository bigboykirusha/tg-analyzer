# Исследования и референсы

Здесь — внешние факты, на которые опираются продуктовые решения. Каждый пункт помечен: **факт** (проверено по источнику, дата проверки) или **гипотеза** (наш вывод, требует проверки данными). Обновлять при каждом новом исследовании.

## Конкуренты (проверено 10.11.2026)

### Анализаторы переписок по файлу экспорта

**Факт.** Большинство инструментов для Telegram работают с файлом `result.json` из Telegram Desktop и считают статистику в браузере, без входа в аккаунт:

- [Tera Chat](https://terachat.co/tools/telegram-chat-analyzer/): строка на участника — сообщения, доля, начатые разговоры, время ответа, «двойные» сообщения, эмодзи.
- [ChatPeek](https://chatpeek.app/telegram-chat-analyzer/): облако слов, тепловая карта, эмодзи, тональность; «100% в браузере».
- [Brutal Verdict](https://www.brutalverdict.com/telegram-chat-analyzer): кто пишет первым, скорость ответа; только личные чаты, часть статистики за входом.
- Открытый код: [PSS1998/telegram-chat-analyzer](https://github.com/PSS1998/telegram-chat-analyzer), [ConvoMetrics](https://github.com/MeetThakur/ConvoMetrics).

**Факт.** Экспорт есть только в Telegram Desktop. В мобильных приложениях и Telegram Web его нет (по описанию тех же сервисов).

Для WhatsApp та же модель «загрузи экспорт»: [MyChatWrap](https://mychatwrap.com/), [Unpack My Chat](https://unpackmychat.com/relationship-chat-analyzer/) — помесячная активность, ответы, ночные часы, паузы.

### «AI-анализ отношений»

**Факт.** Растущая ниша: [WhatsAI](https://apps.apple.com/us/app/whatsai-relationship-analysis/id6744169392) («effort score», статус отношений), [MosaicChats](https://www.mosaicchats.com/whatsapp-analyzer) (настроение, «совместимость», платный Pro), [Lucen](https://lucen.app/) («красные флаги», дейтинг-коуч), [Textopsy](https://textopsy.com/).

Сам Textopsy оговаривает, что экспорт чата не может установить чувства или намерения собеседника.

### «Wrapped» для переписок

**Факт.** Для iMessage есть [wyd.chat](https://www.producthunt.com/products/wyd-chat) («Spotify Wrapped для iMessage», данные остаются на устройстве) и [Messages Wrapped](https://live.trendhunter.com/trends/messages-wrapped).

## Что из этого следует для нас

**Гипотеза — наше отличие.**

- Работаем без экспорта, то есть с телефона, где экспорта нет.
- Отчёт обновляется по новым сообщениям.
- Есть групповые отчёты и «Итоги» в формате сторис.

**Гипотеза — наша слабость.** Барьер доверия выше: мы просим вход в аккаунт, а конкуренты читают файл в браузере. Поэтому лендинг и вход обязаны объяснять доступ (POLISH B1, A2).

**Гипотеза — стратегический вариант на будущее.** Режим «загрузить экспорт» (файл читается в браузере, без входа) как вход в продукт для осторожных пользователей ПК. Не делаем до релиза. Проверить спросом после.

**Решение — оценки отношений.** Не делаем «оценок отношений», «совместимости» и «красных флагов». Показываем только то, что честно следует из чисел. Основание — оговорка Textopsy и наша ставка на доверие.

## Форма отчёта

**Факт** — Apple HIG, [Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data), прочитано 10.11.2026:

- «Keep a chart simple»; «resist the temptation to pack as much data as possible».
- Добавлять к графику описательный заголовок или сводку.
- «Prefer consistency across multiple charts»; предпочитать распространённые типы графиков (столбики, линии).

**Факт** — Spotify Wrapped 2025 ([newsroom](https://newsroom.spotify.com/tag/wrapped-data-stories), [Dataconomy](https://dataconomy.com/2025/12/03/spotify-wrapped-2025-more-layers-stories-and-connection-than-ever-before)): у каждой истории своя карточка для шаринга. Подача — история из карточек с одной цифрой на экран.

Подробного разбора дизайна от самой Spotify не нашёл. Вторичные «разборы» в выдаче — в основном SEO-мусор.

**Факт.** [Strava Year in Sport 2025](https://support.strava.com/hc/en-us/articles/22067973274509-Your-Year-in-Sport) — только в приложении и только по подписке. Платный доступ вызвал недовольство, о нём писала Ars Technica.

**Вывод для отчёта** (POLISH §2):

- одна карточка — один вопрос — одна фраза-ответ — одна картинка;
- 4 вида графиков на весь отчёт;
- «Итоги» — по одной цифре на кадр, у каждого кадра своя картинка для шаринга.

## Технологии

**Факт.** [GramJS](https://github.com/gram-js/gramjs) (npm `telegram`, у нас `^2.26.22` в `apps/api`) заархивирован 14.07.2026, README: «no longer maintained».

Преемник — [teleproto](https://github.com/sanyok12345/teleproto):

- лицензия MIT, около 310 звёзд, слой Telegram API 232;
- «largely compatible», но не прямая замена: изменены `proxy`/`networkSocket`, правила догрузки обновлений и т.д.;
- строки сессий GramJS по README совместимы.

Даты последних коммитов и релизов на странице не видны — проверить в npm перед миграцией.

**Факт.** [Вход по QR-коду](https://core.telegram.org/api/qr-login) — официальный поток: `auth.exportLoginToken`, токен живёт около 30 с и показывается как `tg://login…`; подтверждение — из уже вошедшего приложения.

**Гипотеза.** На ПК вход по QR удобнее и вызывает больше доверия, чем номер и код: так входят в Telegram Web и Desktop. Кандидат после релиза.
