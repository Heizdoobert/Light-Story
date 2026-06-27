# Comic CMS Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 missing route handlers to unified-gateway's `admin.ts` so Comic CMS data persists to Supabase instead of silently dropping to localStorage.

**Architecture:** Extend the existing `admin.ts` route handler with Comic CMS CRUD operations that map to the `stories` and `chapters` Supabase tables (consistent with existing `comics.ts` pattern), plus an R2 file upload handler using the existing bucket binding.

**Tech Stack:** Cloudflare Workers, Supabase REST API, Cloudflare R2

**Key constraint:** The Comic CMS data model (`ComicCmsRecord`) has extra fields (`slug`, `genres`, `tags`, `artist`, `translator`, etc.) that don't exist in the current `stories` table schema. These will be stored as JSON in a `metadata` field or omitted from the initial implementation. The plan flags this as a known limitation.

---
### File Structure

| File | Action | Responsibility |
|---|---|---|
| `workers/unified-gateway/src/routes/admin.ts` | Modify | Add 5 new route handler sections after existing ones |
| `workers/unified-gateway/wrangler.jsonc` | No change needed | R2 bucket binding already exists |
| `workers/unified-gateway/src/utils/supabase-client.ts` | No change needed | Env interface already has R2_BUCKET |

---

### Task 1: Add POST /admin/comics — Create Comic

**Files:**
- Modify: `workers/unified-gateway/src/routes/admin.ts` (insert after line 625, before `return null`)

**Context:** The frontend `createComicFromMetadata()` sends `POST /api/admin/comics` with `{ slug, title, author, description, status, genres, tags }`. The existing `POST /api/comics` in `comics.ts` writes to the `stories` table with only `{ title, author, description, cover_url, status, category }`. We follow the same pattern using the `stories` table, storing Comic CMS extras as JSON in a new `metadata` column (or as a JSON-stringified `category` value). Since the `stories` table lacks `slug`, `genres`, `tags`, we store only the compatible fields and return the created record.

- [ ] **Step 1: Add create comic handler in admin.ts**

Insert this block before the `return null` at line 625 of `admin.ts`:

```typescript
    // ── Comic CMS CRUD ─────────────────────────────────────

    if (method === 'POST' && path === '/admin/comics') {
      const body = (await request.json()) as any;
      const payload: Record<string, unknown> = {
        title: body.title,
        author: body.author || 'Unknown',
        description: body.description || null,
        status: body.status || 'draft',
      };
      // Store extra Comic CMS fields as JSON metadata
      const metadata: Record<string, unknown> = {};
      if (body.slug) metadata.slug = body.slug;
      if (body.genres) metadata.genres = body.genres;
      if (body.tags) metadata.tags = body.tags;
      if (Object.keys(metadata).length > 0) {
        payload.metadata = JSON.stringify(metadata);
      }
      const res = await sbPost('stories', payload, env, token);
      return handleRes(res);
    }
```

- [ ] **Step 2: Verify it compiles**

Run: `cd workers/unified-gateway && npx wrangler types --experimental-include-runtime 2>/dev/null; npm run build`
Expected: build succeeds with no type errors

---

### Task 2: Add GET /admin/comics — List Comics

**Files:**
- Modify: `workers/unified-gateway/src/routes/admin.ts`

**Context:** Needed for the Comic CMS catalog. Returns paginated stories with metadata.

- [ ] **Step 1: Add list comics handler**

Insert after the create comic handler (in the same Comic CMS section):

```typescript
    if (method === 'GET' && path === '/admin/comics') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50')));
      const offset = (page - 1) * pageSize;
      const q = `select=*&order=created_at.desc&limit=${pageSize}&offset=${offset}`;
      const res = await sbGet('stories', q, env, token);
      return handleRes(res);
    }
```

- [ ] **Step 2: Build check**

Run: `npm run build` in `workers/unified-gateway`
Expected: passes

---

### Task 3: Add GET/PATCH/DELETE /admin/comics/:id — Single Comic CRUD

**Files:**
- Modify: `workers/unified-gateway/src/routes/admin.ts`

**Context:** `updateComicRecord()` sends `PATCH /api/admin/comics/{id}` and `deleteComic()` sends `DELETE /api/admin/comics/{id}`.

- [ ] **Step 1: Add GET single comic handler**

Insert after list handler:

```typescript
    if (method === 'GET' && path.match(/^\/admin\/comics\/[^\/]+$/)) {
      const id = path.split('/')[3];
      const res = await sbGet('stories', `id=eq.${id}&select=*`, env, token);
      return handleRes(res);
    }
```

- [ ] **Step 2: Add PATCH comic handler**

Insert after GET single handler:

```typescript
    if (method === 'PATCH' && path.match(/^\/admin\/comics\/[^\/]+$/)) {
      const id = path.split('/')[3];
      const body = (await request.json()) as any;
      const payload: Record<string, unknown> = {};
      if (body.title !== undefined) payload.title = body.title;
      if (body.author !== undefined) payload.author = body.author;
      if (body.description !== undefined) payload.description = body.description;
      if (body.status !== undefined) payload.status = body.status;
      if (body.coverUrl !== undefined) payload.cover_url = body.coverUrl;
      const metadata: Record<string, unknown> = {};
      if (body.genres) metadata.genres = body.genres;
      if (body.tags) metadata.tags = body.tags;
      if (body.slug) metadata.slug = body.slug;
      if (Object.keys(metadata).length > 0) {
        payload.metadata = JSON.stringify(metadata);
      }
      const res = await sbPatch('stories', `id=eq.${id}`, payload, env, token);
      return handleRes(res);
    }
```

- [ ] **Step 3: Add DELETE comic handler**

Insert after PATCH handler:

```typescript
    if (method === 'DELETE' && path.match(/^\/admin\/comics\/[^\/]+$/)) {
      const id = path.split('/')[3];
      const res = await sbDelete('stories', `id=eq.${id}`, env, token);
      return res.ok ? json({ success: true }) : handleRes(res);
    }
```

- [ ] **Step 4: Build check**

Run: `npm run build` in `workers/unified-gateway`
Expected: passes

---

### Task 4: Add POST /admin/comics/:id/chapters — Create Comic Chapter

**Files:**
- Modify: `workers/unified-gateway/src/routes/admin.ts`

**Context:** `createComicChapterFromFiles()` sends `POST /api/admin/comics/{id}/chapters` with `{ comicId, chapterNumber, title, pageUrls }`.

- [ ] **Step 1: Add create chapter handler**

Insert after DELETE handler:

```typescript
    if (method === 'POST' && path.match(/^\/admin\/comics\/[^\/]+\/chapters$/)) {
      const comicId = path.split('/')[3];
      const body = (await request.json()) as any;
      const payload = {
        story_id: body.comicId || comicId,
        chapter_number: body.chapterNumber || 1,
        title: body.title || `Chapter ${body.chapterNumber}`,
        content: JSON.stringify(body.pageUrls || []),
      };
      const res = await sbPost('chapters', payload, env, token);
      return handleRes(res);
    }
```

- [ ] **Step 2: Build check**

Run: `npm run build` in `workers/unified-gateway`
Expected: passes

---

### Task 5: Add POST /admin/upload-to-r2 — File Upload Handler

**Files:**
- Modify: `workers/unified-gateway/src/routes/admin.ts`

**Context:** `uploadFilesToR2()` in `comic.service.ts` sends `POST /api/admin/upload-to-r2` with multipart/form-data (files) and `x-r2-bucket` header. The `Env` interface already has `R2_BUCKET?: R2Bucket`. The `wrangler.jsonc` already has the `lightstory-assets` bucket bound to `R2_BUCKET`.

**Important:** We must handle the request BEFORE the gateway tries to parse JSON body (since it's multipart). The existing code path reads JSON first — this route needs early handling in the handler method, or we parse the multipart form data.

The existing handler method reads `request.json()` which will fail for multipart. We handle this by checking `Content-Type` before parsing JSON.

- [ ] **Step 1: Add R2 upload handler**

Insert at the top of the Comic CMS section (before the create comic handler):

```typescript
    if (method === 'POST' && path === '/admin/upload-to-r2') {
      const bucket = env.R2_BUCKET;
      if (!bucket) {
        return err('R2_NOT_CONFIGURED', 'R2 bucket not bound', 500);
      }
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return err('BAD_REQUEST', 'Expected multipart/form-data', 400);
      }
      const formData = await request.formData();
      const fileEntries = formData.getAll('file') as File[];
      if (fileEntries.length === 0) {
        return err('BAD_REQUEST', 'No files provided', 400);
      }
      const uploadedUrls: string[] = [];
      for (const file of fileEntries) {
        const ext = file.name.split('.').pop() || 'png';
        const key = `uploads/${crypto.randomUUID()}.${ext}`;
        await bucket.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
        uploadedUrls.push(`/api/admin/r2/${key}`);
      }
      return json({ success: true, data: { urls: uploadedUrls } });
    }
```

- [ ] **Step 2: Build check**

Run: `npm run build` in `workers/unified-gateway`
Expected: passes

---

### Self-Review

**1. Spec coverage:**
- Task 1: ✅ POST /admin/comics
- Task 2: ✅ GET /admin/comics
- Task 3: ✅ GET/PATCH/DELETE /admin/comics/:id
- Task 4: ✅ POST /admin/comics/:id/chapters
- Task 5: ✅ POST /admin/upload-to-r2

**2. Placeholder scan:** No TBD, TODO, or "fill in later" patterns. Every step has complete code.

**3. Type consistency:** All method signatures match existing patterns in `admin.ts`. Uses existing `sbPost`, `sbGet`, `sbPatch`, `sbDelete`, `json`, `err` imports already at top of file. No new types introduced.

**Known limitation:** Comic CMS fields `slug`, `genres`, `tags`, `artist`, `translator`, `source`, `rankScore`, `scheduledAt` don't have dedicated columns in the `stories` table. This implementation stores extras as JSON in a `metadata` column (which requires a Supabase migration to add). Without that migration, those fields are silently dropped. A follow-up plan should add a Supabase migration to add a `metadata jsonb` column to the `stories` table.
