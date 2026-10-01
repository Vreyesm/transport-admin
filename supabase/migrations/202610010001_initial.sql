create extension if not exists btree_gist;
create table public.admin_profiles (id uuid primary key references auth.users(id) on delete cascade);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.admin_profiles where id=auth.uid()) $$;
create table public.settings (id int primary key default 1 check(id=1),name text not null default 'Gestión municipal',color text not null default '#2563eb' check(color ~ '^#[0-9a-fA-F]{6}$'),logo text not null default '' check(logo='' or logo like 'https://%'));
insert into public.settings(id) values(1);
create table public.vehicles (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), plate text not null check(length(trim(plate))>0),type text not null check(type in ('bus','minibus')),brand text not null default '',model text not null default '',year int not null check(year between 1950 and 2100),capacity int not null check(capacity between 1 and 200),features text not null default '',notes text not null default '',archived boolean not null default false,photos jsonb not null default '[]' check(jsonb_typeof(photos)='array')
);
create unique index unique_plate on public.vehicles (regexp_replace(upper(plate),'[^A-Z0-9]','','g'));
create table public.occupations (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id), kind text not null check(kind in ('reservation','maintenance')), starts_at timestamptz not null, ends_at timestamptz not null, cancelled boolean not null default false, activity text not null default '',destination text not null default '',organization text not null default '',responsible text not null default '',contact text not null default '',notes text not null default '',check(ends_at>starts_at),
 constraint no_vehicle_overlap exclude using gist(vehicle_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where (not cancelled)
);
create index occupations_dates on public.occupations(starts_at,ends_at);
create table public.audit_log(id bigint generated always as identity primary key,actor uuid,entity text not null,record_id text not null,operation text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.audit_log(actor,entity,record_id,operation,before_data,after_data) values(auth.uid(),TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id'),TG_OP,case when TG_OP<>'INSERT' then to_jsonb(OLD) end,case when TG_OP<>'DELETE' then to_jsonb(NEW) end);return NEW;end $$;
create function public.check_active_vehicle() returns trigger language plpgsql set search_path='' as $$ declare inactive boolean; begin if not NEW.cancelled then select archived into inactive from public.vehicles where id=NEW.vehicle_id for share; if inactive then raise exception 'El vehículo está archivado.';end if;end if;return NEW;end $$;
create trigger occupation_vehicle before insert or update on public.occupations for each row execute function public.check_active_vehicle();
create trigger audit_vehicles after insert or update on public.vehicles for each row execute function public.audit_change();
create trigger audit_occupations after insert or update on public.occupations for each row execute function public.audit_change();
create trigger audit_settings after update on public.settings for each row execute function public.audit_change();
alter table public.admin_profiles enable row level security;
alter table public.settings enable row level security;
alter table public.vehicles enable row level security;
alter table public.occupations enable row level security;
alter table public.audit_log enable row level security;
create policy own_profile on public.admin_profiles for select to authenticated using(id=auth.uid());
create policy admin_vehicle_read on public.vehicles for select to authenticated using(public.is_admin());
create policy admin_vehicle_insert on public.vehicles for insert to authenticated with check(public.is_admin());
create policy admin_vehicle_update on public.vehicles for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_occupation_read on public.occupations for select to authenticated using(public.is_admin());
create policy admin_occupation_insert on public.occupations for insert to authenticated with check(public.is_admin());
create policy admin_occupation_update on public.occupations for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_settings_read on public.settings for select to authenticated using(public.is_admin());
create policy admin_settings_update on public.settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_audit_read on public.audit_log for select to authenticated using(public.is_admin());
revoke all on public.admin_profiles,public.settings,public.vehicles,public.occupations,public.audit_log from anon,authenticated;
grant select on public.admin_profiles,public.audit_log to authenticated;
grant select,insert,update on public.vehicles,public.occupations to authenticated;
grant select,update on public.settings to authenticated;
create function public.public_transport_data() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('settings',(select jsonb_build_object('name',name,'color',color,'logo',logo) from public.settings where id=1),'vehicles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'plate',plate,'type',type,'brand',brand,'model',model,'year',year,'capacity',capacity,'features',features,'archived',false,'photos',photos)) from public.vehicles where not archived),'[]'::jsonb),'occupations',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'vehicle_id',o.vehicle_id,'kind',o.kind,'starts_at',o.starts_at,'ends_at',o.ends_at,'cancelled',false)) from public.occupations o join public.vehicles v on v.id=o.vehicle_id where not o.cancelled and not v.archived),'[]'::jsonb))
$$;
revoke execute on function public.public_transport_data() from public;
grant execute on function public.public_transport_data() to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('vehicle-photos','vehicle-photos',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy admin_photo_insert on storage.objects for insert to authenticated with check(bucket_id='vehicle-photos' and public.is_admin());
create policy admin_photo_select on storage.objects for select to authenticated using(bucket_id='vehicle-photos' and public.is_admin());
create policy admin_photo_delete on storage.objects for delete to authenticated using(bucket_id='vehicle-photos' and public.is_admin());
