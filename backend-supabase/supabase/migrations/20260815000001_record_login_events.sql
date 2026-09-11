-- Record staff login events (dashboard_access) for the superadmin audit view.
-- Fires on real sign-ins only: auth.users.last_sign_in_at changes on login,
-- not on session refresh. Correct ceiling for "who logged in, when".
-- SECURITY DEFINER so the insert bypasses admin_audit_logs RLS (runs as postgres).

create or replace function app_private.record_login_event()
returns trigger
language plpgsql
security definer
set search_path = auth, public, app_private
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at
     and coalesce(new.raw_app_meta_data ->> 'role', '') = any(array['superadmin', 'admin', 'employee']::text[]) then
    -- ponytail: unguarded insert here would fail EVERY user's login (trigger
    -- runs inside Gotrue's UPDATE auth.users). Logging is best-effort; a
    -- write failure must never take auth down. If audit durability ever
    -- matters, move this to a queue and accept eventual consistency.
    begin
      insert into public.admin_audit_logs (actor_user_id, action, metadata)
      values (
        new.id,
        'dashboard_access',
        jsonb_build_object(
          'role', new.raw_app_meta_data ->> 'role',
          'email', coalesce(new.raw_user_meta_data ->> 'email', '')
        )
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists record_login_event on auth.users;
create trigger record_login_event
after update of last_sign_in_at on auth.users
for each row execute function app_private.record_login_event();
