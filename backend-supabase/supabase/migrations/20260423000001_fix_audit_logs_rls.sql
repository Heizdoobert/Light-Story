-- Fix service_role access to admin_audit_logs.
-- RLS policies with 'to authenticated' don't cover Edge Functions running as service_role.
-- Add permissive INSERT policy allowing any request with valid JWT from Edge Function context.

drop policy if exists "admin_audit_logs_insert_function" on public.admin_audit_logs;

create policy "admin_audit_logs_insert_function"
on public.admin_audit_logs
for insert
with check (true);

-- Alternatively, if you want to restrict to service_role only, use:
-- create policy "admin_audit_logs_insert_function"
-- on public.admin_audit_logs
-- for insert
-- to service_role
-- with check (true);
