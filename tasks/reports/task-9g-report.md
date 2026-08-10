# Task 9g Report — Fix Batch 3g: profile dedup + user-group URL templates

**Status**: COMPLETE
**Commit**: `43b2cec` — `fix(user): dedupe profile page to ProfilePageContent, centralize comic URLs to ROUTES (task 9g)`
**Branch**: preview
**Date**: 2026-08-09

## M24 — Duplicate profile UI (`(user)/user/profile/page.tsx` vs `ProfilePageContent.tsx`)

### Before
- `src/app/(user)/user/profile/page.tsx` (213 lines, `"use client"`) fully re-implemented the profile screen: header, avatar card, quick links, edit form with inline `ImageUploader`, and a save handler calling `updateUserProfile` directly. It used `getR2ImageUrl` for the avatar — no `sanitizeImageUrl`/`proxyAvatarUrl`/`getFallbackAvatar` guards.
- Canonical `src/components/user/ProfilePageContent.tsx` (useAuth + useProfilePresenter + sanitizeImageUrl/proxyAvatarUrl/getFallbackAvatar) was exported via barrel but **rendered nowhere** — dead canonical component.

### Save-path reconciliation check (H6 regression guard)
- `ProfilePageContent` → `EditUserProfileModal` → `useAuth().updateProfile` → **`updateUserProfile` action** (`AuthContext.tsx:345` calls `updateUserProfile(user.id, payload)`). Verified the canonical path already routes saves through the Zod-validated server action — no divergence to fix. H6 behavior preserved.
- Avatar upload in the modal uses `supabase.storage` directly (file upload, not profile write) — unchanged, out of scope.

### After
- `page.tsx` is now a 3-line server thin wrapper delegating to `ProfilePageContent` (identical pattern to `user/history/page.tsx` / `user/bookmarks/page.tsx`):
  ```tsx
  import { ProfilePageContent } from '@/components/user/ProfilePageContent';

  export default function UserProfilePage() {
    return <ProfilePageContent />;
  }
  ```
- 213-line duplicated UI deleted (net −203 lines in this file). Avatar display now goes through sanitize/proxy/fallback.
- Trade-off noted: the old page had a sign-out button + quick links (bookmarks/history) not present in the canonical component; the canonical component is authoritative per the plan and was the required direction.

## M25 — Hardcoded `/comics/...` URLs → ROUTES helpers

| File:line | Before | After |
|---|---|---|
| `ReadingHistoryDrawer.tsx:40` | `` `/comics/${item.comicId}/chapter/${item.chapterId}` `` | `ROUTES.CHAPTER_READER(item.comicId, item.chapterId)` |
| `UserReadingHistoryPageContent.tsx:65` | `` `/comics/${item.comicId}` `` | `ROUTES.COMIC_DETAIL(item.comicId)` |
| `UserReadingHistoryPageContent.tsx:77` | `` `/comics/${item.comicId}/chapter/${item.chapterId}` `` | `ROUTES.CHAPTER_READER(item.comicId, item.chapterId)` |
| `UserBookmarksPageContent.tsx:54` | `` `/comics/${comicId}` `` | `ROUTES.COMIC_DETAIL(comicId)` |
| `UserBookmarksPageContent.tsx:62` | `` `/comics/${comicId}` `` | `ROUTES.COMIC_DETAIL(comicId)` |

`ROUTES` import added to `ReadingHistoryDrawer.tsx` (others already imported it). All 5 URLs now centralize to the 9b helpers.

## Test expectation updates (required by the fix, not scope creep)

- `src/__tests__/tier1/f2_rsc_pages.test.ts` + `src/__tests__/tier2/f2_rsc_pages_boundary.test.ts`: the F2 RSC regression lists still classified `(user)/user/profile/page.tsx` as a client component (pre-fix state). Added it to `EXPECTED_SERVER_PAGES`/`SERVER_PAGES` and to `THIN_WRAPPERS` (`'ProfilePageContent'`), matching the bookmarks/history wrapper pattern. This is the tests asserting the new dedup state; without it `npm run test:run` failed.

## Verification

### Build
```
npm run build  → ✓ Compiled successfully (Next.js 16.3.0, Turbopack), TypeScript clean
```
42 routes generated; `/user/profile` static.

### Tests
```
npm run test:run  →  Test Files  45 passed (45)   Tests  385 passed (385)
```
First run after the dedup (before test-list update) failed 3 F2 RSC assertions — expected, fixed by the list update above; final run fully green.

## Files changed (6, +12 / −215)
- `frontend/src/app/(user)/user/profile/page.tsx` — dedup to thin wrapper
- `frontend/src/components/user/ReadingHistoryDrawer.tsx` — ROUTES.CHAPTER_READER
- `frontend/src/components/user/UserReadingHistoryPageContent.tsx` — ROUTES.COMIC_DETAIL + ROUTES.CHAPTER_READER
- `frontend/src/components/user/UserBookmarksPageContent.tsx` — ROUTES.COMIC_DETAIL ×2
- `frontend/src/__tests__/tier1/f2_rsc_pages.test.ts` — server-page list + thin-wrapper entry
- `frontend/src/__tests__/tier2/f2_rsc_pages_boundary.test.ts` — same

## Concerns
- Profile page UX changed: sign-out button and bookmarks/history quick links from the old inline page are gone (canonical component's UI wins). If those are wanted, add them to `ProfilePageContent`, not the page.
- `EditUserProfileModal` still validates fullName/avatarUrl manually (not Zod) — M9-adjacent, pre-existing, not in this batch's scope.
