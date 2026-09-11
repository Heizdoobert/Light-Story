-- Re-point stories.author_id FK from profiles (creator id) to authors (taxonomy).
-- Legacy rows hold profile ids (semantically wrong); null them unless they
-- happen to be valid author ids. Creator identity stays in stories.created_by.

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_author_id_fkey;

UPDATE public.stories
  SET author_id = NULL
  WHERE author_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.authors a WHERE a.id = stories.author_id);

ALTER TABLE public.stories
  ADD CONSTRAINT stories_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;
