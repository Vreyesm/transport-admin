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
3. Añade fotos JPG, PNG o WebP de hasta 5 MB. **Usar principal** coloca una foto como portada. Las fotos son públicas: utiliza únicamente imágenes autorizadas de los vehículos.
4. Pulsa **Guardar vehículo**. La patente no puede repetirse, incluso con diferencias de espacios o guiones.
5. Para editar abre **Ver y editar ficha**. **Archivar vehículo** conserva su historial y bloquea nuevas asignaciones. Activa **Incluir archivados** para encontrarlo y reactivarlo.

### Reservas y mantenimiento

1. Desde Calendario pulsa **Nueva asignación** o el símbolo + de un día.
2. Selecciona vehículo y tipo: Reserva o Mantenimiento.
3. Introduce inicio y término en hora de Chile. Puedes reservar varios días. **Días completos** incluye tanto el primer como el último día indicado.
4. Registra actividad, destino, organización, responsable, contacto y notas internas.
5. Guarda. Si existe un cruce, corrige horario o vehículo. Reservas consecutivas están permitidas si una termina exactamente cuando empieza otra.
6. Pulsa una ocupación para modificarla o **Cancelar asignación**. Las canceladas dejan de bloquear disponibilidad y permanecen en **Historial de asignaciones**.

Los bloqueos por mantenimiento siguen las mismas reglas. Los cambios quedan auditados en la base de datos. No hay borrado permanente desde la aplicación. Archivar un vehículo lo retira de la consulta pública, por lo que conviene cancelar o reasignar sus viajes pendientes previamente.

### Configuración

Modifica nombre municipal, color y URL HTTPS del logo. Guarda para aplicarlo a ambas vistas.

## Demostración

Sin variables de Supabase aparece un aviso de demostración y una entrada administrativa de prueba. Los datos son ficticios y se guardan únicamente en ese navegador. No usar para operación municipal real: no ofrece autenticación ni concurrencia entre equipos. Al conectar Supabase se desactiva automáticamente el modo de demostración; sus datos no se importan.
