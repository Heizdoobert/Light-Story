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
