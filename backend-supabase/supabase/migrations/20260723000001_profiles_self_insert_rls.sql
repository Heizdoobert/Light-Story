-- Allow authenticated users to insert their own profile row on signup.
-- The existing `ensureProfileExists` flow in AuthContext uses anon key
-- but only service_role INSERT policy exists, causing silent failures
-- that leave new users with role=null.

drop policy if exists "profiles_insert_self" on public.profiles;

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
);

-- Existing authenticated users may also need SELECT their own row.
-- This is already covered by profiles_select_own_or_staff policy.
