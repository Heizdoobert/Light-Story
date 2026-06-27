-- Analytics Dashboard RPC Fixes
-- Adds total_views, total_favorites, enriched top_chapters

-- Returns total views count for a time range
create or replace function public.get_total_views(p_time_range text default '7d')
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.story_views
  where viewed_at >= (
    case p_time_range
      when '24h' then timezone('utc'::text, now()) - interval '24 hours'
      when '30d' then timezone('utc'::text, now()) - interval '30 days'
      else timezone('utc'::text, now()) - interval '7 days'
    end
  );
$$;

-- Returns total favorites count
create or replace function public.get_total_favorites()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.story_likes;
$$;

-- Replaces get_top_chapters_by_reads to add favorite_count
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
  favorite_count integer,
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
    count(distinct sv.id)::integer as read_count,
    count(distinct sl.user_id)::integer as favorite_count,
    c.created_at
  from public.chapters c
  join public.stories s on c.story_id = s.id
  left join public.story_views sv on s.id = sv.story_id
    and sv.viewed_at >= v_start_ts and sv.viewed_at < v_end_ts
  left join public.story_likes sl on s.id = sl.story_id
  where s.status in ('ongoing', 'completed')
  group by c.id, s.id, s.title, c.chapter_number, c.title, c.created_at
  order by read_count desc
  limit p_limit;
end;
$$;

grant execute on function public.get_total_views(text) to authenticated;
grant execute on function public.get_total_favorites() to authenticated;
grant execute on function public.get_top_chapters_by_reads(integer, text) to authenticated;
