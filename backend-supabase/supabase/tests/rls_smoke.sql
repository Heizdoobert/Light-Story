-- Smoke tests for Row Level Security (RLS) policies
-- Verifies that critical RLS policies exist on all protected tables

-- profiles table: users can read own profile or staff can read all
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'profiles'
      and policyname = 'profiles_select_own_or_staff'
  ),
  'profiles_select_own_or_staff policy should exist'
);

-- profiles table: users can only update non-privileged fields on own profile
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'profiles'
      and policyname = 'profiles_update_own_non_privileged'
  ),
  'profiles_update_own_non_privileged policy should exist'
);

-- stories table: public or staff can read published stories
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'stories'
      and policyname = 'stories_select_public_or_staff'
  ),
  'stories_select_public_or_staff policy should exist'
);

-- stories table: only staff can write stories
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'stories'
      and policyname = 'stories_write_staff'
  ),
  'stories_write_staff policy should exist'
);

-- chapters table: public or staff can read published chapters
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'chapters'
      and policyname = 'chapters_select_public_or_staff'
  ),
  'chapters_select_public_or_staff policy should exist'
);

-- chapters table: only staff can write chapters
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'chapters'
      and policyname = 'chapters_write_staff'
  ),
  'chapters_write_staff policy should exist'
);

-- site_settings table: everyone can read settings
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'site_settings'
      and policyname = 'site_settings_select_public'
  ),
  'site_settings_select_public policy should exist'
);

-- site_settings table: only admins can write settings
select tests.ok(
  exists(
    select 1 from pg_policies
    where tablename = 'site_settings'
      and policyname = 'site_settings_write_admin'
  ),
  'site_settings_write_admin policy should exist'
);
