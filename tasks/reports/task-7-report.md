# Task 7 Report: (user) + (auth) + (errors) group review

- **Date**: 2026-08-08
- **Scope**: `frontend/src/app/(user)/`, `(auth)/`, `(errors)/` (all files, plus backing components/hooks/routes)
- **Mode**: READ-ONLY — zero code changes, no commits
- **Rule IDs used**: II.1 (auth guard / session required), I.6 (no hardcoded URLs), I.7 (Zod on forms), III (no server-client leaks), T2-MEDIUM (prior sweep flags), CONV (conventions)

---

## Summary

| Group | Files | Verdict |
|---|---|---|
| (user) | 9 | FAIL — no auth guard (II.1), profile form bypasses Zod + server action (I.7), `/user` 404 (T2), dead files, duplication |
| (auth) | 3 | PASS (layout clone verified) with caveat — group is empty, all `/auth/*` routes 404 |
| (errors) | 7 | PASS with caveat — pages consistent, but group lacks layout/error/loading (T2 MEDIUM confirmed) |

**Findings: 2 High, 6 Medium, 5 Low (13 total).**

---

## Per-file verdicts

### `(user)/` group (9 files)

| File | Verdict |
|---|---|
| `(user)/layout.tsx` | **FAIL** — chrome + sidebar only, no session check (II.1). |
| `(user)/error.tsx` | DEAD — no page at `(user)/` segment; `user/error.tsx` shadows it; error.tsx cannot catch same-segment layout errors. |
| `(user)/loading.tsx` | DEAD — no page at `(user)/` segment; `user/loading.tsx` overrides for child routes. |
| `(user)/user/error.tsx` | PASS — uses `ROUTES.USER.PROFILE` for back link; minor: renders raw `error.message`. |
| `(user)/user/loading.tsx` | PASS — thin skeleton. |
| `(user)/user/profile/page.tsx` | **FAIL** — no Zod on form (I.7), direct client DB write bypassing server action, duplicates `ProfilePageContent`. |
| `(user)/user/dashboard/page.tsx` | PASS (thin-ish) — but `progressPct` hardcoded 0, `latestChapter` never populated; N+1 per-story fetches. |
| `(user)/user/history/page.tsx` | PASS — thin 5-line wrapper over `UserReadingHistoryPageContent`. |
| `(user)/user/bookmarks/page.tsx` | PASS — thin 5-line wrapper over `UserBookmarksPageContent`. |

### `(auth)/` group (3 files)

| File | Verdict |
|---|---|
| `(auth)/layout.tsx` | **PASS / VERIFIED** — byte-for-byte clone of `(public)/layout.tsx` (only difference: `AuthLayout` name + ponytail comment at line 1). Matches Task-2 claim. |
| `(auth)/error.tsx` | PASS — matches group convention; dead until pages exist. |
| `(auth)/loading.tsx` | PASS — matches group convention; dead until pages exist. |

### `(errors)/` group (7 files)

| File | Verdict |
|---|---|
| `forbidden/page.tsx` | PASS — thin redirect alias via `ROUTES.ERROR.FORBIDDEN`. |
| `unauthorized/page.tsx` | PASS — thin redirect alias via `ROUTES.ERROR.UNAUTHORIZED`. |
| `handle-exception/400/page.tsx` | PASS — thin wrapper, `BadRequestPage` (status 400 ✓, back-home `ROUTES.HOME` ✓). |
| `handle-exception/401/page.tsx` | PASS — thin wrapper, `UnauthorizedPage` (status 401 ✓, back-home `ROUTES.HOME` ✓). |
| `handle-exception/403/page.tsx` | PASS — thin wrapper, `ForbiddenPage` (status 403 ✓, back-home `ROUTES.HOME` ✓). |
| `handle-exception/404/page.tsx` | PASS — thin wrapper, `NotFoundPage` (status 404 ✓, back-home `ROUTES.HOME` ✓). |
| `handle-exception/503/page.tsx` | PASS — thin wrapper, `ServiceUnavailablePage` (status 503 ✓, back-home `ROUTES.HOME` ✓, reload button). |

---

## Findings

| # | File:line | Issue | Severity | Rule |
|---|---|---|---|---|
| F1 | `src/app/(user)/layout.tsx:9-23` | No auth guard: layout renders Header/UserSidebar/children for anyone; `/user/*` reachable unauthenticated. Pages only do soft client-side checks (profile shows "Chưa Đăng Nhập" card, dashboard greets "Độc giả") — no redirect, no II.1 session gate. | High | II.1 |
| F2 | `src/app/(user)/user/profile/page.tsx:42-55,176-218` | Form has no Zod validation; happy path writes `profiles` directly via browser Supabase client (`:43-50`), bypassing the Zod-validated server action `updateUserProfile` (`src/lib/actions/user.actions.ts:14` — used only as fallback `:53`). Direct client DB write violates service/action policy; `full_name` unvalidated. | High | I.7 / CONV |
| F3 | `src/app/(user)/user/` (no `page.tsx`) | `/user` (URL `ROUTES.USER.ROOT`) 404s — no page.tsx at `(user)/user/`. **T2 MEDIUM confirmed.** | Medium | T2-MEDIUM |
| F4 | `src/app/(user)/user/profile/page.tsx:1-223` vs `src/components/user/ProfilePageContent.tsx` | Duplicate profile UI: canonical `ProfilePageContent` (useAuth + useProfilePresenter, sanitizeImageUrl/proxyAvatarUrl) exists but is unused; page reimplements it with `useUser()` and raw `<img src={getR2ImageUrl(avatarUrl)}>` (`:116`) — misses the canonical image sanitization/proxy. | Medium | CONV |
| F5 | `src/components/user/ReadingHistoryDrawer.tsx:40`, `UserReadingHistoryPageContent.tsx:65,77`, `UserBookmarksPageContent.tsx:54,62` | Hardcoded `/comics/${...}` URLs instead of `ROUTES.COMIC_DETAIL()` / `ROUTES.CHAPTER_READER()` (backing components of the thin history/bookmarks pages). | Medium | I.6 |
| F6 | `src/app/(user)/error.tsx`, `src/app/(user)/loading.tsx` | Dead files: no page exists at the `(user)` segment, `user/` provides its own error/loading, and error.tsx cannot catch same-segment layout errors. | Medium | CONV |
| F7 | `src/app/(user)/user/dashboard/page.tsx:55,145-149` | `progressPct` hardcoded to 0 (progress bars always empty); `latestChapter` never set so "Mới nhất: Chap" never renders; per-comic `fetchStoryById` N+1 (`:43-45`). | Medium | CONV |
| F8 | `src/app/(auth)/` (empty group) | `ROUTES.LOGIN/REGISTER/RESET_PASSWORD` → `/auth/login`, `/auth/register`, `/auth/reset-password` all 404 (no pages in group). Known-empty per plan, but profile page "Đăng Nhập Ngay" CTA (`profile/page.tsx:78`) and Header LoginModal redirects are broken. `(auth)/error.tsx` + `loading.tsx` dead until pages land. | Medium | CONV |
| F9 | `src/app/(errors)/` (no layout/error/loading) | Error group has no layout.tsx/error.tsx/loading.tsx — renders inside (public) chrome. **T2 MEDIUM confirmed.** Pages themselves are consistent (status codes 400/401/403/404/503 correct, all back-home via `ROUTES.HOME`). | Medium | T2-MEDIUM |
| F10 | `src/components/layout/user-sidebar.tsx:11` | Label mismatch: "Cài đặt tài khoản" links to `ROUTES.USER.DASHBOARD` (a dashboard, not settings). | Low | CONV |
| F11 | `src/hooks/features/useReadingHistory.ts:3` vs `profile/page.tsx:15` | Actions split across two dirs: `@/actions/reading-history.actions` vs `@/lib/actions/user.actions` — convention drift (lib/actions also used by profile action import). | Low | CONV |
| F12 | `src/components/errors/StatusErrorPage.tsx:30` | Back-home uses raw `<a href>` instead of Next `<Link>` — full page reload, no prefetch. | Low | CONV |
| F13 | `src/app/(user)/user/error.tsx:32`, `src/app/(user)/error.tsx:26`, `src/app/(auth)/error.tsx:26` | Error boundaries render raw `error.message` to end users — may expose internals. | Low | CONV |

---

## Verified clean (no findings)

- **(auth)/layout.tsx = Task-2 clone** — identical to `(public)/layout.tsx` (same imports, same JSX chrome: bg-zinc-100/dark:bg-zinc-950 wrapper, Header, LoginModal, `<main className="flex-grow w-full">`, PublicFooter). Only diffs: component name `AuthLayout` and ponytail comment `// ponytail: layout duplicated from (public); extract shared chrome only if a 3rd group needs it` at line 1. ✅
- **No server-client leaks (III)**: pages are `'use client'` or thin server wrappers over client components; no server-only imports (`getServerSupabase` etc.) in the group; no secrets/env exposed.
- **history/bookmarks pages are thin** (5-line wrappers) — services (`readerHub.service`) and actions used via `useReadingHistory`; correct React Query usage.
- **errors group status codes** all match their routes (400/401/403/404/503); forbidden/unauthorized aliases use `ROUTES.ERROR.*`.

## Evidence (key lines)

- `(user)/layout.tsx:1-23` — `'use client'`; no auth import, no redirect, no guard.
- `profile/page.tsx:43-50` — `supabase.from("profiles").update({...}).eq("id", user.id)` direct client write; `:53` server action as error-fallback only.
- `user.actions.ts:35` — `updateUserProfileSchema.safeParse` exists (action path validates) but is bypassed in the happy path.
- `routes.ts:12-18` — `ROUTES.USER.ROOT = "/user"` exists; no matching page file (glob: only bookmarks/dashboard/history/profile).
- `routes.ts:34-37` — `ROUTES.ERROR.UNAUTHORIZED/FORBIDDEN` point to `/handle-exception/401|403`; alias pages redirect there correctly.
- `(public)/layout.tsx:1-19` vs `(auth)/layout.tsx:1-20` — clone verified.
- `StatusErrorPage.tsx:8-13` — status codes + `actionHref={ROUTES.HOME}` per page component.

---

## Concerns

- F1 is the headline miss: the group that is supposed to be "logged-in space" has no auth gate at all — enforcement is left to RLS + per-page soft UI. F2 compounds it (client can write `profiles` directly with no Zod validation on the primary path).
- F8: `/auth/*` routes 404 while auth is promoted from the Header/LoginModal — user-facing dead links until (auth) pages exist.
- F4: two divergent profile implementations coexist; risk of one being maintained and the other rotting (the unused `ProfilePageContent` is the canonical one).
