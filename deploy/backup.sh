#!/usr/bin/env bash
# Dumps the database to deploy/backups and keeps the last 14 days. setup.sh runs it nightly by cron.
# Restore: gunzip -c backups/<file>.sql.gz | docker compose exec -T postgres psql -U tganalyzer tganalyzer
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups

file="backups/tganalyzer-$(date +%Y-%m-%d-%H%M).sql.gz"
docker compose exec -T postgres pg_dump -U tganalyzer --clean --if-exists tganalyzer | gzip > "$file"
find backups -name 'tganalyzer-*.sql.gz' -mtime +14 -delete
echo "$(date -Is) saved $file ($(du -h "$file" | cut -f1))"
