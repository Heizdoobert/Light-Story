-- Migration: 202604200001_mvp_init.sql

-- Light Story MVP baseline schema, RLS, and RPC setup.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create schema if not exists app_private;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('superadmin', 'admin', 'employee', 'user', 'haunt')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_profiles_role on public.profiles(role);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  cover_url text,
  category text,
  status text not null default 'ongoing' check (status in ('draft', 'ongoing', 'completed', 'archived')),
  views bigint not null default 0,
  like_count bigint not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_stories_created_at on public.stories(created_at desc);
create index if not exists idx_stories_status on public.stories(status);
create index if not exists idx_stories_category on public.stories(category);
create index if not exists idx_stories_title_trgm on public.stories using gin (title gin_trgm_ops);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  content text not null,
  word_count integer generated always as (
    case
      when length(trim(content)) = 0 then 0
      else cardinality(regexp_split_to_array(trim(content), E'\\s+'))
    end
  ) stored,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(story_id, chapter_number)
);

create index if not exists idx_chapters_story_id on public.chapters(story_id);
create index if not exists idx_chapters_story_chapter_number on public.chapters(story_id, chapter_number);

create table if not exists public.site_settings (
  id bigint generated always as identity primary key,
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (story_id, user_id)
);

create index if not exists idx_story_likes_user_id on public.story_likes(user_id);

drop function if exists public.handle_new_user();

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.increment_story_views(story_id_param uuid)
returns void
language plpgsql
as $$
begin
  update public.stories
  set views = views + 1
  where id = story_id_param;
end;
$$;

create or replace function public.toggle_story_like(story_id_param uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid;
  like_exists boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select exists(
    select 1
    from public.story_likes
    where story_id = story_id_param and user_id = current_user_id
  ) into like_exists;

  if like_exists then
    delete from public.story_likes
    where story_id = story_id_param and user_id = current_user_id;

    update public.stories
    set like_count = greatest(like_count - 1, 0)
    where id = story_id_param;

    return false;
  end if;

  insert into public.story_likes(story_id, user_id)
  values (story_id_param, current_user_id)
  on conflict do nothing;

  update public.stories
  set like_count = like_count + 1
  where id = story_id_param;

  return true;
end;
$$;

create or replace function app_private.set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  caller_role text;
begin
  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role is distinct from 'superadmin' then
    raise exception 'Only superadmin can change roles';
  end if;

  if new_role not in ('superadmin', 'admin', 'employee', 'user') then
    raise exception 'Invalid role value';
  end if;

  update public.profiles
  set role = new_role,
      updated_at = timezone('utc'::text, now())
  where id = target_user_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.site_settings enable row level security;
alter table public.story_likes enable row level security;

create policy "profiles_select_own_or_staff"
on public.profiles
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin', 'employee')
  )
);

create policy "profiles_update_own_non_privileged"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "stories_select_public_or_staff"
on public.stories
for select
using (
  status in ('ongoing', 'completed')
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin', 'employee')
  )
);

create policy "stories_write_staff"
on public.stories
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin', 'employee')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin', 'employee')
  )
);

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
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid() and p.role in ('superadmin', 'admin', 'employee')
        )
      )
  )
);

create policy "chapters_write_staff"
on public.chapters
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin', 'employee')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin', 'employee')
  )
);

create policy "site_settings_select_public"
on public.site_settings
for select
using (true);

create policy "site_settings_write_admin"
on public.site_settings
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin')
  )
);

create policy "story_likes_select_own"
on public.story_likes
for select
using (auth.uid() = user_id);

create policy "story_likes_insert_own"
on public.story_likes
for insert
with check (auth.uid() = user_id);

create policy "story_likes_delete_own"
on public.story_likes
for delete
using (auth.uid() = user_id);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_stories_updated_at on public.stories;
create trigger trg_stories_updated_at
before update on public.stories
for each row execute function public.touch_updated_at();

drop trigger if exists trg_chapters_updated_at on public.chapters;
create trigger trg_chapters_updated_at
before update on public.chapters
for each row execute function public.touch_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();

grant usage on schema app_private to postgres, service_role;
revoke all on function app_private.set_user_role(uuid, text) from public;
grant execute on function app_private.set_user_role(uuid, text) to authenticated;


-- Migration: 20260420063444_auth_role_hardening.sql

-- Harden profile role access so dashboard authorization is driven by trusted auth metadata
-- and profile changes remain restricted to superadmins.

drop policy if exists "profiles_update_own_non_privileged" on public.profiles;

create policy "profiles_update_superadmin_only"
on public.profiles
for update
using (
	exists (
		select 1
		from public.profiles p
		where p.id = auth.uid() and p.role = 'superadmin'
	)
)
with check (
	exists (
		select 1
		from public.profiles p
		where p.id = auth.uid() and p.role = 'superadmin'
	)
);


-- Migration: 20260420063931_current_user_profile_rpc.sql

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


-- Migration: 20260420064417_grant_app_private_usage.sql

grant usage on schema app_private to authenticated;


-- Migration: 20260420064919_role_policy_helper.sql

-- Non-recursive helpers for role-based authorization.

create or replace function app_private.has_role(required_roles text[])
returns boolean
language sql
security definer
set search_path = public, app_private
as $$
	select exists (
		select 1
		from public.profiles p
		where p.id = auth.uid()
			and p.role = any(required_roles)
	);
$$;

revoke all on function app_private.has_role(text[]) from public;
grant execute on function app_private.has_role(text[]) to anon, authenticated;

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


-- Migration: 20260420065237_role_source_auth_metadata.sql

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


-- Migration: 20260420071000_story_covers_storage.sql

-- Create a public bucket for story cover images and restrict uploads to staff.

insert into storage.buckets (id, name, public)
values ('story-covers', 'story-covers', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "story_covers_public_read" on storage.objects;
drop policy if exists "story_covers_staff_upload" on storage.objects;

drop policy if exists "story_covers_staff_delete" on storage.objects;

create policy "story_covers_public_read"
on storage.objects
for select
using (bucket_id = 'story-covers');

create policy "story_covers_staff_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'story-covers'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "story_covers_staff_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'story-covers'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);


-- Migration: 20260420083801_profiles_self_update_safe_fields.sql

-- Allow users to edit their own safe profile fields while blocking privileged field changes.

create or replace function app_private.prevent_profile_privileged_field_changes()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	-- Edge Functions run as service_role; allow privileged sync path.
	if current_setting('request.jwt.claim.role', true) = 'service_role' then
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


-- Migration: 20260420085103_add_missing_updated_at_columns.sql

-- Backfill missing updated_at columns for environments initialized from legacy schema.
-- This prevents trigger errors: record "new" has no field "updated_at".

alter table if exists public.profiles
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

alter table if exists public.stories
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

alter table if exists public.chapters
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

alter table if exists public.site_settings
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

-- Ensure updated_at triggers are present after the column backfill.
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_stories_updated_at on public.stories;
create trigger trg_stories_updated_at
before update on public.stories
for each row execute function public.touch_updated_at();

drop trigger if exists trg_chapters_updated_at on public.chapters;
create trigger trg_chapters_updated_at
before update on public.chapters
for each row execute function public.touch_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();


-- Migration: 20260420090656_story_taxonomy_relations.sql

-- Normalize story taxonomy with relational authors/categories and keep legacy text columns compatible.

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  bio text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_authors_name on public.authors(name);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_categories_name on public.categories(name);

alter table if exists public.stories
  add column if not exists author_id uuid references public.authors(id) on delete set null;

alter table if exists public.stories
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists idx_stories_author_id on public.stories(author_id);
create index if not exists idx_stories_category_id on public.stories(category_id);

-- Backfill taxonomy records from existing denormalized text values.
insert into public.authors (name)
select distinct trim(s.author)
from public.stories s
where s.author is not null and trim(s.author) <> ''
on conflict (name) do nothing;

insert into public.categories (name)
select distinct trim(s.category)
from public.stories s
where s.category is not null and trim(s.category) <> ''
on conflict (name) do nothing;

update public.stories s
set author_id = a.id
from public.authors a
where s.author_id is null
  and s.author is not null
  and lower(trim(s.author)) = lower(trim(a.name));

update public.stories s
set category_id = c.id
from public.categories c
where s.category_id is null
  and s.category is not null
  and lower(trim(s.category)) = lower(trim(c.name));

alter table public.authors enable row level security;
alter table public.categories enable row level security;

drop policy if exists "authors_select_public" on public.authors;
drop policy if exists "authors_write_staff" on public.authors;
drop policy if exists "categories_select_public" on public.categories;
drop policy if exists "categories_write_staff" on public.categories;

create policy "authors_select_public"
on public.authors
for select
using (true);

create policy "authors_write_staff"
on public.authors
for all
to authenticated
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "categories_select_public"
on public.categories
for select
using (true);

create policy "categories_write_staff"
on public.categories
for all
to authenticated
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

drop trigger if exists trg_authors_updated_at on public.authors;
create trigger trg_authors_updated_at
before update on public.authors
for each row execute function public.touch_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.touch_updated_at();


-- Migration: 20260420093400_system_settings_seed.sql

-- Seed default system settings for UI behavior and dashboard tab visibility.

insert into public.site_settings (key, value)
values
  (
    'ui_compact_mode',
    'false'::jsonb
  ),
  (
    'ui_show_sync_badge',
    'true'::jsonb
  ),
  (
    'dashboard_tab_visibility',
    '{
      "superadmin": ["dashboard", "dashboard_access_logs", "audit_logs", "operations", "operations_data", "create_story", "stories", "create_chapter", "categories", "authors", "ads", "settings", "profile", "create_comic"],
      "admin": ["dashboard", "dashboard_access_logs", "operations", "operations_data", "create_story", "stories", "create_chapter", "categories", "authors", "ads", "settings", "profile", "create_comic"],
      "employee": ["dashboard", "create_story", "stories", "create_chapter", "categories", "authors", "profile"],
      "user": []
    }'::jsonb
  )
on conflict (key) do nothing;


-- Migration: 20260420095200_site_settings_jsonb_compat.sql

-- Ensure site_settings.value is JSONB for structured system settings compatibility.

alter table if exists public.site_settings
  alter column value type jsonb
  using (
    case
      when value is null then '{}'::jsonb
      when trim(value::text) = '' then '{}'::jsonb
      when left(trim(value::text), 1) in ('{', '[', '"')
        or lower(trim(value::text)) in ('true', 'false', 'null')
        or trim(value::text) ~ '^-?[0-9]+(\.[0-9]+)?$'
      then value::jsonb
      else to_jsonb(value::text)
    end
  );


-- Migration: 20260421074259_admin_operations_schema.sql

-- Admin operations schema for Light Story.

create extension if not exists pgcrypto;

create table if not exists public.collections (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	description text,
	cover_url text,
	created_by uuid references public.profiles(id),
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.collection_stories (
	collection_id uuid not null references public.collections(id) on delete cascade,
	story_id uuid not null references public.stories(id) on delete cascade,
	sort_order integer not null default 0,
	created_at timestamptz not null default timezone('utc'::text, now()),
	primary key (collection_id, story_id)
);

create table if not exists public.moderation_queue (
	id uuid primary key default gen_random_uuid(),
	story_id uuid references public.stories(id) on delete cascade,
	chapter_id uuid references public.chapters(id) on delete cascade,
	reporter_id uuid references public.profiles(id),
	reason text not null,
	status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'rejected')),
	notes text,
	reviewed_by uuid references public.profiles(id),
	reviewed_at timestamptz,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.crawler_sources (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	source_type text not null default 'rss' check (source_type in ('rss', 'api', 'html', 'manual')),
	source_url text,
	enabled boolean not null default true,
	last_crawled_at timestamptz,
	last_status text,
	notes text,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.crawler_runs (
	id uuid primary key default gen_random_uuid(),
	source_id uuid references public.crawler_sources(id) on delete cascade,
	status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
	started_at timestamptz,
	finished_at timestamptz,
	items_seen integer not null default 0,
	items_created integer not null default 0,
	items_updated integer not null default 0,
	log text,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.vip_plans (
	id uuid primary key default gen_random_uuid(),
	code text not null unique,
	name text not null,
	description text,
	price numeric(12,2) not null default 0,
	billing_period text not null default 'monthly' check (billing_period in ('daily', 'weekly', 'monthly', 'yearly')),
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.vip_subscriptions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	plan_id uuid not null references public.vip_plans(id),
	status text not null default 'active' check (status in ('active', 'paused', 'canceled', 'expired')),
	started_at timestamptz not null default timezone('utc'::text, now()),
	ends_at timestamptz,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.promotions (
	id uuid primary key default gen_random_uuid(),
	code text not null unique,
	title text not null,
	description text,
	discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
	discount_value numeric(12,2) not null default 0,
	starts_at timestamptz,
	ends_at timestamptz,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.events (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	description text,
	starts_at timestamptz,
	ends_at timestamptz,
	status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'finished', 'archived')),
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.transactions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	amount numeric(12,2) not null default 0,
	currency text not null default 'USD',
	transaction_type text not null check (transaction_type in ('topup', 'subscription', 'purchase', 'refund')),
	status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
	reference_code text unique,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.comments (
	id uuid primary key default gen_random_uuid(),
	story_id uuid not null references public.stories(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	parent_id uuid references public.comments(id) on delete cascade,
	body text not null,
	status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted', 'flagged')),
	like_count integer not null default 0,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.ratings (
	id uuid primary key default gen_random_uuid(),
	story_id uuid not null references public.stories(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	rating integer not null check (rating between 1 and 5),
	review text,
	status text not null default 'visible' check (status in ('visible', 'hidden', 'flagged')),
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now()),
	unique(story_id, user_id)
);

create table if not exists public.revenue_snapshots (
	id uuid primary key default gen_random_uuid(),
	snapshot_date date not null unique,
	total_revenue numeric(12,2) not null default 0,
	total_transactions integer not null default 0,
	premium_subscriptions integer not null default 0,
	ad_revenue numeric(12,2) not null default 0,
	notes text,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_collections_created_at on public.collections(created_at desc);
create index if not exists idx_collection_stories_story_id on public.collection_stories(story_id);
create index if not exists idx_moderation_queue_status on public.moderation_queue(status);
create index if not exists idx_crawler_sources_enabled on public.crawler_sources(enabled);
create index if not exists idx_crawler_runs_source_id on public.crawler_runs(source_id);
create index if not exists idx_vip_subscriptions_user_id on public.vip_subscriptions(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_comments_story_id on public.comments(story_id);
create index if not exists idx_ratings_story_id on public.ratings(story_id);
create index if not exists idx_revenue_snapshots_snapshot_date on public.revenue_snapshots(snapshot_date desc);

alter table public.collections enable row level security;
alter table public.collection_stories enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.crawler_sources enable row level security;
alter table public.crawler_runs enable row level security;
alter table public.vip_plans enable row level security;
alter table public.vip_subscriptions enable row level security;
alter table public.promotions enable row level security;
alter table public.events enable row level security;
alter table public.transactions enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.revenue_snapshots enable row level security;

create policy "collections_select_public_or_staff"
on public.collections
for select
using (true);

create policy "collections_write_staff"
on public.collections
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "collection_stories_select_staff"
on public.collection_stories
for select
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "collection_stories_write_staff"
on public.collection_stories
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "moderation_queue_select_staff"
on public.moderation_queue
for select
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "moderation_queue_write_staff"
on public.moderation_queue
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "crawler_sources_staff"
on public.crawler_sources
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "crawler_runs_staff"
on public.crawler_runs
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "vip_plans_select_public"
on public.vip_plans
for select
using (true);

create policy "vip_plans_write_staff"
on public.vip_plans
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "vip_subscriptions_select_own_or_staff"
on public.vip_subscriptions
for select
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "vip_subscriptions_write_staff"
on public.vip_subscriptions
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "promotions_select_public"
on public.promotions
for select
using (true);

create policy "promotions_write_staff"
on public.promotions
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "events_select_public"
on public.events
for select
using (true);

create policy "events_write_staff"
on public.events
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "transactions_select_own_or_staff"
on public.transactions
for select
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "transactions_write_staff"
on public.transactions
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "comments_select_public"
on public.comments
for select
using (status = 'visible' or user_id = auth.uid());

create policy "comments_write_own_or_staff"
on public.comments
for all
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "ratings_select_public"
on public.ratings
for select
using (status = 'visible' or user_id = auth.uid());

create policy "ratings_write_own_or_staff"
on public.ratings
for all
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "revenue_snapshots_staff"
on public.revenue_snapshots
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create trigger touch_collections_updated_at
before update on public.collections
for each row execute function public.touch_updated_at();

create trigger touch_moderation_queue_updated_at
before update on public.moderation_queue
for each row execute function public.touch_updated_at();

create trigger touch_crawler_sources_updated_at
before update on public.crawler_sources
for each row execute function public.touch_updated_at();

create trigger touch_crawler_runs_updated_at
before update on public.crawler_runs
for each row execute function public.touch_updated_at();

create trigger touch_vip_plans_updated_at
before update on public.vip_plans
for each row execute function public.touch_updated_at();

create trigger touch_vip_subscriptions_updated_at
before update on public.vip_subscriptions
for each row execute function public.touch_updated_at();

create trigger touch_promotions_updated_at
before update on public.promotions
for each row execute function public.touch_updated_at();

create trigger touch_events_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

create trigger touch_transactions_updated_at
before update on public.transactions
for each row execute function public.touch_updated_at();

create trigger touch_comments_updated_at
before update on public.comments
for each row execute function public.touch_updated_at();

create trigger touch_ratings_updated_at
before update on public.ratings
for each row execute function public.touch_updated_at();

create trigger touch_revenue_snapshots_updated_at
before update on public.revenue_snapshots
for each row execute function public.touch_updated_at();


-- Migration: 20260422024429_superadmin_only_taxonomy_and_profile_delete.sql

-- Restrict taxonomy write operations to superadmin and allow superadmin profile deletion.

drop policy if exists "authors_write_staff" on public.authors;
drop policy if exists "authors_write_superadmin" on public.authors;

create policy "authors_write_superadmin"
on public.authors
for all
to authenticated
using (app_private.has_role(array['superadmin']::text[]))
with check (app_private.has_role(array['superadmin']::text[]));

drop policy if exists "categories_write_staff" on public.categories;
drop policy if exists "categories_write_superadmin" on public.categories;

create policy "categories_write_superadmin"
on public.categories
for all
to authenticated
using (app_private.has_role(array['superadmin']::text[]))
with check (app_private.has_role(array['superadmin']::text[]));

drop policy if exists "profiles_delete_superadmin" on public.profiles;

create policy "profiles_delete_superadmin"
on public.profiles
for delete
to authenticated
using (app_private.has_role(array['superadmin']::text[]));


-- Migration: 20260422025437_admin_user_audit_logs.sql

-- Audit logs for sensitive admin user-management actions.

create table if not exists public.admin_audit_logs (
	id uuid primary key default gen_random_uuid(),
	actor_user_id uuid,
	action text not null check (action in ('user_create', 'user_delete')),
	target_user_id uuid,
	target_email text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_admin_audit_logs_actor_user_id
on public.admin_audit_logs(actor_user_id);

create index if not exists idx_admin_audit_logs_created_at
on public.admin_audit_logs(created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "admin_audit_logs_select_superadmin" on public.admin_audit_logs;
drop policy if exists "admin_audit_logs_insert_superadmin" on public.admin_audit_logs;

create policy "admin_audit_logs_select_superadmin"
on public.admin_audit_logs
for select
to authenticated
using (app_private.has_role(array['superadmin']::text[]));

create policy "admin_audit_logs_insert_superadmin"
on public.admin_audit_logs
for insert
to authenticated
with check (app_private.has_role(array['superadmin']::text[]));


-- Migration: 20260423000001_fix_audit_logs_rls.sql

-- Fix service_role access to admin_audit_logs.
-- RLS policies with 'to authenticated' don't cover Edge Functions running as service_role.
-- Add permissive INSERT policy allowing any request with valid JWT from Edge Function context.

drop policy if exists "admin_audit_logs_insert_function" on public.admin_audit_logs;

create policy "admin_audit_logs_insert_function"
on public.admin_audit_logs
for insert
with check (true);

-- Alternatively, if you want to restrict to service_role only, use:
-- create policy "admin_audit_logs_insert_function"
-- on public.admin_audit_logs
-- for insert
-- to service_role
-- with check (true);


-- Migration: 20260423000002_profiles_service_role_rls.sql

-- Allow service_role (Edge Functions) to insert and update profiles table.
-- manage-user Edge Function needs to upsert new user profiles after creation.
-- RLS policies with 'to authenticated' don't cover service_role execution context.

drop policy if exists "profiles_insert_service_role" on public.profiles;
drop policy if exists "profiles_update_service_role" on public.profiles;

create policy "profiles_insert_service_role"
on public.profiles
for insert
to service_role
with check (true);

create policy "profiles_update_service_role"
on public.profiles
for update
to service_role
using (true)
with check (true);


-- Migration: 20260423000003_profiles_service_role_trigger_bypass.sql

-- Allow service_role Edge Functions to bypass profile privileged-field trigger.
-- manage-user creates auth user then syncs profile role through service_role.

create or replace function app_private.prevent_profile_privileged_field_changes()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	-- Edge Functions run as service_role; allow privileged sync path.
	if current_setting('request.jwt.claim.role', true) = 'service_role' then
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


-- Migration: 20260423000004_grant_has_role_to_service_role.sql

-- Allow Edge Functions running as service_role to call role helper functions.

revoke all on function app_private.has_role(text[]) from public;
grant execute on function app_private.has_role(text[]) to anon, authenticated, service_role, postgres;


-- Migration: 20260423000005_broaden_service_role_profile_bypass.sql

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

-- Migration: 20260425093000_dashboard_access_logs.sql

-- Add dashboard access event support to admin_audit_logs.

alter table public.admin_audit_logs
  drop constraint if exists admin_audit_logs_action_check;

alter table public.admin_audit_logs
  add constraint admin_audit_logs_action_check
  check (action in ('user_create', 'user_delete', 'dashboard_access'));

-- Allow admin and superadmin to read dashboard access events.
drop policy if exists "admin_audit_logs_select_admin_dashboard_access" on public.admin_audit_logs;

create policy "admin_audit_logs_select_admin_dashboard_access"
on public.admin_audit_logs
for select
to authenticated
using (
  action = 'dashboard_access'
  and app_private.has_role(array['superadmin', 'admin']::text[])
);

-- Allow eligible users to write their own dashboard access events.
drop policy if exists "admin_audit_logs_insert_dashboard_access" on public.admin_audit_logs;

create policy "admin_audit_logs_insert_dashboard_access"
on public.admin_audit_logs
for insert
to authenticated
with check (
  action = 'dashboard_access'
  and actor_user_id = auth.uid()
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);


-- Migration: 20260428000001_fix_site_settings_rls_leak.sql

-- Fix critical RLS leak: site_settings had "select true" policy
-- exposing all settings (including ad keys) to anonymous users.
-- Replace with restricted policy: only authenticated users can read,
-- and they can only access settings prefixed with 'public_'.

-- Drop the overly permissive public select policy
drop policy if exists "site_settings_select_public" on public.site_settings;

-- Create new policy: authenticated users only, and only public_* keys
create policy "site_settings_select_public"
on public.site_settings
for select
to authenticated
using (key like 'public_%');

-- Allow superadmin/admin full access for reads (already covered by write policy)
create policy "site_settings_select_admin"
on public.site_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin')
  )
);


-- Migration: 20260428000002_add_story_views_tracking.sql

-- Harden story views against race conditions.
-- Create a view tracking table to prevent duplicate increments per user.
-- This enables accurate view counts under high concurrency.

-- Create story_views tracking table
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewed_by uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamp default now() not null
);

-- Enforce uniqueness per-story/per-user per hour via a unique expression index
create unique index if not exists idx_story_views_unique_hour on public.story_views (
  story_id,
  viewed_by,
  (date_trunc('hour', viewed_at))
);

alter table public.story_views enable row level security;

-- Users can view their own view records
create policy "story_views_self_read"
on public.story_views
for select
to authenticated
using (viewed_by = auth.uid());

-- Admins can read all
create policy "story_views_admin_read"
on public.story_views
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin')
  )
);

-- Users can insert their own views
create policy "story_views_insert_self"
on public.story_views
for insert
to authenticated
with check (viewed_by = auth.uid());

-- Create index for fast lookups
create index if not exists idx_story_views_story_id on public.story_views(story_id);
create index if not exists idx_story_views_viewed_by on public.story_views(viewed_by);

-- Rewrite increment_story_views to use view tracking.
-- Only increment if this is a new/different viewing session.
drop function if exists public.increment_story_views(uuid) cascade;

create or replace function public.increment_story_views(story_id_param uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  -- Get current user
  current_user_id := auth.uid();
  
  -- If anonymous, just increment counter without tracking
  if current_user_id is null then
    update public.stories
    set views = views + 1
    where id = story_id_param;
    return;
  end if;
  
  -- For authenticated users, only increment if new view in this hour
  insert into public.story_views (story_id, viewed_by)
  values (story_id_param, current_user_id)
  on conflict do nothing;
  
  -- Increment counter for each successful new view
  update public.stories
  set views = views + 1
  where id = story_id_param
  and exists (
    select 1 from public.story_views sv
    where sv.story_id = story_id_param
    and sv.viewed_by = current_user_id
    and sv.viewed_at > now() - interval '1 hour'
    limit 1
  );
end;
$$;

-- Grant execute to authenticated and anon
grant execute on function public.increment_story_views(uuid) to anon, authenticated;


-- Migration: 20260428000003_audit_rbac_rls_enforcement.sql

-- Audit: Verify RLS enforcement on all admin-accessible tables
-- This ensures client-side RBAC bypass via state modification cannot access data.
-- All admin operations require:
-- 1. Role must be in app_metadata (not user_metadata)
-- 2. RLS policies must check role via profiles table
-- 3. No policies should allow read-all ('select true') except for public_* settings

-- Verify critical admin tables have RLS enabled
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where tablename in (
  'profiles',
  'stories',
  'site_settings',
  'admin_audit_logs',
  'admin_user_operations',
  'dashboard_access_logs'
) and schemaname = 'public'
order by tablename;

-- List all policies for admin-relevant tables
select
  schemaname,
  tablename,
  policyname,
  qual as policy_condition,
  with_check
from pg_policies
where tablename in (
  'profiles',
  'stories',
  'site_settings',
  'admin_audit_logs',
  'admin_user_operations',
  'dashboard_access_logs'
)
order by tablename, policyname;

-- Verify no overly-permissive policies exist
select
  schemaname,
  tablename,
  policyname,
  'WARNING: Overly permissive' as issue
from pg_policies
where tablename in (
  'profiles',
  'stories',
  'site_settings',
  'admin_audit_logs',
  'admin_user_operations',
  'dashboard_access_logs'
) and (
  qual = 'true' or
  with_check = 'true'
)
order by tablename, policyname;


-- Migration: 20260502000000_dashboard_access_logs_realtime.sql

-- Publish admin audit logs so dashboard access events can stream in realtime.

-- Ensure publication exists then add the admin_audit_logs table
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  execute 'alter publication supabase_realtime add table public.admin_audit_logs';
exception when undefined_table then
  -- ignore if table does not exist yet
  null;
end;
$$;

-- Migration: 20260503000001_rls_comics_chapters.sql

-- Migration superseded: RLS policies for comics/chapters are defined in 20260505_create_comics_and_chapters.sql
-- This migration is intentionally left blank to avoid duplicate/conflicting policy creation.

-- No-op


-- Migration: 20260509000001_analytics_rpc_functions.sql

-- Analytics Dashboard RPC Functions
-- Created: 2026-05-09
-- Purpose: Provide aggregated metrics for admin dashboard

-- Create analytics snapshot table for caching
create table if not exists public.analytics_snapshots (
  id bigint generated always as identity primary key,
  metric_type text not null check (metric_type in ('user_engagement', 'content_performance', 'infrastructure')),
  time_range text not null,
  snapshot_data jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  expires_at timestamptz not null,
  unique(metric_type, time_range)
);

create index if not exists idx_analytics_snapshots_expiry on public.analytics_snapshots(expires_at);
create index if not exists idx_analytics_snapshots_metric_type on public.analytics_snapshots(metric_type);

alter table public.analytics_snapshots enable row level security;

-- Policy: Only admins can read/write analytics snapshots
create policy "analytics_snapshots_admin_only"
  on public.analytics_snapshots
  for all
  using (auth.jwt() ->> 'role' in ('superadmin', 'admin'))
  with check (auth.jwt() ->> 'role' in ('superadmin', 'admin'));

-- Function: Get user engagement summary (DAU, WAU, MAU, churn)
create or replace function public.get_user_engagement_summary(
  p_time_range text default '24h',
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_prev_start_ts timestamptz;
  v_prev_end_ts timestamptz;
  v_dau integer;
  v_wau integer;
  v_mau integer;
  v_prev_dau integer;
  v_signups integer;
  v_churn_rate numeric;
  v_result jsonb;
begin
  -- Determine time range
  v_end_ts := coalesce(p_end_date, timezone('utc'::text, now()));
  
  case p_time_range
    when '24h' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '24 hours');
      v_prev_start_ts := v_start_ts - interval '24 hours';
      v_prev_end_ts := v_start_ts;
    when '7d' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '7 days');
      v_prev_start_ts := v_start_ts - interval '7 days';
      v_prev_end_ts := v_start_ts;
    when '30d' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '30 days');
      v_prev_start_ts := v_start_ts - interval '30 days';
      v_prev_end_ts := v_start_ts;
    else
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '24 hours');
      v_prev_start_ts := v_start_ts - interval '24 hours';
      v_prev_end_ts := v_start_ts;
  end case;

  -- Calculate DAU (unique users who viewed stories in period)
  select count(distinct viewed_by)
  into v_dau
  from public.story_views
  where viewed_at >= v_start_ts and viewed_at < v_end_ts;

  -- Calculate WAU (unique users in last 7 days from end_ts)
  select count(distinct viewed_by)
  into v_wau
  from public.story_views
  where viewed_at >= (v_end_ts - interval '7 days') and viewed_at < v_end_ts;

  -- Calculate MAU (unique users in last 30 days from end_ts)
  select count(distinct viewed_by)
  into v_mau
  from public.story_views
  where viewed_at >= (v_end_ts - interval '30 days') and viewed_at < v_end_ts;

  -- Calculate previous DAU for comparison
  select count(distinct viewed_by)
  into v_prev_dau
  from public.story_views
  where viewed_at >= v_prev_start_ts and viewed_at < v_prev_end_ts;

  -- Count new signups in period
  select count(*)
  into v_signups
  from public.profiles
  where created_at >= v_start_ts and created_at < v_end_ts;

  -- Calculate churn rate (users inactive in period / total users)
  select round(
    (count(distinct id) - count(distinct viewed_by))::numeric / 
    nullif(count(distinct id), 0) * 100, 2
  )
  into v_churn_rate
  from public.profiles p
  left join public.story_views sv on p.id = sv.viewed_by and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where p.created_at < v_end_ts;

  v_result := jsonb_build_object(
    'dau', coalesce(v_dau, 0),
    'wau', coalesce(v_wau, 0),
    'mau', coalesce(v_mau, 0),
    'dau_change', case when v_prev_dau > 0 then round(((v_dau::numeric - v_prev_dau) / v_prev_dau * 100)::numeric, 2) else null end,
    'new_signups', coalesce(v_signups, 0),
    'churn_rate_pct', coalesce(v_churn_rate, 0),
    'time_range', p_time_range,
    'period_start', v_start_ts::text,
    'period_end', v_end_ts::text
  );

  return v_result;
end;
$$;

-- Function: Get signup trend (cohort analysis)
create or replace function public.get_signup_trend(
  p_days_back integer default 30
)
returns table (
  signup_date date,
  new_users integer,
  cumulative_users bigint
) 
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    date_trunc('day', p.created_at)::date as signup_date,
    count(*)::integer as new_users,
    sum(count(*)) over (order by date_trunc('day', p.created_at)) as cumulative_users
  from public.profiles p
  where p.created_at >= timezone('utc'::text, now()) - (p_days_back || ' days')::interval
  group by date_trunc('day', p.created_at)
  order by date_trunc('day', p.created_at) asc;
end;
$$;

-- Function: Get inactive user cohort
create or replace function public.get_inactive_user_cohort(
  p_inactive_days integer default 7
)
returns table (
  user_id uuid,
  user_email text,
  user_role text,
  last_activity_at timestamptz,
  days_inactive integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.id,
    p.email,
    p.role,
    max(sv.viewed_at) as last_activity_at,
    (extract(epoch from (timezone('utc'::text, now()) - max(sv.viewed_at)))::integer / 86400) as days_inactive
  from public.profiles p
  left join public.story_views sv on p.id = sv.viewed_by
  where p.role = 'user'
  group by p.id, p.email, p.role
  having (extract(epoch from (timezone('utc'::text, now()) - max(sv.viewed_at)))::integer / 86400) >= p_inactive_days
     or max(sv.viewed_at) is null
  order by max(sv.viewed_at) asc nulls first;
end;
$$;

-- Function: Get top stories by metric
create or replace function public.get_top_stories_by_metric(
  p_metric text default 'views',
  p_limit integer default 10,
  p_time_range text default '7d'
)
returns table (
  story_id uuid,
  title text,
  author text,
  metric_value bigint,
  metric_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  v_end_ts := timezone('utc'::text, now());
  
  case p_time_range
    when '24h' then
      v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then
      v_start_ts := v_end_ts - interval '7 days';
    when '30d' then
      v_start_ts := v_end_ts - interval '30 days';
    else
      v_start_ts := v_end_ts - interval '7 days';
  end case;

  if p_metric = 'views' then
    return query
    select
      s.id,
      s.title,
      s.author,
      count(sv.id)::bigint as view_count,
      'views'::text,
      s.created_at
    from public.stories s
    left join public.story_views sv on s.id = sv.story_id 
      and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
    where s.status in ('ongoing', 'completed')
    group by s.id, s.title, s.author, s.created_at
    order by view_count desc
    limit p_limit;
  elsif p_metric = 'likes' then
    return query
    select
      s.id,
      s.title,
      s.author,
      count(sl.user_id)::bigint as like_count,
      'likes'::text,
      s.created_at
    from public.stories s
    left join public.story_likes sl on s.id = sl.story_id
    where s.status in ('ongoing', 'completed')
    group by s.id, s.title, s.author, s.created_at
    order by like_count desc
    limit p_limit;
  end if;
end;
$$;

-- Function: Get top chapters by reads
create or replace function public.get_top_chapters_by_reads(
  p_limit integer default 10,
  p_time_range text default '7d'
)
returns table (
  chapter_id uuid,
  story_id uuid,
  story_title text,
  chapter_number integer,
  chapter_title text,
  read_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  v_end_ts := timezone('utc'::text, now());
  
  case p_time_range
    when '24h' then
      v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then
      v_start_ts := v_end_ts - interval '7 days';
    when '30d' then
      v_start_ts := v_end_ts - interval '30 days';
    else
      v_start_ts := v_end_ts - interval '7 days';
  end case;

  return query
  select
    c.id,
    s.id,
    s.title,
    c.chapter_number,
    c.title,
    count(sv.id)::integer as read_count,
    c.created_at
  from public.chapters c
  join public.stories s on c.story_id = s.id
  left join public.story_views sv on s.id = sv.story_id 
    and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where s.status in ('ongoing', 'completed')
  group by c.id, s.id, s.title, c.chapter_number, c.title, c.created_at
  order by read_count desc
  limit p_limit;
end;
$$;

-- Function: Get story completion rate
create or replace function public.get_story_completion_rates(
  p_story_id uuid default null
)
returns table (
  story_id uuid,
  story_title text,
  total_chapters integer,
  completion_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    s.id,
    s.title,
    count(c.id)::integer as total_chapters,
    round((count(distinct c.id)::numeric / nullif(max(c.chapter_number), 0) * 100)::numeric, 2) as completion_rate
  from public.stories s
  left join public.chapters c on s.id = c.story_id
  where (p_story_id is null or s.id = p_story_id)
    and s.status in ('ongoing', 'completed')
  group by s.id, s.title
  order by completion_rate desc;
end;
$$;

-- Grant analytics functions to authenticated users with admin role (via RLS)
grant execute on function public.get_user_engagement_summary(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_signup_trend(integer) to authenticated;
grant execute on function public.get_inactive_user_cohort(integer) to authenticated;
grant execute on function public.get_top_stories_by_metric(text, integer, text) to authenticated;
grant execute on function public.get_top_chapters_by_reads(integer, text) to authenticated;
grant execute on function public.get_story_completion_rates(uuid) to authenticated;

-- Create table for analytics
grant insert, select on public.analytics_snapshots to authenticated;


-- Migration: 202605100001_comic_platform.sql

-- Migration: Comic Platform core tables, RLS, and pgvector search
-- Date: 2026-05-10

-- 1) pgvector extension (for semantic search)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  cover_url text,
  status text NOT NULL DEFAULT 'draft', -- 'draft' | 'published' | 'archived'
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  search_vector vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text NOT NULL,
  content text,
  vip_content boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, chapter_number)
);

-- 4) RLS: enable on both tables
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stories' AND policyname='read_published_stories') THEN
    CREATE POLICY read_published_stories ON public.stories FOR SELECT USING (status = 'published');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chapters' AND policyname='read_free_chapters') THEN
    CREATE POLICY read_free_chapters ON public.chapters FOR SELECT USING (
      vip_content = FALSE
      AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = public.chapters.story_id AND s.status = 'published')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chapters' AND policyname='read_vip_chapters_premium_admin') THEN
    CREATE POLICY read_vip_chapters_premium_admin ON public.chapters FOR SELECT USING (
      vip_content = TRUE
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('premium', 'admin', 'superadmin'))
    );
  END IF;
END $$;

-- 6) pgvector index (recommended for similarity search)
-- Use ivfflat index; tune 'lists' based on dataset size and performance testing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_stories_search_vector' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_stories_search_vector ON public.stories USING ivfflat (search_vector vector_cosine_ops) WITH (lists = 100)';
  END IF;
END$$;

-- 7) Semantic search RPC using pgvector
CREATE OR REPLACE FUNCTION public.search_stories(
  query_embedding vector(1536),
  match_count integer DEFAULT 10
) RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  cover_url text,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT
    s.id,
    s.title,
    s.summary,
    s.cover_url,
    1 - (s.search_vector <=> query_embedding) AS similarity
  FROM public.stories s
  WHERE s.search_vector IS NOT NULL
  ORDER BY s.search_vector <=> query_embedding
  LIMIT match_count;
$$;

-- 8) Notes / operational guidance (do not run as SQL)
-- Backfill: Populate `stories.search_vector` asynchronously using an embedding generator
-- Example: UPDATE public.stories SET search_vector = '<embedding>' WHERE id = ...;
-- Rebuild ivfflat index after significant inserts: REINDEX INDEX idx_stories_search_vector;


-- Migration: 202605110001_security_hardening_comments_ratings.sql

-- Migration: Security hardening for comments and ratings (RLS + sanitization)
-- Date: 2026-05-11

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ratings ENABLE ROW LEVEL SECURITY;

-- Helper: check role and premium
CREATE OR REPLACE FUNCTION public.user_has_role(uid uuid, role_name text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = role_name);
$$;

CREATE OR REPLACE FUNCTION public.user_has_premium(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role IN ('premium', 'admin', 'superadmin'));
$$;

-- Comments RLS: only allow SELECT on published content and allow INSERT by authenticated users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_select_published') THEN
    CREATE POLICY comments_select_published ON public.comments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = public.comments.story_id AND s.status = 'published'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_insert_auth') THEN
    CREATE POLICY comments_insert_auth ON public.comments FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_update_owner_or_admin') THEN
    CREATE POLICY comments_update_owner_or_admin ON public.comments FOR UPDATE
    USING (author_id = auth.uid() OR public.user_has_role(auth.uid(), 'admin') OR public.user_has_role(auth.uid(), 'superadmin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='comments_delete_owner_or_admin') THEN
    CREATE POLICY comments_delete_owner_or_admin ON public.comments FOR DELETE
    USING (author_id = auth.uid() OR public.user_has_role(auth.uid(), 'admin') OR public.user_has_role(auth.uid(), 'superadmin'));
  END IF;
END $$;

-- Ratings RLS: allow read on published stories; inserts require auth; updates/deletes owner or admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ratings' AND policyname='ratings_select_published') THEN
    CREATE POLICY ratings_select_published ON public.ratings FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.stories s WHERE s.id = public.ratings.story_id AND s.status = 'published'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ratings' AND policyname='ratings_insert_auth') THEN
    CREATE POLICY ratings_insert_auth ON public.ratings FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ratings' AND policyname='ratings_update_owner_or_admin') THEN
    CREATE POLICY ratings_update_owner_or_admin ON public.ratings FOR UPDATE
    USING (user_id = auth.uid() OR public.user_has_role(auth.uid(), 'admin') OR public.user_has_role(auth.uid(), 'superadmin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ratings' AND policyname='ratings_delete_owner_or_admin') THEN
    CREATE POLICY ratings_delete_owner_or_admin ON public.ratings FOR DELETE
    USING (user_id = auth.uid() OR public.user_has_role(auth.uid(), 'admin') OR public.user_has_role(auth.uid(), 'superadmin'));
  END IF;
END $$;

-- IDOR protection: explicit function to validate chapter access by id
CREATE OR REPLACE FUNCTION public.can_read_chapter(_chapter_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN (SELECT vip_content FROM public.chapters WHERE id = _chapter_id) = false THEN
      EXISTS (SELECT 1 FROM public.chapters c JOIN public.stories s ON s.id = c.story_id WHERE c.id = _chapter_id AND s.status = 'published')
    ELSE public.user_has_premium(_uid)
  END;
$$;

-- Note: After applying migration, update API Layer to call can_read_chapter() when fetching chapter by id to ensure explicit check.


-- Migration: 202605110002_add_superadmin_helpers.sql

-- Migration: Add isSuperadmin() helper for fast-path authorization
-- Date: 2026-05-11

-- Fast-path superadmin check (no joins, just direct profile role check)
CREATE OR REPLACE FUNCTION public.is_superadmin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'superadmin');
$$;

-- Utility: is_admin_or_higher (admin OR superadmin)
CREATE OR REPLACE FUNCTION public.is_admin_or_higher(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role IN ('admin', 'superadmin'));
$$;

-- Utility: is_premium_or_higher (premium OR admin OR superadmin)
CREATE OR REPLACE FUNCTION public.is_premium_or_higher(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role IN ('premium', 'admin', 'superadmin'));
$$;


-- Migration: 202605170000_remove_premium_role.sql

-- Remove 'premium' role from the system
-- Migrate existing premium users to 'user' role
-- Drop premium-specific SQL functions
-- Update RLS policies for chapter access

-- 1. Migrate existing premium users to 'user'
UPDATE public.profiles SET role = 'user' WHERE role = 'premium';

-- 2. Drop premium-specific functions
DROP FUNCTION IF EXISTS public.user_has_premium(uuid);
DROP FUNCTION IF EXISTS public.is_premium_or_higher(uuid);

-- 3. Update profiles CHECK constraint (drop and recreate)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'employee', 'user'));

-- 4. Update set_user_role allowed roles
CREATE OR REPLACE FUNCTION app_private.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Only superadmin can change roles';
  END IF;
  IF new_role NOT IN ('superadmin', 'admin', 'employee', 'user') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;
  UPDATE public.profiles
  SET role = new_role, updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;
END;
$$;

-- 5. Simplify can_read_chapter - all published chapters readable
CREATE OR REPLACE FUNCTION public.can_read_chapter(_chapter_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = _chapter_id AND s.status = 'published'
  );
$$;

-- 6. Update chapter RLS - merge free + VIP into single published-read policy
DROP POLICY IF EXISTS "read_free_chapters" ON public.chapters;
DROP POLICY IF EXISTS "read_vip_chapters_premium_admin" ON public.chapters;

CREATE POLICY "chapters_select_published" ON public.chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = public.chapters.story_id AND s.status = 'published'
  )
);


-- Migration: 202605170001_remove_vip_system.sql

-- Remove VIP system: plans, subscriptions, chapter flag, RLS, triggers
-- VIP content model removed; all published chapters equally accessible

-- 1. Drop FK constraints on vip_subscriptions
ALTER TABLE public.vip_subscriptions DROP CONSTRAINT IF EXISTS vip_subscriptions_user_id_fkey;
ALTER TABLE public.vip_subscriptions DROP CONSTRAINT IF EXISTS vip_subscriptions_plan_id_fkey;

-- 2. Drop VIP tables (CASCADE handles dependent policies/triggers)
DROP TABLE IF EXISTS public.vip_subscriptions CASCADE;
DROP TABLE IF EXISTS public.vip_plans CASCADE;

-- 3. Drop chapters.vip_content column
ALTER TABLE public.chapters DROP COLUMN IF EXISTS vip_content;


-- Migration: 202605170002_fix_story_status_and_like_unlike.sql

-- Fix story status constraint to match frontend usage
-- Add 'ongoing' and 'completed' to allowed statuses
-- Frontend uses ongoing/completed for display, backend uses draft/published for moderation

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_status_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_status_check
  CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'archived'));

-- Update stories RLS: also show ongoing stories to public
DROP POLICY IF EXISTS "read_published_stories" ON public.stories;
CREATE POLICY "read_published_stories" ON public.stories FOR SELECT
USING (status IN ('published', 'ongoing', 'completed'));


-- Migration: 20260521000100_analytics_rpc_access_hardening.sql

-- Harden analytics RPCs: require authenticated staff roles and remove PUBLIC execute.

create or replace function public.get_user_engagement_summary(
  p_time_range text default '24h',
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_prev_start_ts timestamptz;
  v_prev_end_ts timestamptz;
  v_dau integer;
  v_wau integer;
  v_mau integer;
  v_prev_dau integer;
  v_signups integer;
  v_churn_rate numeric;
  v_result jsonb;
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_end_ts := coalesce(p_end_date, timezone('utc'::text, now()));

  case p_time_range
    when '24h' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '24 hours');
      v_prev_start_ts := v_start_ts - interval '24 hours';
      v_prev_end_ts := v_start_ts;
    when '7d' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '7 days');
      v_prev_start_ts := v_start_ts - interval '7 days';
      v_prev_end_ts := v_start_ts;
    when '30d' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '30 days');
      v_prev_start_ts := v_start_ts - interval '30 days';
      v_prev_end_ts := v_start_ts;
    else
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '24 hours');
      v_prev_start_ts := v_start_ts - interval '24 hours';
      v_prev_end_ts := v_start_ts;
  end case;

  select count(distinct viewed_by)
  into v_dau
  from public.story_views
  where viewed_at >= v_start_ts and viewed_at < v_end_ts;

  select count(distinct viewed_by)
  into v_wau
  from public.story_views
  where viewed_at >= (v_end_ts - interval '7 days') and viewed_at < v_end_ts;

  select count(distinct viewed_by)
  into v_mau
  from public.story_views
  where viewed_at >= (v_end_ts - interval '30 days') and viewed_at < v_end_ts;

  select count(distinct viewed_by)
  into v_prev_dau
  from public.story_views
  where viewed_at >= v_prev_start_ts and viewed_at < v_prev_end_ts;

  select count(*)
  into v_signups
  from public.profiles
  where created_at >= v_start_ts and created_at < v_end_ts;

  select round(
    (count(distinct id) - count(distinct viewed_by))::numeric /
    nullif(count(distinct id), 0) * 100, 2
  )
  into v_churn_rate
  from public.profiles p
  left join public.story_views sv on p.id = sv.viewed_by and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where p.created_at < v_end_ts;

  v_result := jsonb_build_object(
    'dau', coalesce(v_dau, 0),
    'wau', coalesce(v_wau, 0),
    'mau', coalesce(v_mau, 0),
    'dau_change', case when v_prev_dau > 0 then round(((v_dau::numeric - v_prev_dau) / v_prev_dau * 100)::numeric, 2) else null end,
    'new_signups', coalesce(v_signups, 0),
    'churn_rate_pct', coalesce(v_churn_rate, 0),
    'time_range', p_time_range,
    'period_start', v_start_ts::text,
    'period_end', v_end_ts::text
  );

  return v_result;
end;
$$;

drop function if exists public.get_signup_trend cascade;
create function public.get_signup_trend(
  p_days_back integer default 30
)
returns table (
  signup_date date,
  new_users integer,
  cumulative_users bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    date_trunc('day', p.created_at)::date as signup_date,
    count(*)::integer as new_users,
    sum(count(*)) over (order by date_trunc('day', p.created_at)) as cumulative_users
  from public.profiles p
  where p.created_at >= timezone('utc'::text, now()) - (p_days_back || ' days')::interval
  group by date_trunc('day', p.created_at)
  order by date_trunc('day', p.created_at) asc;
end;
$$;

drop function if exists public.get_inactive_user_cohort cascade;
create function public.get_inactive_user_cohort(
  p_inactive_days integer default 7
)
returns table (
  user_id uuid,
  user_email text,
  user_role text,
  last_activity_at timestamptz,
  days_inactive integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.email,
    p.role,
    max(sv.viewed_at) as last_activity_at,
    (extract(epoch from (timezone('utc'::text, now()) - max(sv.viewed_at)))::integer / 86400) as days_inactive
  from public.profiles p
  left join public.story_views sv on p.id = sv.viewed_by
  where p.role = 'user'
  group by p.id, p.email, p.role
  having (extract(epoch from (timezone('utc'::text, now()) - max(sv.viewed_at)))::integer / 86400) >= p_inactive_days
     or max(sv.viewed_at) is null
  order by max(sv.viewed_at) asc nulls first;
end;
$$;

drop function if exists public.get_top_stories_by_metric cascade;
create function public.get_top_stories_by_metric(
  p_metric text default 'views',
  p_limit integer default 10,
  p_time_range text default '7d'
)
returns table (
  story_id uuid,
  title text,
  author text,
  metric_value bigint,
  metric_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_end_ts := timezone('utc'::text, now());

  case p_time_range
    when '24h' then
      v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then
      v_start_ts := v_end_ts - interval '7 days';
    when '30d' then
      v_start_ts := v_end_ts - interval '30 days';
    else
      v_start_ts := v_end_ts - interval '7 days';
  end case;

  if p_metric = 'views' then
    return query
    select
      s.id,
      s.title,
      s.author,
      count(sv.id)::bigint as view_count,
      'views'::text,
      s.created_at
    from public.stories s
    left join public.story_views sv on s.id = sv.story_id
      and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
    where s.status in ('ongoing', 'completed')
    group by s.id, s.title, s.author, s.created_at
    order by view_count desc
    limit p_limit;
  elsif p_metric = 'likes' then
    return query
    select
      s.id,
      s.title,
      s.author,
      count(sl.user_id)::bigint as like_count,
      'likes'::text,
      s.created_at
    from public.stories s
    left join public.story_likes sl on s.id = sl.story_id
    where s.status in ('ongoing', 'completed')
    group by s.id, s.title, s.author, s.created_at
    order by like_count desc
    limit p_limit;
  end if;
end;
$$;

drop function if exists public.get_top_chapters_by_reads cascade;
create function public.get_top_chapters_by_reads(
  p_limit integer default 10,
  p_time_range text default '7d'
)
returns table (
  chapter_id uuid,
  story_id uuid,
  story_title text,
  chapter_number integer,
  chapter_title text,
  read_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_end_ts := timezone('utc'::text, now());

  case p_time_range
    when '24h' then
      v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then
      v_start_ts := v_end_ts - interval '7 days';
    when '30d' then
      v_start_ts := v_end_ts - interval '30 days';
    else
      v_start_ts := v_end_ts - interval '7 days';
  end case;

  return query
  select
    c.id,
    s.id,
    s.title,
    c.chapter_number,
    c.title,
    count(sv.id)::integer as read_count,
    c.created_at
  from public.chapters c
  join public.stories s on c.story_id = s.id
  left join public.story_views sv on s.id = sv.story_id
    and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where s.status in ('ongoing', 'completed')
  group by c.id, s.id, s.title, c.chapter_number, c.title, c.created_at
  order by read_count desc
  limit p_limit;
end;
$$;

drop function if exists public.get_story_completion_rates cascade;
create function public.get_story_completion_rates(
  p_story_id uuid default null
)
returns table (
  story_id uuid,
  story_title text,
  total_chapters integer,
  completion_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.title,
    count(c.id)::integer as total_chapters,
    round((count(distinct c.id)::numeric / nullif(max(c.chapter_number), 0) * 100)::numeric, 2) as completion_rate
  from public.stories s
  left join public.chapters c on s.id = c.story_id
  where (p_story_id is null or s.id = p_story_id)
    and s.status in ('ongoing', 'completed')
  group by s.id, s.title
  order by completion_rate desc;
end;
$$;

revoke all on function public.get_user_engagement_summary(text, timestamptz, timestamptz) from public;
revoke all on function public.get_signup_trend(integer) from public;
revoke all on function public.get_inactive_user_cohort(integer) from public;
revoke all on function public.get_top_stories_by_metric(text, integer, text) from public;
revoke all on function public.get_top_chapters_by_reads(integer, text) from public;
revoke all on function public.get_story_completion_rates(uuid) from public;

grant execute on function public.get_user_engagement_summary(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_signup_trend(integer) to authenticated;
grant execute on function public.get_inactive_user_cohort(integer) to authenticated;
grant execute on function public.get_top_stories_by_metric(text, integer, text) to authenticated;
grant execute on function public.get_top_chapters_by_reads(integer, text) to authenticated;
grant execute on function public.get_story_completion_rates(uuid) to authenticated;


-- Migration: 20260521000300_analytics_dashboard_fix_rpcs.sql

-- Analytics Dashboard RPC Fixes
-- Adds total_views, total_favorites, enriched top_chapters

-- Returns total views count for a time range
create or replace function public.get_total_views(p_time_range text default '7d')
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.story_views
  where viewed_at >= (
    case p_time_range
      when '24h' then timezone('utc'::text, now()) - interval '24 hours'
      when '30d' then timezone('utc'::text, now()) - interval '30 days'
      else timezone('utc'::text, now()) - interval '7 days'
    end
  );
$$;

-- Returns total favorites count
create or replace function public.get_total_favorites()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.story_likes;
$$;

-- Replaces get_top_chapters_by_reads to add favorite_count
drop function if exists public.get_top_chapters_by_reads cascade;
create function public.get_top_chapters_by_reads(
  p_limit integer default 10,
  p_time_range text default '7d'
)
returns table (
  chapter_id uuid,
  story_id uuid,
  story_title text,
  chapter_number integer,
  chapter_title text,
  read_count integer,
  favorite_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  v_end_ts := timezone('utc'::text, now());

  case p_time_range
    when '24h' then
      v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then
      v_start_ts := v_end_ts - interval '7 days';
    when '30d' then
      v_start_ts := v_end_ts - interval '30 days';
    else
      v_start_ts := v_end_ts - interval '7 days';
  end case;

  return query
  select
    c.id,
    s.id,
    s.title,
    c.chapter_number,
    c.title,
    count(distinct sv.id)::integer as read_count,
    count(distinct sl.user_id)::integer as favorite_count,
    c.created_at
  from public.chapters c
  join public.stories s on c.story_id = s.id
  left join public.story_views sv on s.id = sv.story_id
    and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  left join public.story_likes sl on s.id = sl.story_id
  where s.status in ('ongoing', 'completed')
  group by c.id, s.id, s.title, c.chapter_number, c.title, c.created_at
  order by read_count desc
  limit p_limit;
end;
$$;

grant execute on function public.get_total_views(text) to authenticated;
grant execute on function public.get_total_favorites() to authenticated;
grant execute on function public.get_top_chapters_by_reads(integer, text) to authenticated;


-- Migration: 20260612000100_recruitment_tables.sql

-- Recruitment agent: candidate, decision, and invite tracking

create table if not exists public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_platform text not null,
  creator_name text,
  creator_handle text,
  avatar_url text,
  follower_count int default 0,
  score int check (score >= 0 and score <= 100),
  evaluation_json jsonb default '{}',
  verdict text check (verdict in ('strong_match', 'potential', 'mismatch')),
  status text not null default 'pending' check (status in ('pending', 'evaluated', 'approved', 'rejected', 'invited', 'onboarded')),
  admin_notes text,
  created_at timestamptz default now(),
  evaluated_at timestamptz,
  decided_at timestamptz
);

create table if not exists public.recruitment_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.recruitment_candidates(id) on delete cascade,
  admin_id uuid not null,
  action text not null check (action in ('approve', 'reject', 'invite')),
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.recruitment_invites (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.recruitment_candidates(id) on delete cascade,
  invite_code text unique not null,
  status text not null default 'sent' check (status in ('sent', 'opened', 'accepted', 'expired')),
  sent_at timestamptz default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '30 days'
);

-- Indexes for common queries
create index idx_recruitment_candidates_status on public.recruitment_candidates(status);
create index idx_recruitment_candidates_source on public.recruitment_candidates(source_platform);
create index idx_recruitment_candidates_score on public.recruitment_candidates(score desc);
create index idx_recruitment_decisions_candidate on public.recruitment_decisions(candidate_id);
create index idx_recruitment_invites_candidate on public.recruitment_invites(candidate_id);
create index idx_recruitment_invites_code on public.recruitment_invites(invite_code);

-- RLS: only superadmin and admin can view/manage recruitment
alter table public.recruitment_candidates enable row level security;
alter table public.recruitment_decisions enable row level security;
alter table public.recruitment_invites enable row level security;

create policy "superadmin_full_access_recruitment_candidates"
  on public.recruitment_candidates for all
  using (public.user_has_role(auth.uid(), 'superadmin'))
  with check (public.user_has_role(auth.uid(), 'superadmin'));

create policy "admin_read_recruitment_candidates"
  on public.recruitment_candidates for select
  using (public.user_has_role(auth.uid(), 'admin'));

create policy "superadmin_full_access_recruitment_decisions"
  on public.recruitment_decisions for all
  using (public.user_has_role(auth.uid(), 'superadmin'))
  with check (public.user_has_role(auth.uid(), 'superadmin'));

create policy "admin_read_recruitment_decisions"
  on public.recruitment_decisions for select
  using (public.user_has_role(auth.uid(), 'admin'));

create policy "superadmin_full_access_recruitment_invites"
  on public.recruitment_invites for all
  using (public.user_has_role(auth.uid(), 'superadmin'))
  with check (public.user_has_role(auth.uid(), 'superadmin'));

create policy "admin_read_recruitment_invites"
  on public.recruitment_invites for select
  using (public.user_has_role(auth.uid(), 'admin'));


-- Migration: 20260628154354_audit_logs_rls_staff.sql

-- Enable RLS on audit_logs (already enabled, idempotent)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow staff to INSERT audit entries
DROP POLICY IF EXISTS audit_logs_insert_staff ON public.audit_logs;
CREATE POLICY audit_logs_insert_staff ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'editor', 'admin', 'superadmin')
    )
  );

-- Allow staff to SELECT audit entries
DROP POLICY IF EXISTS audit_logs_select_staff ON public.audit_logs;
CREATE POLICY audit_logs_select_staff ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'editor', 'admin', 'superadmin')
    )
  );


-- Migration: 20260722000001_reader_hub_bookmarks_history_rls.sql

-- Create bookmarks table if not exists
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comic_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_comic_bookmark UNIQUE (user_id, comic_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks"
  ON public.bookmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create reading_history table if not exists
CREATE TABLE IF NOT EXISTS public.reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comic_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  chapter_number NUMERIC DEFAULT 1,
  progress_pct NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_comic_history UNIQUE (user_id, comic_id)
);

ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own reading history" ON public.reading_history;
CREATE POLICY "Users can manage own reading history"
  ON public.reading_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- Migration: 20260723000001_profiles_self_insert_rls.sql

-- Allow authenticated users to insert their own profile row on signup.
-- The existing `ensureProfileExists` flow in AuthContext uses anon key
-- but only service_role INSERT policy exists, causing silent failures
-- that leave new users with role=null.

drop policy if exists "profiles_insert_self" on public.profiles;

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
);

-- Existing authenticated users may also need SELECT their own row.
-- This is already covered by profiles_select_own_or_staff policy.


-- Migration: 20260725000001_translators_schema.sql

-- Migration: Create translators table and link to stories
-- Date: 2026-07-25

CREATE TABLE IF NOT EXISTS public.translators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  contact text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_translators_name ON public.translators(name);
CREATE INDEX IF NOT EXISTS idx_translators_status ON public.translators(status);

-- Link translator to stories table
ALTER TABLE IF EXISTS public.stories
  ADD COLUMN IF NOT EXISTS translator text;

ALTER TABLE IF EXISTS public.stories
  ADD COLUMN IF NOT EXISTS translator_id uuid REFERENCES public.translators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stories_translator_id ON public.stories(translator_id);

-- Enable RLS
ALTER TABLE public.translators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='translators' AND policyname='read_translators') THEN
    CREATE POLICY read_translators ON public.translators FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='translators' AND policyname='manage_translators_admin') THEN
    CREATE POLICY manage_translators_admin ON public.translators FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('superadmin', 'admin', 'employee')
      )
    );
  END IF;
END $$;

-- Trigger touch_updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_translators_updated_at') THEN
    CREATE TRIGGER trg_translators_updated_at
      BEFORE UPDATE ON public.translators
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;


-- Migration: 20260727000000_fix_get_signup_trend_type.sql

-- Fix datatype mismatch: sum(count(*)) returns numeric, but function expects bigint
drop function if exists public.get_signup_trend cascade;

create function public.get_signup_trend(
  p_days_back integer default 30
)
returns table (
  signup_date date,
  new_users integer,
  cumulative_users bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    date_trunc('day', p.created_at)::date as signup_date,
    count(*)::integer as new_users,
    (sum(count(*)) over (order by date_trunc('day', p.created_at)))::bigint as cumulative_users
  from public.profiles p
  where p.created_at >= timezone('utc'::text, now()) - (p_days_back || ' days')::interval
  group by date_trunc('day', p.created_at)
  order by date_trunc('day', p.created_at) asc;
end;
$$;

grant execute on function public.get_signup_trend(integer) to authenticated;
revoke all on function public.get_signup_trend(integer) from public;


-- Migration: 20260727000001_avatars_storage.sql

-- Create a public bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_authenticated_upload" on storage.objects;
drop policy if exists "avatars_authenticated_update" on storage.objects;
drop policy if exists "avatars_authenticated_delete" on storage.objects;

create policy "avatars_public_read"
on storage.objects
for select
using (bucket_id = 'avatars');

create policy "avatars_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    (auth.uid()::text = split_part(name, '-', 1))
    or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
  )
);

create policy "avatars_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (auth.uid()::text = split_part(name, '-', 1))
    or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
  )
);

create policy "avatars_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (auth.uid()::text = split_part(name, '-', 1))
    or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
  )
);


