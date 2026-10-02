#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ ! -f .env ]]; then
  printf 'Copia .env.example a .env y configura las credenciales antes de iniciar.\n' >&2
  exit 1
fi
docker compose -f compose.yaml -f compose.dev.yaml up --build -d
printf 'Aplicacion disponible en el puerto PORT de .env (3000 por defecto).\n'
