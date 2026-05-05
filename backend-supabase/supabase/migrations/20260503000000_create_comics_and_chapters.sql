-- Migration: create comics and chapters tables
-- Generated for Comic Management module

create table if not exists public.comics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid references public.comics(id) on delete cascade,
  title text not null,
  "order" int not null,
  image_urls jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Optional: add owner_id to comics for RLS (if not already present)
alter table public.comics add column if not exists owner_id uuid;

-- Grant usage to supabase service role (if needed)
grant select, insert, update, delete on public.comics to service_role;
grant select, insert, update, delete on public.chapters to service_role;