-- Public reading interface: chapters RLS policies subquery stories as the
-- querying role (anon/authenticated), so both tables need explicit SELECT
-- grants. Fresh migration replays lacked them (permission denied for table
-- stories, code 42501) — existing environments only worked via dashboard-era
-- default grants.

grant select on public.stories to anon, authenticated;
grant select on public.chapters to anon, authenticated;
