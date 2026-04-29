# Contributing

This project keeps the frontend and Supabase backend in the same repository, so most changes touch both code and deployment concerns. Keep each PR focused and verify the impacted area before asking for review.

## Workflow

1. Branch from `main`.
2. Make the smallest safe change that solves the problem.
3. Run the relevant local checks.
4. Push the branch and review the generated PR.

## Frontend Checks

Run these from `frontend/` when you touch UI, data fetching, routing, or shared TypeScript code:

```bash
npm install
npm run lint
npm run build
```

## Supabase Checks

Run these from `backend-supabase/` when you touch schema, policies, migrations, or Edge Functions:

```bash
supabase login
supabase link --project-ref rwnzsmmfvsetfcnkjoxt
supabase db push
supabase functions deploy increment-story-views
supabase functions deploy manage-story
supabase functions deploy manage-chapter
```

If the change affects RLS, RPCs, or auth-sensitive behavior, also keep the SQL smoke tests in `backend-supabase/supabase/tests/` aligned with the expected access model.

## PR Checklist

Include the following in your PR description when applicable:

- a short summary of the user-facing change
- migration or deployment notes
- rollback notes for database or auth changes
- verification results, especially frontend build output and Supabase deploy status

## Deployment & Internal Routes (developers)

- Add the following environment variables to your deployment provider before enabling admin features:
	- `NEXT_PUBLIC_SUPABASE_URL` (frontend)
	- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (frontend)
	- `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by internal routes)
	- `INTERNAL_ADMIN_SECRET` (server-only; short HMAC-like secret for trusted requests)

- Quick local test for internal-route auth (requires dev server running):

```bash
# from repo root
npm --prefix frontend run dev
# in another shell
npm --prefix frontend run test:internal-auth
```

The test simply verifies internal admin endpoints return HTTP 401/403 when no credentials are provided. For full integration tests that exercise Supabase admin operations you must set `SUPABASE_SERVICE_ROLE_KEY` and other Supabase env vars in your test environment.

## Supabase Rules of Thumb

- Prefer `VITE_*` environment variables for the frontend.
- Keep privileged database helpers out of exposed schemas.
- Verify RLS policies against the actual role model, not just the happy path.
- Avoid shipping schema changes without a migration entry.
- Treat `backend-supabase/supabase/tests/` as part of the release checklist for backend work.