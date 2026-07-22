# Staging Runbook

Deploy a full staging environment: frontend on Cloudflare Pages, Workers on Cloudflare, Supabase migrations + Edge Functions.

## Prerequisites

- Node.js and npm installed
- Supabase CLI authenticated for the staging project
- Wrangler CLI authenticated (`npx wrangler login`)
- Cloudflare Pages project created (`npx wrangler pages project create light-story-staging`)

## Step 1: Deploy Workers (Gateway + Domain Workers)

Deploy all Workers to staging. Workers must be deployed **before** the frontend so the gateway URL is available.

```bash
# Deploy API Gateway (routing + JWT + CORS)
npx wrangler deploy --env staging
cd workers/api-gateway
npx wrangler secret put SUPABASE_JWKS_URL --env staging
cd ../..

# Deploy domain workers
for dir in comics-worker stories-worker analytics-worker admin-worker; do
  cd workers/$dir
  npx wrangler deploy --env staging
  cd ../..
done

# Deploy R2 proxy
cd workers/r2-signed-url
npx wrangler deploy --env staging
cd ../..
```

## Step 2: Configure API Gateway Service Bindings

After all domain Workers are deployed, update `workers/api-gateway/wrangler.jsonc` with their staging URLs:

```json
{
  "services": [
    { "binding": "COMICS_WORKER", "service": "comics-worker", "environment": "staging" },
    { "binding": "STORIES_WORKER", "service": "stories-worker", "environment": "staging" },
    { "binding": "ANALYTICS_WORKER", "service": "analytics-worker", "environment": "staging" },
    { "binding": "ADMIN_WORKER", "service": "admin-worker", "environment": "staging" },
    { "binding": "R2_PROXY", "service": "lightstory-r2-proxy", "environment": "staging" }
  ]
}
```

Then redeploy the gateway:
```bash
cd workers/api-gateway
npx wrangler deploy --env staging
cd ../..
```

## Step 3: Deploy Supabase Migrations + Edge Functions

```bash
cd backend-supabase
supabase link --project-ref <staging-project-ref>
supabase db push
supabase functions deploy increment-story-views
supabase functions deploy manage-story
supabase functions deploy manage-chapter
supabase functions deploy manage-user
supabase functions deploy payment_and_rewards
cd ..
```

## Step 4: Deploy Frontend to Cloudflare Pages

```bash
# Build with staging env vars
set NEXT_PUBLIC_API_URL=https://api-gateway.<account>.workers.dev/api/v1
npm --prefix frontend run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy frontend/.next --project-name light-story-staging --branch main
```

## Step 5: Run Validation Checks

```bash
# Health check
curl https://api-gateway.<account>.workers.dev/api/v1/health

# Test auth flow
curl -H "Authorization: Bearer <staging-jwt>" https://api-gateway.<account>.workers.dev/api/v1/health

# Check CORS preflight
curl -X OPTIONS -H "Origin: https://staging.lightstory.pages.dev" \
  https://api-gateway.<account>.workers.dev/api/v1/health
```

Frontend checks:
- Admin route accessible only to staff roles
- Comic creation, chapter upload, and analytics dashboard load
- R2 asset proxy serves images (public and VIP-gated)

## Step 6: Run Postman API Tests

```bash
npx newman run API_test.json \
  -e postman/light-story-api.staging.postman_environment.json \
  --reporters cli,junit
```

## Rollback

```bash
# Frontend — redeploy previous build
npx wrangler pages deploy frontend/.next --project-name light-story-staging --branch previous

# Worker — rollback to previous version
npx wrangler rollback --env staging
# or specify version: wrangler rollback --version-id <id>

# Supabase — revert last migration
cd backend-supabase
supabase db remote commit
supabase db remote revert
```

## Monitoring

- Gateway logs: `npx wrangler tail --env staging` (from `workers/api-gateway/`)
- Supabase logs: `supabase functions logs` or dashboard
- Domain Worker logs: `npx wrangler tail` per worker directory