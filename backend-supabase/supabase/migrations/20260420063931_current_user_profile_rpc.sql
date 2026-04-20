-- Return the current user's profile from the database side so the frontend does not
-- depend on client-side table access semantics for dashboard authorization.

create or replace function app_private.get_current_profile()
returns table (
	id uuid,
	email text,
	full_name text,
	avatar_url text,
	role text
)
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	return query
	select
		p.id,
		p.email,
		p.full_name,
		p.avatar_url,
		p.role
	from public.profiles p
	where p.id = auth.uid();
end;
$$;

revoke all on function app_private.get_current_profile() from public;
grant execute on function app_private.get_current_profile() to authenticated;
