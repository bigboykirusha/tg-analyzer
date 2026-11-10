#!/usr/bin/env bash
# Puts the latest main on the server: pull, rebuild what changed, restart. Migrations run on start.
#   bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")"

git -C .. pull --ff-only
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null
docker compose ps
