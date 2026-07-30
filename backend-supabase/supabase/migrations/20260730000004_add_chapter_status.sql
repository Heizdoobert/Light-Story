DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chapter_status') THEN
    CREATE TYPE chapter_status AS ENUM ('uploading', 'draft', 'published');
  END IF;
END $$;

ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS status chapter_status NOT NULL DEFAULT 'draft';
