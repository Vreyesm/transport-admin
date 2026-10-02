# Manual de uso

## Consulta pública

Abre `/calendario` sin iniciar sesión. Cambia entre Mes, Semana y Agenda; usa las flechas o **Hoy**, y filtra por tipo, vehículo o patente. Una fecha libre no tiene ocupaciones para el vehículo seleccionado. Las reservas se muestran en azul, el uso vigente en verde y el mantenimiento en ámbar. Pulsa una ocupación para ver su inicio y término. Los datos de solicitantes no son públicos.

**Libre ahora** solo describe el momento actual: revisa el intervalo completo antes de planificar un traslado. **En uso** se calcula por horario, no por GPS. La información se consulta cada 60 segundos con la pestaña visible y al recuperar el foco.

En `/flota`, consulta las fichas, capacidad, características y fotografías públicas.

## Administración

Entra por **Acceso administrativo** con tu correo y contraseña. La cuenta debe estar habilitada por el responsable técnico; no existe inscripción pública. Cierra la sesión al terminar, especialmente en equipos compartidos.

### Flota

1. En **Flota de vehículos**, pulsa **Agregar vehículo**.
2. Completa nombre, patente, tipo, capacidad, marca, modelo, año y características. Las observaciones son internas.
3. Añade fotos JPG, PNG o WebP de hasta 5 MB. Se previsualizan localmente y se suben al guardar; cerrar sin guardar descarta las fotos nuevas. **Usar principal** coloca una foto como portada. Las fotos son públicas: utiliza únicamente imágenes autorizadas de los vehículos.
4. Pulsa **Guardar vehículo**. La patente no puede repetirse, incluso con diferencias de espacios o guiones.
5. Para editar abre **Ver y editar ficha**. **Archivar vehículo** conserva su historial y bloquea nuevas asignaciones. Si tiene asignaciones vigentes o futuras, debes cancelarlas o reasignarlas antes de archivarlo. Activa **Incluir archivados** para encontrarlo y reactivarlo.

### Reservas y mantenimiento

1. Desde Calendario pulsa **Nueva asignación** o el símbolo + de un día.
2. Selecciona vehículo y tipo: Reserva o Mantenimiento.
3. Introduce inicio y término en hora de Chile. Puedes reservar varios días. **Días completos** incluye tanto el primer como el último día indicado.
4. Registra actividad, destino, organización, responsable, contacto y notas internas.
5. Guarda. Si existe un cruce, corrige horario o vehículo. Reservas consecutivas están permitidas si una termina exactamente cuando empieza otra.
6. Pulsa una ocupación para modificarla o **Cancelar asignación**. Las canceladas dejan de bloquear disponibilidad y permanecen en **Historial de asignaciones**.

Los bloqueos por mantenimiento siguen las mismas reglas. Los cambios quedan auditados en la base de datos. No hay borrado permanente desde la aplicación. Archivar un vehículo lo retira de la consulta pública y exige cancelar o reasignar sus asignaciones pendientes previamente.

### Configuración

Modifica nombre municipal, color y URL HTTPS del logo. Guarda para aplicarlo a ambas vistas.

### Auditoría

Abre **Auditoría** (`/admin/auditoria`). Solo una cuenta administrativa puede consultar este historial: la base aplica RLS y no permite escribir ni borrar entradas desde el cliente. Cada registro indica fecha en Chile, entidad, operación, UUID completo del actor y registro afectado. Despliega la entrada para comparar valores anteriores y nuevos. Un actor vacío identifica una operación del sistema o una migración; no se atribuye a una persona. El UUID identifica la cuenta sin revelar correos ni consultar un directorio público.

Filtra por entidad, operación, UUID completo del actor y fechas civiles de Chile (ambos días incluidos). Se muestran 20 entradas por página, ordenadas por fecha e identificador descendentes. **Actualizar** recarga el resultado. En demostración se muestra una explicación: no se registra auditoría persistente ni se inventan identidades.

### Confirmaciones y borradores

Cancelar una asignación requiere confirmación explícita. Rechazar la acción conserva la asignación y el formulario. Las fichas de vehículos, asignaciones y configuración avisan después de editar un campo, alternar días completos o añadir, quitar o reordenar fotografías locales. El aviso aparece al cerrar por botón, Escape o fondo y al navegar por los enlaces. **Seguir editando**, Escape o cerrar el aviso conserva los valores y fotos; **Confirmar y descartar** permite salir. Guardar correctamente elimina el aviso. El control es conservador: volver manualmente al valor original sigue contando como edición.

Recargar o cerrar la pestaña usa el aviso nativo del navegador, que necesita una interacción previa y puede ser limitado por el navegador. Atrás/Adelante dentro de la aplicación usa Navigation API en navegadores compatibles. Para equipos operativos usa un navegador actualizado compatible con esta API; los enlaces y el cierre de fichas están protegidos en todos los navegadores soportados por la aplicación.

Cerrar sesión descarta borradores y fotos locales sin confirmación, incluso durante un guardado. Cambiar de cuenta o detectar la revocación del perfil administrativo limpia datos internos, fichas y confirmaciones pendientes. El perfil se vuelve a comprobar en cada actualización administrativa (cada 60 segundos con la pestaña visible y al recuperar el foco).

### Programación y exportación

Desde Calendario selecciona una fecha y el período **Diaria** o **Semanal**. La semana va de lunes a domingo e incluye la fecha seleccionada. El informe usa los filtros actuales de nombre/patente, tipo y vehículo. **Exportar CSV** descarga el archivo; **Vista imprimible** muestra la misma tabla y su botón **Imprimir**. Horarios completos en America/Santiago, con fecha y hora de inicio y término: los viajes que cruzan días aparecen una sola vez si intersectan el período y mantienen sus horarios reales.

Las canceladas se excluyen por defecto. Solo en administración se puede seleccionar **Incluir canceladas**; su estado figura en el informe. Ambos informes incluyen vehículo, patente, horario, tipo y estado. Responsable, destino y contacto aparecen exclusivamente en administración. La consulta pública no consulta ni exporta campos internos, aunque haya una sesión administrativa abierta en otra sección. CSV usa UTF-8, comillas y neutralización de prefijos de fórmulas; abrirlo como texto conserva exactamente los campos entre comillas.

## Demostración

Sin variables de Supabase aparece un aviso de demostración y una entrada administrativa de prueba. Los datos son ficticios y se guardan únicamente en ese navegador. No usar para operación municipal real: no ofrece autenticación ni concurrencia entre equipos. Al conectar Supabase se desactiva automáticamente el modo de demostración; sus datos no se importan.

Si otro administrador cambió el registro mientras lo editabas, se rechaza el guardado para conservar sus cambios. Cierra y vuelve a abrir la ficha antes de reintentar. En Configuración, vuelve a entrar a la sección.

La cabecera muestra la última actualización exitosa en hora de Chile. Si aparece **Sin actualizar**, la disponibilidad puede estar desactualizada: recupera la conexión antes de planificar.
