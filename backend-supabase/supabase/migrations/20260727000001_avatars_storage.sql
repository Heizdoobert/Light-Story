-- Create a public bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_authenticated_upload" on storage.objects;
drop policy if exists "avatars_authenticated_update" on storage.objects;
drop policy if exists "avatars_authenticated_delete" on storage.objects;

create policy "avatars_public_read"
on storage.objects
for select
using (bucket_id = 'avatars');

create policy "avatars_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    (auth.uid()::text = split_part(name, '-', 1))
    or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
  )
);

create policy "avatars_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (auth.uid()::text = split_part(name, '-', 1))
    or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
  )
);

create policy "avatars_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (auth.uid()::text = split_part(name, '-', 1))
    or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
  )
);
