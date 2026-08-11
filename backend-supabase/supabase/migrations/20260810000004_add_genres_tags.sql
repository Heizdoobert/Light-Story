create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_genres_name on public.genres(name);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_tags_name on public.tags(name);

alter table public.genres enable row level security;
alter table public.tags enable row level security;

drop policy if exists "genres_select_public" on public.genres;
drop policy if exists "genres_write_staff" on public.genres;
drop policy if exists "tags_select_public" on public.tags;
drop policy if exists "tags_write_staff" on public.tags;

create policy "genres_select_public"
on public.genres
for select
using (true);

create policy "genres_write_staff"
on public.genres
for all
to authenticated
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "tags_select_public"
on public.tags
for select
using (true);

create policy "tags_write_staff"
on public.tags
for all
to authenticated
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

drop trigger if exists trg_genres_updated_at on public.genres;
create trigger trg_genres_updated_at
before update on public.genres
for each row execute function public.touch_updated_at();

drop trigger if exists trg_tags_updated_at on public.tags;
create trigger trg_tags_updated_at
before update on public.tags
for each row execute function public.touch_updated_at();
