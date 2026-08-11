-- Migration: 20260805000001_sync_user_metadata_role.sql
-- Synchronize user role from raw_user_meta_data upon user creation in Supabase Auth.

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
begin
  assigned_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'user');
  if assigned_role not in ('superadmin', 'admin', 'employee', 'user', 'haunt') then
    assigned_role := 'user';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    assigned_role
  )
  on conflict (id) do update
  set role = case 
        when excluded.role <> 'user' then excluded.role 
        else public.profiles.role 
      end,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;
