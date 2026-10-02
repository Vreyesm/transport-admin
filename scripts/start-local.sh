#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
umask 077

npx --yes supabase@2.119.0 start -x realtime,edge-runtime,logflare,vector,supavisor,imgproxy --yes >/dev/null
npx --yes supabase@2.119.0 migration up --local
npx --yes supabase@2.119.0 status -o json | node scripts/provision-local.mjs
docker compose up --build -d
printf 'Aplicación: http://localhost:%s\n' "${APP_PORT:-3000}"
printf 'PostgreSQL: localhost:54322 (usuario/base/contraseña: postgres)\nStudio: http://localhost:54323\n'
