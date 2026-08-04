-- Migration: 20260804000001_r2_storage_buckets.sql
--
-- Supabase-side storage buckets matching the folders used by the frontend
-- upload route (src/app/api/r2/upload + src/lib/r2/s3.ts):
--   - 'covers'   -> NEXT_PUBLIC_R2_BUCKET_COVERS   (story covers)
--   - 'chapters' -> NEXT_PUBLIC_R2_BUCKET_CHAPTERS (reader page images)
--
-- Public read for all visitors; writes restricted to staff roles.
-- Cloudflare R2 bucket CORS is configured via S3 PutBucketCors — see
-- scripts/r2-set-cors.mjs in the frontend.

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true),
       ('chapters', 'chapters', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "r2_covers_public_read" on storage.objects;
drop policy if exists "r2_covers_staff_upload" on storage.objects;
drop policy if exists "r2_covers_staff_delete" on storage.objects;
drop policy if exists "r2_chapters_public_read" on storage.objects;
drop policy if exists "r2_chapters_staff_upload" on storage.objects;
drop policy if exists "r2_chapters_staff_delete" on storage.objects;

create policy "r2_covers_public_read"
on storage.objects
for select
using (bucket_id = 'covers');

create policy "r2_covers_staff_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'covers'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "r2_covers_staff_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'covers'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "r2_chapters_public_read"
on storage.objects
for select
using (bucket_id = 'chapters');

create policy "r2_chapters_staff_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chapters'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "r2_chapters_staff_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chapters'
  and app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);
