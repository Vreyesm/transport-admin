-- Solo desarrollo: datos ficticios. Ejecutar después de la migración.
insert into public.vehicles(id,name,plate,type,brand,model,year,capacity,features) values
('11111111-1111-4111-8111-111111111111','Bus municipal 01','LKTR-24','bus','Mercedes-Benz','OF 1721',2022,45,'Aire acondicionado · Cinturones de seguridad'),
('22222222-2222-4222-8222-222222222222','Minibús municipal 02','PBGH-62','minibus','Hyundai','County',2023,25,'Aire acondicionado · Acceso asistido') on conflict do nothing;
insert into public.occupations(id,vehicle_id,kind,starts_at,ends_at,activity,organization) values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','reservation',date_trunc('day',now())+interval '12 hours',date_trunc('day',now())+interval '20 hours','Traslado comunitario de ejemplo','Organización ficticia') on conflict do nothing;
