# Validación de la primera versión

## Comprobaciones automatizadas

`npm test`: 7 pruebas aprobadas. PostgreSQL embebido ejecuta ambas migraciones; verifica exclusión entre reservas/mantenimiento, intervalos consecutivos, cancelación, inserciones competidoras, archivo, patente normalizada, metadatos de fotografías, auditoría, consulta pública sin campos privados y permisos anónimos/administrativos. Se comprueban offsets de verano/invierno, intervalos de varios días, hora inexistente y día de 23 horas en Chile.

`npm run lint`, `npm run typecheck` y `npm run build`: aprobados.

## Comprobaciones en navegador

- Acceso administrativo de demostración y navegación entre módulos.
- Alta de minibús ficticio, guardado y posterior asignación.
- Rechazo de reserva superpuesta con mensaje visible en el formulario.
- Consulta pública de la reserva: muestra vehículo e intervalo, omite contacto y notas.
- Subida y guardado de una fotografía PNG ficticia, marcada como principal.
- Vista móvil de 390 × 844: navegación, filtros y agenda; el calendario usa desplazamiento horizontal dentro de su contenedor sin desbordar la página.

## Comprobaciones con infraestructura real

Ambas migraciones y los datos ficticios se instalaron correctamente en Supabase. La RPC pública devuelve dos vehículos y una ocupación sin actividad ni contactos. Las llamadas anónimas directas a las cinco tablas internas probadas reciben `42501` (permiso denegado).

Vercel compiló y publicó la implementación en https://transport-admin-liart.vercel.app. Una sesión de navegador sin login comprobó el calendario conectado a Supabase y el detalle público limitado a vehículo e intervalo.

## Pendiente

La creación de la cuenta administrativa requiere intervención del titular para su contraseña. Falta comprobar login y subida a Storage con esa cuenta, cerrar el registro público y configurar Site URL. La sesión del panel Supabase expiró durante la configuración.

PGlite serializa consultas: las inserciones competidoras validan la restricción de exclusión, pero no simulan dos sesiones PostgreSQL independientes. Falta probar concurrencia con dos conexiones reales. No se construyó la imagen Docker.
