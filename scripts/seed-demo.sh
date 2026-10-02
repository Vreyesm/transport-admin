#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Explicit opt-in: only the PostgreSQL service in this Compose project.
docker compose exec -T postgres psql -U transport -d transport -v ON_ERROR_STOP=1 < database/seed.sql
docker compose exec -T postgres psql -U transport -d transport -v ON_ERROR_STOP=1 < database/seed-usage.sql
printf 'Datos ficticios cargados en PostgreSQL local.\n'
