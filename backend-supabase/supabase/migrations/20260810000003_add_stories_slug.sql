ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_slug
  ON public.stories (slug)
  WHERE slug IS NOT NULL;

UPDATE public.stories
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
       || '-' || left(replace(id::text, '-', ''), 8)
WHERE slug IS NULL;
