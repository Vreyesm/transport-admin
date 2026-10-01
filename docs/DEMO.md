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

La primera implementación (`de7cbb2`) se promovió al dominio público desde la rama del PR. La sesión Supabase expiró antes de crear el administrador, cerrar registro público y configurar Site URL; esos pasos siguen pendientes.
