#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Preserve PostgreSQL data and development caches.
docker compose -f compose.yaml -f compose.dev.yaml down
