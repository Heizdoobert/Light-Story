# Light Story

Light Story is an online reading platform with a React frontend and a Supabase backend stack.

## Repository Layout

```text
/
   frontend/                # React + Vite application
   backend-supabase/        # Supabase config, migrations, functions, docs
   agents/                  # Local project knowledge (ignored by git)
   docs/                    # Architecture and ADR workspace
```

## Frontend

- Location: `frontend/`
- Stack: React, TypeScript, Vite
- Main scripts:
   - `npm run dev`
   - `npm run build`
   - `npm run lint`

Environment variables expected in `frontend/.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

## Backend (Supabase)

- Location: `backend-supabase/supabase/`
- Contains:
   - `migrations/` for versioned SQL
   - `functions/` for edge functions
   - `seed.sql` for local seed data
   - `config.toml` for local Supabase settings

MVP baseline migration:

- `backend-supabase/supabase/migrations/202604200001_mvp_init.sql`

## Quick Start

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Start frontend locally:

```bash
npm run dev
```

3. Apply backend migration in your Supabase project using your preferred workflow.

## Notes

- `agents/` is intentionally git-ignored for local project memory.
- Existing legacy SQL files at repository root are retained for reference during transition.
