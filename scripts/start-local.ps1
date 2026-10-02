$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

& npx --yes supabase@2.119.0 start -x realtime,edge-runtime,logflare,vector,supavisor,imgproxy --yes | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar Supabase local.' }
$localStatus = (& npx --yes supabase@2.119.0 status -o json | Out-String) | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $localStatus.ANON_KEY) { throw 'No se pudo obtener la configuración local.' }
$localApiUri = [uri]$localStatus.API_URL
if (-not $localApiUri.IsLoopback) { throw 'El script solo permite aprovisionar Supabase local.' }

# Only public credentials go to the frontend container. Keep cloud .env.local intact.
@(
    "NEXT_PUBLIC_SUPABASE_URL=$($localStatus.API_URL)"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($localStatus.ANON_KEY)"
) | Set-Content -Encoding utf8 .env.docker.local

# Provision only the local test account through the local Auth admin API.
$localHeaders = @{ apikey = $localStatus.SERVICE_ROLE_KEY; Authorization = "Bearer $($localStatus.SERVICE_ROLE_KEY)" }
$localAdminSeed = Get-Content -LiteralPath supabase/seed-admin.json -Raw | ConvertFrom-Json
$localUsers = Invoke-RestMethod -Uri "$($localStatus.API_URL)/auth/v1/admin/users" -Headers $localHeaders
$localAdmin = $localUsers.users | Where-Object email -eq $localAdminSeed.email | Select-Object -First 1
if (-not $localAdmin) {
    $localBody = $localAdminSeed | ConvertTo-Json
    $localAdmin = Invoke-RestMethod -Method Post -Uri "$($localStatus.API_URL)/auth/v1/admin/users" -Headers $localHeaders -ContentType 'application/json' -Body $localBody
}
$localAdminId = [guid]::Parse($localAdmin.id).ToString()
& docker exec supabase_db_transport-admin psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "insert into public.admin_profiles(id) values ('$localAdminId') on conflict do nothing;"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo habilitar el administrador local.' }

& docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar la aplicación.' }
Write-Host 'Aplicación: http://localhost:3000'
Write-Host 'PostgreSQL: localhost:54322 (usuario/base/contraseña: postgres)'
Write-Host 'Studio: http://localhost:54323'
Write-Host 'Admin local: admin@transport-admin.cl / demotransporte'
