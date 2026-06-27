-- Fix story status constraint to match frontend usage
-- Add 'ongoing' and 'completed' to allowed statuses
-- Frontend uses ongoing/completed for display, backend uses draft/published for moderation

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_status_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_status_check
  CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'archived'));

-- Update stories RLS: also show ongoing stories to public
DROP POLICY IF EXISTS "read_published_stories" ON public.stories;
CREATE POLICY "read_published_stories" ON public.stories FOR SELECT
USING (status IN ('published', 'ongoing', 'completed'));
