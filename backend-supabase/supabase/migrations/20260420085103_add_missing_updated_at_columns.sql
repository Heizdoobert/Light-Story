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
