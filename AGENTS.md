# AGENTS.md

## Tech Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4 (CSS-first: `@theme` tokens in `frontend/src/app/globals.css`)
- State: React context + TanStack Query; UI: motion/react + lucide-react
- Backend: single Cloudflare Worker `workers/kv-worker` (gateway: R2, KV, queue, workflow) + Supabase (Postgres, auth, storage)
- i18n: VI/EN via `frontend/src/lib/i18n/translations.ts` — every user-facing string is a key there, never hardcoded

## Commands
Run from the `frontend/` directory unless noted:

| Task | Command |
|------|---------|
| Test suite | `npm test` |
| Test a tier | `npm test -- __tests__/tier1` (or `tier2`/`tier3`/`tier4`) |
| Lint | `npm run lint` — 0 errors required |
| Typecheck | `npx tsc --noEmit` |
| Dev | `npm run dev` (port 3001) |
| Gateway dev | `npm run dev:gateway` (wrangler dev --remote, port 8787) |
| Build | `npm run build` |

## Conventions
- `"use client"` at top of interactive component files only (entry points; server components for static content/data fetching). Source: https://nextjs.org/docs/app/api-reference/directives/use-client
- Presenter pattern: page → `hooks/presenters/useXPresenter` → dumb component (e.g. `HomePage.tsx`)
- Named exports; no default exports for components
- No emoji in public UI — lucide-react icons only
- Dark mode: class-driven via `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. Source: https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually
- UI colors: orange-500/amber-600 gradient (light), `primary`/`accent` tokens (dark)
- Tests: vitest + Testing Library, `vi.mock` for next/navigation/contexts/sonner, files in `src/__tests__/tier{1-4}/f_*.test.tsx`; assert behavior, not implementation

## Boundaries
- Never commit `.env` files or secrets (gitignored)
- Don't edit `workers/` or Supabase migrations for frontend tasks (separate deploys)
- Architecture decisions → ADRs in `docs/decisions/`; gateway URL contract: `docs/decisions/ADR-001-gateway-url-fallback.md`
- `.opencode/` and `tasks/` are gitignored local tooling — changes there never commit
- All tests pass + lint 0 errors before committing (pre-commit hook runs lint)

## Patterns
- Presenter-fed section layout: `frontend/src/components/comics/HomePage.tsx`
- Context-mocked component test: `frontend/src/__tests__/tier3/f_public_header.test.tsx`
