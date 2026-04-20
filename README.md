# Light Story

Light Story is an online reading platform with a Vite frontend and a Supabase backend.

## Repository Layout

```text
/
  frontend/                # React + Vite application
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
```

Environment variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

The app also accepts `NEXT_PUBLIC_*` keys for compatibility, but `VITE_*` is the primary convention.

## Backend

Location: `backend-supabase/supabase/`

Contains:

- `migrations/` for versioned SQL
- `functions/` for Edge Functions
- `tests/` for SQL smoke checks
- `config.toml` for local Supabase settings

Current baseline migration:

- `backend-supabase/supabase/migrations/202604200001_mvp_init.sql`

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

You can run this from the repository root or from `frontend/`; the root `package.json` forwards the command to the Vite app.

3. Build and type-check the frontend before shipping:

```bash
npm run lint
npm run build
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

- run frontend lint and build
- validate backend file structure
- open an automatic pull request for non-main pushes after CI succeeds

## Contributing

Contributor workflow and PR guidance live in [CONTRIBUTING.md](CONTRIBUTING.md).

## Notes

- `agents/` is intentionally git-ignored for local project memory.
- Legacy SQL files at the repository root are retained for reference during transition.
