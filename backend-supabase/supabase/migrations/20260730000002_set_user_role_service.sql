-- Allow service_role (backed-gateway admin helpers) to set any user's profile role.
-- Bypasses the superadmin gate in app_private.set_user_role so that the unified
-- gateway can promote users via its service-identity credentials (no RLS).

create or replace function app_private.set_user_role_service(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new_role not in ('superadmin', 'admin', 'employee', 'user') then
    raise exception 'Invalid role value';
  end if;
  update public.profiles
  set role = new_role
  where id = target_user_id;
end;
$$;

revoke all on function app_private.set_user_role_service(uuid, text) from public, authenticated, anon;
grant execute on function app_private.set_user_role_service(uuid, text) to service_role;
