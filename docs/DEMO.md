# Demo inicial

Repositorio: https://github.com/Vreyesm/transport-admin

- Proyecto Vercel: `transport-admin`, equipo `victorreyesmedina-7761s-projects`.
- Dominio: https://transport-admin-liart.vercel.app
- Supabase: `transport-admin-demo`, referencia `tjizcrnbpyanwstcxlgq`, región `us-east-1`.
- Ambas migraciones y `seed.sql` instalados desde SQL Editor en una transacción.
- Vercel recibe las dos variables públicas para Production y Preview. `.env.local` está ignorado por Git.
- GitHub/Vercel permite despliegues automáticos del repositorio. `main` es la rama de producción; el primer PR permanece abierto para revisión. La implementación puede desplegarse y promoverse desde su rama sin fusionar el PR.

Los ejemplos son ficticios. La administración requiere una cuenta creada en Supabase Auth y su UUID en `admin_profiles`. Nunca envíes la contraseña por chat ni añadas credenciales al repositorio.

## Verificación contra Supabase real

La función pública devuelve dos vehículos y una ocupación sin actividad ni contactos. Las llamadas anónimas directas a `vehicles`, `occupations`, `admin_profiles`, `audit_log` y `vehicle_photos` reciben permiso denegado (`42501`).

La primera implementación (`de7cbb2`) se promovió al dominio público desde la rama del PR. El titular creó su cuenta Auth y se habilitó su perfil administrativo. Registro público desactivado y Site URL configurada con el dominio HTTPS de la demo.

Seed adicional: supabase/seed-usage.sql cargado en la demo. Flota de cuatro vehículos; 27 ejemplos nuevos (24 reservas, tres mantenimientos, una de las reservas cancelada). La consulta pública muestra 27 ocupaciones activas incluyendo la reserva inicial y conserva denegado el acceso anónimo a tablas internas.
