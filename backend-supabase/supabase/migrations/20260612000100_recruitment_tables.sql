-- Recruitment agent: candidate, decision, and invite tracking

create table if not exists public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_platform text not null,
  creator_name text,
  creator_handle text,
  avatar_url text,
  follower_count int default 0,
  score int check (score >= 0 and score <= 100),
  evaluation_json jsonb default '{}',
  verdict text check (verdict in ('strong_match', 'potential', 'mismatch')),
  status text not null default 'pending' check (status in ('pending', 'evaluated', 'approved', 'rejected', 'invited', 'onboarded')),
  admin_notes text,
  created_at timestamptz default now(),
  evaluated_at timestamptz,
  decided_at timestamptz
);

create table if not exists public.recruitment_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.recruitment_candidates(id) on delete cascade,
  admin_id uuid not null,
  action text not null check (action in ('approve', 'reject', 'invite')),
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.recruitment_invites (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.recruitment_candidates(id) on delete cascade,
  invite_code text unique not null,
  status text not null default 'sent' check (status in ('sent', 'opened', 'accepted', 'expired')),
  sent_at timestamptz default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '30 days'
);

-- Indexes for common queries
create index idx_recruitment_candidates_status on public.recruitment_candidates(status);
create index idx_recruitment_candidates_source on public.recruitment_candidates(source_platform);
create index idx_recruitment_candidates_score on public.recruitment_candidates(score desc);
create index idx_recruitment_decisions_candidate on public.recruitment_decisions(candidate_id);
create index idx_recruitment_invites_candidate on public.recruitment_invites(candidate_id);
create index idx_recruitment_invites_code on public.recruitment_invites(invite_code);

-- RLS: only superadmin and admin can view/manage recruitment
alter table public.recruitment_candidates enable row level security;
alter table public.recruitment_decisions enable row level security;
alter table public.recruitment_invites enable row level security;

create policy "superadmin_full_access_recruitment_candidates"
  on public.recruitment_candidates for all
  using (public.has_role(auth.uid(), 'superadmin'::public.user_role))
  with check (public.has_role(auth.uid(), 'superadmin'::public.user_role));

create policy "admin_read_recruitment_candidates"
  on public.recruitment_candidates for select
  using (public.has_role(auth.uid(), 'admin'::public.user_role));

create policy "superadmin_full_access_recruitment_decisions"
  on public.recruitment_decisions for all
  using (public.has_role(auth.uid(), 'superadmin'::public.user_role))
  with check (public.has_role(auth.uid(), 'superadmin'::public.user_role));

create policy "admin_read_recruitment_decisions"
  on public.recruitment_decisions for select
  using (public.has_role(auth.uid(), 'admin'::public.user_role));

create policy "superadmin_full_access_recruitment_invites"
  on public.recruitment_invites for all
  using (public.has_role(auth.uid(), 'superadmin'::public.user_role))
  with check (public.has_role(auth.uid(), 'superadmin'::public.user_role));

create policy "admin_read_recruitment_invites"
  on public.recruitment_invites for select
  using (public.has_role(auth.uid(), 'admin'::public.user_role));
