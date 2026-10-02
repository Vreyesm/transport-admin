-- RLS and read-only authenticated grants are established by the initial migration.
-- Support deterministic pagination and common administrative audit filters.
create index audit_log_created_id on public.audit_log(created_at desc, id desc);
create index audit_log_entity_created on public.audit_log(entity, created_at desc);
create index audit_log_actor_created on public.audit_log(actor, created_at desc);
