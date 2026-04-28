-- Fix critical RLS leak: site_settings had "select true" policy
-- exposing all settings (including ad keys) to anonymous users.
-- Replace with restricted policy: only authenticated users can read,
-- and they can only access settings prefixed with 'public_'.

-- Drop the overly permissive public select policy
drop policy if exists "site_settings_select_public" on public.site_settings;

-- Create new policy: authenticated users only, and only public_* keys
create policy "site_settings_select_public"
on public.site_settings
for select
to authenticated
using (key like 'public_%');

-- Allow superadmin/admin full access for reads (already covered by write policy)
create policy "site_settings_select_admin"
on public.site_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('superadmin', 'admin')
  )
);
