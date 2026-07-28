-- Drop the fragile dynamic-SQL version
drop function if exists public.get_table_counts(text[]);

-- Return live row counts for known admin ops tables (bypass RLS via SECURITY DEFINER)
create or replace function public.get_operations_table_counts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'collections',         (select count(*) from collections),
    'collection_stories',  (select count(*) from collection_stories),
    'moderation_queue',    (select count(*) from moderation_queue),
    'comments',            (select count(*) from comments),
    'ratings',             (select count(*) from ratings),
    'crawler_sources',     (select count(*) from crawler_sources),
    'crawler_runs',        (select count(*) from crawler_runs),
    'promotions',          (select count(*) from promotions),
    'events',              (select count(*) from events),
    'transactions',        (select count(*) from transactions),
    'revenue_snapshots',   (select count(*) from revenue_snapshots)
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_operations_table_counts() to authenticated;
