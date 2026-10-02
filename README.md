# Transporte municipal

Aplicación en español para administrar buses y minibuses, reservas y bloqueos por mantenimiento. Next.js App Router, TypeScript, Tailwind, componentes con convenciones shadcn/ui, Supabase Auth/PostgreSQL/Storage. Una municipalidad por instalación.

## PostgreSQL y Supabase en Docker (entorno local completo)

En Linux, con Bash, Docker Engine + Compose v2 (o Docker Desktop) y Node.js 24/npm:

```bash
./scripts/start-local.sh
```

El script inicia PostgreSQL 17, API, Auth, Storage y Studio usando la CLI
Supabase fijada a 2.119.0, aplica las migraciones y levanta la aplicación
con Docker Compose. Los seeds no se cargan automáticamente.
No necesita cuenta de Supabase ni modifica la base remota.
El primer inicio descarga las imágenes y requiere internet.

- Aplicación: http://localhost:3000
- Studio (administración de la base local): http://localhost:54323
- API local: http://127.0.0.1:54321
- PostgreSQL: `localhost:54322`, base `postgres`, usuario `postgres`, contraseña `postgres`
- Administrador de prueba local, solo con `--seed-admin`: `admin@transport-admin.cl` / `demotransporte`

`.env.docker.local` contiene solamente URL y clave pública locales y está
ignorado por Git. `.env.local` del entorno remoto se conserva.
Las cuentas y datos de Vercel/Supabase remoto no se copian. Para crear opcionalmente
el administrador de `supabase/seed-admin.json` mediante Auth, ejecuta
`./scripts/start-local.sh --seed-admin`. Sin esa opción se conservan las cuentas existentes
y no se crea ninguna. Puedes crear y habilitar tus propias cuentas desde Studio.
Los datos y fotos persisten en volúmenes Docker. Para detener sin borrarlos:

```bash
./scripts/stop-local.sh
```

Repite el script de inicio para volver a levantarlo. Para aplicar nuevas
migraciones sin borrar datos: `npx --yes supabase@2.119.0 migration up --local`.
No uses `supabase db reset` salvo que quieras borrar y recrear la base local. Tras un reset,
ejecuta `./scripts/start-local.sh --seed-admin` si quieres volver a crear el administrador de prueba.


Para cargar buses y asignaciones de ejemplo explícitamente:

```bash
./scripts/seed-demo.sh
```

Este comando aplica `supabase/seed-demo.sql` únicamente a PostgreSQL local.
No se ejecuta al iniciar ni al reiniciar. Cambiar el seed no elimina los datos
ya existentes en un volumen: los ejemplos cargados anteriormente permanecen.

## Ejecutar localmente sin Docker

Requiere Node.js 24 y npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`npm run dev` aplica automáticamente las migraciones pendientes antes de arrancar.
Sin configuración de Supabase conserva el modo demostración. Con Supabase, configura
también `SUPABASE_DB_URL` y `SUPABASE_DB_PASSWORD` en `.env.local`; son secretos privados
y nunca deben tener prefijo `NEXT_PUBLIC_`. Para la base local usa
`SUPABASE_DB_URL=postgresql://postgres@127.0.0.1:54322/postgres` y
`SUPABASE_DB_PASSWORD=postgres`. Inicia Supabase antes de ejecutar la aplicación.
Para Supabase remoto usa la conexión directa o el session pooler del mismo proyecto
(contraseña de PostgreSQL, no una API key). La conexión remota exige TLS.
El arranque se cancela si falta la conexión, apunta a otro proyecto o falla una migración.
No se ejecutan seeds, resets ni reparaciones automáticas del historial.

Para aplicar migraciones explícitamente: `npm run db:migrate`.
En despliegues ejecútalo antes del build con las credenciales privadas disponibles;
en producción el contenedor standalone solo sirve la aplicación.
Si aplicaste SQL manualmente, comprueba el esquema y sincroniza una vez el historial
con `supabase migration list` / `supabase migration repair` antes de usar este flujo.
Marca como aplicadas únicamente migraciones cuyo contenido ya exista en la base.

Abre http://localhost:3000. Sin variables de Supabase funciona en **modo demostración**, con datos ficticios locales y acceso administrativo de prueba. No sirve como autenticación de producción. Los datos de demostración no se transfieren a Supabase.

## Conectar Supabase

1. Crea un proyecto Supabase. Configura la conexión privada indicada arriba y ejecuta `npm run db:migrate` (también se ejecuta antes de `npm run dev`). La CLI registra el historial y aplica solo las migraciones pendientes de `supabase/migrations/`, en orden. No vuelvas a ejecutar SQL de migraciones ya aplicadas.
2. Opcionalmente, solo en desarrollo, ejecuta `supabase/seed-demo.sql` para cargar buses y asignaciones ficticios. Es manual, aditivo e idempotente: no modifica registros existentes y omite ejemplos en conflicto.
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

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Las pruebas ejecutan PostgreSQL embebido con PGlite y `btree_gist`. Aplican las migraciones y prueban cruces, reservas consecutivas, inserciones competidoras, cancelaciones, patentes, archivo, fotos, auditoría, RPC pública, permisos anónimos y RLS administrativa. Auth y Storage se representan con esquemas mínimos para esas pruebas; no sustituyen una prueba de integración contra Supabase real. Las pruebas de tiempo comprueban verano, invierno y horas inexistentes por cambio de horario chileno. Las horas repetidas al volver al horario de invierno se resuelven a la primera ocurrencia que encuentra el conversor; no se permite elegir el offset desde la interfaz.

## Producción

La aplicación usa Supabase para datos, autenticación y fotos. Puedes usar Supabase administrado o autoalojado mediante su [configuración oficial de Docker Compose](https://supabase.com/docs/guides/self-hosting/docker). PostgreSQL por sí solo no sustituye Auth, Storage ni la API.

Los scripts locales y el Compose de este repositorio son para desarrollo: ejecutan `next dev` y usan credenciales de prueba. No se deben exponer como entorno productivo. Para producción usa el target `production` del Dockerfile, HTTPS, secretos propios, volúmenes persistentes y respaldos de la base y las fotos. No cargues el administrador de prueba ni el seed de demostración en producción.

### Despliegue económico

Puedes alojar Next.js en cualquier servicio compatible con Node.js y usar Supabase administrado. No requiere workers ni servicios adicionales. La demo usa Vercel Hobby y Supabase Free; consulta su configuración en [docs/DEMO.md](docs/DEMO.md).

```bash
npm ci
npm run build
npm run start
```

Define las dos variables públicas **antes del build**. Usa HTTPS y un proxy inverso si despliegas en VPS. El Dockerfile ofrece salida standalone:

```bash
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-CLAVE-PUBLICA -t transport-admin .
docker run -d --name transport-admin -p 3000:3000 --restart unless-stopped transport-admin
```

Configura respaldos y retención según las capacidades del plan Supabase elegido. Revisa cuotas de almacenamiento, tráfico y base de datos antes de producción; no se asume gratuidad ni disponibilidad garantizada. La aplicación consulta datos cada 60 segundos mientras está visible, y al recuperar el foco. La cabecera muestra la hora de la última consulta exitosa y avisa cuando la actualización falla.

## Manual

Consulta [el manual en español](docs/MANUAL.md). Conductores, documentos, solicitudes, recurrencias y notificaciones quedan para módulos futuros.

## Comandos de la aplicación en Docker

Después de iniciar el entorno completo con `./scripts/start-local.sh`, puedes administrar solo la aplicación:

```bash
docker compose up --build -d
docker compose logs -f app
```

Abre http://localhost:3000. La raíz redirige al calendario de la aplicación.
Compose carga `.env.docker.local`, generado por el script de inicio local.
El script conserva `.env.local` para el entorno remoto.
Se usa Webpack con polling para recargar cambios desde Windows y volúmenes
separados para dependencias y caché. Al arrancar se actualizan las dependencias con `npm ci`
y se aplican las migraciones pendientes a PostgreSQL local a través de la red de Supabase.
Si la base no está disponible o falla una migración, la aplicación no arranca.

Para detener: `docker compose down`. Para cambiar el puerto en Linux, usa `APP_PORT=3001 ./scripts/start-local.sh`.

La imagen de producción admite las variables públicas como build args según
la sección de despliegue. El target por defecto es `production`.
## Actualizar una instalación existente

Aplica `supabase/migrations/202610020001_safe_updates.sql` después de las dos migraciones iniciales. Agrega versiones a vehículos, asignaciones y configuración, protege el archivado con compromisos pendientes y evita eliminar fotos en uso. Si falta esta migración, el calendario administrativo carga los datos en modo consulta; la edición queda deshabilitada. Aplica la migración pendiente y recarga la página para habilitarla. No vuelvas a ejecutar migraciones ya aplicadas.
