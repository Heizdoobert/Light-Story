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
