-- Allow any authenticated admin user to read dashboard access logs (bypass RLS via SECURITY DEFINER)
create or replace function public.read_dashboard_access_logs(limit_count int default 200)
returns table (
  id uuid,
  actor_user_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select a.id, a.actor_user_id, a.action, a.metadata, a.created_at
  from public.admin_audit_logs a
  where a.action = 'dashboard_access'
  order by a.created_at desc
  limit limit_count;
end;
$$;

grant execute on function public.read_dashboard_access_logs(int) to authenticated;
