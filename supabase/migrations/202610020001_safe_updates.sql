-- Reject stale editor snapshots inside the transaction that writes the row.
alter table public.vehicles add column version integer not null default 1 check(version > 0);
alter table public.occupations add column version integer not null default 1 check(version > 0);
alter table public.settings add column version integer not null default 1 check(version > 0);

create function public.check_record_version() returns trigger
language plpgsql set search_path='' as $$
begin
  if NEW.version <> OLD.version then
    raise exception using errcode='PT409', message='Otro administrador modificó este registro. Cierra la ficha y vuelve a abrirla antes de guardar.';
  end if;
  NEW.version := OLD.version + 1;
  return NEW;
end $$;
create trigger version_vehicles before update on public.vehicles for each row execute function public.check_record_version();
create trigger version_occupations before update on public.occupations for each row execute function public.check_record_version();
create trigger version_settings before update on public.settings for each row execute function public.check_record_version();

-- An occupation locks its vehicle FOR SHARE. Updating archived takes the
-- conflicting row lock, so reservations and archival cannot race past this guard.
create function public.check_vehicle_archive() returns trigger
language plpgsql set search_path='' as $$
begin
  if NEW.archived and not OLD.archived and exists (
    select 1 from public.occupations
    where vehicle_id=NEW.id and not cancelled and ends_at > now()
  ) then
    raise exception 'Cancela o reasigna las asignaciones pendientes antes de archivar el vehículo.';
  end if;
  return NEW;
end $$;
create trigger archive_vehicle before update of archived on public.vehicles
for each row execute function public.check_vehicle_archive();

-- Cleanup must never remove a photo still referenced by any vehicle, including
-- when a save committed but the client lost its response.
create function public.photo_is_referenced(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.vehicle_photos
    where url like '%/storage/v1/object/public/vehicle-photos/' || object_name)
$$;
revoke all on function public.photo_is_referenced(text) from public;
grant execute on function public.photo_is_referenced(text) to authenticated;
drop policy admin_photo_delete on storage.objects;
create policy admin_photo_delete on storage.objects for delete to authenticated
using(bucket_id='vehicle-photos' and public.is_admin() and not public.photo_is_referenced(name));
