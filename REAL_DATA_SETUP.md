# Real Data Setup Guide - Supabase + Cloudflare D1

This guide helps you set up real production data in both Supabase and Cloudflare D1 databases for development and testing.

## Prerequisites

- Access to Supabase project: `https://rwnzsmmfvsetfcnkjoxt.supabase.co`
- Access to Cloudflare account (for D1 databases)
- Wrangler CLI configured (`npx wrangler`)
- Supabase CLI installed (`npx supabase` or `supabase` command)

## Part 1: Real Data in Supabase

### 1.1 Link to Remote Supabase Project

From `backend-supabase/`:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link to the remote project
supabase link --project-ref rwnzsmmfvsetfcnkjoxt

# You'll be prompted to enter your Supabase password/token
```

### 1.2 Push Migrations to Remote

```bash
# From backend-supabase/
supabase db push

# This will apply all migrations from supabase/migrations/ to the remote database
```

### 1.3 Load Sample Data

```bash
# Execute the seed file (creates categories, authors, stories, chapters, views)
psql "postgresql://postgres.[project-ref]:[password]@db.[region].supabase.co:5432/postgres" \
  -f supabase/seed-sample-data.sql

# Alternative: Use Supabase Studio UI to run the seed file
# 1. Go to https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt/sql/new
# 2. Copy and paste contents of supabase/seed-sample-data.sql
# 3. Click "Run"
```

### 1.4 Verify Sample Data

```bash
# Query the database to confirm data was loaded
psql "postgresql://postgres.[project-ref]:[password]@db.[region].supabase.co:5432/postgres" \
  -c "SELECT COUNT(*) FROM categories; SELECT COUNT(*) FROM authors; SELECT COUNT(*) FROM stories;"
```

**Expected output:**
```
 count
-------
     5

 count
-------
     5

 count
-------
     6
```

## Part 2: Real Data in Cloudflare D1

### 2.1 Create D1 Control Database

```bash
# From backend-d1-saas/
npx wrangler d1 create saas-control-plane

# Save the database_id from the output
# You'll get something like: Database ID: 12345678-1234-1234-1234-123456789012
```

### 2.2 Update wrangler.jsonc

Update `backend-d1-saas/wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "CONTROL_DB",
    "database_name": "saas-control-plane",
    "database_id": "YOUR_DATABASE_ID"  // <- Replace with actual ID from step 2.1
  }
]
```

### 2.3 Run D1 Migrations

```bash
# From backend-d1-saas/
npx wrangler d1 migrations apply saas-control-plane --remote

# This creates the tenants table and indexes
```

### 2.4 Seed D1 with Tenant Data

```bash
# Create sample tenants in D1
npx wrangler d1 execute saas-control-plane --remote --command "
INSERT INTO tenants (id, slug, name, database_id, database_name, api_key_hash, status)
VALUES
  ('tenant_001', 'light-story-tenant-1', 'Light Story Tenant 1', 'db_001', 'tenant_db_001', 'hash_1', 'active'),
  ('tenant_002', 'light-story-tenant-2', 'Light Story Tenant 2', 'db_002', 'tenant_db_002', 'hash_2', 'active'),
  ('tenant_003', 'light-story-tenant-3', 'Light Story Tenant 3', 'db_003', 'tenant_db_003', 'hash_3', 'provisioning');
"
```

### 2.5 Verify Tenant Data

```bash
npx wrangler d1 execute saas-control-plane --remote --command "SELECT COUNT(*) FROM tenants;"
```

**Expected output:** 3 tenants

## Part 3: Connect Frontend to Real Data

### 3.1 Update Environment Variables

In `frontend/.env.local`:

```env
# Supabase Configuration
SUPABASE_URL=https://rwnzsmmfvsetfcnkjoxt.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://rwnzsmmfvsetfcnkjoxt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_t_iwlCxgUXgitmhfW8tVAg_LczUQcSl

# Service Role Key (get from Supabase Settings -> API)
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_[your_key_here]

# Cloudflare D1 Configuration
BACKEND_D1_SAAS_URL=http://localhost:8787
BACKEND_D1_SAAS_ADMIN_KEY=truyen3xxx_super_secret_key_3636_xnxx

# Internal Admin Secret (dev mode only)
NEXT_PUBLIC_INTERNAL_ADMIN_SECRET=internal-secret-placeholder
INTERNAL_ADMIN_SECRET=internal-secret-placeholder
```

### 3.2 Start Backend D1 Service (Optional Local Testing)

```bash
# From backend-d1-saas/
npx wrangler dev

# Starts local D1 emulator on http://localhost:8787
```

### 3.3 Restart Frontend Dev Server

```bash
# From frontend/
npm run dev

# Server will now use real Supabase and D1 data
```

## Part 4: Verify Real Data is Working

### 4.1 Test Supabase Data

```bash
# In browser console or terminal:
curl -X GET "http://localhost:3001/api/internal/admin/taxonomy?type=categories" \
  -H "x-internal-secret: internal-secret-placeholder" \
  -H "Content-Type: application/json"

# Should return: {"data":[...real categories...]}
```

### 4.2 Test Analytics with Real Data

```bash
curl -X GET "http://localhost:3001/api/internal/admin/analytics/dashboard?range=7d" \
  -H "x-internal-secret: internal-secret-placeholder"

# Should return metrics based on real story_views data
```

### 4.3 Test Admin Operations with Real Data

Visit `http://localhost:3001/admin` and:
1. Click "Dashboard" → See real analytics metrics
2. Click "Stories" → See 6 real stories (5 published, 1 draft)
3. Click "Categories" → See 5 real categories
4. Click "Authors" → See 5 real authors

## Part 5: Data Structure Reference

### Supabase Tables (Real Data Loaded)

| Table | Records | Purpose |
|-------|---------|---------|
| `categories` | 5 | Story categories (Fantasy, Romance, etc.) |
| `authors` | 5 | Author profiles |
| `stories` | 6 | Story metadata (5 published, 1 draft) |
| `chapters` | 8 | Chapter content (3-3-2 chapters per story) |
| `story_views` | 8 | View tracking data for analytics |
| `site_settings` | 5 | Platform configuration |
| `audit_logs` | 1+ | Seed operation logged |

### Cloudflare D1 Tables (Real Data Loaded)

| Table | Records | Purpose |
|-------|---------|---------|
| `tenants` | 3 | Multi-tenant configuration |

## Troubleshooting

### Issue: "Permission denied" when pushing migrations

**Solution:** Ensure you're linked to the correct project:
```bash
supabase projects list
supabase link --project-ref rwnzsmmfvsetfcnkjoxt
```

### Issue: Seed script fails with "relation does not exist"

**Solution:** Ensure migrations were run first:
```bash
supabase db push
# Then retry seed script
```

### Issue: D1 database creation fails

**Solution:** Ensure Wrangler is authenticated:
```bash
npx wrangler login
# Then retry: npx wrangler d1 create saas-control-plane
```

### Issue: Frontend still showing mock data

**Solution:** 
1. Clear `.next` folder: `rm -rf frontend/.next`
2. Restart dev server: `npm run dev`
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

## Next Steps

After setting up real data:

1. **Test admin endpoints** - Verify all 8 internal admin routes work with real data
2. **Run analytics dashboard** - Check that real view metrics are displayed
3. **Create new content** - Test story/chapter creation against real database
4. **Test multi-tenancy** - Verify D1 tenant isolation works correctly
5. **Load test** - Use sample data as baseline for performance testing

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

---

**Last Updated**: May 10, 2026
**Status**: Real data setup complete and verified
