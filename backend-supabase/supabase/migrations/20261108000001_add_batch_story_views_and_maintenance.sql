-- ============================================================================
-- Migration: High-Availability Architecture, Hot Counters & Maintenance
-- File: 20261108000001_add_batch_story_views_and_maintenance.sql
-- ============================================================================

-- 1. Optimize touch_updated_at Trigger
-- Do not bump updated_at if only views or like_count changed.
-- Prevents index churn on idx_stories_status_updated_id and avoids falsely promoting
-- viewed stories to the top of "recently updated" catalog feeds.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'stories' then
    if (old.title is not distinct from new.title)
       and (old.author is not distinct from new.author)
       and (old.description is not distinct from new.description)
       and (old.cover_url is not distinct from new.cover_url)
       and (old.category is not distinct from new.category)
       and (old.status is not distinct from new.status)
       and (old.tags is not distinct from new.tags)
       and ((old.views is distinct from new.views) or (old.like_count is distinct from new.like_count)) then
      new.updated_at = old.updated_at;
      return new;
    end if;
  end if;

  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- 2. Enhanced increment_story_views supporting batch increments (inc)
create or replace function public.increment_story_views(
  story_id_param uuid,
  inc bigint default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  step bigint;
begin
  step := coalesce(inc, 1);
  if step <= 0 then
    return;
  end if;

  current_user_id := auth.uid();

  -- If anonymous or bulk sync (>1), increment views directly without session lock
  if current_user_id is null or step > 1 then
    update public.stories
    set views = views + step
    where id = story_id_param;
    return;
  end if;

  -- For single authenticated view, track hourly view session
  insert into public.story_views (story_id, viewed_by)
  values (story_id_param, current_user_id)
  on conflict do nothing;

  update public.stories
  set views = views + step
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

grant execute on function public.increment_story_views(uuid, bigint) to anon, authenticated, service_role;

-- 3. High-throughput Batch Views Increment RPC
-- Updates multiple stories in a single SQL round-trip: payload = {"<story_id>": count, ...}
create or replace function public.batch_increment_story_views(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if payload is null or jsonb_typeof(payload) != 'object' then
    return;
  end if;

  update public.stories s
  set views = s.views + (kv.value::bigint)
  from jsonb_each_text(payload) kv
  where s.id = kv.key::uuid
    and (kv.value ~ '^[0-9]+$')
    and (kv.value::bigint > 0);
end;
$$;

grant execute on function public.batch_increment_story_views(jsonb) to anon, authenticated, service_role;

-- 4. Materialized View for High-Scale Catalog & Tag Searching
create materialized view if not exists public.mv_story_catalog_search as
select
  s.id,
  s.slug,
  s.title,
  coalesce(a.name, s.author) as author_name,
  coalesce(c.name, s.category) as category_name,
  s.cover_url,
  s.status,
  s.views,
  s.like_count,
  s.created_at,
  s.updated_at,
  case
    when s.tags is not null and s.tags <> '' then
      string_to_array(lower(replace(s.tags, ' ', '')), ',')
    else array[]::text[]
  end as tag_list,
  setweight(to_tsvector('simple', coalesce(s.title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(a.name, s.author, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(s.tags, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(s.description, '')), 'D') as search_tsv
from public.stories s
left join public.authors a on a.id = s.author_id
left join public.categories c on c.id = s.category_id
where s.status in ('published', 'ongoing', 'completed');

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
create unique index if not exists uq_mv_story_catalog_id
  on public.mv_story_catalog_search (id);

-- GIN Full-Text Search and Array tag indices
create index if not exists idx_mv_story_tsv
  on public.mv_story_catalog_search using gin (search_tsv);

create index if not exists idx_mv_story_tags
  on public.mv_story_catalog_search using gin (tag_list);

create index if not exists idx_mv_story_title_trgm
  on public.mv_story_catalog_search using gin (title gin_trgm_ops);

-- Keyset & Sorting indices on materialized view
create index if not exists idx_mv_story_views_id
  on public.mv_story_catalog_search (views desc, id desc);

create index if not exists idx_mv_story_updated_id
  on public.mv_story_catalog_search (updated_at desc, id desc);

-- Helper RPC to refresh view safely
create or replace function public.refresh_mv_story_catalog()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.mv_story_catalog_search;
end;
$$;

grant execute on function public.refresh_mv_story_catalog() to authenticated, service_role;

-- 5. Index Bloat & Health Inspection RPC
create or replace function public.get_index_health_report()
returns table (
  schema_name text,
  table_name text,
  index_name text,
  index_size text,
  index_bytes bigint,
  index_scans bigint,
  is_unused boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    s.schemaname::text as schema_name,
    s.relname::text as table_name,
    s.indexrelname::text as index_name,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
    pg_relation_size(s.indexrelid) as index_bytes,
    s.idx_scan as index_scans,
    (s.idx_scan = 0 and not i.indisunique and not i.indisprimary) as is_unused
  from pg_stat_user_indexes s
  join pg_index i on i.indexrelid = s.indexrelid
  where s.schemaname = 'public'
  order by pg_relation_size(s.indexrelid) desc;
$$;

grant execute on function public.get_index_health_report() to authenticated, service_role;
