-- Add integer overload for get_user_engagement_summary to maintain compatibility with p_days_back calls
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
  v_time_range text;
begin
  if not app_private.has_role(array['superadmin', 'admin', 'employee']::text[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_time_range := coalesce(p_days_back || 'd', '30d');
  return public.get_user_engagement_summary(
    p_time_range => v_time_range,
    p_start_date => p_start_date,
    p_end_date => p_end_date
  );
end;
$$;

grant execute on function public.get_user_engagement_summary(integer, timestamptz, timestamptz) to authenticated;
revoke all on function public.get_user_engagement_summary(integer, timestamptz, timestamptz) from public;
