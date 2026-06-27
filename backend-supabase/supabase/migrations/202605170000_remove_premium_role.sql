-- Remove 'premium' role from the system
-- Migrate existing premium users to 'user' role
-- Drop premium-specific SQL functions
-- Update RLS policies for chapter access

-- 1. Migrate existing premium users to 'user'
UPDATE public.profiles SET role = 'user' WHERE role = 'premium';

-- 2. Drop premium-specific functions
DROP FUNCTION IF EXISTS public.user_has_premium(uuid);
DROP FUNCTION IF EXISTS public.is_premium_or_higher(uuid);

-- 3. Update profiles CHECK constraint (drop and recreate)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'employee', 'user'));

-- 4. Update set_user_role allowed roles
CREATE OR REPLACE FUNCTION app_private.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Only superadmin can change roles';
  END IF;
  IF new_role NOT IN ('superadmin', 'admin', 'employee', 'user') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;
  UPDATE public.profiles
  SET role = new_role, updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;
END;
$$;

-- 5. Simplify can_read_chapter - all published chapters readable
CREATE OR REPLACE FUNCTION public.can_read_chapter(_chapter_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = _chapter_id AND s.status = 'published'
  );
$$;

-- 6. Update chapter RLS - merge free + VIP into single published-read policy
DROP POLICY IF EXISTS "read_free_chapters" ON public.chapters;
DROP POLICY IF EXISTS "read_vip_chapters_premium_admin" ON public.chapters;

CREATE POLICY "chapters_select_published" ON public.chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = public.chapters.story_id AND s.status = 'published'
  )
);
