#!/usr/bin/env bash
# First start on a fresh Ubuntu server (22.04 or 24.04), run as root from the repository:
#   bash deploy/setup.sh
# Installs Docker, a firewall and swap, writes deploy/.env with fresh secrets, schedules
# a nightly database backup and starts everything. Safe to run again: it keeps an existing .env.
set -euo pipefail

cd "$(dirname "$0")"
DEPLOY_DIR="$(pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy/setup.sh" >&2
  exit 1
fi

echo "== Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null

echo "== Firewall: SSH, HTTP, HTTPS"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
fi

echo "== Swap (building the site needs memory)"
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== Settings (deploy/.env)"
if [ ! -f .env ]; then
  cp .env.example .env
  hex() { openssl rand -hex "$1"; }
  set_value() { sed -i "s|^$1=.*|$1=$2|" .env; }
  set_value POSTGRES_PASSWORD "$(hex 24)"
  set_value SESSION_ENCRYPTION_KEY "$(hex 32)"
  set_value JWT_SECRET "$(hex 32)"
  set_value JWT_REFRESH_SECRET "$(hex 32)"

  ip="$(curl -fsS https://api.ipify.org || true)"
  default_host="${ip//./-}.sslip.io"
  read -r -p "Site address without https:// [${default_host}]: " host
  set_value SITE_HOST "${host:-$default_host}"
  read -r -p "TELEGRAM_API_ID (my.telegram.org): " api_id
  set_value TELEGRAM_API_ID "$api_id"
  read -r -s -p "TELEGRAM_API_HASH (input hidden): " api_hash
  echo
  set_value TELEGRAM_API_HASH "$api_hash"
  chmod 600 .env
  echo "Written deploy/.env. Keep a copy somewhere safe: losing SESSION_ENCRYPTION_KEY signs everyone out."
else
  echo "deploy/.env exists, kept as is."
fi

echo "== Nightly backup at 04:00"
chmod +x backup.sh update.sh
if ! command -v crontab >/dev/null 2>&1; then
  apt-get install -y cron >/dev/null
  systemctl enable --now cron >/dev/null
fi
cron_line="0 4 * * * ${DEPLOY_DIR}/backup.sh >> ${DEPLOY_DIR}/backups/backup.log 2>&1"
mkdir -p backups
# A fresh server has no crontab yet: `crontab -l` fails and grep finds nothing — neither is an error here.
{ crontab -l 2>/dev/null | grep -v "${DEPLOY_DIR}/backup.sh" || true; echo "$cron_line"; } | crontab -

echo "== Build and start (the first build takes 5–10 minutes)"
docker compose up -d --build

host="$(grep '^SITE_HOST=' .env | cut -d= -f2)"
echo
echo "Done. Open https://${host} (the HTTPS certificate may take a minute)."
echo "Status: docker compose -f ${DEPLOY_DIR}/docker-compose.yml ps"
