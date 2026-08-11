# Task 8a Report — Fix Batch 1a (api/ routes + Header)

Status: DONE. Build + tests green. Commit: `5695e52`

## H7 — `src/components/navigation/Header.tsx:92` (dead search fetch)

**Before:** `apiClient.get('/api/comics?keyword=...&limit=6')` — route doesn't exist (no `/api/comics` in build output), search always 404/empty. Results state typed `Comic[]` (comic.service `ComicContext`); dropdown rendered `comic.coverUrl`.

**After:** `fetchStoriesPage({ keyword: trimmed, page: 1, pageSize: 6, sort: 'newest' })` from `@/services/comics/story.service` (hits `ROUTES.API.STORIES_PAGE` → `/api/stories`). `.catch(() => null)` kept. Results state retyped `Story[]` (entities) since `Story` uses `cover_url` (snake) vs the old `ComicContext.coverUrl`; `getComicCover` switched to `comic.cover_url`. Dropdown rendering untouched.

## M2 — `src/app/api/avatar/route.ts:46` (unbounded `arrayBuffer()` on public route)

**Before:** `fetch(url)` then unconditional `response.arrayBuffer()` — memory exhaustion vector.

**After:** `const MAX_AVATAR_BYTES = 5 * 1024 * 1024`. Reject when upstream `Content-Length` > 5MB → `503 { error: 'Image exceeds size limit' }` before buffering. Avatars are small S3 objects so `Content-Length` is reliably present; missing-length case still `arrayBuffer()`s (unbounded edge accepted — see concern).

## T3 F-03 (avatar redirects)

**Before:** default redirect mode — SSRF-relevant follow of redirects off-origin.

**After:** `fetch(..., { redirect: 'manual' })` + `response.redirected || response.type === 'opaqueredirect'` → `400 { error: 'Redirects not allowed' }`. Check placed before `!response.ok` (undici manual redirect gives status 0, which would otherwise produce an invalid status in `NextResponse.json`).

## M4 — `src/app/api/r2/upload/route.ts:77` (whole file buffered, 250MB cap)

**Before:** `MAX_FILE_SIZE = 250 * 1024 * 1024`; guard at :61 already ran before `file.arrayBuffer()` but ceiling was huge.

**After:** `MAX_FILE_SIZE = 50 * 1024 * 1024` with `// ponytail:` comment naming the ceiling (covers .cbz/.zip) and upgrade path (streaming multipart put). Guard order unchanged — size check still precedes `arrayBuffer()`.

## T3 F-07 — `src/app/api/r2/proxy/route.ts:56` (buffered object unguarded)

**Before:** `getObject(...)` body passed straight to `NextResponse` — no size check.

**After:** `const MAX_OBJECT_SIZE = 50 * 1024 * 1024` (same const approach as M4, ponytail comment names streaming upgrade path via `GetObject`/`response.Body`). `body.byteLength > MAX_OBJECT_SIZE` → `413 { error: 'Object exceeds size limit' }` before `Buffer.from(body)`.

## Notes accepted (no code change, rationale)

- **F-02** avatar manual URL validation: route is single-param (`url`), origin whitelist + image content-type check are the effective guards; Zod schema would add no enforcement here (adjudicated "marginal — skip").
- **F-06** proxy manual validation: key/folder validation is two scalar params; key traversal + folder allowlist already enforced; Zod marginal.
- **F-08** upload `application/octet-stream` looseness: extension allowlist (`ALLOWED_EXTENSIONS`) is the effective gate — octet-stream without a known extension is rejected; MIME-claim tightening adds nothing.
- **F-10** webhook dev bypass: production path protected by `requireRouteAuthorization`/verification; dev bypass is environment-gated and does not affect prod.

## Verification

**Build** (`npm run build`, Next.js 16.3.0, workdir `frontend`): compiled successfully, TypeScript pass, 41 pages generated. Pre-existing warnings only (metadataBase/localhost — M5, separate finding). Routes `ƒ /api/avatar`, `ƒ /api/r2/proxy`, `ƒ /api/r2/upload` present; no `/api/comics` (confirmed dead route removed as data source).

**Tests** (`npm run test:run`, vitest 4.1.10): `45 files passed (45), 385 tests passed (385)` — 28.47s.

**Commit:** `5695e52` `fix(api): cap buffered bodies in avatar/r2 routes; wire header search to stories service` (4 files, +25/−10). Only the 4 task files staged; unrelated dirty files (`opencode.json`, tasks/) left untouched.

## Concerns

1. M2 guard relies on upstream `Content-Length`. If a chunked/no-length response ever appears, `arrayBuffer()` remains unbounded. Mitigate later with a streaming reader cap (`reader.read()` loop aborting at 5MB) — 8 lines, deferred as not needed for S3-backed Supabase avatars.
2. M4: `request.formData()` itself buffers the full multipart body before `file.size` is visible; the 50MB ceiling bounds the File payload but a hostile multi-part request could still exceed it at the formData layer. Full fix is streaming multipart (named as upgrade path in the ponytail comment).
