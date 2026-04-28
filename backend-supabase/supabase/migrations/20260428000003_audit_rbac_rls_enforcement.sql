-- Audit: Verify RLS enforcement on all admin-accessible tables
-- This ensures client-side RBAC bypass via state modification cannot access data.
-- All admin operations require:
-- 1. Role must be in app_metadata (not user_metadata)
-- 2. RLS policies must check role via profiles table
-- 3. No policies should allow read-all ('select true') except for public_* settings

-- Verify critical admin tables have RLS enabled
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where tablename in (
  'profiles',
  'stories',
  'site_settings',
  'admin_audit_logs',
  'admin_user_operations',
  'dashboard_access_logs'
) and schemaname = 'public'
order by tablename;

-- List all policies for admin-relevant tables
select
  schemaname,
  tablename,
  policyname,
  qual as policy_condition,
  with_check
from pg_policies
where tablename in (
  'profiles',
  'stories',
  'site_settings',
  'admin_audit_logs',
  'admin_user_operations',
  'dashboard_access_logs'
)
order by tablename, policyname;

-- Verify no overly-permissive policies exist
select
  schemaname,
  tablename,
  policyname,
  'WARNING: Overly permissive' as issue
from pg_policies
where tablename in (
  'profiles',
  'stories',
  'site_settings',
  'admin_audit_logs',
  'admin_user_operations',
  'dashboard_access_logs'
) and (
  qual = 'true' or
  with_check = 'true'
)
order by tablename, policyname;
