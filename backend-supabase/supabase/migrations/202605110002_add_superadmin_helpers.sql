-- Migration: Add isSuperadmin() helper for fast-path authorization
-- Date: 2026-05-11

-- Fast-path superadmin check (no joins, just direct profile role check)
CREATE OR REPLACE FUNCTION public.is_superadmin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role = 'superadmin');
$$;

-- Utility: is_admin_or_higher (admin OR superadmin)
CREATE OR REPLACE FUNCTION public.is_admin_or_higher(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role IN ('admin', 'superadmin'));
$$;

-- Utility: is_premium_or_higher (premium OR admin OR superadmin)
CREATE OR REPLACE FUNCTION public.is_premium_or_higher(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.role IN ('premium', 'admin', 'superadmin'));
$$;
