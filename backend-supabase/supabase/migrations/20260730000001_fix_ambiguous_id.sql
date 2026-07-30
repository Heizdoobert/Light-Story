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
    (count(distinct p.id) - count(distinct viewed_by))::numeric /
    nullif(count(distinct p.id), 0) * 100, 2
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

grant execute on function public.get_user_engagement_summary(text, timestamptz, timestamptz) to authenticated;
revoke all on function public.get_user_engagement_summary(text, timestamptz, timestamptz) from public;
