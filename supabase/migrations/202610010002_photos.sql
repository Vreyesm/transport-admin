-- Metadata de fotos normalizada; el array de vehicles es la interfaz de escritura.
-- El trigger mantiene orden y portada dentro de la misma transacción.
create table public.vehicle_photos (
 vehicle_id uuid not null references public.vehicles(id),position int not null check(position>=0),url text not null,primary key(vehicle_id,position)
);
alter table public.vehicle_photos enable row level security;
revoke all on public.vehicle_photos from anon,authenticated;
grant select on public.vehicle_photos to authenticated;
create policy admin_photo_metadata_read on public.vehicle_photos for select to authenticated using(public.is_admin());
create function public.sync_vehicle_photos() returns trigger language plpgsql security definer set search_path='' as $$ begin
 delete from public.vehicle_photos where vehicle_id=NEW.id;
 insert into public.vehicle_photos(vehicle_id,position,url) select NEW.id,(ordinality-1)::int,value from jsonb_array_elements_text(NEW.photos) with ordinality;
 return NEW; end $$;
create trigger sync_photos after insert or update of photos on public.vehicles for each row execute function public.sync_vehicle_photos();
insert into public.vehicle_photos(vehicle_id,position,url) select v.id,(p.ordinality-1)::int,p.value from public.vehicles v cross join lateral jsonb_array_elements_text(v.photos) with ordinality as p;
