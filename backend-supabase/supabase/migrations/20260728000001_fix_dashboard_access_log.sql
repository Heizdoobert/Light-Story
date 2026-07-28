-- Allow any authenticated user to log their own dashboard access (bypass RLS via SECURITY DEFINER)
create or replace function public.log_dashboard_access(
  p_actor_user_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_logs (actor_user_id, action, metadata)
  values (p_actor_user_id, 'dashboard_access', p_metadata);
end;
$$;

grant execute on function public.log_dashboard_access(uuid, jsonb) to authenticated;
