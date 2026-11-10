-- ============================================================================
-- Migration: System Logs Retention Policy & Scheduled Purge
-- File: 20261110000001_system_logs_retention_policy.sql
-- ============================================================================

-- Function to prune expired logs to prevent table bloat
create or replace function public.cleanup_old_system_logs(
  days_to_keep int default 30,
  error_days_to_keep int default 90
)
returns table(deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint := 0;
  v_non_error_cutoff timestamptz;
  v_error_cutoff timestamptz;
begin
  -- Only superadmins or service role may run log cleanup
  if auth.role() <> 'service_role' and not app_private.has_role(array['superadmin']) then
    raise exception 'Unauthorized: Only superadmins or service_role can trigger log retention cleanup';
  end if;

  v_non_error_cutoff := timezone('utc'::text, now()) - (days_to_keep || ' days')::interval;
  v_error_cutoff := timezone('utc'::text, now()) - (error_days_to_keep || ' days')::interval;

  -- Delete info, debug, warn logs older than days_to_keep
  with deleted_non_errors as (
    delete from public.system_logs
    where created_at < v_non_error_cutoff
      and level in ('debug', 'info', 'warn')
    returning 1
  )
  select count(*) into v_deleted from deleted_non_errors;

  -- Delete error logs older than error_days_to_keep
  with deleted_errors as (
    delete from public.system_logs
    where created_at < v_error_cutoff
      and level = 'error'
    returning 1
  )
  select v_deleted + count(*) into v_deleted from deleted_errors;

  return query select v_deleted;
end;
$$;

-- Grant execution permission
grant execute on function public.cleanup_old_system_logs(int, int) to authenticated, service_role;

-- Conditionally schedule with pg_cron if extension is available
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.unschedule('purge-system-logs');
    perform cron.schedule(
      'purge-system-logs',
      '0 3 * * *', -- Run daily at 03:00 UTC
      'select public.cleanup_old_system_logs(30, 90);'
    );
  end if;
exception
  when others then
    -- Ignore error if pg_cron is not active or lacks permissions
    null;
end;
$$;
