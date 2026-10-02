# Gestión de transportes

Next.js y PostgreSQL en Docker Compose. La consulta pública muestra disponibilidad sin contactos ni notas privadas; la administración requiere una cuenta habilitada. Datos, fotos y sesiones se guardan en PostgreSQL.

## Inicio

1. Copia `.env.example` a `.env`. Define `POSTGRES_PASSWORD` (alfanumérica para la URL), `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres).
2. Ejecuta `docker compose up --build -d`.
3. Abre http://localhost:3000. La cuenta inicial permite entrar en `/admin`.

Compose espera a PostgreSQL y aplica migraciones transaccionales antes de iniciar la aplicación. El volumen `postgres_data` persiste datos y fotos. La base no publica puertos. Las migraciones quedan registradas y pueden ejecutarse otra vez. La cuenta inicial se crea solamente si no existe; cambiar las variables no cambia su contraseña.

En producción usa HTTPS, `COOKIE_SECURE=true` y `APP_ORIGIN=https://tu-dominio`. Las sesiones duran ocho horas, usan cookies HttpOnly y pueden revocarse eliminando la fila de `auth.sessions` o deshabilitando la cuenta en `auth.users`. Login limita cada correo a diez intentos por quince minutos. El usuario PostgreSQL de la aplicación es de confianza: las peticiones públicas y administrativas cambian a roles restringidos dentro de cada transacción.

## Desarrollo y verificación

`npm ci`, `npm run dev`. Configura `DATABASE_URL` con una base migrada accesible. `node --env-file=.env scripts/database.mjs` aplica el esquema y crea la cuenta inicial. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` verifican el proyecto.

Los ejemplos son opcionales: carga `database/seed.sql` y luego `database/seed-usage.sql` usando psql. Nunca se cargan automáticamente en producción.

## Migración de una instalación existente

Consulta [la guía de migración](docs/MIGRACION.md). No se modifica ni elimina la instalación de origen. Haz un respaldo y verifica la nueva instalación antes de cambiar el tráfico.

## Respaldo

`docker compose exec -T postgres pg_dump -U transport -d transport -Fc > transport.dump` (usa un shell que preserve bytes para el formato binario). Incluye fotos, cuentas y sesiones. Conserva también `.env` en un lugar seguro. `docker compose down` conserva el volumen; `down -v` lo elimina.

Prueba de integración contra una instalación aislada: define `TEST_BASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`, y ejecuta `node tests/api.integration.mjs`. Esta prueba crea registros ficticios; úsala únicamente en una base de pruebas.

## Desarrollo local en Docker

Configura `.env` y ejecuta `bash scripts/start-local.sh`. El archivo `compose.dev.yaml` agrega recarga automatica y volumenes de dependencias y cache. `bash scripts/stop-local.sh` detiene el entorno conservando los datos. Para cargar ejemplos, ejecuta explicitamente `bash scripts/seed-demo.sh`. Estos scripts usan PostgreSQL del mismo proyecto de Compose.
