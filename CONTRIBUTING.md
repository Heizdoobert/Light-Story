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

## Supabase Rules of Thumb

- Prefer `VITE_*` environment variables for the frontend.
- Keep privileged database helpers out of exposed schemas.
- Verify RLS policies against the actual role model, not just the happy path.
- Avoid shipping schema changes without a migration entry.
- Treat `backend-supabase/supabase/tests/` as part of the release checklist for backend work.