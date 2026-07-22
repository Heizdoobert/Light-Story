# Light Story Testing Guide

## Purpose

This is the canonical testing and local validation guide for the repository.

## Frontend Validation

From `frontend/`:

```bash
npm install
npm run lint
npm run build
npm run test:run
npm run ci:verify
```

The frontend package also provides `npm run test:internal-auth` for internal route smoke checks.

## Supabase Local Emulator

Use the Supabase CLI from `backend-supabase/` when you need to validate migrations, functions, or local SQL behavior:

```powershell
cd D:\Light-Story\backend-supabase
supabase start
supabase db push
```

If you are using the frontend package scripts, `npm run supabase:start` and `npm run supabase:stop` map to the same CLI workflow.

## Backend D1 Validation

From `backend-d1-saas/`:

```bash
npm run check
npm run test
npm run test:smoke
```

`npm run dev` starts the local Wrangler worker.

## Real Data Smoke Checks

After configuring real data, verify the admin endpoints from the frontend app:

```bash
curl -X GET "http://localhost:3001/api/internal/admin/taxonomy?type=categories" \
  -H "x-internal-secret: internal-secret-placeholder"

curl -X GET "http://localhost:3001/api/internal/admin/analytics/dashboard?range=7d" \
  -H "x-internal-secret: internal-secret-placeholder"
```

## Validation Order

1. Run the narrowest check that exercises the touched slice.
2. Re-run the relevant package build or typecheck.
3. Finish with the smallest integration smoke test that proves the flow.

## Reference Docs

- `docs/REAL_DATA.md`
- `backend-supabase/docs/ANALYTICS_WORKER_SETUP.md`
- `backend-supabase/docs/db-schema.md`
- `backend-supabase/docs/rls-policies.md`
- `backend-supabase/docs/storage.md`
