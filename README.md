# Light Story

Light Story is an online reading platform with a Next.js frontend and a Supabase backend.

## Repository Layout

```text
/
  frontend/                # Next.js application (App Router)
  backend-supabase/        # Supabase config, migrations, functions, tests
  agents/                  # Local project memory, ignored by git
  docs/                    # Architecture and release notes
```

## Frontend

Location: `frontend/`

Main scripts:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run ci:verify
```

Environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Server-side (do NOT expose these in the browser):
# `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role key used by server internal routes/functions.
# `INTERNAL_ADMIN_SECRET` — short, high-entropy secret to allow trusted internal requests.
```

Use `NEXT_PUBLIC_*` keys for frontend runtime configuration.

### Authentication & Access

- Sign in with password, Google OAuth, and email magic link.
- User self-registration with email verification.
- Dedicated password reset flow via `/auth/reset-password`.
- Role-based admin access for `superadmin`, `admin`, and `employee` with route guards.
- Admin user-role operations are hardened to prevent unsafe role transitions and self-role edits.

### Admin Operations

- Operations center for core content, user, commerce, analytics, and system workflows.
- Operations data tab to validate backend admin tables and row counts in real time.
- Menu visibility controls for role-based sidebar configuration.
- System settings backup and restore for the settings surface managed in the UI.

## Backend

Location: `backend-supabase/supabase/`

Contains:

- `migrations/` for versioned SQL
- `functions/` for Edge Functions
- `tests/` for SQL smoke checks
- `config.toml` for local Supabase settings

Current baseline migration:

- `backend-supabase/supabase/migrations/202604200001_mvp_init.sql`

Recent operations migration:

- `backend-supabase/supabase/migrations/20260421074259_admin_operations_schema.sql`
  - Adds collections, moderation queue, crawler sources/runs, VIP plans/subscriptions,
    promotions/events, transactions, comments/ratings, and revenue snapshots.

Suggested verification scope:

- `backend-supabase/supabase/tests/rls_smoke.sql`
- `backend-supabase/supabase/tests/rpc_smoke.sql`


## Security & Performance Updates (April 2026)

Recent comprehensive audit identified and resolved 10 critical security, performance, and reliability issues:

### Database & Security (3 items)
1. **RLS Policy Hardening** - Fixed critical "select true" leak on site_settings that exposed ad keys and sensitive config to unauthenticated users. Now requires authentication with restricted "public_*" key access.
2. **View Count Race Condition** - Replaced simple UPDATE with idempotent RPC using story_views tracking table, preventing duplicate increments under high concurrency.
3. **Profile Role Escalation Prevention** - Verified and maintained trigger-based protection preventing unauthorized role changes; only superadmin can modify user roles.

### Frontend Performance (3 items)
4. **Ad Injection Optimization** - Deferred ad script injection using requestIdleCallback (fallback setTimeout) to prevent main thread blocking and improve Lighthouse scores.
5. **Bundle Size Reduction** - Implemented dynamic imports for admin dashboard; non-admin users no longer download admin code (~13KB saved).
6. **Dark Mode FOUC Prevention** - Applied blocking script pattern + useLayoutEffect to eliminate white flash on load by applying theme before React hydrates.

### Error Handling & UX (4 items)
7. **Global Error Handling** - Added useGlobalErrorHandler hook and GlobalErrorHandler component to catch unhandled promise rejections and surface Supabase errors via toast UI.
8. **Chapter Draft Auto-Save** - Implemented useAutoSave hook with 3-second debounced localStorage backup; unsaved work persists across session expiry and tab crashes.
9. **Client-Side RBAC Audit** - Created RLS audit migration verifying all admin tables enforce role-based access; client-side protections are supplementary only.
10. **Optimistic Updates Foundation** - Created useOptimisticUpdate hook enabling snappier UI feedback for likes/views; integration examples in `frontend/src/examples/OptimisticUpdateExample.tsx`.

**Commits**: 935242d, a99a3cf (completed April 28, 2026)

### Usage Notes
- Optimistic updates are ready for integration via `useStoryMutations` hook
- Auto-save recovery automatically triggers on page reload with user notification
- Theme blocking script runs before React initialization; check suppressHydrationWarning in html tag if troubleshooting
- RLS audit migration can be run manually: `SELECT * FROM app_private.check_rls_policies();`


## Local Setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Run the app locally:

```bash
npm run dev
```

Default dev server runs on `http://localhost:3001`.

You can run this from the repository root with `npm --prefix frontend run dev` or directly inside `frontend/`.

3. Build and type-check the frontend before shipping:

```bash
npm run lint
npm run build
npm run ci:verify
```

4. If you hit intermittent `500` with missing `.next` artifacts (for example `routes-manifest.json`), reset local cache and restart:

```bash
taskkill /F /IM node.exe
rm -r frontend/.next
npm --prefix frontend run dev
```

## Supabase Sync

Use the Supabase CLI from `backend-supabase/`:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy increment-story-views
supabase functions deploy manage-story
supabase functions deploy manage-chapter
```

## Deployment & Internal API notes

- The frontend exposes internal server routes under `/api/internal/admin/*` that must be protected in production.
- Set `SUPABASE_SERVICE_ROLE_KEY` and `INTERNAL_ADMIN_SECRET` in the deployment environment before enabling admin features.
- Recommended workflow:
  1. Add `SUPABASE_SERVICE_ROLE_KEY` and `INTERNAL_ADMIN_SECRET` to your hosting provider's secret store (Vercel/Netlify/Cloud run env vars).
  2. Ensure only server-side code reads `SUPABASE_SERVICE_ROLE_KEY`; never surface this key to the browser.
  3. The internal routes support two auth paths:
     - Bearer JWT: client sends `Authorization: Bearer <access_token>`; server verifies token and profile role using the service role client.
     - Internal secret: send `x-internal-secret: <INTERNAL_ADMIN_SECRET>` from trusted internal services for automation.
  4. Audit access logs and rotate `INTERNAL_ADMIN_SECRET` regularly.

### Testing internal routes locally

To validate the internal admin endpoints return the expected authorization responses during local development, run the dev server and the included smoke test:

```bash
# from repo root
npm --prefix frontend run dev
# in another shell (no secrets set)
npm --prefix frontend run test:internal-auth
```

If you need to run the smoke test with service-role credentials, set `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` (do not commit it) and re-run the test to exercise server-side behavior.

### Replacing client Edge Function calls

- The previous client call to the `manage-user` Edge Function has been replaced by a proxied internal endpoint at `/api/internal/admin/manage-user` that performs server-side role checks and calls Supabase admin APIs using the service role key.
- If you deploy the backend Edge Function `manage-user`, it can remain as a fallback for external integrations, but the frontend now prefers the internal route for admin actions.

The linked project in this workspace is `rwnzsmmfvsetfcnkjoxt`.

## CI

The repository uses GitHub Actions to:

- clean Next cache, then run frontend `ci:verify` (type-check + build)
- validate backend file structure
- open an automatic pull request for non-main pushes after CI succeeds

## Contributing

Contributor workflow and PR guidance live in [CONTRIBUTING.md](CONTRIBUTING.md).

## Notes

- `agents/` is intentionally git-ignored for local project memory.
- Legacy SQL files at the repository root are retained for reference during transition.

