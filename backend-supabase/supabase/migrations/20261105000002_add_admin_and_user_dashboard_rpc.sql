-- Migration: 20261105000002_add_admin_and_user_dashboard_rpc.sql
-- Light Story High-Performance Dashboard RPCs & Security Hardening

-- 1. Security Hardening: Patch Privilege Escalation on User Signup
-- Invariant: Self-signup ALWAYS assigns 'user' role regardless of raw_user_meta_data.
-- Role promotion to staff/superadmin is strictly restricted to app_private.set_user_role_service.
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

-- 2. High-Performance Admin Dashboard Summary RPC
-- Replaces sequential 7+ HTTP roundtrips and 100k views reduce with a single atomic query in PostgreSQL.
create or replace function public.get_admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_stats jsonb;
  v_recent_stories jsonb;
  v_recent_settings jsonb;
begin
  -- Enforce staff role authorization
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'FORBIDDEN: Insufficient permissions for dashboard telemetry';
  end if;

  -- 1. Atomic aggregation query for core metrics
  select jsonb_build_object(
    'totalStories', (select count(*) from public.stories),
    'totalChapters', (select count(*) from public.chapters),
    'activeStories', (select count(*) from public.stories where status not in ('draft', 'archived')),
    'totalViews',    (select coalesce(sum(views), 0)::bigint from public.stories)
  ) into v_stats;

  -- 2. Recent stories (limit 5)
  select coalesce(jsonb_agg(s), '[]'::jsonb)
  into v_recent_stories
  from (
    select id, title, author, views, like_count, status, created_at
    from public.stories
    order by created_at desc
    limit 5
  ) s;

  -- 3. Recent settings updates with masked PII for non-superadmins
  select coalesce(jsonb_agg(l), '[]'::jsonb)
  into v_recent_settings
  from (
    select
      a.id,
      a.action,
      case 
        when app_private.has_role(array['superadmin']::text[]) then p.email
        when p.email is not null and position('@' in p.email) > 0 then
          concat(substr(p.email, 1, 3), '***@', split_part(p.email, '@', 2))
        else null
      end as actor_email,
      p.full_name as actor_name,
      a.metadata,
      a.created_at
    from public.admin_audit_logs a
    left join public.profiles p on a.actor_user_id = p.id
    where a.action = 'settings_update'
    order by a.created_at desc
    limit 10
  ) l;

  return jsonb_build_object(
    'stats', v_stats,
    'stories', v_recent_stories,
    'recentSettingsChanges', v_recent_settings
  );
end;
$$;

revoke all on function public.get_admin_dashboard_summary() from public, anon;
grant execute on function public.get_admin_dashboard_summary() to authenticated;

-- 3. High-Performance User Reading Progress RPC
-- Computes real-time progress percentage using B-Tree index idx_reading_history_user_updated
create or replace function public.get_user_reading_progress(p_user_id uuid)
returns table (
  comic_id uuid,
  title text,
  cover_url text,
  last_read_chapter_id text,
  last_read_chapter_number int,
  total_chapters bigint,
  progress_percent int,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    rh.comic_id,
    s.title,
    s.cover_url,
    rh.chapter_id as last_read_chapter_id,
    rh.chapter_number as last_read_chapter_number,
    coalesce(c_count.total, 0) as total_chapters,
    case
      when coalesce(c_count.total, 0) = 0 then 0
      else least(100, greatest(0, round((rh.chapter_number::numeric / c_count.total::numeric) * 100)))::int
    end as progress_percent,
    rh.updated_at
  from public.reading_history rh
  inner join public.stories s on s.id = rh.comic_id
  left join lateral (
    select count(*) as total
    from public.chapters c
    where c.story_id = rh.comic_id
  ) c_count on true
  where rh.user_id = p_user_id
  order by rh.updated_at desc
  limit 20;
$$;

revoke all on function public.get_user_reading_progress(uuid) from public, anon;
grant execute on function public.get_user_reading_progress(uuid) to authenticated;
