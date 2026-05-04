-- Smoke tests for RPC (Remote Procedure Call) database functions
-- Verifies that critical functions are registered and accessible

-- increment_story_views: idempotent view counting via request_id deduplication
select tests.ok(
  exists(
    select 1 from pg_proc where proname = 'increment_story_views'
  ),
  'increment_story_views function should exist'
);

-- toggle_story_like: authenticated users can like/unlike stories
select tests.ok(
  exists(
    select 1 from pg_proc where proname = 'toggle_story_like'
  ),
  'toggle_story_like function should exist'
);

-- handle_new_user: trigger function that provisions profile on signup
select tests.ok(
  exists(
    select 1 from pg_proc
    where proname = 'handle_new_user'
      and pronamespace = (select oid from pg_namespace where nspname = 'app_private')
  ),
  'app_private.handle_new_user trigger function should exist'
);

-- get_current_profile: security-definer function to return authenticated user profile
select tests.ok(
  exists(
    select 1 from pg_proc
    where proname = 'get_current_profile'
      and pronamespace = (select oid from pg_namespace where nspname = 'app_private')
  ),
  'app_private.get_current_profile function should exist'
);

-- set_user_role: privileged function for role management restricted to service role
select tests.ok(
  exists(
    select 1 from pg_proc
    where proname = 'set_user_role'
      and pronamespace = (select oid from pg_namespace where nspname = 'app_private')
  ),
  'app_private.set_user_role function should exist'
);
