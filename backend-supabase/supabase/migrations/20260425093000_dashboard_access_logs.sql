-- Add dashboard access event support to admin_audit_logs.

alter table public.admin_audit_logs
  drop constraint if exists admin_audit_logs_action_check;

alter table public.admin_audit_logs
  add constraint admin_audit_logs_action_check
  check (action in ('user_create', 'user_delete', 'dashboard_access'));

-- Allow admin and superadmin to read dashboard access events.
drop policy if exists "admin_audit_logs_select_admin_dashboard_access" on public.admin_audit_logs;

create policy "admin_audit_logs_select_admin_dashboard_access"
on public.admin_audit_logs
for select
to authenticated
using (
  action = 'dashboard_access'
  and app_private.has_role(array['superadmin', 'admin']::text[])
);

-- Allow eligible users to write their own dashboard access events.
drop policy if exists "admin_audit_logs_insert_dashboard_access" on public.admin_audit_logs;

create policy "admin_audit_logs_insert_dashboard_access"
on public.admin_audit_logs
for insert
to authenticated
with check (
  action = 'dashboard_access'
  and actor_user_id = auth.uid()
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);
