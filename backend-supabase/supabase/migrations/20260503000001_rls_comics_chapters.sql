-- Enable Row Level Security
alter table public.comics enable row level security;
alter table public.chapters enable row level security;

-- Allow authenticated users to insert comics (owner_id set to auth.uid())
create policy "authenticated can insert comics"
  on public.comics for insert
  using (auth.role() = 'authenticated')
  with check (auth.uid() = auth.uid());

-- Allow owners to update/delete their comics
create policy "owner can modify comics"
  on public.comics for update, delete
  using (owner_id = auth.uid());

-- Allow owners to insert chapters for their comics
create policy "owner can insert chapters"
  on public.chapters for insert
  using (
    exists (
      select 1 from public.comics where id = new.comic_id and owner_id = auth.uid()
    )
  );

-- Allow owners to update/delete their chapters
create policy "owner can modify chapters"
  on public.chapters for update, delete
  using (
    exists (
      select 1 from public.comics where id = comic_id and owner_id = auth.uid()
    )
  );