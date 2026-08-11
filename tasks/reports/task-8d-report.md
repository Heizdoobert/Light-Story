# Task 8d Report — Fix Batch 2b (genres + (user) group Highs)

Commit: `7ae05ee` — `fix(app): filter genre pages by slug, guard (user) group, route profile via server action`
Workdir: `D:\Light-Story\frontend` | Branch: preview

## Summary

| Finding | Status |
|---------|--------|
| H4 (genre pages ignore slug) | FIXED — page resolves slug → category NAME, filters via `initialCategory`, `notFound()` on miss |
| H5 (no auth guard on (user) group) | FIXED — session guard in `(user)/layout.tsx`, loading state, client redirect to `ROUTES.LOGIN` |
| H6 (profile bypasses server action + Zod) | FIXED — happy path routed solely through `updateUserProfile` |

## Category-param semantics verification (H4 prerequisite)

Verified against the backend gateway BEFORE finalizing:

- `workers/kv-worker/src/routes/stories.ts:43,60-62` — `GET /api/stories?category=X` builds `category=ilike.*X*` against the `stories.category` column, which stores category **NAMES** (comma-joined; see `payload.category.join(', ')` at stories.ts:98-101). Param expects a **NAME**, case-insensitive substring.
- `frontend/src/components/comics/FilterMenu.tsx:67` pushes `category=<catName>` on the search page — consistent name semantics.
- Conclusion: the brief's assumption (pass the matched category **NAME**) is correct. No conflict → normal DONE, not DONE_WITH_CONCERNS.

## Per-finding before/after

### H4 — `src/app/(public)/genres/[genreSlug]/page.tsx` + presenter + content

Before: `GenreDetailPage` returned `<SearchPageContent />` with no props; `useSearchPresenter()` read only `useSearchParams()`, so `/genres/<slug>` rendered the unfiltered search.

After:
- `page.tsx` (server component, matches `comics/[comicId]/page.tsx` pattern): awaits `params`, fetches `categories (id, name)` via `getServerSupabase()` (the codebase's established server-component data path — see `comics/[comicId]/page.tsx:17`), finds `normalizeName(category.name) === normalizeName(genreSlug)`, `notFound()` if unresolved, else renders `<SearchPageContent initialCategory={match.name} />`.
  - Note: the brief suggested `fetchCategories()` from `taxonomy.service.ts`, but that endpoint (`/api/admin/taxonomy?entity=category`) requires a valid JWT on the gateway (`workers/kv-worker/src/index.ts:410-412` returns 401 for `/admin/*` without `authCtx`), and a server component has no browser token → guaranteed 401. The public gateway `/categories` route (`stories.ts:23-31`) is public but returns only `id,name`; the server-supabase query is the minimal, existing-pattern, auth-free equivalent. Semantics unchanged (match by NAME).
  - `normalizeName` is diacritics-aware (NFD strip + đ→d) so Vietnamese names ("Hành Động" → `hanh-dong`) and ASCII names ("Fantasy" → `fantasy`) both resolve; compare is case-insensitive per brief.
- `useSearchPresenter.ts`: signature `useSearchPresenter(initialCategory?: string)`; `categoryParam = searchParams.get("category") || initialCategory || "all"` — URL param still wins (filter menu on genre page navigates to `/search?category=...` as before).
- `SearchPageContent.tsx`: `React.FC<{ initialCategory?: string }>` passes the prop through. Other callers (`/search`, `/comics` pages) pass nothing — unaffected (optional prop).

### H5 — `src/app/(user)/layout.tsx`

Before: no session check; `/user/*` rendered for anyone.

After:
- `const { user, loading } = useAuth();` + `useRouter()`.
- `useEffect`: `if (!loading && !user) router.replace(ROUTES.LOGIN)` (client-side redirect — no server `redirect()` in a 'use client' layout).
- `loading` → renders the group's existing loading UI (`import UserLoading from './loading'`, the spinner used by the segment).
- `!user` (post-loading) → `null` while the redirect fires; `children` render only when authenticated.
- `AuthProvider` wraps the app at root (`src/app/providers.tsx:44`), so `useAuth` is safe here.

### H6 — `src/app/(user)/user/profile/page.tsx`

Before: browser `supabase.from('profiles').update(...)` direct write; `updateUserProfile` action used only as fallback when the direct write errored.

After: direct write and `getSupabaseBrowserClient` import removed; the only path is `const res = await updateUserProfile(user.id, { full_name: fullName, avatar_url: avatarUrl }); if (!res.success) throw new Error(res.error);` — Zod validation + server-side ownership check (requireActionRole + `currentUserId !== userId` guard) now always apply. Toast/saving UX unchanged.

## Verification outputs

- `npm run build` — PASS (all routes compiled; `/genres/[genreSlug]` = ƒ dynamic, `/user/*` = ○ static).
- `npm run test:run` — PASS: 45 files, 385 tests (0 failures).
- `npm run lint` — PASS ("Lint ok"; project lint is an echo stub).

## Files changed

- `frontend/src/app/(public)/genres/[genreSlug]/page.tsx` (rewritten)
- `frontend/src/hooks/presenters/useSearchPresenter.ts` (+1 line)
- `frontend/src/components/comics/SearchPageContent.tsx` (+3 lines)
- `frontend/src/app/(user)/layout.tsx` (+11 lines)
- `frontend/src/app/(user)/user/profile/page.tsx` (−9 lines)

Only these 5 files staged; unrelated worktree changes (opencode.json, tasks/) left untouched.

## Concerns

1. H4 uses `getServerSupabase()` instead of the brief-named `fetchCategories()` because that client-service endpoint is admin-auth-gated (gateway `index.ts:410-412`) and cannot run in a server component. Same NAME-matching semantics; noted for plan traceability.
2. H6: after saving, `useUser()`-backed profile state and AuthContext profile are not refreshed until reload (pre-existing behavior; the old fallback path also didn't refresh). Not a regression; the write itself is now validated.
3. Category names on the site are Vietnamese; slugs are defined by `normalizeName` (NFD strip). Links to `/genres/<slug>` must use the normalized form (no existing in-app links to update).
