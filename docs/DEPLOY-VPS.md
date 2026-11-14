# Прод на своём сервере (VPS)

Весь продукт на одной машине в Docker: сайт, API, worker, Postgres, Redis и Caddy (HTTPS). Файлы — в папке `deploy/`. Облака (Vercel, Railway, Neon, Upstash) не нужны.

Почему так (решение 10.11.2026): аудитория — Россия, Украина, Грузия, Польша и соседи. Европейский сервер без прокси Cloudflare одинаково доступен везде, данные и очередь живут рядом, один счёт.

## Что нужно

- Сервер: Ubuntu 22.04 или 24.04, 2 vCPU, 4 ГБ RAM, 40 ГБ диска, регион Европа (Хельсинки, Амстердам, Франкфурт). Подойдёт Kamatera, Hetzner, Aeza и т. п.
- `TELEGRAM_API_ID` и `TELEGRAM_API_HASH` с https://my.telegram.org → API development tools.
- Домен — не обязателен на старте: сайт поднимается на бесплатном адресе `IP-через-дефисы.sslip.io` с настоящим HTTPS.

## Первый запуск (10–15 минут)

1. Зайдите на сервер по SSH под root (адрес и пароль — в панели хостера):

   ```bash
   ssh root@АДРЕС_СЕРВЕРА
   ```

2. Скачайте проект и запустите установку:

   ```bash
   apt-get update && apt-get install -y git
   git clone https://github.com/bigboykirusha/tg-analyzer.git /opt/tganalyzer
   bash /opt/tganalyzer/deploy/setup.sh
   ```

   Скрипт поставит Docker, файрвол (открыты только 22, 80, 443) и swap, создаст `deploy/.env` со свежими секретами и спросит:
   - адрес сайта — нажмите Enter, чтобы взять `IP.sslip.io`, или введите домен;
   - `TELEGRAM_API_ID` и `TELEGRAM_API_HASH` (хеш при вводе не виден).

   Первая сборка идёт 5–10 минут.

3. Откройте `https://АДРЕС` из конца вывода. Сертификат появляется за минуту после старта.

4. Сохраните копию `/opt/tganalyzer/deploy/.env` у себя (например, в менеджере паролей): без `SESSION_ENCRYPTION_KEY` все пользователи будут разлогинены из Telegram.

## Обновление

После пуша в `main`:

```bash
bash /opt/tganalyzer/deploy/update.sh
```

Скрипт подтянет код, пересоберёт изменённое и перезапустит сервисы. Миграции базы применяются сами при старте. Перерыв — секунды.

## Свой домен

1. У регистратора домена создайте две DNS-записи типа `A` на IP сервера: `@` (сам домен) и `www`. Прокси Cloudflare не включайте.
2. На сервере поменяйте адрес и перезапустите:

   ```bash
   cd /opt/tganalyzer/deploy
   sed -i 's/^SITE_HOST=.*/SITE_HOST=ваш-домен.com/' .env
   docker compose up -d --build
   ```

Caddy сам получит сертификат. Старые входы на адресе sslip.io перестанут действовать — люди просто войдут заново.

## Бэкапы

Каждую ночь в 04:00 дамп базы кладётся в `deploy/backups/`, хранится 14 дней. Вручную: `bash deploy/backup.sh`.

Восстановление:

```bash
cd /opt/tganalyzer/deploy
gunzip -c backups/ФАЙЛ.sql.gz | docker compose exec -T postgres psql -U tganalyzer tganalyzer
```

Бэкапы лежат на том же сервере. Раз в неделю копируйте свежий файл к себе (`scp root@АДРЕС:/opt/tganalyzer/deploy/backups/ФАЙЛ .`) или включите снапшоты диска у хостера.

## Если что-то не так

```bash
cd /opt/tganalyzer/deploy
docker compose ps                 # все сервисы должны быть running / healthy
docker compose logs -f api        # или worker, web, caddy
docker compose restart worker
```

- Сайт не открывается по HTTPS — `docker compose logs caddy`: чаще всего DNS домена ещё не указывает на сервер или закрыт порт 80.
- Вход не доходит до кода — `docker compose logs api`, проверьте `TELEGRAM_API_ID/HASH` в `.env`.
- Разбор висит — `docker compose logs worker`.

Пуш-уведомления («Отчёт готов» и остальные события человека): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` и `VAPID_SUBJECT` (`mailto:адрес`) в `.env`, ключи — `docker compose run --rm api npx web-push generate-vapid-keys` (или на любом компьютере с Node), затем `docker compose up -d`. Ключи не меняйте: подписки, сделанные со старыми, перестанут работать.

Бот (новости для подписчиков и «Сообщить о проблеме»): `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME` в `.env`. Персональных сообщений и входа на сайт у бота нет. Рассылка всем подписчикам: `docker compose exec worker node dist/broadcast.js "Текст"` покажет, сколько человек её получат, с `--send` — отправит (длинный текст — `--file путь`, файл должен быть внутри контейнера).

Алерты в Telegram: заполните `ALERT_TELEGRAM_BOT_TOKEN` и `ALERT_TELEGRAM_CHAT_ID` в `.env` и выполните `docker compose up -d`.

## После переезда

Когда сайт на сервере заработает, старые облачные сервисы можно отключить: проект на Vercel, сервисы на Railway, базу Neon и Upstash. Данные из Neon не переносятся — пользователи войдут заново и сделают отчёты на новом сервере.
