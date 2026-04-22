-- Audit logs for sensitive admin user-management actions.

create table if not exists public.admin_audit_logs (
	id uuid primary key default gen_random_uuid(),
	actor_user_id uuid,
	action text not null check (action in ('user_create', 'user_delete')),
	target_user_id uuid,
	target_email text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_admin_audit_logs_actor_user_id
on public.admin_audit_logs(actor_user_id);

create index if not exists idx_admin_audit_logs_created_at
on public.admin_audit_logs(created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin_audit_logs_select_superadmin" on public.admin_audit_logs;
drop policy if exists "admin_audit_logs_insert_superadmin" on public.admin_audit_logs;

create policy "admin_audit_logs_select_superadmin"
on public.admin_audit_logs
for select
to authenticated
using (app_private.has_role(array['superadmin']::text[]));

create policy "admin_audit_logs_insert_superadmin"
on public.admin_audit_logs
for insert
to authenticated
with check (app_private.has_role(array['superadmin']::text[]));
