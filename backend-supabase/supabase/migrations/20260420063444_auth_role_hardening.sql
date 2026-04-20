-- Harden profile role access so dashboard authorization is driven by trusted auth metadata
-- and profile changes remain restricted to superadmins.

drop policy if exists "profiles_update_own_non_privileged" on public.profiles;

create policy "profiles_update_superadmin_only"
on public.profiles
for update
using (
	exists (
		select 1
		from public.profiles p
		where p.id = auth.uid() and p.role = 'superadmin'
	)
)
with check (
	exists (
		select 1
		from public.profiles p
		where p.id = auth.uid() and p.role = 'superadmin'
	)
);
