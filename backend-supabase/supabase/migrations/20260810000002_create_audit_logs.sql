-- Create the generic entity audit trail table expected by the gateway worker.
-- Worker audit endpoints (kv-worker/src/routes/admin.ts:231,238,245) read/write
-- 'audit_logs' with columns (id, user_id, action, entity_type, entity_id,
-- metadata, created_at) — the table was never migrated, so those calls 404'd
-- (PGRST205) and the tabbed audit UI + notifications were silently broken.
-- admin_audit_logs stays for user-admin actions (user_create/user_delete/dashboard_access).
create table if not exists public.audit_logs (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references auth.users(id) on delete set null,
	action text not null,
	entity_type text,
	entity_id text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_audit_logs_created_at
on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

-- Staff can read/write the trail directly; role check via SECURITY DEFINER
-- helper (immune to profiles RLS tightening), role set covers both DB
-- (staff/editor/admin/superadmin) and worker (employee) taxonomies.
drop policy if exists "audit_logs_select_staff" on public.audit_logs;
create policy "audit_logs_select_staff"
on public.audit_logs
for select
to authenticated
using (
	app_private.has_role(array['staff', 'editor', 'admin', 'superadmin', 'employee'])
);

drop policy if exists "audit_logs_insert_staff" on public.audit_logs;
create policy "audit_logs_insert_staff"
on public.audit_logs
for insert
to authenticated
with check (
	app_private.has_role(array['staff', 'editor', 'admin', 'superadmin', 'employee'])
);
