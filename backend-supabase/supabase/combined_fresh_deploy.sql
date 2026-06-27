-- ==========================================================
-- Light Story — Fresh DB Deployment (V2 Schema)
-- Combines all migrations with V1→V2 conflict resolution
-- ==========================================================

-- 0. CLEAN SLATE
drop table if exists public.revenue_snapshots cascade;
drop table if exists public.analytics_snapshots cascade;
drop table if exists public.ratings cascade;
drop table if exists public.comments cascade;
drop table if exists public.transactions cascade;
drop table if exists public.events cascade;
drop table if exists public.promotions cascade;

drop table if exists public.crawler_runs cascade;
drop table if exists public.crawler_sources cascade;
drop table if exists public.moderation_queue cascade;
drop table if exists public.collection_stories cascade;
drop table if exists public.collections cascade;
drop table if exists public.story_views cascade;
drop table if exists public.story_likes cascade;
drop table if exists public.dashboard_access_logs cascade;
drop table if exists public.audit_logs cascade;
drop function if exists public.search_stories;
drop table if exists public.chapters cascade;
drop table if exists public.stories cascade;
drop table if exists public.categories cascade;
drop table if exists public.authors cascade;
drop table if exists public.site_settings cascade;
drop table if exists public.profiles cascade;
drop schema if exists app_private cascade;

-- Drop all potentially-existing functions (fresh deploy)
drop function if exists public.get_top_stories_by_metric(text, integer, text);
drop function if exists public.get_top_chapters_by_reads(integer, text);
drop function if exists public.get_story_completion_rates(uuid);
drop function if exists public.get_user_engagement_summary(text, timestamptz, timestamptz);
drop function if exists public.get_user_engagement_summary(integer, timestamptz, timestamptz);
drop function if exists public.get_signup_trend(integer);
drop function if exists public.get_inactive_user_cohort(integer);
drop function if exists public.search_stories(vector(1536), integer);
drop function if exists public.can_read_chapter(uuid, uuid);
drop function if exists public.increment_story_views(uuid);
drop function if exists public.toggle_story_like(uuid);
drop function if exists public.user_has_role(uuid, text);
drop function if exists public.is_superadmin(uuid);
drop function if exists public.is_admin_or_higher(uuid);
drop function if exists public.touch_updated_at();

-- 1. EXTENSIONS
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists vector;

-- 2. SCHEMA
create schema if not exists app_private;

-- 3. HELPER FUNCTIONS
create or replace function public.touch_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- 4. PROFILES
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

-- Helper functions (must be after profiles table)
create or replace function app_private.has_role(required_roles text[])
returns boolean
language sql
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = any(required_roles)
  );
$$;

revoke all on function app_private.has_role(text[]) from public;
grant execute on function app_private.has_role(text[]) to anon, authenticated;

create or replace function public.user_has_role(uid uuid, role_name text)
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = role_name);
$$;

create or replace function public.is_superadmin(uid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'superadmin');
$$;

create or replace function public.is_admin_or_higher(uid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role in ('admin', 'superadmin'));
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5. AUTHORS (taxonomy)
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  bio text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_authors_name on public.authors(name);

-- 6. CATEGORIES (taxonomy)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_categories_name on public.categories(name);

-- 7. STORIES (V2 SCHEMA)
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  description text,
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'ongoing', 'completed', 'archived')),
  author_id uuid references public.profiles(id) on delete set null,
  author text,
  category text,
  views bigint not null default 0,
  like_count bigint not null default 0,
  created_by uuid references public.profiles(id),
  search_vector vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stories_created_at on public.stories(created_at desc);
create index if not exists idx_stories_author_id on public.stories(author_id);
create index if not exists idx_stories_category on public.stories(category);
create index if not exists idx_stories_status on public.stories(status);
create index if not exists idx_stories_title_trgm on public.stories using gin (title gin_trgm_ops);

-- 8. CHAPTERS (V2 SCHEMA)
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  content text,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(story_id, chapter_number)
);

create index if not exists idx_chapters_story_id on public.chapters(story_id);
create index if not exists idx_chapters_story_chapter_number on public.chapters(story_id, chapter_number);

-- 9. SITE SETTINGS
create table if not exists public.site_settings (
  id bigint generated always as identity primary key,
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 10. STORY LIKES
create table if not exists public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (story_id, user_id)
);
create index if not exists idx_story_likes_user_id on public.story_likes(user_id);

-- 11. STORY VIEWS
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewed_by uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamp default now() not null
);
create unique index if not exists idx_story_views_unique_hour on public.story_views (
  story_id, viewed_by, (date_trunc('hour', viewed_at))
);
create index if not exists idx_story_views_story_id on public.story_views(story_id);
create index if not exists idx_story_views_viewed_by on public.story_views(viewed_by);

-- 12. COLLECTIONS
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  cover_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_collections_created_at on public.collections(created_at desc);

create table if not exists public.collection_stories (
  collection_id uuid not null references public.collections(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (collection_id, story_id)
);
create index if not exists idx_collection_stories_story_id on public.collection_stories(story_id);

-- 13. MODERATION
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
create index if not exists idx_moderation_queue_status on public.moderation_queue(status);

-- 14. CRAWLER
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
create index if not exists idx_crawler_sources_enabled on public.crawler_sources(enabled);

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
create index if not exists idx_crawler_runs_source_id on public.crawler_runs(source_id);

-- 15. PROMOTIONS
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

-- 17. EVENTS
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

-- 18. TRANSACTIONS
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
create index if not exists idx_transactions_user_id on public.transactions(user_id);

-- 19. COMMENTS
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
create index if not exists idx_comments_story_id on public.comments(story_id);

-- 20. RATINGS
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
create index if not exists idx_ratings_story_id on public.ratings(story_id);

-- 21. REVENUE SNAPSHOTS
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
create index if not exists idx_revenue_snapshots_snapshot_date on public.revenue_snapshots(snapshot_date desc);

-- 22. ANALYTICS SNAPSHOTS
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

-- 23. AUDIT LOGS
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.dashboard_access_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id),
  route text not null,
  method text not null default 'GET',
  ip_address inet,
  user_agent text,
  duration_ms integer,
  status_code integer,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_dashboard_access_logs_user_id on public.dashboard_access_logs(user_id);
create index if not exists idx_dashboard_access_logs_created_at on public.dashboard_access_logs(created_at desc);
create index if not exists idx_dashboard_access_logs_route on public.dashboard_access_logs(route);

-- 24. pgvector INDEX
do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'idx_stories_search_vector' and n.nspname = 'public'
  ) then
    execute 'create index idx_stories_search_vector on public.stories using ivfflat (search_vector vector_cosine_ops) with (lists = 100)';
  end if;
end$$;

-- ==========================================================
-- FUNCTIONS & RPCs
-- ==========================================================

-- increment_story_views (V2-compatible: only track, no views column update)
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
  current_user_id := auth.uid();
  if current_user_id is null then
    return;
  end if;
  insert into public.story_views (story_id, viewed_by)
  values (story_id_param, current_user_id)
  on conflict do nothing;
end;
$$;
grant execute on function public.increment_story_views(uuid) to anon, authenticated;

-- toggle_story_like (V2-compatible: no like_count column update)
drop function if exists public.toggle_story_like(uuid) cascade;
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
    select 1 from public.story_likes
    where story_id = story_id_param and user_id = current_user_id
  ) into like_exists;
  if like_exists then
    delete from public.story_likes
    where story_id = story_id_param and user_id = current_user_id;
    return false;
  end if;
  insert into public.story_likes(story_id, user_id)
  values (story_id_param, current_user_id)
  on conflict do nothing;
  return true;
end;
$$;

-- set_user_role (superadmin only)
create or replace function app_private.set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'superadmin' then
    raise exception 'Only superadmin can change roles';
  end if;
  if new_role not in ('superadmin', 'admin', 'employee', 'user') then
    raise exception 'Invalid role value';
  end if;
  update public.profiles
  set role = new_role, updated_at = timezone('utc'::text, now())
  where id = target_user_id;
end;
$$;

-- can_read_chapter (IDOR protection) - all published chapters readable
create or replace function public.can_read_chapter(_chapter_id uuid, _uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.chapters c
    join public.stories s on s.id = c.story_id
    where c.id = _chapter_id and s.status = 'published'
  );
$$;

-- search_stories (pgvector semantic search)
create or replace function public.search_stories(
  query_embedding vector(1536),
  match_count integer default 10
) returns table (
  id uuid, title text, summary text, cover_url text, similarity float
) language sql stable as $$
  select s.id, s.title, s.summary, s.cover_url,
    1 - (s.search_vector <=> query_embedding) as similarity
  from public.stories s
  where s.search_vector is not null
  order by s.search_vector <=> query_embedding
  limit match_count;
$$;

-- get_user_engagement_summary (accepts p_days_back integer for worker compatibility)
create or replace function public.get_user_engagement_summary(
  p_days_back integer default 30,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz; v_end_ts timestamptz;
  v_prev_start_ts timestamptz; v_prev_end_ts timestamptz;
  v_dau integer; v_wau integer; v_mau integer; v_prev_dau integer;
  v_signups integer; v_churn_rate numeric; v_result jsonb;
begin
  v_end_ts := coalesce(p_end_date, timezone('utc'::text, now()));
  v_start_ts := coalesce(p_start_date, v_end_ts - (p_days_back || ' days')::interval);
  v_prev_start_ts := v_start_ts - (p_days_back || ' days')::interval;
  v_prev_end_ts := v_start_ts;
  select count(distinct viewed_by) into v_dau
  from public.story_views where viewed_at >= v_start_ts and viewed_at < v_end_ts;
  select count(distinct viewed_by) into v_wau
  from public.story_views where viewed_at >= (v_end_ts - interval '7 days') and viewed_at < v_end_ts;
  select count(distinct viewed_by) into v_mau
  from public.story_views where viewed_at >= (v_end_ts - interval '30 days') and viewed_at < v_end_ts;
  select count(distinct viewed_by) into v_prev_dau
  from public.story_views where viewed_at >= v_prev_start_ts and viewed_at < v_prev_end_ts;
  select count(*) into v_signups
  from public.profiles where created_at >= v_start_ts and created_at < v_end_ts;
  select round(
    (count(distinct p.id) - count(distinct viewed_by))::numeric / nullif(count(distinct p.id), 0) * 100, 2
  ) into v_churn_rate
  from public.profiles p
  left join public.story_views sv on p.id = sv.viewed_by and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where p.created_at < v_end_ts;
  v_result := jsonb_build_object(
    'dau', coalesce(v_dau, 0), 'wau', coalesce(v_wau, 0), 'mau', coalesce(v_mau, 0),
    'dau_change', case when v_prev_dau > 0 then round(((v_dau::numeric - v_prev_dau) / v_prev_dau * 100)::numeric, 2) else null end,
    'new_signups', coalesce(v_signups, 0), 'churn_rate_pct', coalesce(v_churn_rate, 0),
    'time_range', p_days_back || 'd', 'period_start', v_start_ts::text, 'period_end', v_end_ts::text
  );
  return v_result;
end;
$$;

-- get_signup_trend
create or replace function public.get_signup_trend(p_days_back integer default 30)
returns table (signup_date date, new_users integer, cumulative_users bigint)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select date_trunc('day', p.created_at)::date as signup_date,
    count(*)::integer as new_users,
    sum(count(*)) over (order by date_trunc('day', p.created_at)) as cumulative_users
  from public.profiles p
  where p.created_at >= timezone('utc'::text, now()) - (p_days_back || ' days')::interval
  group by date_trunc('day', p.created_at)
  order by date_trunc('day', p.created_at) asc;
end;
$$;

-- get_inactive_user_cohort
create or replace function public.get_inactive_user_cohort(p_inactive_days integer default 7)
returns table (user_id uuid, user_email text, user_role text, last_activity_at timestamptz, days_inactive integer)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select p.id, p.email, p.role,
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

-- get_top_stories_by_metric (V2-compatible: use story_views.count + profiles join for author)
create or replace function public.get_top_stories_by_metric(
  p_metric text default 'views', p_limit integer default 10, p_time_range text default '7d'
)
returns table (story_id uuid, title text, author_name text, metric_value bigint, metric_name text, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_start_ts timestamptz; v_end_ts timestamptz;
begin
  v_end_ts := timezone('utc'::text, now());
  case p_time_range
    when '24h' then v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then v_start_ts := v_end_ts - interval '7 days';
    when '30d' then v_start_ts := v_end_ts - interval '30 days';
    else v_start_ts := v_end_ts - interval '7 days';
  end case;
  if p_metric = 'views' then
    return query
    select s.id, s.title, pr.full_name,
      count(sv.id)::bigint as view_count, 'views'::text, s.created_at
    from public.stories s
    left join public.profiles pr on s.author_id = pr.id
    left join public.story_views sv on s.id = sv.story_id
      and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
    where s.status in ('published')
    group by s.id, s.title, pr.full_name, s.created_at
    order by view_count desc limit p_limit;
  elsif p_metric = 'likes' then
    return query
    select s.id, s.title, pr.full_name,
      count(sl.user_id)::bigint as like_count, 'likes'::text, s.created_at
    from public.stories s
    left join public.profiles pr on s.author_id = pr.id
    left join public.story_likes sl on s.id = sl.story_id
    where s.status in ('published')
    group by s.id, s.title, pr.full_name, s.created_at
    order by like_count desc limit p_limit;
  end if;
end;
$$;

-- get_top_chapters_by_reads
create or replace function public.get_top_chapters_by_reads(
  p_limit integer default 10, p_time_range text default '7d'
)
returns table (chapter_id uuid, story_id uuid, story_title text, chapter_number integer, chapter_title text, read_count integer, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_start_ts timestamptz; v_end_ts timestamptz;
begin
  v_end_ts := timezone('utc'::text, now());
  case p_time_range
    when '24h' then v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then v_start_ts := v_end_ts - interval '7 days';
    when '30d' then v_start_ts := v_end_ts - interval '30 days';
    else v_start_ts := v_end_ts - interval '7 days';
  end case;
  return query
  select c.id, s.id, s.title, c.chapter_number, c.title,
    count(sv.id)::integer as read_count, c.created_at
  from public.chapters c
  join public.stories s on c.story_id = s.id
  left join public.story_views sv on s.id = sv.story_id
    and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where s.status in ('published')
  group by c.id, s.id, s.title, c.chapter_number, c.title, c.created_at
  order by read_count desc limit p_limit;
end;
$$;

-- get_story_completion_rates
create or replace function public.get_story_completion_rates(p_story_id uuid default null)
returns table (story_id uuid, story_title text, total_chapters integer, completion_rate numeric)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  select s.id, s.title,
    count(c.id)::integer as total_chapters,
    round((count(distinct c.id)::numeric / nullif(max(c.chapter_number), 0) * 100)::numeric, 2) as completion_rate
  from public.stories s
  left join public.chapters c on s.id = c.story_id
  where (p_story_id is null or s.id = p_story_id)
    and s.status in ('published')
  group by s.id, s.title
  order by completion_rate desc;
end;
$$;

-- Grant analytics functions
grant execute on function public.get_user_engagement_summary(integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_signup_trend(integer) to authenticated;
grant execute on function public.get_inactive_user_cohort(integer) to authenticated;
grant execute on function public.get_top_stories_by_metric(text, integer, text) to authenticated;
grant execute on function public.get_top_chapters_by_reads(integer, text) to authenticated;
grant execute on function public.get_story_completion_rates(uuid) to authenticated;
grant insert, select on public.analytics_snapshots to authenticated;

-- ==========================================================
-- RLS POLICIES
-- ==========================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.authors enable row level security;
alter table public.categories enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.site_settings enable row level security;
alter table public.story_likes enable row level security;
alter table public.story_views enable row level security;
alter table public.collections enable row level security;
alter table public.collection_stories enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.crawler_sources enable row level security;
alter table public.crawler_runs enable row level security;

alter table public.promotions enable row level security;
alter table public.events enable row level security;
alter table public.transactions enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.revenue_snapshots enable row level security;
alter table public.analytics_snapshots enable row level security;

-- Profiles: select own or staff, update superadmin only
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
drop policy if exists "profiles_update_superadmin_only" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles for select
using (auth.uid() = id or app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));
create policy "profiles_update_superadmin_only" on public.profiles for update
using (app_private.has_role(array['superadmin']::text[]))
with check (app_private.has_role(array['superadmin']::text[]));

-- Authors: public select, staff write
drop policy if exists "authors_select_public" on public.authors;
drop policy if exists "authors_write_staff" on public.authors;
create policy "authors_select_public" on public.authors for select using (true);
create policy "authors_write_staff" on public.authors for all to authenticated
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Categories: public select, staff write
drop policy if exists "categories_select_public" on public.categories;
drop policy if exists "categories_write_staff" on public.categories;
create policy "categories_select_public" on public.categories for select using (true);
create policy "categories_write_staff" on public.categories for all to authenticated
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Stories: V2 RLS — published + ongoing readable, staff write
drop policy if exists "stories_select_public_or_staff" on public.stories;
drop policy if exists "stories_write_staff" on public.stories;
drop policy if exists "read_published_stories" on public.stories;
create policy "read_published_stories" on public.stories for select
using (status in ('published', 'ongoing', 'completed'));
create policy "stories_write_staff" on public.stories for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Chapters: V2 RLS — published chapters public, staff write
drop policy if exists "chapters_select_public_or_staff" on public.chapters;
drop policy if exists "chapters_write_staff" on public.chapters;
drop policy if exists "read_free_chapters" on public.chapters;
create policy "chapters_select_published" on public.chapters for select
using (
  exists (
    select 1 from public.stories s
    where s.id = public.chapters.story_id and s.status = 'published'
  )
);
create policy "chapters_write_staff" on public.chapters for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Site settings: public select, admin write
drop policy if exists "site_settings_select_public" on public.site_settings;
drop policy if exists "site_settings_write_admin" on public.site_settings;
create policy "site_settings_select_public" on public.site_settings for select using (true);
create policy "site_settings_write_admin" on public.site_settings for all
using (app_private.has_role(array['superadmin', 'admin']::text[]))
with check (app_private.has_role(array['superadmin', 'admin']::text[]));

-- Story likes: own CRUD
drop policy if exists "story_likes_select_own" on public.story_likes;
drop policy if exists "story_likes_insert_own" on public.story_likes;
drop policy if exists "story_likes_delete_own" on public.story_likes;
create policy "story_likes_select_own" on public.story_likes for select using (auth.uid() = user_id);
create policy "story_likes_insert_own" on public.story_likes for insert with check (auth.uid() = user_id);
create policy "story_likes_delete_own" on public.story_likes for delete using (auth.uid() = user_id);

-- Story views: self read, admin read all, self insert
drop policy if exists "story_views_self_read" on public.story_views;
drop policy if exists "story_views_admin_read" on public.story_views;
drop policy if exists "story_views_insert_self" on public.story_views;
create policy "story_views_self_read" on public.story_views for select to authenticated using (viewed_by = auth.uid());
create policy "story_views_admin_read" on public.story_views for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superadmin', 'admin')));
create policy "story_views_insert_self" on public.story_views for insert to authenticated
with check (viewed_by = auth.uid());

-- Collections: public select, staff write
drop policy if exists "collections_select_public_or_staff" on public.collections;
drop policy if exists "collections_write_staff" on public.collections;
create policy "collections_select_public_or_staff" on public.collections for select using (true);
create policy "collections_write_staff" on public.collections for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Collection stories: staff only
drop policy if exists "collection_stories_select_staff" on public.collection_stories;
drop policy if exists "collection_stories_write_staff" on public.collection_stories;
create policy "collection_stories_select_staff" on public.collection_stories for select
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));
create policy "collection_stories_write_staff" on public.collection_stories for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Moderation queue: staff
drop policy if exists "moderation_queue_select_staff" on public.moderation_queue;
drop policy if exists "moderation_queue_write_staff" on public.moderation_queue;
create policy "moderation_queue_select_staff" on public.moderation_queue for select
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));
create policy "moderation_queue_write_staff" on public.moderation_queue for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Crawler sources/runs: staff
drop policy if exists "crawler_sources_staff" on public.crawler_sources;
drop policy if exists "crawler_runs_staff" on public.crawler_runs;
create policy "crawler_sources_staff" on public.crawler_sources for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));
create policy "crawler_runs_staff" on public.crawler_runs for all
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]))
with check (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

-- Promotions: public select, admin write
drop policy if exists "promotions_select_public" on public.promotions;
drop policy if exists "promotions_write_staff" on public.promotions;
create policy "promotions_select_public" on public.promotions for select using (true);
create policy "promotions_write_staff" on public.promotions for all
using (app_private.has_role(array['superadmin', 'admin']::text[]))
with check (app_private.has_role(array['superadmin', 'admin']::text[]));

-- Events: public select, admin write
drop policy if exists "events_select_public" on public.events;
drop policy if exists "events_write_staff" on public.events;
create policy "events_select_public" on public.events for select using (true);
create policy "events_write_staff" on public.events for all
using (app_private.has_role(array['superadmin', 'admin']::text[]))
with check (app_private.has_role(array['superadmin', 'admin']::text[]));

-- Transactions: own or staff select, staff write
drop policy if exists "transactions_select_own_or_staff" on public.transactions;
drop policy if exists "transactions_write_staff" on public.transactions;
create policy "transactions_select_own_or_staff" on public.transactions for select
using (user_id = auth.uid() or app_private.has_role(array['superadmin', 'admin']::text[]));
create policy "transactions_write_staff" on public.transactions for all
using (app_private.has_role(array['superadmin', 'admin']::text[]))
with check (app_private.has_role(array['superadmin', 'admin']::text[]));

-- Comments: published stories select, auth insert, owner/admin update/delete
drop policy if exists "comments_select_public" on public.comments;
drop policy if exists "comments_write_own_or_staff" on public.comments;
drop policy if exists "comments_select_published" on public.comments;
drop policy if exists "comments_insert_auth" on public.comments;
drop policy if exists "comments_update_owner_or_admin" on public.comments;
drop policy if exists "comments_delete_owner_or_admin" on public.comments;
create policy "comments_select_published" on public.comments for select
using (exists (select 1 from public.stories s where s.id = public.comments.story_id and s.status = 'published'));
create policy "comments_insert_auth" on public.comments for insert with check (auth.uid() is not null);
create policy "comments_update_owner_or_admin" on public.comments for update
using (user_id = auth.uid() or public.user_has_role(auth.uid(), 'admin') or public.user_has_role(auth.uid(), 'superadmin'));
create policy "comments_delete_owner_or_admin" on public.comments for delete
using (user_id = auth.uid() or public.user_has_role(auth.uid(), 'admin') or public.user_has_role(auth.uid(), 'superadmin'));

-- Ratings: published stories select, auth insert, owner/admin update/delete
drop policy if exists "ratings_select_public" on public.ratings;
drop policy if exists "ratings_write_own_or_staff" on public.ratings;
drop policy if exists "ratings_select_published" on public.ratings;
drop policy if exists "ratings_insert_auth" on public.ratings;
drop policy if exists "ratings_update_owner_or_admin" on public.ratings;
drop policy if exists "ratings_delete_owner_or_admin" on public.ratings;
create policy "ratings_select_published" on public.ratings for select
using (exists (select 1 from public.stories s where s.id = public.ratings.story_id and s.status = 'published'));
create policy "ratings_insert_auth" on public.ratings for insert with check (auth.uid() is not null);
create policy "ratings_update_owner_or_admin" on public.ratings for update
using (user_id = auth.uid() or public.user_has_role(auth.uid(), 'admin') or public.user_has_role(auth.uid(), 'superadmin'));
create policy "ratings_delete_owner_or_admin" on public.ratings for delete
using (user_id = auth.uid() or public.user_has_role(auth.uid(), 'admin') or public.user_has_role(auth.uid(), 'superadmin'));

-- Revenue snapshots: admin
drop policy if exists "revenue_snapshots_staff" on public.revenue_snapshots;
create policy "revenue_snapshots_staff" on public.revenue_snapshots for all
using (app_private.has_role(array['superadmin', 'admin']::text[]))
with check (app_private.has_role(array['superadmin', 'admin']::text[]));

-- Analytics snapshots: admin only
drop policy if exists "analytics_snapshots_admin_only" on public.analytics_snapshots;
create policy "analytics_snapshots_admin_only" on public.analytics_snapshots for all
using (auth.jwt() ->> 'role' in ('superadmin', 'admin'))
with check (auth.jwt() ->> 'role' in ('superadmin', 'admin'));

-- ==========================================================
-- TRIGGERS
-- ==========================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists trg_stories_updated_at on public.stories;
create trigger trg_stories_updated_at before update on public.stories
for each row execute function public.touch_updated_at();
drop trigger if exists trg_chapters_updated_at on public.chapters;
create trigger trg_chapters_updated_at before update on public.chapters
for each row execute function public.touch_updated_at();
drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at before update on public.site_settings
for each row execute function public.touch_updated_at();
drop trigger if exists trg_authors_updated_at on public.authors;
create trigger trg_authors_updated_at before update on public.authors
for each row execute function public.touch_updated_at();
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
for each row execute function public.touch_updated_at();
drop trigger if exists touch_collections_updated_at on public.collections;
create trigger touch_collections_updated_at before update on public.collections
for each row execute function public.touch_updated_at();
drop trigger if exists touch_moderation_queue_updated_at on public.moderation_queue;
create trigger touch_moderation_queue_updated_at before update on public.moderation_queue
for each row execute function public.touch_updated_at();
drop trigger if exists touch_crawler_sources_updated_at on public.crawler_sources;
create trigger touch_crawler_sources_updated_at before update on public.crawler_sources
for each row execute function public.touch_updated_at();
drop trigger if exists touch_crawler_runs_updated_at on public.crawler_runs;
create trigger touch_crawler_runs_updated_at before update on public.crawler_runs
for each row execute function public.touch_updated_at();

drop trigger if exists touch_promotions_updated_at on public.promotions;
create trigger touch_promotions_updated_at before update on public.promotions
for each row execute function public.touch_updated_at();
drop trigger if exists touch_events_updated_at on public.events;
create trigger touch_events_updated_at before update on public.events
for each row execute function public.touch_updated_at();
drop trigger if exists touch_transactions_updated_at on public.transactions;
create trigger touch_transactions_updated_at before update on public.transactions
for each row execute function public.touch_updated_at();
drop trigger if exists touch_comments_updated_at on public.comments;
create trigger touch_comments_updated_at before update on public.comments
for each row execute function public.touch_updated_at();
drop trigger if exists touch_ratings_updated_at on public.ratings;
create trigger touch_ratings_updated_at before update on public.ratings
for each row execute function public.touch_updated_at();
drop trigger if exists touch_revenue_snapshots_updated_at on public.revenue_snapshots;
create trigger touch_revenue_snapshots_updated_at before update on public.revenue_snapshots
for each row execute function public.touch_updated_at();

-- ==========================================================
-- GRANTS
-- ==========================================================

grant usage on schema app_private to postgres, service_role;
revoke all on function app_private.set_user_role(uuid, text) from public;
grant execute on function app_private.set_user_role(uuid, text) to authenticated;

-- ==========================================================
-- SEED DATA
-- ==========================================================

insert into public.site_settings (key, value)
values
  ('ads_enabled', 'true'::jsonb),
  ('home_banner_text', '"Read stories without limits"'::jsonb)
on conflict (key) do update set value = excluded.value;
