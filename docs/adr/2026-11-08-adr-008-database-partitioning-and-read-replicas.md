# ADR-008: Database Scaling, Hash-Partitioning, Hot Counters & Regional Read Replicas

- **Status**: Accepted
- **Date**: 2026-11-08
- **Context**: Light-Story Monorepo (Next.js 16 + Cloudflare Workers Gateway + Supabase PostgreSQL)

---

## 1. Context & Motivation
As Light-Story scales towards millions of comic chapters, hundreds of thousands of active stories, and global reading traffic:
1. High-frequency reads and writes to story views and likes create hot-row locks in PostgreSQL.
2. The `chapters` table with high row volume requires efficient partitioning to keep index trees in RAM and maximize partition pruning.
3. Search and catalog filtering over large tag sets needs pre-flattened full-text indexing without expensive multi-table joins.
4. Global edge traffic requires routing read requests to regional replicas while guaranteeing that data-modifying queries execute on the primary database without transaction errors.
5. Index bloat on trigram and composite B-tree indexes requires proactive health monitoring and non-blocking maintenance.

---

## 2. Decision Rules & Architecture

### 2.1 Normalized Core with Isolated Hot Counters
- The core entities (`profiles`, `stories`, `chapters`) remain strictly normalized.
- Only high-velocity counters (`views`, `like_count`) are denormalized on `stories`.
- **Trigger Optimization**: The `touch_updated_at()` trigger is modified to skip updating `updated_at` when only `views` or `like_count` mutate. This eliminates index churn on `idx_stories_status_updated_id` and prevents read activity from falsely shifting stories to the top of "recently updated" feeds.

### 2.2 Hash-Partitioning Strategy for `chapters` (> 5M Rows)
- **Partition Key**: `PARTITION BY HASH (story_id)` with 16 partitions (`chapters_p00` through `chapters_p15`).
- **Partition Pruning**: Because 99% of reading traffic queries chapters by story (`WHERE story_id = $1 ORDER BY chapter_number DESC`), hash-partitioning guarantees that queries hit exactly 1 partition.
- **Constraint Contract**:
  - Primary Key: `PRIMARY KEY (story_id, id)`.
  - Unique Constraint: `UNIQUE (story_id, chapter_number)`.
- **Zero-Downtime Migration Playbook**:
  1. Create shadow partitioned table `chapters_part`.
  2. Attach dual-write trigger on legacy `chapters` table.
  3. Batch backfill rows from `chapters` to `chapters_part` in 20,000-row chunks.
  4. Perform atomic cutover (`ALTER TABLE chapters RENAME TO chapters_legacy; ALTER TABLE chapters_part RENAME TO chapters;`).

### 2.3 Redis/KV Hot Counter Buffer & Batch Synchronization
- Edge Worker routes (`POST /api/v1/stories/:id/view`) buffer increments in edge memory / Cloudflare KV (`view:<storyId>`) or Upstash Redis.
- Scheduled cron workers execute batch flushes using the `public.batch_increment_story_views(payload jsonb)` RPC, executing atomic bulk updates in a single SQL round-trip.
- Fallback RPC `public.increment_story_views(story_id_param uuid, inc bigint)` supports increment steps `inc > 1`.

### 2.4 Materialized View for Catalog & Tag Searching
- High-scale catalog queries use `public.mv_story_catalog_search`, combining `stories`, `authors`, `categories`, and `tags` into a single view.
- Indexed with a unique index `uq_mv_story_catalog_id(id)` allowing non-blocking `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- Optimized with GIN indexes on `search_tsv` (tsvector), `tag_list` (text[]), and `title gin_trgm_ops`.
- Refreshed on a schedule via `public.refresh_mv_story_catalog()` or pg_cron.

### 2.5 Regional Read Replicas & Master Write Enforcement
- **Read Operations (`GET`, `HEAD`)**:
  - The Cloudflare Worker inspects `x-supabase-region` or `CF-Region` / `cf.region`.
  - EU requests route to `env.SUPABASE_URL_EU`.
  - US requests route to `env.SUPABASE_URL_US`.
  - All other regions fall back to primary `env.SUPABASE_URL`.
- **Mutating Operations (`POST`, `PUT`, `PATCH`, `DELETE`)**:
  - Mutating operations ALWAYS route to primary `env.SUPABASE_URL` (Master). Replicas are never sent write traffic.
- **Failover**: If a replica query fails, the gateway automatically falls back to primary.

### 2.6 Index Bloat & Proactive Health Inspection
- Database maintenance uses `public.get_index_health_report()`, querying `pg_stat_user_indexes` to report index sizes, scan frequencies, and unused indexes.
- Re-indexing must be executed non-blockingly using `REINDEX TABLE CONCURRENTLY` outside of PL/pgSQL transaction blocks.

---

## 3. Consequences
- **Positive**: Eliminates hot-row locking, reduces database CPU saturation by >70% under traffic spikes, enables sub-50ms global reads, and establishes a clear path to 10M+ rows.
- **Negative**: Requires periodic materialized view refresh jobs and dual-connection configurations for multi-region replicas.
