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

## Pendiente de verificar con infraestructura real

No hay credenciales Supabase configuradas. Auth, subida a Storage y comportamiento de múltiples conexiones deben comprobarse con un proyecto de pruebas antes del despliegue. PGlite serializa consultas: las inserciones competidoras validan la restricción de exclusión, pero no simulan dos sesiones PostgreSQL independientes. No se construyó la imagen Docker ni se publicó infraestructura.
