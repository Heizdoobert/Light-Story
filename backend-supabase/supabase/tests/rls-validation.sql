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

-- 3. Test is_premium_or_higher() helper
SELECT 
  'Test: is_premium_or_higher() helper' as test,
  public.is_premium_or_higher('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid) as result_should_be_false,
  'Helper should return false for non-existent user' as note;

-- 4. Verify VIP chapter RLS now includes superadmin
-- (If a superadmin user exists in profiles, this demonstrates the updated policy)
SELECT 
  'Test: VIP chapter policy includes superadmin' as test,
  COUNT(c.id) as vip_chapters_visible,
  'If user is superadmin and VIP chapters exist, this count should be > 0' as note
FROM public.chapters c
WHERE 
  c.vip_content = true
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('premium', 'admin', 'superadmin')
  )
LIMIT 1;

-- 5. Run full RLS policy check for current auth user
SELECT 
  'Test: Current user role and RLS access' as test,
  p.id as user_id,
  p.role as user_role,
  COUNT(DISTINCT CASE WHEN ch.vip_content = FALSE THEN ch.id END) as free_chapters_visible,
  COUNT(DISTINCT CASE WHEN ch.vip_content = TRUE THEN ch.id END) as vip_chapters_visible
FROM public.profiles p
LEFT JOIN public.chapters ch ON 1=1
  AND (
    (ch.vip_content = FALSE 
      AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = ch.story_id AND s.status = 'published'))
    OR
    (ch.vip_content = TRUE 
      AND EXISTS (SELECT 1 FROM public.profiles pp WHERE pp.id = auth.uid() AND pp.role IN ('premium', 'admin', 'superadmin')))
  )
WHERE p.id = auth.uid()
GROUP BY p.id, p.role;
