-- Publish admin audit logs so dashboard access events can stream in realtime.

-- Ensure publication exists then add the admin_audit_logs table
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  execute 'alter publication supabase_realtime add table public.admin_audit_logs';
exception when undefined_table then
  -- ignore if table does not exist yet
  null;
end;
$$;