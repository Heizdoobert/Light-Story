-- Harden analytics RPCs: require authenticated staff roles and remove PUBLIC execute.

revoke all on function public.get_user_engagement_summary(text, timestamptz, timestamptz) from public;
revoke all on function public.get_signup_trend(integer) from public;
revoke all on function public.get_inactive_user_cohort(integer) from public;
revoke all on function public.get_top_stories_by_metric(text, integer, text) from public;
revoke all on function public.get_top_chapters_by_reads(integer, text) from public;
revoke all on function public.get_story_completion_rates(uuid) from public;

grant execute on function public.get_user_engagement_summary(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_signup_trend(integer) to authenticated;
grant execute on function public.get_inactive_user_cohort(integer) to authenticated;
grant execute on function public.get_top_stories_by_metric(text, integer, text) to authenticated;
grant execute on function public.get_top_chapters_by_reads(integer, text) to authenticated;
grant execute on function public.get_story_completion_rates(uuid) to authenticated;

create or replace function public.get_user_engagement_summary(
  p_time_range text default '24h',
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_prev_start_ts timestamptz;
  v_prev_end_ts timestamptz;
  v_dau integer;
  v_wau integer;
  v_mau integer;
  v_prev_dau integer;
  v_signups integer;
  v_churn_rate numeric;
  v_result jsonb;
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_end_ts := coalesce(p_end_date, timezone('utc'::text, now()));

  case p_time_range
    when '24h' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '24 hours');
      v_prev_start_ts := v_start_ts - interval '24 hours';
      v_prev_end_ts := v_start_ts;
    when '7d' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '7 days');
      v_prev_start_ts := v_start_ts - interval '7 days';
      v_prev_end_ts := v_start_ts;
    when '30d' then
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '30 days');
      v_prev_start_ts := v_start_ts - interval '30 days';
      v_prev_end_ts := v_start_ts;
    else
      v_start_ts := coalesce(p_start_date, v_end_ts - interval '24 hours');
      v_prev_start_ts := v_start_ts - interval '24 hours';
      v_prev_end_ts := v_start_ts;
  end case;

  select count(distinct viewed_by)
  into v_dau
  from public.story_views
  where viewed_at >= v_start_ts and viewed_at < v_end_ts;

  select count(distinct viewed_by)
  into v_wau
  from public.story_views
  where viewed_at >= (v_end_ts - interval '7 days') and viewed_at < v_end_ts;

  select count(distinct viewed_by)
  into v_mau
  from public.story_views
  where viewed_at >= (v_end_ts - interval '30 days') and viewed_at < v_end_ts;

  select count(distinct viewed_by)
  into v_prev_dau
  from public.story_views
  where viewed_at >= v_prev_start_ts and viewed_at < v_prev_end_ts;

  select count(*)
  into v_signups
  from public.profiles
  where created_at >= v_start_ts and created_at < v_end_ts;

  select round(
    (count(distinct id) - count(distinct viewed_by))::numeric /
    nullif(count(distinct id), 0) * 100, 2
  )
  into v_churn_rate
  from public.profiles p
  left join public.story_views sv on p.id = sv.viewed_by and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where p.created_at < v_end_ts;

  v_result := jsonb_build_object(
    'dau', coalesce(v_dau, 0),
    'wau', coalesce(v_wau, 0),
    'mau', coalesce(v_mau, 0),
    'dau_change', case when v_prev_dau > 0 then round(((v_dau::numeric - v_prev_dau) / v_prev_dau * 100)::numeric, 2) else null end,
    'new_signups', coalesce(v_signups, 0),
    'churn_rate_pct', coalesce(v_churn_rate, 0),
    'time_range', p_time_range,
    'period_start', v_start_ts::text,
    'period_end', v_end_ts::text
  );

  return v_result;
end;
$$;

create or replace function public.get_signup_trend(
  p_days_back integer default 30
)
returns table (
  signup_date date,
  new_users integer,
  cumulative_users bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    date_trunc('day', p.created_at)::date as signup_date,
    count(*)::integer as new_users,
    sum(count(*)) over (order by date_trunc('day', p.created_at)) as cumulative_users
  from public.profiles p
  where p.created_at >= timezone('utc'::text, now()) - (p_days_back || ' days')::interval
  group by date_trunc('day', p.created_at)
  order by date_trunc('day', p.created_at) asc;
end;
$$;

create or replace function public.get_inactive_user_cohort(
  p_inactive_days integer default 7
)
returns table (
  user_id uuid,
  user_email text,
  user_role text,
  last_activity_at timestamptz,
  days_inactive integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.email,
    p.role,
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

create or replace function public.get_top_stories_by_metric(
  p_metric text default 'views',
  p_limit integer default 10,
  p_time_range text default '7d'
)
returns table (
  story_id uuid,
  title text,
  author text,
  metric_value bigint,
  metric_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_end_ts := timezone('utc'::text, now());

  case p_time_range
    when '24h' then
      v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then
      v_start_ts := v_end_ts - interval '7 days';
    when '30d' then
      v_start_ts := v_end_ts - interval '30 days';
    else
      v_start_ts := v_end_ts - interval '7 days';
  end case;

  if p_metric = 'views' then
    return query
    select
      s.id,
      s.title,
      s.author,
      count(sv.id)::bigint as view_count,
      'views'::text,
      s.created_at
    from public.stories s
    left join public.story_views sv on s.id = sv.story_id
      and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
    where s.status in ('ongoing', 'completed')
    group by s.id, s.title, s.author, s.created_at
    order by view_count desc
    limit p_limit;
  elsif p_metric = 'likes' then
    return query
    select
      s.id,
      s.title,
      s.author,
      count(sl.user_id)::bigint as like_count,
      'likes'::text,
      s.created_at
    from public.stories s
    left join public.story_likes sl on s.id = sl.story_id
    where s.status in ('ongoing', 'completed')
    group by s.id, s.title, s.author, s.created_at
    order by like_count desc
    limit p_limit;
  end if;
end;
$$;

create or replace function public.get_top_chapters_by_reads(
  p_limit integer default 10,
  p_time_range text default '7d'
)
returns table (
  chapter_id uuid,
  story_id uuid,
  story_title text,
  chapter_number integer,
  chapter_title text,
  read_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_ts timestamptz;
  v_end_ts timestamptz;
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_end_ts := timezone('utc'::text, now());

  case p_time_range
    when '24h' then
      v_start_ts := v_end_ts - interval '24 hours';
    when '7d' then
      v_start_ts := v_end_ts - interval '7 days';
    when '30d' then
      v_start_ts := v_end_ts - interval '30 days';
    else
      v_start_ts := v_end_ts - interval '7 days';
  end case;

  return query
  select
    c.id,
    s.id,
    s.title,
    c.chapter_number,
    c.title,
    count(sv.id)::integer as read_count,
    c.created_at
  from public.chapters c
  join public.stories s on c.story_id = s.id
  left join public.story_views sv on s.id = sv.story_id
    and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  where s.status in ('ongoing', 'completed')
  group by c.id, s.id, s.title, c.chapter_number, c.title, c.created_at
  order by read_count desc
  limit p_limit;
end;
$$;

create or replace function public.get_story_completion_rates(
  p_story_id uuid default null
)
returns table (
  story_id uuid,
  story_title text,
  total_chapters integer,
  completion_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.title,
    count(c.id)::integer as total_chapters,
    round((count(distinct c.id)::numeric / nullif(max(c.chapter_number), 0) * 100)::numeric, 2) as completion_rate
  from public.stories s
  left join public.chapters c on s.id = c.story_id
  where (p_story_id is null or s.id = p_story_id)
    and s.status in ('ongoing', 'completed')
  group by s.id, s.title
  order by completion_rate desc;
end;
$$;
