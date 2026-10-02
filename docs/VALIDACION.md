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

El titular creó su cuenta Auth; su perfil administrativo se habilitó en Supabase. Registro público desactivado y Site URL configurada. Falta comprobar login y subida a Storage con esa cuenta; la contraseña solo la introduce el titular.

PGlite serializa consultas: las inserciones competidoras validan la restricción de exclusión, pero no simulan dos sesiones PostgreSQL independientes. Falta probar concurrencia con dos conexiones reales. No se construyó la imagen Docker.

## Validación de los fixes

14 pruebas aprobadas. Las pruebas adicionales cubren fechas civiles del calendario desde cinco zonas horarias, invalidación de consultas y escrituras al cerrar sesión, respuestas fuera de orden, limpieza de fotos tras guardado o conflicto, interrupción de sesión durante una subida y avisos ante errores de limpieza. La prueba de base de datos aplica la tercera migración y comprueba rechazo de ediciones obsoletas, conservación de cancelaciones, archivado con asignaciones pendientes y política de Storage que conserva fotos referenciadas.

En navegador local de demostración se comprobó que alternar Días completos conserva fechas y horas editadas, que el archivado con viajes pendientes muestra el rechazo en el modal y que cerrar sesión retira los controles administrativos. Se corrigió también el reinicio del foco del modal al editar.

La migración `202610020001_safe_updates.sql` se validó en PGlite; queda pendiente aplicarla a Supabase antes de desplegar el cliente. Esta revisión no modificó la infraestructura real. Sigue pendiente probar carreras con dos conexiones PostgreSQL independientes y Storage/Auth real con una cuenta administrativa.
