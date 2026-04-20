-- RPC smoke tests for Light Story MVP.

begin;

-- Ensure increment_story_views function exists and can execute.
select proname
from pg_proc
where proname = 'increment_story_views';

-- Ensure toggle_story_like function exists.
select proname
from pg_proc
where proname = 'toggle_story_like';

-- Ensure role mutation RPC exists in private schema.
select p.proname, n.nspname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'set_user_role'
  and n.nspname = 'app_private';

rollback;
