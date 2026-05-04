-- Publish admin audit logs so dashboard access events can stream in realtime.

alter publication supabase_realtime add table if not exists public.admin_audit_logs;