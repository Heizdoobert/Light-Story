# Spec: Next.js App Router Architecture, SEO, OG Images & Production Pipeline

## Objective
Implement Next.js App Router production, SEO, networking, and deployment standards for Light-Story:
1. **SEO & Dynamic OG Images**: Add `metadataBase`, dynamic `generateMetadata()` for comic/chapter pages, and Edge `next/og` `opengraph-image.tsx` routes.
2. **Route Handlers & Middleware Audit**: Clean API verb handlers (`GET`, `POST`, `OPTIONS`), lightweight middleware security headers, and health endpoint (`/api/health`).
3. **Deployment Readiness**: Verify `standalone` Docker config (`next.config.js`), Zod env schema validation, and zero-downtime CI check.

## Tech Stack
- **Framework**: Next.js (App Router), React 18 / 19
- **OG Generation**: `next/og` (`ImageResponse` on Edge Runtime)
- **State & Data**: React Query (`@tanstack/react-query`), Supabase SSR
- **Types & Env**: TypeScript, Zod

## Commands
- Build: `npm run build` (inside `frontend/`)
- Test: `npm run test:run` (inside `frontend/`)
- Lint/Typecheck: `npm run lint` (inside `frontend/`)
- Dev: `npm run dev` (inside `frontend/`)

## Project Structure
```
frontend/
├── middleware.ts                   → Global Edge security headers & route protection
├── next.config.js                  → Standalone build output & security headers
├── src/
│   ├── env.mjs                     → Zod environment variable validation
│   ├── app/
│   │   ├── layout.tsx              → Root metadataBase & base metadata configuration
│   │   ├── api/
│   │   │   └── health/route.ts     → Orchestration health check route handler
│   │   └── opengraph-image.tsx     → Global default dynamic open-graph image
tasks/
├── spec.md                         → This specification document
├── plan.md                         → Execution plan
└── todo.md                         → Task checklist
```

## Code Style
```tsx
// Route Handler Standard (app/api/health/route.ts)
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 });
}
```
- Direct services in `frontend/src/services/`.
- No over-engineered domain/clean layers.
- Mark minimal code choices with `// ponytail:` comment.

## Testing Strategy
- Framework: Vitest (`npm run test:run`)
- Verification: Standalone build test (`npm run build`) & TypeScript check (`npm run lint`).

## Boundaries
- **Always do**: Run lint & typecheck before committing (`npm run lint`), scope changes to `fix/bug-fix` branch.
- **Ask first**: Schema modifications in Supabase or structural rewrite of `middleware.ts`.
- **Never do**: Push directly to `main`, remove failing tests, hardcode production secrets.

## Success Criteria
- [ ] `metadataBase` configured in root `layout.tsx`.
- [ ] Global default dynamic OG image (`app/opengraph-image.tsx`) created with `next/og`.
- [ ] Health check endpoint (`/api/health/route.ts`) returning 200 status JSON.
- [ ] Environment variable validation (`src/env.mjs`) with Zod.
- [ ] `npm run build` succeeds cleanly in `frontend/`.

## Open Questions
- None. Ready for Phase 2 (Plan & Tasks).
