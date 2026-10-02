$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
# Explicit opt-in. This command targets only the local Docker database.
Get-Content -LiteralPath supabase/seed-demo.sql -Raw | & docker exec -i supabase_db_transport-admin psql -U postgres -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron cargar los datos de ejemplo locales.' }
Write-Host 'Seed de buses y asignaciones cargado en PostgreSQL local.'
