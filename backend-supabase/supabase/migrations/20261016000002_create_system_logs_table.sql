-- Create system_logs table for structured backend logging, error tracking, and superadmin inspection.
create table if not exists public.system_logs (
    id uuid primary key default gen_random_uuid(),
    level text not null check (level in ('debug', 'info', 'warn', 'error')),
    message text not null,
    service text not null default 'default',
    metadata jsonb not null default '{}'::jsonb,
    error_stack text,
    user_id uuid references auth.users(id) on delete set null,
    request_id text,
    created_at timestamptz not null default timezone('utc'::text, now())
);

-- Optimize queries for superadmin log viewer (descending time, level filtering, service filtering)
create index if not exists idx_system_logs_created_at
on public.system_logs(created_at desc);

create index if not exists idx_system_logs_level
on public.system_logs(level);

create index if not exists idx_system_logs_service
on public.system_logs(service);

-- Enable Row Level Security
alter table public.system_logs enable row level security;

-- Only superadmins may query or read system logs
drop policy if exists "system_logs_select_superadmin" on public.system_logs;
create policy "system_logs_select_superadmin"
on public.system_logs
for select
to authenticated
using (
    app_private.has_role(array['superadmin'])
);

-- Authenticated staff/admins/services can insert system logs
drop policy if exists "system_logs_insert_staff" on public.system_logs;
create policy "system_logs_insert_staff"
on public.system_logs
for insert
to authenticated
with check (
    app_private.has_role(array['staff', 'editor', 'admin', 'superadmin', 'employee'])
);
