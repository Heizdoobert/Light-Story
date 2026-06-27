# Light Story Database Schema (Complete)

Canonical reference for all Supabase PostgreSQL tables, relationships, RLS policies, and RPC functions.

## Table of Contents

- [Core Tables](#core-tables)
- [Admin & Operations](#admin--operations)
- [Monetization](#monetization)
- [Comic Platform](#comic-platform)
- [Analytics](#analytics)
- [RLS Helper Functions](#rls-helper-functions)
- [RPC Functions](#rpc-functions)
- [Migrations Index](#migrations-index)

## Core Tables

### `profiles`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK → `auth.users(id)` ON DELETE CASCADE |
| `email` | `text` | UNIQUE NOT NULL |
| `full_name` | `text` | |
| `avatar_url` | `text` | |
| `role` | `text` | NOT NULL DEFAULT 'user' CHECK (`superadmin`, `admin`, `employee`, `user`) |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

**Indexes:** `idx_profiles_role`
**Triggers:** `trg_profiles_updated_at` (auto-update `updated_at`)
**RLS:** `profiles_select_own_or_staff` (self or staff), `profiles_update_own_non_privileged` (self only, can't escalate role)

### `stories` (MVP)
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() |
| `title` | `text` | NOT NULL |
| `author` | `text` | NOT NULL |
| `description` | `text` | |
| `cover_url` | `text` | |
| `category` | `text` | |
| `status` | `text` | NOT NULL DEFAULT 'ongoing' CHECK (`draft`, `published`, `ongoing`, `completed`, `archived`) |
| `views` | `bigint` | NOT NULL DEFAULT 0 |
| `like_count` | `bigint` | NOT NULL DEFAULT 0 |
| `created_by` | `uuid` | → `profiles(id)` |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

**Indexes:** `idx_stories_created_at`, `idx_stories_status`, `idx_stories_category`, `idx_stories_title_trgm` (gin_trgm)
**Triggers:** `trg_stories_updated_at`
**RLS:** `stories_select_public_or_staff` (published/ongoing public, all staff), `stories_write_staff` (admin/employee+)

### `chapters` (MVP)
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() |
| `story_id` | `uuid` | NOT NULL → `stories(id)` ON DELETE CASCADE |
| `chapter_number` | `integer` | NOT NULL CHECK > 0, UNIQUE(story_id, chapter_number) |
| `title` | `text` | NOT NULL |
| `content` | `text` | NOT NULL |
| `word_count` | `integer` | GENERATED ALWAYS AS (stored, from whitespace count) |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

**Indexes:** `idx_chapters_story_id`, `idx_chapters_story_chapter_number`
**Triggers:** `trg_chapters_updated_at`
**RLS:** `chapters_select_published` (story status = 'published'), staff write

### `story_likes`
| Column | Type | Constraints |
|---|---|---|
| `story_id` | `uuid` | NOT NULL → `stories(id)` ON DELETE CASCADE |
| `user_id` | `uuid` | NOT NULL → `profiles(id)` ON DELETE CASCADE |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| | | PK (story_id, user_id) |

**Indexes:** `idx_story_likes_user_id`
**RLS:** `story_likes_select_own`, `story_likes_insert_own`, `story_likes_delete_own`

### `site_settings`
| Column | Type | Constraints |
|---|---|---|
| `id` | `bigint` | PK GENERATED ALWAYS AS IDENTITY |
| `key` | `text` | NOT NULL UNIQUE |
| `value` | `jsonb` | NOT NULL DEFAULT '{}' |
| `updated_by` | `uuid` | → `profiles(id)` |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

**Triggers:** `trg_site_settings_updated_at`
**RLS:** `site_settings_select_public` (all can read), `site_settings_write_admin` (admin+ only)

### `system_settings`
| Column | Type | Constraints |
|---|---|---|
| `id` | `bigint` | PK GENERATED ALWAYS AS IDENTITY |
| `key` | `text` | NOT NULL UNIQUE |
| `value` | `text` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `story_views`
| Column | Type | Constraints |
|---|---|---|
| `id` | `bigint` | PK GENERATED ALWAYS AS IDENTITY |
| `story_id` | `uuid` | NOT NULL → `stories(id)` ON DELETE CASCADE |
| `viewed_by` | `uuid` | → `profiles(id)` |
| `viewed_at` | `timestamptz` | NOT NULL DEFAULT now() |

**Indexes:** `idx_story_views_story_id`, `idx_story_views_viewed_by`, `idx_story_views_viewed_at`

## Admin & Operations

### `audit_logs`
| Column | Type | Constraints |
|---|---|---|
| `id` | `bigint` | PK GENERATED ALWAYS AS IDENTITY |
| `user_id` | `uuid` | NOT NULL → `profiles(id)` |
| `action` | `text` | NOT NULL |
| `entity_type` | `text` | NOT NULL |
| `entity_id` | `uuid` | → stories/chapters/etc |
| `ip_address` | `inet` | |
| `metadata` | `jsonb` | NOT NULL DEFAULT '{}' |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

**RLS:** admin+ select + insert

### `collections`
Story groupings for curated lists.
- `id` (uuid PK), `name` (text UNIQUE), `description`, `cover_url`, `created_by` → profiles, timestamps

### `collection_stories`
Many-to-many: collections ↔ stories.
- `collection_id` → collections, `story_id` → stories, `sort_order`, PK(collection_id, story_id)

### `categories`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() |
| `name` | `text` | NOT NULL |
| `slug` | `text` | NOT NULL UNIQUE |
| `description` | `text` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `authors`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() |
| `name` | `text` | NOT NULL |
| `slug` | `text` | NOT NULL UNIQUE |
| `bio` | `text` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `moderation_queue`
Reported stories/chapters for staff review.
- `id` (uuid PK), `story_id`, `chapter_id`, `reporter_id` → profiles, `reason`, `status` (pending/reviewing/resolved/rejected), `notes`, `reviewed_by` → profiles, timestamps

### `crawler_sources` / `crawler_runs`
External content source tracking.
- Sources: `name`, `source_type` (rss/api/html/manual), `source_url`, `enabled`, `last_crawled_at`
- Runs: `source_id`, `status` (queued/running/succeeded/failed), `items_seen/created/updated`, `log`

### `comments`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `story_id` | `uuid` | NOT NULL → stories ON DELETE CASCADE |
| `user_id` | `uuid` | NOT NULL → profiles ON DELETE CASCADE |
| `parent_id` | `uuid` | → comments ON DELETE CASCADE |
| `body` | `text` | NOT NULL |
| `status` | `text` | NOT NULL DEFAULT 'visible' CHECK (visible/hidden/deleted/flagged) |
| `like_count` | `integer` | NOT NULL DEFAULT 0 |
| timestamps | | |

**RLS:** Published stories only for SELECT; authenticated INSERT; owner or admin for UPDATE/DELETE.

### `ratings`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `story_id` | `uuid` | NOT NULL → stories |
| `user_id` | `uuid` | NOT NULL → profiles |
| `rating` | `integer` | CHECK (1-5) |
| `review` | `text` | |
| `status` | `text` | DEFAULT 'visible' |
| | | UNIQUE(story_id, user_id) |

**RLS:** Same pattern as comments.

## Monetization

### `promotions`
Discount codes: `code`, `title`, `discount_type` (percent/fixed), `discount_value`, date range, `is_active`

### `transactions`
- `id`, `user_id` → profiles, `amount` (numeric(12,2)), `currency`, `transaction_type` (topup/subscription/purchase/refund), `status` (pending/succeeded/failed/refunded), `reference_code`, `metadata` (jsonb)

### `revenue_snapshots`
Daily revenue rollups: `snapshot_date` (UNIQUE DATE), `total_revenue`, `total_transactions`, `premium_subscriptions`, `ad_revenue`

### `events`
Time-limited events: `slug` (UNIQUE), `title`, `starts_at`, `ends_at`, `status` (draft/scheduled/active/finished/archived)

## Comic Platform

### `stories` (Comic Platform — separate from MVP)
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() |
| `title` | `text` | NOT NULL |
| `summary` | `text` | |
| `cover_url` | `text` | |
| `status` | `text` | NOT NULL DEFAULT 'draft' (draft/published/ongoing/completed/archived) |
| `author_id` | `uuid` | → `profiles(id)` ON DELETE SET NULL |
| `search_vector` | `vector(1536)` | pgvector embedding for semantic search |
| timestamps | | |

**Indexes:** `idx_stories_search_vector` (ivfflat, cosine_ops, lists=100)
**RLS:** `stories_select_public_or_staff` (published/ongoing/completed public, all staff)

### `chapters` (Comic Platform)
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() |
| `story_id` | `uuid` | NOT NULL → stories ON DELETE CASCADE |
| `chapter_number` | `integer` | NOT NULL, UNIQUE(story_id, chapter_number) |
| `title` | `text` | NOT NULL |
| `content` | `text` | |
| `published_at` | `timestamptz` | |
| timestamps | | |

**RLS:**
- `chapters_select_published`: story status = published

## Analytics

### `analytics_snapshots`
Cached analytics data for dashboard.
- `id` (bigint PK), `metric_type` (user_engagement/content_performance/infrastructure), `time_range`, `snapshot_data` (jsonb), `expires_at`, UNIQUE(metric_type, time_range)
- **RLS:** Admin/superadmin only

## RLS Helper Functions

| Function | Location | Purpose |
|---|---|---|
| `public.touch_updated_at()` | `202604200001_mvp_init.sql` | Trigger: auto-set `updated_at` |
| `app_private.handle_new_user()` | `202604200001_mvp_init.sql` | Trigger: create profile on signup |
| `app_private.has_role(text[])` | Various | Check if current user has any of the given roles |
| `public.is_superadmin(uuid)` | `202605110002_add_superadmin_helpers.sql` | Fast-path superadmin check |
| `public.is_admin_or_higher(uuid)` | `202605110002_add_superadmin_helpers.sql` | admin OR superadmin |
| `public.user_has_role(uuid, text)` | `202605110001_security_hardening_comments_ratings.sql` | Check specific role |
| `public.can_read_chapter(uuid, uuid)` | `202605110001_security_hardening_comments_ratings.sql` | IDOR protection for chapter access |
| `app_private.set_user_role(uuid, text)` | `202604200001_mvp_init.sql` | Superadmin-only role change |

## RPC Functions

| Function | Arguments | Returns | Purpose |
|---|---|---|---|
| `increment_story_views(uuid)` | story_id | void | Increment view counter |
| `toggle_story_like(uuid)` | story_id | boolean | Like/unlike a story |
| `search_stories(vector(1536), int)` | embedding, match_count | TABLE(id, title, summary, cover_url, similarity) | Semantic search |
| `get_user_engagement_summary(text, timestamptz, timestamptz)` | time_range, start, end | jsonb | DAU/WAU/MAU/churn |
| `get_signup_trend(int)` | days_back | TABLE(signup_date, new_users, cumulative_users) | Cohort analysis |
| `get_inactive_user_cohort(int)` | inactive_days | TABLE | Churn risk identification |
| `get_top_stories_by_metric(text, int, text)` | metric, limit, range | TABLE | Top stories by views/likes |
| `get_top_chapters_by_reads(int, text)` | limit, range | TABLE | Top chapters by reads |
| `get_story_completion_rates(uuid)` | story_id (optional) | TABLE | Completion percentage |

## Migration Index

| File | Date | Purpose |
|---|---|---|
| `202604200001_mvp_init.sql` | 2026-04-20 | Core tables, RLS, triggers, auth handlers |
| `20260420063444_auth_role_hardening.sql` | 2026-04-20 | Auth role enforcement |
| `20260420063931_current_user_profile_rpc.sql` | 2026-04-20 | Current profile RPC |
| `20260420064417_grant_app_private_usage.sql` | 2026-04-20 | Schema grants |
| `20260420064919_role_policy_helper.sql` | 2026-04-20 | has_role() helper |
| `20260420065237_role_source_auth_metadata.sql` | 2026-04-20 | Metadata source for roles |
| `20260420071000_story_covers_storage.sql` | 2026-04-20 | Storage bucket for covers |
| `20260420083801_profiles_self_update_safe_fields.sql` | 2026-04-20 | Safe profile update fields |
| `20260420085103_add_missing_updated_at_columns.sql` | 2026-04-20 | Missing timestamp fix |
| `20260420090656_story_taxonomy_relations.sql` | 2026-04-20 | Categories, authors tables |
| `20260420093400_system_settings_seed.sql` | 2026-04-20 | System settings seed data |
| `20260420095200_site_settings_jsonb_compat.sql` | 2026-04-20 | JSONB compatibility |
| `20260421074259_admin_operations_schema.sql` | 2026-04-21 | Collections, moderation, crawlers, VIP, payments, comments, ratings, events |
| `20260422024429_superadmin_only_taxonomy_and_profile_delete.sql` | 2026-04-22 | Superadmin-only operations |
| `20260422025437_admin_user_audit_logs.sql` | 2026-04-22 | admin_audit_logs table |
| `20260423000001_fix_audit_logs_rls.sql` | 2026-04-23 | Audit log RLS fix |
| `20260423000002_profiles_service_role_rls.sql` | 2026-04-23 | Service role profile access |
| `20260423000003_profiles_service_role_trigger_bypass.sql` | 2026-04-23 | Trigger bypass for service role |
| `20260423000004_grant_has_role_to_service_role.sql` | 2026-04-23 | Grant has_role() to service_role |
| `20260423000005_broaden_service_role_profile_bypass.sql` | 2026-04-23 | Broaden service role bypass |
| `20260425093000_dashboard_access_logs.sql` | 2026-04-25 | Story views tracking |
| `20260428000001_fix_site_settings_rls_leak.sql` | 2026-04-28 | Site settings RLS fix |
| `20260428000002_add_story_views_tracking.sql` | 2026-04-28 | story_views table |
| `20260428000003_audit_rbac_rls_enforcement.sql` | 2026-04-28 | RBAC enforcement |
| `20260502000000_dashboard_access_logs_realtime.sql` | 2026-05-02 | Realtime for dashboard |
| `20260503000000_create_comics_and_chapters.sql` | 2026-05-03 | No-op (placeholder) |
| `20260503000001_rls_comics_chapters.sql` | 2026-05-03 | RLS for comics |
| `20260505_create_comics_and_chapters.sql` | 2026-05-05 | Comics D1 migration |
| `20260507120000_analytics_rpc_functions.sql` | 2026-05-07 | Analytics RPCs (initial) |
| `20260509000001_analytics_rpc_functions.sql` | 2026-05-09 | Analytics RPCs + snapshots table |
| `202605100001_comic_platform.sql` | 2026-05-10 | Comic platform: pgvector, stories, chapters, VIP gating, search_stories() |
| `202605110001_security_hardening_comments_ratings.sql` | 2026-05-11 | Comments/ratings hardening |
| `202605110002_add_superadmin_helpers.sql` | 2026-05-11 | Superadmin fast-path helpers |

## Key Relationships

```
auth.users
  └─ profiles.id → auth.users.id
       ├─ stories.created_by → profiles.id
       ├─ chapters.story_id → stories.id
       ├─ story_likes.story_id → stories.id
       ├─ story_likes.user_id → profiles.id
       ├─ comments.story_id → stories.id (ON DELETE CASCADE)
       ├─ comments.user_id → profiles.id (ON DELETE CASCADE)
       ├─ ratings.story_id → stories.id
       ├─ ratings.user_id → profiles.id
        ├─ transactions.user_id → profiles.id
        └─ moderation_queue.story_id/chapter_id → stories/chapters
```

## Role-Based Access Control

| Role | Stories (read) | Chapters (read) | Comments | Admin Panels |
|---|---|---|---|---|---|
| anonymous | Published only | Published only | — | — |
| user | Published only | Published only | Own CRUD | — |
| employee | All | All | Own CRUD | Limited |
| admin | All | All | All CRUD | Full |
| superadmin | All | All | All CRUD | Full (bypass) |

## D1 Database Schemas (Workers)

The domain workers use their own D1 databases. See `docs/WORKERS_DEPLOYMENT.md` for D1 schema details and migration files in each worker's directory.
