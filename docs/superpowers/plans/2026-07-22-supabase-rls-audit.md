# Supabase RLS Policy Audit & Reader Hub Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create Supabase SQL migration `20260722000001_reader_hub_bookmarks_history_rls.sql` with explicit RLS policies for `bookmarks` and `reading_history` tables.

**Architecture:** Create SQL migration file under `backend-supabase/supabase/migrations/` and verify SQL structure.

---

### Task 1: Create Reader Hub RLS SQL Migration

**Files:**
- Create: `backend-supabase/supabase/migrations/20260722000001_reader_hub_bookmarks_history_rls.sql`

- [ ] **Step 1: Write `20260722000001_reader_hub_bookmarks_history_rls.sql`**

```sql
-- Create bookmarks table if not exists
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comic_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_comic_bookmark UNIQUE (user_id, comic_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks"
  ON public.bookmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create reading_history table if not exists
CREATE TABLE IF NOT EXISTS public.reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comic_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  chapter_number NUMERIC DEFAULT 1,
  progress_pct NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_comic_history UNIQUE (user_id, comic_id)
);

ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own reading history" ON public.reading_history;
CREATE POLICY "Users can manage own reading history"
  ON public.reading_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Commit & Update Graphify**

```bash
git add backend-supabase/supabase/migrations/20260722000001_reader_hub_bookmarks_history_rls.sql
git commit -m "feat(db): add Supabase RLS policy migration for bookmarks and reading_history"
graphify update .
```
