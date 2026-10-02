$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
& docker compose down
if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la aplicación.' }
& npx --yes supabase@2.119.0 stop
if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener Supabase local.' }
# Supabase stop preserves the local database and Storage volumes.
