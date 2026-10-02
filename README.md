# Transporte municipal

Aplicación en español para administrar buses y minibuses, reservas y bloqueos por mantenimiento. Next.js App Router, TypeScript, Tailwind, componentes con convenciones shadcn/ui, Supabase Auth/PostgreSQL/Storage. Una municipalidad por instalación.

## Ejecutar localmente

Requiere Node.js 24 y npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abre http://localhost:3000. Sin variables de Supabase funciona en **modo demostración**, con datos ficticios locales y acceso administrativo de prueba. No sirve como autenticación de producción. Los datos de demostración no se transfieren a Supabase.

## Conectar Supabase

1. Crea un proyecto Supabase. Ejecuta en SQL Editor, en orden, los archivos de `supabase/migrations/`. También pueden aplicarse con Supabase CLI y su flujo habitual de migraciones. No vuelvas a ejecutarlos en un proyecto ya migrado.
2. Solo en desarrollo, ejecuta `supabase/seed.sql` y luego `supabase/seed-usage.sql` para cargar ejemplos ficticios. El segundo agrega dos vehículos y 27 viajes/bloqueos del mes actual en Chile, incluidos viajes de varios días, día completo, horarios consecutivos y una cancelación. Es aditivo e idempotente: no modifica registros existentes y omite ejemplos en conflicto.
3. Copia la URL y la clave pública **publishable** (o anon/legacy JWT) del proyecto a `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-CLAVE-PUBLICA
```

No uses una clave `service_role` en la aplicación. Las variables `NEXT_PUBLIC_*` son públicas y se incorporan al compilar; protege los datos mediante RLS.

4. En Authentication, desactiva **Allow new users to sign up** y crea los administradores en el panel de Supabase. Habilita cada UUID de Auth desde SQL Editor:

```sql
insert into public.admin_profiles(id) values ('UUID-DEL-USUARIO');
```

5. Configura Site URL con el dominio de la aplicación, HTTPS y la política de contraseñas de tu organización. Para recuperación de contraseña, el responsable técnico puede usar el panel de Supabase; no hay pantalla de recuperación en esta versión.
6. Reinicia el servidor de desarrollo. Prueba login, permisos, fotografías y calendario con tu proyecto.

## Arquitectura

- `src/app`: rutas públicas y administrativas; `/` redirige al calendario.
- `src/modules`: persistencia de flota, planificación y configuración.
- `src/lib`: cliente Supabase, contratos compartidos, tiempo de Chile y demostración.
- `src/components`: interfaz compartida y componentes UI extensibles mediante `components.json`.
- `supabase/migrations`: esquema, RLS, consulta pública de campos permitidos, auditoría y metadatos de fotos.

Las reservas y mantenimiento comparten `occupations`, con intervalos `[inicio, término)`. PostgreSQL impide cruces con `EXCLUDE USING gist`; no depende de una comprobación en el navegador. La cancelación conserva registros y libera disponibilidad. Las versiones de registros impiden sobrescribir cambios de otro administrador: ante un conflicto, vuelve a abrir la ficha con los datos actuales. No se permite archivar vehículos con asignaciones vigentes o futuras; primero cancélalas o reasígnalas. La auditoría registra actor, fecha y valores anteriores/nuevos; puede consultarse por SQL con permisos administrativos.

Los visitantes solo tienen ejecución de `public_transport_data()`: no SELECT directo a tablas internas. Las cuentas autenticadas requieren `admin_profiles` para operar. El cliente oculta controles, pero la protección efectiva está en RLS. El bucket de fotos es público y solo los administradores pueden subir archivos; todo lo subido debe ser apto para publicación. Las fotos nuevas se previsualizan localmente y se suben al guardar. Al guardar se eliminan del bucket las fotos retiradas de la ficha; la política de Storage conserva cualquier foto que siga asociada a un vehículo. Si falla la conexión durante la limpieza, se informa al administrador para reintentar desde Storage.

## Verificación

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Las pruebas ejecutan PostgreSQL embebido con PGlite y `btree_gist`. Aplican las migraciones y prueban cruces, reservas consecutivas, inserciones competidoras, cancelaciones, patentes, archivo, fotos, auditoría, RPC pública, permisos anónimos y RLS administrativa. Auth y Storage se representan con esquemas mínimos para esas pruebas; no sustituyen una prueba de integración contra Supabase real. Las pruebas de tiempo comprueban verano, invierno y horas inexistentes por cambio de horario chileno. Las horas repetidas al volver al horario de invierno se resuelven a la primera ocurrencia que encuentra el conversor; no se permite elegir el offset desde la interfaz.

## Despliegue económico

Puedes alojar Next.js en cualquier servicio compatible con Node.js y usar Supabase administrado. No requiere workers ni servicios adicionales. La demo usa Vercel Hobby y Supabase Free; consulta su configuración en [docs/DEMO.md](docs/DEMO.md).

```powershell
npm ci
npm run build
npm run start
```

Define las dos variables públicas **antes del build**. Usa HTTPS y un proxy inverso si despliegas en VPS. El Dockerfile ofrece salida standalone:

```powershell
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-CLAVE-PUBLICA -t transport-admin .
docker run -d --name transport-admin -p 3000:3000 --restart unless-stopped transport-admin
```

Configura respaldos y retención según las capacidades del plan Supabase elegido. Revisa cuotas de almacenamiento, tráfico y base de datos antes de producción; no se asume gratuidad ni disponibilidad garantizada. La aplicación consulta datos cada 60 segundos mientras está visible, y al recuperar el foco. La cabecera muestra la hora de la última consulta exitosa y avisa cuando la actualización falla.

## Manual

Consulta [el manual en español](docs/MANUAL.md). Conductores, documentos, solicitudes, recurrencias y notificaciones quedan para módulos futuros.

## Actualizar una instalación existente

Antes de desplegar estos fixes, aplica `supabase/migrations/202610020001_safe_updates.sql` después de las dos migraciones iniciales. Agrega versiones a vehículos, asignaciones y configuración, protege el archivado con compromisos pendientes y evita eliminar fotos en uso. El nuevo cliente requiere esta migración; no despliegues el cliente sobre el esquema anterior.
