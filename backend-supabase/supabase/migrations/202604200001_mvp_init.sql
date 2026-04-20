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
  role text not null default 'user' check (role in ('superadmin', 'admin', 'employee', 'user')),
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

create or replace function public.handle_new_user()
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
for each row execute function public.handle_new_user();

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
