# Staging Deployment Runbook - Comic Platform

This runbook guides deployment of the comic platform to a staging Supabase project.

## Prerequisites

- Staging Supabase project created (separate from production)
- `.env` file with staging credentials:
  ```
  SUPABASE_URL=https://staging-xyz.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=sb_service_role_staging_xxxxx
  OPENAI_API_KEY=sk-...
  ```
- Deno CLI installed (for Edge Function testing)
- wrangler CLI installed (for R2 Worker testing)

## Step 1: Apply Database Migrations

```bash
cd backend-supabase/supabase
# Load environment
$env:SUPABASE_URL = 'https://staging-xyz.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'sb_service_role_staging_xxxxx'

# Run migrations
.\scripts\apply_migrations.ps1

# Verify in Supabase dashboard:
# - `stories` table exists with pgvector column
# - `chapters` table exists with vip_content column
# - RLS policies are enabled on both tables
# - `idx_stories_search_vector` index created
# - `search_stories()` RPC available
```

## Step 2: Deploy Edge Function

```bash
cd backend-supabase

# Link to staging project
supabase link --project-id staging_project_id

# Set secrets
supabase secrets set SUPABASE_URL=https://staging-xyz.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_service_role_staging_xxxxx

# Deploy Edge Function
supabase functions deploy payment_and_rewards

# Verify in Supabase dashboard:
# - Function listed under Edge Functions
# - Logs available for monitoring
```

## Step 3: Test Edge Function Locally

```bash
cd backend-supabase

# Start local emulator
supabase start

# In another terminal, test the webhook
curl -X POST http://localhost:54321/functions/v1/payment_and_rewards \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_webhook",
    "data": {
      "user_id": "test-user-123",
      "amount": 9.99,
      "provider": "stripe"
    }
  }'

# Expected response: { "recorded": true }

# Test daily checkin
curl -X POST http://localhost:54321/functions/v1/payment_and_rewards \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_checkin",
    "data": {
      "user_id": "test-user-123"
    }
  }'

# Expected response: { "rewarded": true }
```

## Step 4: Backfill Test Data with Embeddings

```bash
cd backend-supabase/supabase/scripts

npm install

# For testing without OpenAI (uses mock embeddings)
node backfill_embeddings.js

# With OpenAI
$env:OPENAI_API_KEY = 'sk-...'
node backfill_embeddings.js

# Verify in Supabase:
# SELECT COUNT(*) FROM public.stories WHERE search_vector IS NOT NULL;
# Should show backfilled rows
```

## Step 5: Test RLS Policies

```bash
# In Supabase SQL Editor, run tests
-- Create test rows
INSERT INTO public.stories (title, status) VALUES ('Published Story', 'published');
INSERT INTO public.stories (title, status) VALUES ('Draft Story', 'draft');

-- Test as public user (no auth)
-- Query: SELECT * FROM public.stories;
-- Expected: Only published stories returned

-- Test RLS with premium user role
-- (Requires auth context with role = 'premium' in profile)
-- Query: SELECT * FROM public.chapters WHERE vip_content = true;
-- Expected: Rows returned for premium users
```

## Step 6: Deploy Frontend Changes

```bash
cd frontend

# Build with staging environment
npm run build

# Verify:
# - useChapterSubscription hook integrated in chapter viewer
# - Frontend connects to staging Supabase URL
# - Realtime subscription works

# Deploy to staging hosting (Vercel/Firebase/etc.)
npm run deploy:staging
```

## Step 7: Create Test Content

```sql
-- Insert test story with free and VIP chapters
INSERT INTO public.stories (id, title, summary, status)
VALUES (
  'test-story-001',
  'Test Comic Series',
  'A test comic for staging',
  'published'
)
ON CONFLICT DO NOTHING;

-- Insert free chapter
INSERT INTO public.chapters (story_id, chapter_number, title, content, vip_content)
VALUES (
  'test-story-001',
  1,
  'Chapter 1: Beginning',
  'This is a free chapter',
  false
)
ON CONFLICT DO NOTHING;

-- Insert VIP chapter
INSERT INTO public.chapters (story_id, chapter_number, title, content, vip_content)
VALUES (
  'test-story-001',
  2,
  'Chapter 2: Premium Content',
  'This is VIP-only content',
  true
)
ON CONFLICT DO NOTHING;
```

## Step 8: Configure R2 Worker (Optional)

```bash
cd workers/r2-signed-url

# Create staging R2 bucket (in Cloudflare dashboard)
# Update wrangler.toml with staging bucket name

# Test locally
wrangler dev

# Visit http://localhost:8787/public/test.png
# Should test JWT verification and asset access

# Deploy to staging Workers
wrangler deploy --env staging
```

## Validation Checklist

- [ ] Migrations applied successfully
- [ ] Edge Function deployed and responding to requests
- [ ] Backfill completed (embeddings generated)
- [ ] RLS policies verified (public/VIP access control)
- [ ] Frontend builds and connects to staging
- [ ] Test content created and accessible
- [ ] Realtime chapter subscriptions working
- [ ] R2 Worker deployed (optional)

## Rollback Procedure

If issues occur:

```bash
# Revert migrations
cd backend-supabase
supabase db reset

# Undeploy Edge Function
supabase functions delete payment_and_rewards

# Redeploy previous version if needed
git checkout main
supabase functions deploy payment_and_rewards
```

## Monitoring

Monitor staging environment:

```bash
# Edge Function logs
supabase functions logs payment_and_rewards --project-id staging_project_id

# Database usage
supabase db usage --project-id staging_project_id

# Check Realtime subscriptions
# In Supabase dashboard: Database → Realtime → Check active subscriptions
```

## Next Steps

After successful staging deployment:
1. Run full integration tests
2. Load test with simulated traffic
3. Verify cost estimates
4. Get stakeholder approval
5. Deploy to production using same runbook
