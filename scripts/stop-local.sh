#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker compose down
# Preserve local PostgreSQL and Storage data.
npx --yes supabase@2.119.0 stop
