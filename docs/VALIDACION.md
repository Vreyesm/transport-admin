# ValidaciÃ³n de la primera versiÃ³n

## Comprobaciones automatizadas

`npm test`: 7 pruebas aprobadas. PostgreSQL embebido ejecuta ambas migraciones; verifica exclusiÃ³n entre reservas/mantenimiento, intervalos consecutivos, cancelaciÃ³n, inserciones competidoras, archivo, patente normalizada, metadatos de fotografÃ­as, auditorÃ­a, consulta pÃºblica sin campos privados y permisos anÃ³nimos/administrativos. Se comprueban offsets de verano/invierno, intervalos de varios dÃ­as, hora inexistente y dÃ­a de 23 horas en Chile.

`npm run lint`, `npm run typecheck` y `npm run build`: aprobados.

## Comprobaciones en navegador

- Acceso administrativo de demostraciÃ³n y navegaciÃ³n entre mÃ³dulos.
- Alta de minibÃºs ficticio, guardado y posterior asignaciÃ³n.
- Rechazo de reserva superpuesta con mensaje visible en el formulario.
- Consulta pÃºblica de la reserva: muestra vehÃ­culo e intervalo, omite contacto y notas.
- Subida y guardado de una fotografÃ­a PNG ficticia, marcada como principal.
- Vista mÃ³vil de 390 Ã— 844: navegaciÃ³n, filtros y agenda; el calendario usa desplazamiento horizontal dentro de su contenedor sin desbordar la pÃ¡gina.

## Comprobaciones con infraestructura real

Ambas migraciones y los datos ficticios se instalaron correctamente en Supabase. La RPC pÃºblica devuelve dos vehÃ­culos y una ocupaciÃ³n sin actividad ni contactos. Las llamadas anÃ³nimas directas a las cinco tablas internas probadas reciben `42501` (permiso denegado).

Vercel compilÃ³ y publicÃ³ la implementaciÃ³n en https://transport-admin-liart.vercel.app. Una sesiÃ³n de navegador sin login comprobÃ³ el calendario conectado a Supabase y el detalle pÃºblico limitado a vehÃ­culo e intervalo.

## Pendiente

El titular creÃ³ su cuenta Auth; su perfil administrativo se habilitÃ³ en Supabase. Registro pÃºblico desactivado y Site URL configurada. Falta comprobar login y subida a Storage con esa cuenta; la contraseÃ±a solo la introduce el titular.

PGlite serializa consultas: las inserciones competidoras validan la restricciÃ³n de exclusiÃ³n, pero no simulan dos sesiones PostgreSQL independientes. Falta probar concurrencia con dos conexiones reales. No se construyÃ³ la imagen Docker.

## ValidaciÃ³n de los fixes

14 pruebas aprobadas. Las pruebas adicionales cubren fechas civiles del calendario desde cinco zonas horarias, invalidaciÃ³n de consultas y escrituras al cerrar sesiÃ³n, respuestas fuera de orden, limpieza de fotos tras guardado o conflicto, interrupciÃ³n de sesiÃ³n durante una subida y avisos ante errores de limpieza. La prueba de base de datos aplica la tercera migraciÃ³n y comprueba rechazo de ediciones obsoletas, conservaciÃ³n de cancelaciones, archivado con asignaciones pendientes y polÃ­tica de Storage que conserva fotos referenciadas.

En navegador local de demostraciÃ³n se comprobÃ³ que alternar DÃ­as completos conserva fechas y horas editadas, que el archivado con viajes pendientes muestra el rechazo en el modal y que cerrar sesiÃ³n retira los controles administrativos. Se corrigiÃ³ tambiÃ©n el reinicio del foco del modal al editar.

La migraciÃ³n `202610020001_safe_updates.sql` se validÃ³ en PGlite; queda pendiente aplicarla a Supabase antes de desplegar el cliente. Esta revisiÃ³n no modificÃ³ la infraestructura real. Sigue pendiente probar carreras con dos conexiones PostgreSQL independientes y Storage/Auth real con una cuenta administrativa.

## AuditorÃ­a, confirmaciones y exportaciÃ³n

21 pruebas aprobadas; lint, typecheck y build aprobados. La prueba de PGlite aplica tambiÃ©n `202610020002_audit_indexes.sql`. Comprueba que anon no puede leer auditorÃ­a, que una cuenta autenticada sin perfil no obtiene registros, que un administrador sÃ­ ve el actor UUID y los valores nuevos, y que el cliente no puede insertar entradas falsas. No se usa service_role ni un directorio de cuentas en el cliente.

Las pruebas de exportaciÃ³n verifican la lista explÃ­cita de columnas pÃºblicas aun al recibir datos administrativos, filtros de vehÃ­culos, semanas civiles, intersecciÃ³n de viajes entre dÃ­as, exclusiÃ³n de un viaje que termina exactamente al iniciar el perÃ­odo y canceladas solo con selecciÃ³n administrativa explÃ­cita. CSV neutraliza fÃ³rmulas precedidas por espacios/controles y escapa comillas, comas y saltos de lÃ­nea. Las pruebas del controlador de borradores cubren rechazo sin pÃ©rdida del estado, aceptaciÃ³n de la acciÃ³n pendiente, confirmaciÃ³n de cancelaciÃ³n aun sin cambios y revocaciÃ³n que descarta acciones pendientes y permite cerrar fichas pÃºblicas.

En navegador local de producciÃ³n se verificaron:

- Cierre de asignaciÃ³n por botÃ³n y Escape: rechazar conserva el campo editado; aceptar descarta la ficha.
- Enlaces y AtrÃ¡s desde configuraciÃ³n: el aviso conserva el nombre editado al rechazar. Cerrar sesiÃ³n con ese borrador retira controles y formulario sin confirmaciÃ³n.
- Foto PNG ficticia aÃ±adida localmente: rechazar cierre conserva la URL blob; aceptar y volver a abrir no conserva la foto.
- CancelaciÃ³n: abre confirmaciÃ³n explÃ­cita; rechazar mantiene habilitada la asignaciÃ³n.
- Vista administrativa semanal con responsable, destino y contacto; vista pÃºblica sin esas columnas, sin auditorÃ­a ni opciÃ³n de incluir canceladas. Filtrar minibuses reduce la misma tabla.
- AuditorÃ­a demo explica la ausencia de historial persistente sin simular actores.

Se inspeccionÃ³ visualmente la tabla imprimible. El evento de descarga de un blob no pudo verificarse con el navegador automatizado; la generaciÃ³n CSV sÃ­ se probÃ³ automÃ¡ticamente. Falta validar descarga final y diÃ¡logo nativo de impresiÃ³n en el navegador del operador, ademÃ¡s del aviso nativo al recargar/cerrar pestaÃ±a. La protecciÃ³n AtrÃ¡s/Adelante dentro de la aplicaciÃ³n requiere Navigation API; fue comprobada en el navegador local compatible.

Esta revisiÃ³n no aplica migraciones ni despliega infraestructura real. Antes de desplegar el cliente deben aplicarse `202610020001_safe_updates.sql` y despuÃ©s `202610020002_audit_indexes.sql`. La segunda agrega Ã­ndices para auditorÃ­a; la RLS y sus permisos de solo lectura administrativa siguen definidos en la migraciÃ³n inicial. Falta verificar la vista paginada contra Supabase real, revocaciÃ³n del perfil en una sesiÃ³n real y Auth/Storage con la cuenta del titular.
