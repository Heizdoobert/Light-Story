# Real Data Setup Guide

## Purpose

This is the canonical guide for wiring the project to real Supabase, Cloudflare D1, and Workers data.

## Quick Start

### Supabase

From `backend-supabase/`:

```bash
supabase link --project-ref rwnzsmmfvsetfcnkjoxt
supabase db push
```

Load sample data:
- Run `backend-supabase/supabase/seed-sample-data.sql` in Supabase Studio
- Or through `psql`: `psql $DATABASE_URL -f backend-supabase/supabase/seed-sample-data.sql`

### Cloudflare D1

Create and seed D1 databases for each domain worker:

```bash
# Comics worker D1
cd workers/comics-worker
npx wrangler d1 create comics-db
npx wrangler d1 migrations apply comics-db --remote

# Stories worker D1
cd ../stories-worker
npx wrangler d1 create stories-db
npx wrangler d1 migrations apply stories-db --remote

# Admin worker D1
cd ../admin-worker
npx wrangler d1 create admin-db
npx wrangler d1 migrations apply admin-db --remote

# Analytics worker D1
cd ../analytics-worker
npx wrangler d1 create analytics-db
npx wrangler d1 migrations apply analytics-db --remote
```

### Legacy D1 Backend (Control Plane)

The monolithic D1 backend (`backend-d1-saas/`) is being migrated to domain workers. If still needed:

```bash
cd backend-d1-saas
npx wrangler d1 create saas-control-plane
npx wrangler d1 migrations apply saas-control-plane --remote
```

## Frontend Wiring

Set the real-data variables in `frontend/.env.local`:

```env
# Supabase
SUPABASE_URL=https://rwnzsmmfvsetfcnkjoxt.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://rwnzsmmfvsetfcnkjoxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_[your_key_here]

# API Gateway (replaces BACKEND_D1_SAAS_URL)
NEXT_PUBLIC_API_URL=https://api-gateway.<account>.workers.dev/api/v1

# Internal admin secret
NEXT_PUBLIC_INTERNAL_ADMIN_SECRET=<your-secret>
INTERNAL_ADMIN_SECRET=<your-secret>

# Legacy (migration phase only)
BACKEND_D1_SAAS_URL=http://localhost:8787
BACKEND_D1_SAAS_ADMIN_KEY=<your-admin-key>
```

Restart the frontend after updating:

```bash
cd frontend
npm run dev
```

## Verification via Gateway

```bash
# Health check
curl https://api-gateway.<account>.workers.dev/api/v1/health

# Internal admin (via BFF)
curl -X GET "http://localhost:3001/api/internal/admin/taxonomy?type=categories" \
  -H "x-internal-secret: <your-secret>"

curl -X GET "http://localhost:3001/api/internal/admin/analytics/dashboard?range=7d" \
  -H "x-internal-secret: <your-secret>"
```

## Reference Data Shapes

- **Supabase**: profiles, stories, chapters, categories, authors, story_likes, site_settings, audit_logs, system_settings
- **Comics D1**: comics, chapters, pages, audit_logs
- **Stories D1**: stories, chapters, comments
- **Admin D1**: profiles, audit_logs, site_settings
- **Legacy D1**: tenants (control plane)

## Reference Docs

- `docs/TESTING.md`
- `docs/WORKERS_DEPLOYMENT.md`
- `backend-supabase/docs/db-schema.md`
- `backend-supabase/docs/ANALYTICS_WORKER_SETUP.md`
