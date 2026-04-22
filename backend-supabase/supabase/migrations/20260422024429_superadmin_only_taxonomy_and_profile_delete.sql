-- Restrict taxonomy write operations to superadmin and allow superadmin profile deletion.

drop policy if exists "authors_write_staff" on public.authors;
drop policy if exists "authors_write_superadmin" on public.authors;

create policy "authors_write_superadmin"
on public.authors
for all
to authenticated
using (app_private.has_role(array['superadmin']::text[]))
with check (app_private.has_role(array['superadmin']::text[]));

drop policy if exists "categories_write_staff" on public.categories;
drop policy if exists "categories_write_superadmin" on public.categories;

create policy "categories_write_superadmin"
on public.categories
for all
to authenticated
using (app_private.has_role(array['superadmin']::text[]))
with check (app_private.has_role(array['superadmin']::text[]));

drop policy if exists "profiles_delete_superadmin" on public.profiles;

create policy "profiles_delete_superadmin"
on public.profiles
for delete
to authenticated
using (app_private.has_role(array['superadmin']::text[]));
