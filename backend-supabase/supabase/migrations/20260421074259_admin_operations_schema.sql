-- Admin operations schema for Light Story.

create extension if not exists pgcrypto;

create table if not exists public.collections (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	description text,
	cover_url text,
	created_by uuid references public.profiles(id),
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.collection_stories (
	collection_id uuid not null references public.collections(id) on delete cascade,
	story_id uuid not null references public.stories(id) on delete cascade,
	sort_order integer not null default 0,
	created_at timestamptz not null default timezone('utc'::text, now()),
	primary key (collection_id, story_id)
);

create table if not exists public.moderation_queue (
	id uuid primary key default gen_random_uuid(),
	story_id uuid references public.stories(id) on delete cascade,
	chapter_id uuid references public.chapters(id) on delete cascade,
	reporter_id uuid references public.profiles(id),
	reason text not null,
	status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'rejected')),
	notes text,
	reviewed_by uuid references public.profiles(id),
	reviewed_at timestamptz,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.crawler_sources (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	source_type text not null default 'rss' check (source_type in ('rss', 'api', 'html', 'manual')),
	source_url text,
	enabled boolean not null default true,
	last_crawled_at timestamptz,
	last_status text,
	notes text,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.crawler_runs (
	id uuid primary key default gen_random_uuid(),
	source_id uuid references public.crawler_sources(id) on delete cascade,
	status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
	started_at timestamptz,
	finished_at timestamptz,
	items_seen integer not null default 0,
	items_created integer not null default 0,
	items_updated integer not null default 0,
	log text,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.vip_plans (
	id uuid primary key default gen_random_uuid(),
	code text not null unique,
	name text not null,
	description text,
	price numeric(12,2) not null default 0,
	billing_period text not null default 'monthly' check (billing_period in ('daily', 'weekly', 'monthly', 'yearly')),
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.vip_subscriptions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	plan_id uuid not null references public.vip_plans(id),
	status text not null default 'active' check (status in ('active', 'paused', 'canceled', 'expired')),
	started_at timestamptz not null default timezone('utc'::text, now()),
	ends_at timestamptz,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.promotions (
	id uuid primary key default gen_random_uuid(),
	code text not null unique,
	title text not null,
	description text,
	discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
	discount_value numeric(12,2) not null default 0,
	starts_at timestamptz,
	ends_at timestamptz,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.events (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	description text,
	starts_at timestamptz,
	ends_at timestamptz,
	status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'finished', 'archived')),
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.transactions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	amount numeric(12,2) not null default 0,
	currency text not null default 'USD',
	transaction_type text not null check (transaction_type in ('topup', 'subscription', 'purchase', 'refund')),
	status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
	reference_code text unique,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.comments (
	id uuid primary key default gen_random_uuid(),
	story_id uuid not null references public.stories(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	parent_id uuid references public.comments(id) on delete cascade,
	body text not null,
	status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted', 'flagged')),
	like_count integer not null default 0,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.ratings (
	id uuid primary key default gen_random_uuid(),
	story_id uuid not null references public.stories(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	rating integer not null check (rating between 1 and 5),
	review text,
	status text not null default 'visible' check (status in ('visible', 'hidden', 'flagged')),
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now()),
	unique(story_id, user_id)
);

create table if not exists public.revenue_snapshots (
	id uuid primary key default gen_random_uuid(),
	snapshot_date date not null unique,
	total_revenue numeric(12,2) not null default 0,
	total_transactions integer not null default 0,
	premium_subscriptions integer not null default 0,
	ad_revenue numeric(12,2) not null default 0,
	notes text,
	created_at timestamptz not null default timezone('utc'::text, now()),
	updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_collections_created_at on public.collections(created_at desc);
create index if not exists idx_collection_stories_story_id on public.collection_stories(story_id);
create index if not exists idx_moderation_queue_status on public.moderation_queue(status);
create index if not exists idx_crawler_sources_enabled on public.crawler_sources(enabled);
create index if not exists idx_crawler_runs_source_id on public.crawler_runs(source_id);
create index if not exists idx_vip_subscriptions_user_id on public.vip_subscriptions(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_comments_story_id on public.comments(story_id);
create index if not exists idx_ratings_story_id on public.ratings(story_id);
create index if not exists idx_revenue_snapshots_snapshot_date on public.revenue_snapshots(snapshot_date desc);

alter table public.collections enable row level security;
alter table public.collection_stories enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.crawler_sources enable row level security;
alter table public.crawler_runs enable row level security;
alter table public.vip_plans enable row level security;
alter table public.vip_subscriptions enable row level security;
alter table public.promotions enable row level security;
alter table public.events enable row level security;
alter table public.transactions enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.revenue_snapshots enable row level security;

create policy "collections_select_public_or_staff"
on public.collections
for select
using (true);

create policy "collections_write_staff"
on public.collections
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "collection_stories_select_staff"
on public.collection_stories
for select
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "collection_stories_write_staff"
on public.collection_stories
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "moderation_queue_select_staff"
on public.moderation_queue
for select
using (app_private.has_role(array['superadmin', 'admin', 'employee']::text[]));

create policy "moderation_queue_write_staff"
on public.moderation_queue
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "crawler_sources_staff"
on public.crawler_sources
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "crawler_runs_staff"
on public.crawler_runs
for all
using (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "vip_plans_select_public"
on public.vip_plans
for select
using (true);

create policy "vip_plans_write_staff"
on public.vip_plans
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "vip_subscriptions_select_own_or_staff"
on public.vip_subscriptions
for select
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "vip_subscriptions_write_staff"
on public.vip_subscriptions
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "promotions_select_public"
on public.promotions
for select
using (true);

create policy "promotions_write_staff"
on public.promotions
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "events_select_public"
on public.events
for select
using (true);

create policy "events_write_staff"
on public.events
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "transactions_select_own_or_staff"
on public.transactions
for select
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "transactions_write_staff"
on public.transactions
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create policy "comments_select_public"
on public.comments
for select
using (status = 'visible' or user_id = auth.uid());

create policy "comments_write_own_or_staff"
on public.comments
for all
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "ratings_select_public"
on public.ratings
for select
using (status = 'visible' or user_id = auth.uid());

create policy "ratings_write_own_or_staff"
on public.ratings
for all
using (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
)
with check (
	user_id = auth.uid()
	or app_private.has_role(array['superadmin', 'admin', 'employee']::text[])
);

create policy "revenue_snapshots_staff"
on public.revenue_snapshots
for all
using (
	app_private.has_role(array['superadmin', 'admin']::text[])
)
with check (
	app_private.has_role(array['superadmin', 'admin']::text[])
);

create trigger touch_collections_updated_at
before update on public.collections
for each row execute function public.touch_updated_at();

create trigger touch_moderation_queue_updated_at
before update on public.moderation_queue
for each row execute function public.touch_updated_at();

create trigger touch_crawler_sources_updated_at
before update on public.crawler_sources
for each row execute function public.touch_updated_at();

create trigger touch_crawler_runs_updated_at
before update on public.crawler_runs
for each row execute function public.touch_updated_at();

create trigger touch_vip_plans_updated_at
before update on public.vip_plans
for each row execute function public.touch_updated_at();

create trigger touch_vip_subscriptions_updated_at
before update on public.vip_subscriptions
for each row execute function public.touch_updated_at();

create trigger touch_promotions_updated_at
before update on public.promotions
for each row execute function public.touch_updated_at();

create trigger touch_events_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

create trigger touch_transactions_updated_at
before update on public.transactions
for each row execute function public.touch_updated_at();

create trigger touch_comments_updated_at
before update on public.comments
for each row execute function public.touch_updated_at();

create trigger touch_ratings_updated_at
before update on public.ratings
for each row execute function public.touch_updated_at();

create trigger touch_revenue_snapshots_updated_at
before update on public.revenue_snapshots
for each row execute function public.touch_updated_at();
