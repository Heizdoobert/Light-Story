-- SQL Test: Verify superadmin helpers and RLS behavior
-- Run in Supabase SQL editor to validate that helpers work and superadmin bypasses restrictions

-- 1. Test isSuperadmin() helper
SELECT 
  'Test: isSuperadmin() helper' as test,
  public.is_superadmin('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid) as result_should_be_false,
  'Helper should return false for non-existent user' as note;

-- 2. Test is_admin_or_higher() helper
SELECT 
  'Test: is_admin_or_higher() helper' as test,
  public.is_admin_or_higher('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid) as result_should_be_false,
  'Helper should return false for non-existent user' as note;

-- 3. Verify published chapter RLS for current auth user
SELECT 
  'Test: Published chapter visibility' as test,
  COUNT(ch.id) as published_chapters_visible,
  'All published chapters should be visible' as note
FROM public.chapters ch
WHERE EXISTS (
  SELECT 1 FROM public.stories s
  WHERE s.id = ch.story_id AND s.status = 'published'
);

-- 4. Run full RLS policy check for current auth user
SELECT 
  'Test: Current user role and RLS access' as test,
  p.id as user_id,
  p.role as user_role,
  COUNT(DISTINCT ch.id) as total_chapters_visible
FROM public.profiles p
LEFT JOIN public.chapters ch ON EXISTS (
  SELECT 1 FROM public.stories s
  WHERE s.id = ch.story_id AND s.status = 'published'
)
WHERE p.id = auth.uid()
GROUP BY p.id, p.role;
