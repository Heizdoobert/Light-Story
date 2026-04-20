-- RLS smoke tests for Light Story MVP.

begin;

set local role anon;
select count(*) from public.stories;
select count(*) from public.chapters;

reset role;
set local role authenticated;

-- Read own profile or staff-readable data depending on seeded user context.
select count(*) from public.profiles;

-- Should fail in normal authenticated context without staff role.
do $$
begin
  begin
    insert into public.site_settings(key, value) values ('rls_test_forbidden', '{"blocked": true}'::jsonb);
    raise exception 'Expected permission denied did not occur';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

rollback;
