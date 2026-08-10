# Task 5 Report: (public) Route Group Review

- Date: 2026-08-08
- Scope: `frontend/src/app/(public)/` — 26 files reviewed (brief listed 21; actual tree has 26: auth group is 6 files incl. error/layout, comics has layout+page, all dynamic segments have error/layout/loading/page)
- Mode: READ-ONLY — zero code changes, no commits
- Rules source: `PROJECT_RULES.md` (I.6, I.7, I.9, I.10, II.1, III) + `CLAUDE.md`

## Summary

| Severity | Count |
|----------|-------|
| High     | 1     |
| Med      | 4     |
| Low      | 5     |

The route group pages are uniformly thin wrappers — no business logic in pages/layouts (II.1 ✓), no `'use server'` misuse (I.10 ✓), no `revalidateTag` calls at all in the group (no mutations, so I.9 is vacuous ✓), no hardcoded URLs inside the group itself (I.6 ✓ at page level), modals comply with the `max-h-[90vh]`/`overflow-y-auto` rule ✓. The findings concentrate in two places: (1) a functional bug where `genres/[genreSlug]` never reads its slug; (2) hardcoded URL strings inside the content components that these pages render.

## Per-file Verdicts

| File | Verdict |
|------|---------|
| `(public)/error.tsx` | OK — client error boundary, ROUTES.HOME used, digest shown. |
| `(public)/layout.tsx` | OK — 'use client' chrome (Header+LoginModal+Footer), known/accepted (Task 2). |
| `(public)/loading.tsx` | OK — skeleton. |
| `(public)/page.tsx` | OK — static metadata + thin delegate to HomePage. |
| `auth/error.tsx` | OK — mirrors public error, ROUTES used. |
| `auth/layout.tsx` | OK — static metadata. Minor: no `loading.tsx` sibling (Low F8). |
| `auth/login/page.tsx` | STUB — placeholder text only, no form (modal does auth), no metadata (Low F7). |
| `auth/register/page.tsx` | STUB — same (Low F7). |
| `auth/forgetPassword/page.tsx` | STUB — "under development"; the real reset-email flow lives in LoginModal; route is effectively dead (Low F7). |
| `auth/reset-password/page.tsx` | OK as a page — delegates to ResetPasswordPage. Component itself violates I.7 (Med F2). |
| `comics/layout.tsx` | OK — static metadata. Minor: no error/loading siblings at this level (Low F8). |
| `comics/page.tsx` | OK — static metadata + SearchPageContent delegate. |
| `comics/[comicId]/page.tsx` | ISSUES — duplicate `generateMetadata` vs layout (Med F3); `generateMetadata` swallows DB errors (Low F4); page renders client-only content (Low F9). |
| `comics/[comicId]/layout.tsx` | ISSUES — duplicate `generateMetadata` vs page (Med F3); unguarded DB query in `generateMetadata` can throw 500 (Low F4). |
| `comics/[comicId]/loading.tsx` | OK — skeleton. |
| `comics/[comicId]/error.tsx` | OK — ROUTES.COMICS used. |
| `comics/[comicId]/chapter/[chapterId]/page.tsx` | OK — dynamic import + Suspense; params derived client-side. |
| `comics/[comicId]/chapter/[chapterId]/layout.tsx` | OK — generateMetadata for chapter SEO; unguarded DB query (Low F4). |
| `comics/[comicId]/chapter/[chapterId]/loading.tsx` | OK — skeleton. |
| `comics/[comicId]/chapter/[chapterId]/error.tsx` | OK — client error boundary (`window.history.back()`, no ROUTES needed). |
| `genres/[genreSlug]/page.tsx` | **BROKEN — High F1**: renders `<SearchPageContent />` ignoring `params.genreSlug`; the underlying presenter reads only query string. Genre route shows unfiltered default search. |
| `genres/[genreSlug]/layout.tsx` | OK — generateMetadata from slug (only place the slug is used). |
| `genres/[genreSlug]/loading.tsx` | OK — skeleton. |
| `genres/[genreSlug]/error.tsx` | OK — ROUTES.HOME used. |
| `profile/page.tsx` | OK — `redirect(ROUTES.USER.PROFILE)`; ROUTES used. |
| `search/page.tsx` | OK — static metadata + delegate. |

## Findings Table

| # | File:Line | Issue | Severity | Rule |
|---|-----------|-------|----------|------|
| F1 | `src/app/(public)/genres/[genreSlug]/page.tsx:3-4` | Page ignores `params.genreSlug`. `SearchPageContent` → `useSearchPresenter` reads only `useSearchParams()` (`keyword/category/sort/page`). URL `/genres/<slug>` (path param) is never consumed, so the route renders the default (all-comics) search. Slug is used only in layout `generateMetadata`. Genre pages are unfiltered — broken feature. Also: nothing in `components/` links to `/genres/` at all (orphan route). | **High** | II.1 |
| F2 | `src/components/auth/ResetPasswordPage.tsx:40-48` (page: `src/app/(public)/auth/reset-password/page.tsx:4`) | Password form validated by hand (`password.length < 6`, `password !== confirmPassword`) — no Zod schema from `lib/schemas/` (no auth schema exists). Brief explicitly flags login/register/forget/reset. Same manual pattern in `login-modal.tsx:62-79` (related, component scope). | Med | I.7 |
| F3 | `src/app/(public)/comics/[comicId]/page.tsx:5-36` + `layout.tsx:7-39` | `generateMetadata` defined in BOTH page and layout; Next merges them, so both run → two nearly identical Supabase queries (`stories` select) on every comic-detail render. Layout's OG/description work is partially dead (page overrides title/description). Consolidate into one (layout) and drop the other. | Med | II.1 |
| F4 | `comics/[comicId]/layout.tsx:15-19`, `comics/[comicId]/chapter/[chapterId]/layout.tsx:16-23` | `generateMetadata` Supabase queries unguarded — a thrown DB error (vs. `page.tsx:31` which try/catches) propagates → 500 on metadata resolution. Wrap in try/catch like `[comicId]/page.tsx`. | Low | II.1 |
| F5 | `src/components/comics/SearchPageContent.tsx:150` — `` href={`/comics/${comic.id}`} `` | Hardcoded URL; should be `ROUTES.COMIC_DETAIL(comic.id)`. | Med | I.6 |
| F6 | `src/components/comics/ComicDetailPageContent.tsx:94,105,204` and `src/components/reader/ChapterReaderPageContent.tsx:88,140,149,205,256` — `` href={`/comics/${comicId}/chapter/${id}`} `` / `` href={`/comics/${comicId}`} `` | 8 hardcoded URL templates; should be `ROUTES.CHAPTER_READER(comicId, id)` / `ROUTES.COMIC_DETAIL(comicId)`. The group pages delegate to these components, so I.6 exposure is real. (Group pages themselves: grep `href="/` + `router.push` = 0 hits.) | Med | I.6 |
| F7 | `auth/login/page.tsx:1-8`, `auth/register/page.tsx:1-8`, `auth/forgetPassword/page.tsx:1-8` | Placeholder stubs: no form, no `generateMetadata` (title/description), forgetPassword is dead ("đang phát triển") while the real forgot-password email flow lives in `LoginModal`. Route stubs are SEO-indexable with near-empty content. | Low | II.1 |
| F8 | `comics/` (no error/loading), `auth/` (no loading.tsx) | II.1 "mỗi route group nên có error.tsx và loading.tsx" — these levels inherit from `(public)/`, so impact is minimal. | Low | II.1 |
| F9 | `comics/[comicId]/page.tsx:38-39` | Page is a server component that fetches nothing — all content fetched client-side by `useComicDetailPresenter` (`useQuery` + services + browser supabase). Initial SSR HTML is empty for the main content (SEO/CLS concern). Pattern is consistent with the rest of the app; flag as observation only. | Low | II.1 |
| — | `src/components/auth/login-modal.tsx:170` | Compliance check — `overflow-y-auto max-h-[90vh]` present ✓ (no finding). | — | CLAUDE.md |
| — | `src/components/comics/SearchPageContent.tsx:65` | Filter drawer has `overflow-y-auto` ✓ (fixed full-height drawer, no max-h needed). No data tables in group — `overflow-x-auto` rule N/A. | — | CLAUDE.md |

## Grep Evidence

Run from `frontend/` (PowerShell), target `src/app/(public)/` unless noted:

```
# No hardcoded URLs in the group (I.6)
rg -n 'href="/' 'src\app\(public)'           -> 0 hits
rg -n 'router\.push' 'src\app\(public)'       -> 0 hits

# No revalidateTag/revalidatePath in group (I.9 — no data mutations in public pages; vacuous)
rg -n 'revalidateTag|revalidatePath' 'src\app\(public)' -> 0 hits

# No 'use server' in group (I.10)
rg -ln 'use server' 'src\app\(public)'        -> 0 files

# No Zod/lib/schemas imports in group (I.7) — validation lives in components:
rg -n 'lib/schemas' 'src\app\(public)'        -> 0 hits
lib/schemas/ contents: admin-stories, admin, ads, chapter-form, chapter,
comic-cms-schemas, comic, ops, story-form, system-settings-form,
system-settings, user, webhook  (NO auth schema)

# I.6 violations inside group-rendered content components:
SearchPageContent.tsx:150            href={`/comics/${comic.id}`}
ComicDetailPageContent.tsx:94        `/comics/${comicId}/chapter/${firstChapter.id}`
ComicDetailPageContent.tsx:105       `/comics/${comicId}/chapter/${latestChapter.id}`
ComicDetailPageContent.tsx:204       `/comics/${comicId}/chapter/${chapter.id}`
ChapterReaderPageContent.tsx:88      `/comics/${comicId}`
ChapterReaderPageContent.tsx:140     `/comics/${comicId}/chapter/${prevChapter.id}`
ChapterReaderPageContent.tsx:149     `/comics/${comicId}/chapter/${nextChapter.id}`
ChapterReaderPageContent.tsx:205,256 (same pattern, chapter list + next)

# F1 evidence — genre slug never read: SearchPageContent takes NO props and
# its presenter reads only query string:
SearchPageContent.tsx:14   export const SearchPageContent: React.FC = () => {
useSearchPresenter.ts:12   const searchParams = useSearchParams();
useSearchPresenter.ts:13-21  keyword/category/sort/page all from searchParams
components-wide:           rg -rn 'genres/' 'src\components' -> 0 hits (orphan route)

# F3 evidence — duplicate generateMetadata:
comics\[comicId]\page.tsx:5     export async function generateMetadata (queries stories.title/author)
comics\[comicId]\layout.tsx:7   export async function generateMetadata (queries stories.title/description/cover_url/author)

# F2 evidence — manual validation, no Zod:
ResetPasswordPage.tsx:40  if (password.length < 6)
ResetPasswordPage.tsx:45  if (password !== confirmPassword)
login-modal.tsx:74-79     same manual checks (component scope)

# Modal compliance (CLAUDE.md):
login-modal.tsx:170  overflow-y-auto max-h-[90vh]   ✓
SearchPageContent.tsx:65  flex-1 overflow-y-auto    ✓ (drawer)
```

## Notes / Concerns

1. **F1 is a live bug**: any link/crawl to `/genres/<anything>` shows the unfiltered "all comics" search (same content as `/comics`), just with genre-flavored `<title>`. If the genre page is intentionally pending, it should `redirect()` to `/search?category=<slug>` rather than silently render wrong content.
2. **F3 doubles DB load** on every comic-detail pageview — cheap fix (delete one `generateMetadata`), meaningful when traffic grows.
3. `profile/page.tsx` redirects to `ROUTES.USER.PROFILE` (`/user/profile`, auth-gated) — intended behavior; the (public) profile route is a landing redirect only.
4. Auth forms are split across LoginModal (login/register/magic-link) + ResetPasswordPage (reset) — no Zod auth schema exists in `lib/schemas/`; both validate manually (F2). Adding `lib/schemas/auth.ts` + wiring both components is the root fix.
5. All dynamic segments have full sibling sets (error/layout/loading/page) ✓ per II.1; only `comics/` and `auth/` middle levels lack loading/error (inherit from `(public)/` — Low).
