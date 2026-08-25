-- Fix: chapters select policy omits 'published' story status.
-- 202605170002 added 'published' to the stories public-read list but
-- chapters_select_public_or_staff was never updated, so chapters of
-- published stories were invisible to anonymous readers.

DROP POLICY IF EXISTS "chapters_select_public_or_staff" ON public.chapters;

CREATE POLICY "chapters_select_public_or_staff"
ON public.chapters
FOR SELECT
USING (
	EXISTS (
		SELECT 1
		FROM public.stories s
		WHERE s.id = chapters.story_id
			AND (
				s.status IN ('published', 'ongoing', 'completed')
				OR app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
			)
	)
);
