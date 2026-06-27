-- RLS Policy Tests for Comic Platform
-- Test file for verifying RLS policies on stories and chapters

-- Setup: Create test user roles
BEGIN;

-- Test: Public user can read published stories
SELECT * FROM public.stories
WHERE status = 'published'
LIMIT 1;
-- Expected: Rows returned

-- Test: Public user cannot read draft stories
SELECT * FROM public.stories
WHERE status = 'draft'
LIMIT 1;
-- Expected: No rows (access denied by RLS)

-- Test: Public user can read published chapters
SELECT * FROM public.chapters
WHERE EXISTS (
  SELECT 1 FROM public.stories s
  WHERE s.id = public.chapters.story_id AND s.status = 'published'
)
LIMIT 1;
-- Expected: Rows returned

-- Test: Search RPC is accessible
SELECT * FROM public.search_stories(
  '[0.1, 0.2, 0.3]'::vector,
  10
);
-- Expected: Results based on search vector

ROLLBACK;
