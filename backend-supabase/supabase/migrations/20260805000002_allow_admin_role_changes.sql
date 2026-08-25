-- Migration: 20260805000002_allow_admin_role_changes.sql
-- Allow superadmin, admin, postgres, and service_role contexts to modify user profile roles.

create or replace function app_private.prevent_profile_privileged_field_changes()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
declare
	request_role text := coalesce(
		nullif(current_setting('request.jwt.claim.role', true), ''),
		nullif(auth.role(), ''),
		''
	);
begin
	if request_role = 'service_role' 
     or current_user in ('postgres', 'service_role', 'supabase_admin') 
     or current_setting('role', true) in ('postgres', 'service_role', 'supabase_admin') then
		return new;
	end if;

	-- Allow both superadmin and admin to modify role.
	if new.role is distinct from old.role
		 and not app_private.has_role(array['superadmin', 'admin']::text[]) then
		raise exception 'Only superadmin or admin can modify role';
	end if;

	-- Email is managed by auth flow and must not be changed from client profile updates.
	if new.email is distinct from old.email
		 and not app_private.has_role(array['superadmin', 'admin']::text[]) then
		raise exception 'Email cannot be changed from profile update';
	end if;

	-- id must remain immutable.
	if new.id is distinct from old.id then
		raise exception 'Profile id is immutable';
	end if;

	return new;
end;
$$;
