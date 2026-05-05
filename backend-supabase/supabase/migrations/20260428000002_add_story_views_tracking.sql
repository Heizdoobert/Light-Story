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
