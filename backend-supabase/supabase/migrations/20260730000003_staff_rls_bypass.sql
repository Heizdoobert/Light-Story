-- Staff RLS bypass for reading draft stories/chapters
-- Staff users (superadmin, admin, employee) can preview drafts before publishing
-- via user-JWT endpoints (public reading interface).
-- Admin panel already bypasses RLS via service key — this only affects
-- public routes when the viewer is a logged-in staff user.

drop policy if exists "read_published_stories" on public.stories;
create policy "read_published_stories" on public.stories for select
using (
  status in ('published', 'ongoing', 'completed')
  or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

drop policy if exists "chapters_select_published" on public.chapters;
create policy "chapters_select_published" on public.chapters for select
using (
  exists (
    select 1 from public.stories s
    where s.id = public.chapters.story_id and s.status = 'published'
  )
  or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);
