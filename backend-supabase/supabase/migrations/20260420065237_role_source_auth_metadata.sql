-- Use auth metadata as the non-recursive source of truth for roles and keep it in sync
-- with the public profiles table.

create or replace function app_private.has_role(required_roles text[])
returns boolean
language sql
security definer
set search_path = auth, public, app_private
as $$
	select exists (
		select 1
		from auth.users u
		where u.id = auth.uid()
			and coalesce(u.raw_app_meta_data ->> 'role', '') = any(required_roles)
	);
$$;

revoke all on function app_private.has_role(text[]) from public;
grant execute on function app_private.has_role(text[]) to anon, authenticated;

create or replace function app_private.sync_profile_role_to_auth()
returns trigger
language plpgsql
security definer
set search_path = auth, public, app_private
as $$
begin
	update auth.users
	set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
		|| jsonb_build_object('role', new.role)
	where id = new.id;

	return new;
end;
$$;

revoke all on function app_private.sync_profile_role_to_auth() from public;
grant execute on function app_private.sync_profile_role_to_auth() to postgres, service_role;

drop trigger if exists trg_sync_profile_role_to_auth on public.profiles;
create trigger trg_sync_profile_role_to_auth
after insert or update of role on public.profiles
for each row
execute function app_private.sync_profile_role_to_auth();

update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
	|| jsonb_build_object('role', p.role)
from public.profiles p
where p.id = u.id
	and p.role in ('superadmin', 'admin', 'employee', 'user');

drop policy if exists "profiles_select_own_or_staff" on public.profiles;
drop policy if exists "profiles_update_superadmin_only" on public.profiles;
drop policy if exists "stories_select_public_or_staff" on public.stories;
drop policy if exists "stories_write_staff" on public.stories;
drop policy if exists "chapters_select_public_or_staff" on public.chapters;
drop policy if exists "chapters_write_staff" on public.chapters;
drop policy if exists "site_settings_write_admin" on public.site_settings;

create policy "profiles_select_own_or_staff"
on public.profiles
for select
using (
	auth.uid() = id
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "profiles_update_superadmin_only"
on public.profiles
for update
using (app_private.has_role(array['superadmin']::text[]))
with check (app_private.has_role(array['superadmin']::text[]));

create policy "stories_select_public_or_staff"
on public.stories
for select
using (
	status in ('ongoing', 'completed')
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "stories_write_staff"
on public.stories
for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "chapters_select_public_or_staff"
on public.chapters
for select
using (
	exists (
		select 1
		from public.stories s
		where s.id = chapters.story_id
			and (
				s.status in ('ongoing', 'completed')
				or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
			)
	)
);

create policy "chapters_write_staff"
on public.chapters
for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "site_settings_write_admin"
on public.site_settings
for all
using (app_private.has_role(array['superadmin', 'admin']::text[]))
with check (app_private.has_role(array['superadmin', 'admin']::text[]));
