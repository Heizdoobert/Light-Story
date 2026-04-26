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
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

The app accepts both `VITE_*` and `NEXT_PUBLIC_*` keys for compatibility.

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
