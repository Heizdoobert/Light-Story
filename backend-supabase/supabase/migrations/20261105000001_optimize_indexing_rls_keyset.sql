-- ============================================================================
-- Migration: P0 Performance & Security Migration (Sprint 6)
-- File: 20261105000001_optimize_indexing_rls_keyset.sql
-- Target Scale: 100,000+ Records
--
-- Objectives:
-- 1. RLS Query Plan Optimization:
--    Wrap auth.uid() inside a subquery `(SELECT auth.uid())` across engagement
--    tables (reading_history, bookmarks, ratings). This forces PostgreSQL's query
--    planner to treat the authentication identity check as an InitPlan executed
--    once per query (O(1)) rather than evaluating auth.uid() per-row (O(N)),
--    preventing severe latency and CPU saturation at 100k+ records.
--
-- 2. Role Function Volatility:
--    Ensure role validation functions (such as app_private.has_role) are marked
--    STABLE. STABLE functions guarantee consistent results within a single query
--    scan and allow the optimizer to cache results across rows.
--
-- 3. Partial B-Tree Indexes for Story Catalogs & Keyset (Cursor) Pagination:
--    Index active/public stories ('published', 'ongoing', 'completed') using composite
--    (updated_at DESC, id DESC) and (views DESC, id DESC). This optimizes high-traffic
--    catalog feeds and deterministic keyset pagination without indexing archived/draft
--    records, keeping index size small and memory-resident.
--
-- 4. Reverse Chapter Ordering Index:
--    Index chapters with (story_id, chapter_number DESC) to enable fast O(1)
--    retrieval of the latest chapters without requiring runtime in-memory sorting.
--
-- 5. User Engagement Composite Indexes:
--    Composite B-Tree indexes on reading_history (user_id, updated_at DESC) and
--    bookmarks (user_id, created_at DESC) to ensure instantaneous personal history
--    and saved bookmark lookups.
-- ============================================================================

-- ============================================================================
-- PART 1: Optimize Role Verification Functions & RLS InitPlan Execution
-- ============================================================================

-- 1.1 Safe type definition for app_role if defined in target Supabase environments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'employee', 'user', 'haunt');
  END IF;
END $$;

-- 1.2 Mark role checking functions as STABLE
-- STABLE tells PostgreSQL that the function cannot modify the database and that
-- within a single statement it will consistently return the same result for the
-- same arguments, enabling plan caching and InitPlan evaluation.
ALTER FUNCTION IF EXISTS app_private.has_role(uuid, app_role) STABLE;
ALTER FUNCTION IF EXISTS app_private.has_role(text[]) STABLE;

-- 1.3 Table: public.reading_history
-- RLS Policy: Wrap auth.uid() in (SELECT auth.uid()) for InitPlan O(1)
DROP POLICY IF EXISTS "Users can manage own reading history" ON public.reading_history;
CREATE POLICY "Users can manage own reading history"
  ON public.reading_history
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 1.4 Table: public.bookmarks
-- RLS Policy: Wrap auth.uid() in (SELECT auth.uid()) for InitPlan O(1)
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks"
  ON public.bookmarks
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 1.5 Table: public.ratings
-- RLS Policies: Wrap auth.uid() in (SELECT auth.uid()) for InitPlan O(1)

-- Allow public to select visible ratings, or users to select their own ratings
DROP POLICY IF EXISTS "ratings_select_public" ON public.ratings;
CREATE POLICY "ratings_select_public"
  ON public.ratings
  FOR SELECT
  USING (
    status = 'visible'
    OR user_id = (SELECT auth.uid())
  );

-- Allow users to manage own ratings, or staff to moderate
DROP POLICY IF EXISTS "ratings_write_own_or_staff" ON public.ratings;
CREATE POLICY "ratings_write_own_or_staff"
  ON public.ratings
  FOR ALL
  USING (
    user_id = (SELECT auth.uid())
    OR app_private.has_role(ARRAY['superadmin', 'admin', 'employee']::text[])
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR app_private.has_role(ARRAY['superadmin', 'admin', 'employee']::text[])
  );

-- Additional granular update policy if present from hardening migrations
DROP POLICY IF EXISTS "ratings_update_owner_or_admin" ON public.ratings;
DROP POLICY IF EXISTS ratings_update_owner_or_admin ON public.ratings;
CREATE POLICY ratings_update_owner_or_admin
  ON public.ratings
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR public.user_has_role((SELECT auth.uid()), 'admin')
    OR public.user_has_role((SELECT auth.uid()), 'superadmin')
  );

-- Additional granular delete policy if present from hardening migrations
DROP POLICY IF EXISTS "ratings_delete_owner_or_admin" ON public.ratings;
DROP POLICY IF EXISTS ratings_delete_owner_or_admin ON public.ratings;
CREATE POLICY ratings_delete_owner_or_admin
  ON public.ratings
  FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR public.user_has_role((SELECT auth.uid()), 'admin')
    OR public.user_has_role((SELECT auth.uid()), 'superadmin')
  );


-- ============================================================================
-- PART 2: Partial B-tree Indexes for Stories Catalogs & Keyset (Cursor) Pagination
-- ============================================================================
-- Filters only active statuses ('published', 'ongoing', 'completed') to keep
-- indexes lean, cache-friendly, and optimal for 100k+ records.
-- Tie-breaking with `id DESC` enables seamless keyset pagination (WHERE (col, id) < ($cursor_val, $cursor_id)).

CREATE INDEX IF NOT EXISTS idx_stories_status_updated_id
  ON public.stories (updated_at DESC, id DESC)
  WHERE status IN ('published', 'ongoing', 'completed');

CREATE INDEX IF NOT EXISTS idx_stories_status_views_id
  ON public.stories (views DESC, id DESC)
  WHERE status IN ('published', 'ongoing', 'completed');

CREATE INDEX IF NOT EXISTS idx_chapters_story_number
  ON public.chapters (story_id, chapter_number DESC);


-- ============================================================================
-- PART 3: Composite B-tree Indexes for User Engagement
-- ============================================================================
-- Provides high-performance, index-only-compatible retrieval for user activity feeds.

CREATE INDEX IF NOT EXISTS idx_reading_history_user_updated
  ON public.reading_history (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created
  ON public.bookmarks (user_id, created_at DESC);
