-- Hardening app_private.set_user_role_service RPC:
-- 1. Explicit search_path with pg_temp to prevent schema search path injection.
-- 2. Enforce strict caller identity check: caller must either be running as internal DB user
--    ('service_role', 'postgres', 'supabase_admin'), have auth.role() = 'service_role',
--    or hold the 'superadmin' role.
-- 3. Validate target user existence and role domain.
-- 4. Emit an audit log into public.audit_logs upon successful promotion/demotion.

create or replace function app_private.set_user_role_service(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  old_role text;
begin
  -- 1. Enforce caller authorization gate
  if current_user not in ('service_role', 'postgres', 'supabase_admin')
     and coalesce(auth.role(), '') != 'service_role'
     and not app_private.has_role(array['superadmin']) then
    raise exception 'FORBIDDEN: set_user_role_service requires service_role or superadmin authority';
  end if;

  -- 2. Validate role domain
  if new_role not in ('superadmin', 'admin', 'employee', 'user', 'haunt') then
    raise exception 'Invalid role value: %', new_role;
  end if;

  -- 3. Verify target profile exists and capture old role for audit
  select role into old_role
  from public.profiles
  where id = target_user_id;

  if not found then
    raise exception 'Target user profile not found for id: %', target_user_id;
  end if;

  -- 4. Perform update
  update public.profiles
  set role = new_role,
      updated_at = timezone('utc'::text, now())
  where id = target_user_id;

  -- 5. Record audit event
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    'user_role_change',
    'profile',
    target_user_id::text,
    jsonb_build_object(
      'old_role', old_role,
      'new_role', new_role,
      'caller_user', current_user,
      'caller_role', auth.role()
    )
  );
end;
$$;

revoke all on function app_private.set_user_role_service(uuid, text) from public, authenticated, anon;
grant execute on function app_private.set_user_role_service(uuid, text) to service_role;
