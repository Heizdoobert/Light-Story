-- Migration: Create translators table and link to stories
-- Date: 2026-07-25

CREATE TABLE IF NOT EXISTS public.translators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  contact text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_translators_name ON public.translators(name);
CREATE INDEX IF NOT EXISTS idx_translators_status ON public.translators(status);

-- Link translator to stories table
ALTER TABLE IF EXISTS public.stories
  ADD COLUMN IF NOT EXISTS translator text;

ALTER TABLE IF EXISTS public.stories
  ADD COLUMN IF NOT EXISTS translator_id uuid REFERENCES public.translators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stories_translator_id ON public.stories(translator_id);

-- Enable RLS
ALTER TABLE public.translators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='translators' AND policyname='read_translators') THEN
    CREATE POLICY read_translators ON public.translators FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='translators' AND policyname='manage_translators_admin') THEN
    CREATE POLICY manage_translators_admin ON public.translators FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('superadmin', 'admin', 'employee')
      )
    );
  END IF;
END $$;

-- Trigger touch_updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_translators_updated_at') THEN
    CREATE TRIGGER trg_translators_updated_at
      BEFORE UPDATE ON public.translators
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;
