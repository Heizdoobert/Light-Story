-- Broaden profile trigger bypass for Edge Functions.
-- Some service-role executions surface different role markers, so treat any
-- service-role context as privileged before enforcing profile field guards.

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
	if request_role = 'service_role' then
		return new;
	end if;

	if current_user = 'service_role' then
		return new;
	end if;

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