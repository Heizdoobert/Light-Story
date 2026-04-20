-- Create a public bucket for story cover images and restrict uploads to staff.

insert into storage.buckets (id, name, public)
values ('story-covers', 'story-covers', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "story_covers_public_read" on storage.objects;
drop policy if exists "story_covers_staff_upload" on storage.objects;

drop policy if exists "story_covers_staff_delete" on storage.objects;

create policy "story_covers_public_read"
on storage.objects
for select
using (bucket_id = 'story-covers');

create policy "story_covers_staff_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'story-covers'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "story_covers_staff_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'story-covers'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);
