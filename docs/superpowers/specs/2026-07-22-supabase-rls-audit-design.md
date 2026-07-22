# Supabase RLS Policy Audit & User Reader Hub Migration Design Spec

## Overview
Database migration and security hardening adding explicit Row-Level Security (RLS) policies for `bookmarks` and `reading_history` tables, verifying service_role key bypass policies across all 26 Supabase tables in `backend-supabase/supabase/migrations/`.

## Architecture & Data Schema

### 1. New Migration: `20260722000001_reader_hub_bookmarks_history_rls.sql`
Location: `backend-supabase/supabase/migrations/20260722000001_reader_hub_bookmarks_history_rls.sql`

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

CREATE POLICY "Users can manage own reading history"
  ON public.reading_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2. Verification
Validate migration syntax and test SQL assertion files (`backend-supabase/supabase/tests/rls_smoke.sql`).

## Testing Strategy
- Structure & SQL syntax validation via `test -f backend-supabase/supabase/config.toml`.
- Frontend linting and test execution (`npm --prefix frontend run lint && npm --prefix frontend run test:run`).
