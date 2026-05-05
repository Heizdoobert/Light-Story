-- Migration: create comics and chapters tables with RLS policies
-- Run with: supabase db push

create table public.comics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  title varchar not null,
  description text,
  cover_url varchar,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid references public.comics(id) on delete cascade not null,
  chapter_number int not null,
  title varchar not null,
  content jsonb, -- array of image URLs
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Optional normalized table for chapter images
create table public.chapter_images (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  image_url varchar not null,
  created_at timestamp with time zone default now()
);

-- Row Level Security policies
alter table public.comics enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_images enable row level security;

-- Comics: owners can manage their own comics
create policy "allow owners insert comics" on public.comics for insert using (auth.uid() = owner_id);
create policy "allow owners select comics" on public.comics for select using (true);
create policy "allow owners update comics" on public.comics for update using (auth.uid() = owner_id);
create policy "allow owners delete comics" on public.comics for delete using (auth.uid() = owner_id);

-- Chapters: owners can manage chapters of their comics
create policy "allow owners insert chapters" on public.chapters for insert using (
  auth.uid() = (select owner_id from public.comics where id = comic_id)
);
create policy "allow owners select chapters" on public.chapters for select using (true);
create policy "allow owners update chapters" on public.chapters for update using (
  auth.uid() = (select owner_id from public.comics where id = comic_id)
);
create policy "allow owners delete chapters" on public.chapters for delete using (
  auth.uid() = (select owner_id from public.comics where id = comic_id)
);

-- Chapter images policy (if used)
create policy "allow owners insert chapter images" on public.chapter_images for insert using (
  auth.uid() = (select owner_id from public.comics where id = (select comic_id from public.chapters where id = chapter_id))
);
create policy "allow owners select chapter images" on public.chapter_images for select using (true);
create policy "allow owners delete chapter images" on public.chapter_images for delete using (
  auth.uid() = (select owner_id from public.comics where id = (select comic_id from public.chapters where id = chapter_id))
);
