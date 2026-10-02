#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Explicit opt-in; target only the local Docker database.
docker exec -i supabase_db_transport-admin psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/seed-demo.sql
printf 'Seed de buses y asignaciones cargado en PostgreSQL local.\n'
