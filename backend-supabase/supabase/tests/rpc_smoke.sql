-- RPC smoke tests: core helper functions must exist and behave
select plan(10);

select ok(
  exists(select 1 from pg_proc where proname = 'is_superadmin' and pronamespace = 'public'::regnamespace),
  'is_superadmin function exists'
);
select ok(
  exists(select 1 from pg_proc where proname = 'is_admin_or_higher' and pronamespace = 'public'::regnamespace),
  'is_admin_or_higher function exists'
);
select ok(
  exists(select 1 from pg_proc where proname = 'can_read_chapter' and pronamespace = 'public'::regnamespace),
  'can_read_chapter function exists'
);
select ok(
  exists(select 1 from pg_proc where proname = 'increment_story_views' and pronamespace = 'public'::regnamespace),
  'increment_story_views function exists'
);
select ok(
  exists(select 1 from pg_proc where proname = 'toggle_story_like' and pronamespace = 'public'::regnamespace),
  'toggle_story_like function exists'
);
select ok(
  exists(select 1 from pg_proc where proname = 'get_operations_table_counts' and pronamespace = 'public'::regnamespace),
  'get_operations_table_counts function exists'
);
select ok(
  exists(select 1 from pg_proc where proname = 'set_user_role_service' and pronamespace = 'app_private'::regnamespace),
  'app_private.set_user_role_service function exists'
);

-- is_superadmin returns false for a non-existent user
select is(
  public.is_superadmin('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid),
  false,
  'is_superadmin returns false for non-existent user'
);
-- is_admin_or_higher returns false for a non-existent user
select is(
  public.is_admin_or_higher('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid),
  false,
  'is_admin_or_higher returns false for non-existent user'
);
-- get_operations_table_counts returns a rowset without erroring
select ok(
  (select count(*) > 0 from public.get_operations_table_counts()),
  'get_operations_table_counts returns rows'
);

select * from finish();
