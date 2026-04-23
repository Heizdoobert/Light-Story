-- Allow service_role (Edge Functions) to insert and update profiles table.
-- manage-user Edge Function needs to upsert new user profiles after creation.
-- RLS policies with 'to authenticated' don't cover service_role execution context.

drop policy if exists "profiles_insert_service_role" on public.profiles;
drop policy if exists "profiles_update_service_role" on public.profiles;

create policy "profiles_insert_service_role"
on public.profiles
for insert
to service_role
with check (true);

create policy "profiles_update_service_role"
on public.profiles
for update
to service_role
using (true)
with check (true);
