# Migración desde Supabase a PostgreSQL

Esta PR reemplaza SDK, Auth y Storage por API de Next.js, cuentas locales y fotos bytea. El esquema mantiene IDs, versiones, auditoría, RLS, exclusión de horarios y triggers. La instancia de origen no se altera.

1. Detén escrituras en origen y realiza respaldo de las tablas y archivos de Storage.
2. Inicia Compose con credenciales nuevas. El esquema se crea en una base vacía.
3. Exporta únicamente datos (no esquema, roles ni extensiones) de `public.settings`, `public.vehicles`, `public.occupations` y `public.audit_log` usando la conexión directa de PostgreSQL de Supabase. No exportes `auth` ni `storage`.
4. Importa en una transacción como propietario de la base. Deshabilita temporalmente triggers con `SET LOCAL session_replication_role=replica`, limpia la fila inicial de settings e importa en orden settings, vehicles, occupations, audit_log. Rehabilita triggers y reconstruye `vehicle_photos` desde `vehicles.photos`. Ajusta la secuencia de audit_log con `setval(pg_get_serial_sequence('public.audit_log','id'),coalesce((select max(id) from public.audit_log),1),exists(select 1 from public.audit_log))`. Las restricciones CHECK, FK y exclusión deben verificarse antes del cambio de tráfico.
5. Descarga cada foto original con acceso autorizado; insértala en `photo_files(mime,data)` y reemplaza su URL en `vehicles.photos` por `/api/photos/<id>`. Las URLs antiguas siguen visibles mientras el origen esté disponible, pero deben reemplazarse antes de retirarlo. Cambia también logos que dependan del origen a una URL independiente.
6. Reprovisiona administradores: no se trasladan contraseñas ni sesiones de Supabase. El script crea la primera cuenta; para cuentas adicionales inserta `auth.users` con hash `salt:scrypt(password,salt,64)` y su UUID en `admin_profiles`. Mantén el UUID original si necesitas continuidad entre cuentas y actores históricos.
7. Verifica conteos, historial, fotos, login, campos públicos, conflictos y edición antes de cambiar tráfico. Conserva origen y respaldo durante la validación para poder volver atrás.

Una instalación nueva no requiere exportaciones. `database/seed*.sql` contiene solo ejemplos opcionales. Ningún script de esta PR borra datos de Supabase.
