# Spec: Frontend Architecture & Directory Restructuring

## Objective
Refactor the frontend codebase to strictly conform to the user's target directory structure. Migrate existing components, services, and route handlers into the new layout, clean up redundant legacy directories (`src/views`, `src/@core`, `src/@layouts`, `src/@menu`, `src/configs`), and establish clear architectural boundaries between Public, User, and Admin route groups.

## Tech Stack
- **Framework**: Next.js 16 (App Router), React 19
- **Database & Auth**: Supabase SSR (@supabase/ssr)
- **Storage**: Cloudflare R2 Presigned POST / S3 SDK
- **State & Data**: TanStack React Query v5
- **UI & Styling**: Tailwind CSS, Lucide React, clsx + tailwind-merge (`lib/utils/cn.ts`)
- **Validation**: Zod schemas (`lib/schemas/`)

## Commands
- Build: `npm run build` (inside `frontend/`)
- Lint/Typecheck: `npm run lint` (inside `frontend/`)
- Test: `npm run test:run` (inside `frontend/`)
- Dev: `npm run dev` (inside `frontend/`)

## Target Project Structure
```
frontend/src/ (or frontend/)
├── app/
│   ├── (public)/                           → Public route group (no auth required)
│   │   ├── page.tsx                        → Home page (banner, featured comics, recent updates)
│   │   ├── comics/                         → Comics list & details
│   │   │   ├── page.tsx                    → All comics list (filter, search, pagination)
│   │   │   └── [comicId]/
│   │   │       ├── page.tsx                → Comic detail (info, chapters, ratings, comments)
│   │   │       └── chapter/
│   │   │           └── [chapterId]/
│   │   │               └── page.tsx        → Chapter reader (vertical/horizontal photo reader)
│   │   ├── genres/
│   │   │   └── [genreSlug]/
│   │   │       └── page.tsx                → Comics by genre
│   │   └── layout.tsx                      → Public layout (PublicHeader, PublicFooter, Providers)
│   │
│   ├── (user)/                             → User route group (authenticated users)
│   │   ├── dashboard/
│   │   │   └── page.tsx                    → User personal dashboard (reading progress, recommendations)
│   │   ├── history/
│   │   │   └── page.tsx                    → Reading history
│   │   ├── bookmarks/
│   │   │   └── page.tsx                    → Bookmarked / followed comics
│   │   ├── profile/
│   │   │   └── page.tsx                    → User profile & security settings
│   │   └── layout.tsx                      → User layout (UserSidebar, profile dropdown)
│   │
│   ├── (admin)/                            → Admin route group (staff / admin role required)
│   │   ├── admin/                          → /admin URL prefix
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                → Admin overview (comics, chapters, new users)
│   │   │   ├── comics/
│   │   │   │   ├── page.tsx                → Comic management table (CRUD, search)
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx            → Create comic form
│   │   │   │   └── [comicId]/
│   │   │   │       └── page.tsx            → Edit comic form
│   │   │   ├── chapters/
│   │   │   │   ├── page.tsx                → Chapter management
│   │   │   │   └── [chapterId]/
│   │   │   │       └── page.tsx            → Edit chapter & image drag-drop manager
│   │   │   ├── users/
│   │   │   │   └── page.tsx                → User management (roles, ban/unban)
│   │   │   └── audit/
│   │   │       └── page.tsx                → Audit log activity
│   │   └── layout.tsx                      → Admin layout (AdminSidebar, RBAC check)
│   │
│   ├── api/
│   │   └── webhooks/
│   │       └── supabase/route.ts           → Supabase webhooks handler
│   ├── layout.tsx                          → Root layout (<html>, <body>, global CSS, Providers)
│   ├── globals.css
│   ├── loading.tsx                         → Root loading skeleton
│   └── error.tsx                           → Root error boundary
│
├── components/
│   ├── ui/                                 → Primitives (button, input, card, skeleton, badge, modal, dropdown-menu, index.ts)
│   ├── layout/                             → Layouts (public-header, public-footer, user-sidebar, admin-sidebar, mobile-nav)
│   ├── comic/                              → Comic components (comic-card, comic-list, chapter-list, chapter-reader, rating-stars, genre-badge)
│   ├── admin/                              → Admin components (data-table, form-editor, image-uploader, stat-card)
│   └── user/                               → User components (bookmark-button, reading-progress)
│
├── lib/
│   ├── schemas/                            → Zod validation schemas (comic.ts, chapter.ts, audit.ts)
│   ├── actions/                            → Server Actions ('use server') (comic.actions.ts, chapter.actions.ts, audit.actions.ts, user.actions.ts)
│   ├── supabase/                           → Supabase client setup (client.ts, server.ts, middleware.ts)
│   ├── r2/                                 → Cloudflare R2 utilities (client.ts, upload.ts)
│   ├── hooks/                              → React custom hooks (use-user.ts, use-chapter-images.ts, use-debounce.ts)
│   ├── constants/                          → Application constants (routes.ts, cache-tags.ts, comic-status.ts, pagination.ts)
│   └── utils/                              → Pure utility functions (cn.ts, format-date.ts, api-client.ts, image-url.ts)
│
├── providers/                              → Context Providers (theme-provider, supabase-provider, query-provider)
│
├── middleware.ts                           → Root Next.js middleware (session refresh & RBAC protection)
```

## Code Style
- Client components use `"use client";` at top.
- Server Actions use `"use server";` at top of file (in `lib/actions/`).
- Import paths use `@/` alias mapped to `src/` (e.g. `@/components/ui`, `@/lib/utils/cn`, `@/lib/constants/routes`).
- Component files follow kebab-case (`comic-card.tsx`, `public-header.tsx`).

## Testing Strategy
- Framework: Vitest (`npm run test:run`)
- Quality Checks: ESLint & TypeScript compilation (`npm run lint`)
- Build Check: Production Next.js build (`npm run build`)

## Boundaries
- **Always do**: Maintain full working functionality, preserve existing working API routes & Supabase bindings, run `npm run lint` and `npm run test:run` after refactoring.
- **Ask first**: Major database schema migrations or changes to external Cloudflare worker APIs.
- **Never do**: Break existing user or admin features, leave orphaned/dangling imports to deleted directories, hardcode production credentials.

## Reframed Success Criteria
1. `src/app/` route hierarchy updated to match `(public)`, `(user)`, `(admin)` group structure exactly.
2. `src/components/` structured into `ui/`, `layout/`, `comic/`, `admin/`, and `user/`.
3. `src/lib/` organized into `schemas/`, `actions/`, `supabase/`, `r2/`, `hooks/`, `constants/`, and `utils/`.
4. `src/providers/` created containing `theme-provider.tsx`, `supabase-provider.tsx`, `query-provider.tsx`.
5. Legacy directories (`src/views`, `src/@core`, `src/@layouts`, `src/@menu`, `src/configs`) cleaned up.
6. `npm run lint`, `npm run test:run`, and `npm run build` pass cleanly without errors.

## Open Questions
- Assumptions surfaced for human confirmation before execution.
