-- Fix datatype mismatch: sum(count(*)) returns numeric, but function expects bigint
drop function if exists public.get_signup_trend cascade;

create function public.get_signup_trend(
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
    (sum(count(*)) over (order by date_trunc('day', p.created_at)))::bigint as cumulative_users
  from public.profiles p
  where p.created_at >= timezone('utc'::text, now()) - (p_days_back || ' days')::interval
  group by date_trunc('day', p.created_at)
  order by date_trunc('day', p.created_at) asc;
end;
$$;

grant execute on function public.get_signup_trend(integer) to authenticated;
revoke all on function public.get_signup_trend(integer) from public;
