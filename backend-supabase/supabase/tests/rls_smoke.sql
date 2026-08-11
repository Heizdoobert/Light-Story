-- RLS smoke tests: schema objects and key policies that migrations must create
select plan(22);

-- Core tables exist
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles'),
  'profiles table exists'
);
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'stories'),
  'stories table exists'
);
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'chapters'),
  'chapters table exists'
);
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'audit_logs'),
  'audit_logs table exists'
);
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'genres'),
  'genres table exists'
);
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'tags'),
  'tags table exists'
);

-- RLS enabled on user-facing tables
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles' and rowsecurity),
  'RLS enabled on profiles'
);
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'stories' and rowsecurity),
  'RLS enabled on stories'
);
select ok(
  exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'chapters' and rowsecurity),
  'RLS enabled on chapters'
);

-- Critical policies exist
select ok(
  exists(select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_select_own_or_staff'),
  'profiles_select_own_or_staff policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'stories' and policyname = 'stories_select_public_or_staff'),
  'stories_select_public_or_staff policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'stories' and policyname = 'stories_write_staff'),
  'stories_write_staff policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'chapters' and policyname = 'chapters_select_public_or_staff'),
  'chapters_select_public_or_staff policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'chapters' and policyname = 'chapters_write_staff'),
  'chapters_write_staff policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'bookmarks' and policyname = 'Users can manage own bookmarks'),
  'bookmarks own-row policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'reading_history' and policyname = 'Users can manage own reading history'),
  'reading_history own-row policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'genres' and policyname = 'genres_select_public'),
  'genres_select_public policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'tags' and policyname = 'tags_select_public'),
  'tags_select_public policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'audit_logs_select_staff'),
  'audit_logs_select_staff policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'audit_logs_insert_staff'),
  'audit_logs_insert_staff policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'comments' and policyname = 'comments_select_public'),
  'comments_select_public policy exists'
);
select ok(
  exists(select 1 from pg_policies where tablename = 'ratings' and policyname = 'ratings_select_public'),
  'ratings_select_public policy exists'
);

select * from finish();
