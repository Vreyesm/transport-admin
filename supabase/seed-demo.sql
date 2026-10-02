-- Solo desarrollo: datos ficticios. Ejecutar después de la migración.
insert into public.vehicles(id,name,plate,type,brand,model,year,capacity,features) values
('11111111-1111-4111-8111-111111111111','Bus municipal 01','LKTR-24','bus','Mercedes-Benz','OF 1721',2022,45,'Aire acondicionado · Cinturones de seguridad'),
('22222222-2222-4222-8222-222222222222','Minibús municipal 02','PBGH-62','minibus','Hyundai','County',2023,25,'Aire acondicionado · Acceso asistido') on conflict do nothing;
insert into public.occupations(id,vehicle_id,kind,starts_at,ends_at,activity,organization) values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','reservation',date_trunc('day',now())+interval '12 hours',date_trunc('day',now())+interval '20 hours','Traslado comunitario de ejemplo','Organización ficticia') on conflict do nothing;

-- Solo desarrollo/demo: 27 ocupaciones ficticias del mes actual en Chile.
-- Es aditivo: no modifica registros existentes.
-- Los IDs son estables: repetir este archivo no duplica ni mueve asignaciones.
-- ON CONFLICT omite ejemplos que choquen con reservas ya registradas.
begin;
insert into public.vehicles(id,name,plate,type,brand,model,year,capacity,features) values
('55555555-5555-4555-8555-555555555555','Bus municipal 03','JDFR-18','bus','Volvo','B270F',2020,42,'Cinturones de seguridad · Maletero'),
('66666666-6666-4666-8666-666666666666','Minibús municipal 04','RXYZ-76','minibus','Mercedes-Benz','Sprinter',2024,19,'Aire acondicionado · Acceso asistido')
on conflict do nothing;
with examples(n,vehicle_id,start_day,start_time,end_day,end_time,kind,activity,destination,organization,cancelled) as (
values
(1,'11111111-1111-4111-8111-111111111111',0,'18:00',0,'21:00','reservation','Traslado a encuentro vecinal','Centro comunitario','Junta vecinal de ejemplo',false),
(2,'22222222-2222-4222-8222-222222222222',0,'08:30',0,'13:00','reservation','Atenciones de salud rural','Centro de salud','Programa de salud ficticio',false),
(3,'55555555-5555-4555-8555-555555555555',1,'07:30',1,'17:30','reservation','Salida educativa','Museo regional','Escuela de ejemplo',false),
(4,'11111111-1111-4111-8111-111111111111',2,'09:00',2,'19:00','reservation','Encuentro deportivo comunal','Estadio regional','Club deportivo ficticio',false),
(5,'22222222-2222-4222-8222-222222222222',3,'09:00',3,'12:00','reservation','Traslado de personas mayores','Centro diurno','Club de mayores de ejemplo',false),
(6,'22222222-2222-4222-8222-222222222222',3,'12:00',3,'16:00','reservation','Taller de participación ciudadana','Biblioteca comunal','Programa comunitario ficticio',false),
(7,'66666666-6666-4666-8666-666666666666',4,'08:00',4,'14:00','reservation','Visita técnica a sectores rurales','Sector rural norte','Unidad municipal de ejemplo',false),
(8,'11111111-1111-4111-8111-111111111111',5,'08:00',5,'18:00','reservation','Jornada cultural escolar','Teatro regional','Escuela de ejemplo',false),
(9,'55555555-5555-4555-8555-555555555555',6,'00:00',8,'00:00','maintenance','Mantenimiento preventivo','Taller municipal','Unidad de flota ficticia',false),
(10,'22222222-2222-4222-8222-222222222222',6,'10:00',6,'17:00','reservation','Operativo comunitario','Sede vecinal','Organización comunitaria ficticia',false),
(11,'66666666-6666-4666-8666-666666666666',7,'07:00',7,'13:30','reservation','Traslado a controles médicos','Hospital regional','Programa de salud ficticio',false),
(12,'11111111-1111-4111-8111-111111111111',8,'08:00',10,'20:00','reservation','Viaje cultural de varios días','Circuito regional','Agrupación cultural de ejemplo',false),
(13,'55555555-5555-4555-8555-555555555555',9,'09:00',9,'16:00','reservation','Visita a feria de servicios','Plaza regional','Organización vecinal de ejemplo',false),
(14,'22222222-2222-4222-8222-222222222222',10,'00:00',11,'00:00','reservation','Jornada comunitaria de día completo','Parque comunal','Programa comunitario ficticio',false),
(15,'66666666-6666-4666-8666-666666666666',11,'08:00',11,'17:00','maintenance','Revisión de frenos y neumáticos','Taller municipal','Unidad de flota ficticia',false),
(16,'11111111-1111-4111-8111-111111111111',12,'08:30',12,'18:30','reservation','Encuentro de personas mayores','Centro recreativo','Club de mayores de ejemplo',false),
(17,'55555555-5555-4555-8555-555555555555',13,'06:30',13,'21:00','reservation','Competencia deportiva regional','Complejo deportivo','Club deportivo ficticio',false),
(18,'22222222-2222-4222-8222-222222222222',14,'09:00',14,'13:00','reservation','Taller de educación ambiental','Centro ambiental','Escuela de ejemplo',false),
(19,'66666666-6666-4666-8666-666666666666',15,'08:00',15,'14:00','reservation','Operativo rural de atención','Sector rural sur','Unidad municipal de ejemplo',false),
(20,'11111111-1111-4111-8111-111111111111',16,'00:00',18,'00:00','maintenance','Mantención y revisión técnica','Taller municipal','Unidad de flota ficticia',false),
(21,'55555555-5555-4555-8555-555555555555',17,'09:00',17,'18:00','reservation','Encuentro de organizaciones sociales','Centro comunitario','Agrupación social de ejemplo',false),
(22,'22222222-2222-4222-8222-222222222222',19,'08:00',19,'15:00','reservation','Feria de emprendimiento local','Plaza comunal','Agrupación de emprendedores ficticia',false),
(23,'66666666-6666-4666-8666-666666666666',21,'08:00',21,'18:00','reservation','Salida cultural comunitaria','Museo regional','Junta vecinal de ejemplo',false),
(24,'11111111-1111-4111-8111-111111111111',23,'07:00',24,'19:00','reservation','Participación en festival regional','Recinto cultural','Agrupación cultural de ejemplo',false),
(25,'55555555-5555-4555-8555-555555555555',25,'09:00',25,'17:00','reservation','Actividad recreativa familiar','Parque regional','Programa comunitario ficticio',false),
(26,'22222222-2222-4222-8222-222222222222',27,'08:30',27,'13:30','reservation','Traslado a atenciones de salud','Centro de salud','Programa de salud ficticio',false),
(27,'55555555-5555-4555-8555-555555555555',1,'08:00',1,'15:00','reservation','Salida educativa cancelada','Museo regional','Escuela de ejemplo',true)
), anchor as (
 select date_trunc('month', now() at time zone 'America/Santiago') as month_start
)
insert into public.occupations(id,vehicle_id,kind,starts_at,ends_at,activity,destination,organization,responsible,contact,notes,cancelled)
select md5('transport-demo-usage-' || n)::uuid, vehicle_id::uuid, kind,
 (month_start + start_day * interval '1 day' + start_time::interval) at time zone 'America/Santiago',
 (month_start + end_day * interval '1 day' + end_time::interval) at time zone 'America/Santiago',
 activity,destination,organization,'Responsable ficticio ' || n,
 'Contacto de demostración, sin datos reales',
 case when cancelled then 'Ejemplo cancelado: cambio de programación.' else 'Dato ficticio para explorar el calendario.' end,
 cancelled
from examples cross join anchor
where exists(select 1 from public.vehicles v where v.id=vehicle_id::uuid and not v.archived)
on conflict do nothing;
commit;

