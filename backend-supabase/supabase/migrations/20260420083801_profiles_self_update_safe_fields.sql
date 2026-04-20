-- Allow users to edit their own safe profile fields while blocking privileged field changes.

create or replace function app_private.prevent_profile_privileged_field_changes()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	-- Only superadmin can modify role.
	if new.role is distinct from old.role
		 and not app_private.has_role(array['superadmin']::text[]) then
		raise exception 'Only superadmin can modify role';
	end if;

	-- Email is managed by auth flow and must not be changed from client profile updates.
	if new.email is distinct from old.email
		 and not app_private.has_role(array['superadmin']::text[]) then
		raise exception 'Email cannot be changed from profile update';
	end if;

	-- id must remain immutable.
	if new.id is distinct from old.id then
		raise exception 'Profile id is immutable';
	end if;

	return new;
end;
$$;

drop trigger if exists trg_prevent_profile_privileged_field_changes on public.profiles;
create trigger trg_prevent_profile_privileged_field_changes
before update on public.profiles
for each row
execute function app_private.prevent_profile_privileged_field_changes();

drop policy if exists "profiles_update_superadmin_only" on public.profiles;
drop policy if exists "profiles_update_own_non_privileged" on public.profiles;
drop policy if exists "profiles_update_own_safe_fields" on public.profiles;
drop policy if exists "profiles_update_superadmin" on public.profiles;

create policy "profiles_update_own_safe_fields"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_update_superadmin"
on public.profiles
for update
to authenticated
using (app_private.has_role(array['superadmin']::text[]))
with check (app_private.has_role(array['superadmin']::text[]));
