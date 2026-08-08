# Task 10b Report — Fix Batch 4b (admin lows + reviewer minors)

## Status: DONE

Build ✅ · Tests ✅ (385 passed, 45 files) · Lint ✅

---

## Per-finding before/after

### F18 — `frontend/src/app/(admin)/admin/profile/page.tsx:83`
- **Before**: `{user?.email || "admin@lightstory.app"}` — fake fallback email displayed as if real when `user?.email` missing.
- **After**: `{user?.email || "Chưa có email"}` — honest placeholder matching admin group Vietnamese copy.

### F19 — `frontend/src/app/(admin)/not-found.tsx`
- **Before**: Stock Next.js boilerplate (English "Not Found / Could not find requested resource / Return Home", unstyled), hardcoded `href="/"`.
- **After**: Full rewrite — admin-group styling (dark `slate-950` bg, `slate-900` card, orange accent), Vietnamese copy ("Lỗi 404 / Không Tìm Thấy Trang / ..."), link to `ROUTES.HOME` via `next/link`.

### F21 — `frontend/src/app/(admin)/admin/dashboard/page.tsx`
- **Before**: `:132-138` hardcoded "KẾT NỐI SẮC NÉT (Active)" banner with animated ping dot presented as live state; `:169-177` "Worker API Gateway / Port 8787" checklist row with green "Live"-style badge.
- **After**: Banner block removed, replaced with `// ponytail:` note documenting that gateway connectivity is not data-derived (re-add a real health probe when one exists). Checklist row now shows honest neutral badge "Chưa kiểm tra" (slate, no green check).

### F22 — `frontend/src/app/(admin)/admin/analytics/page.tsx`
- **Before**: Faked defaults shown as real when `data` null: `99.5%` cache hit ratio (L69), `4.2 ms` latency (L78), `65/30/5%` device bars (L135-162), `0.05 GB` egress (L108), `100%` storage efficiency (L116), progress bar min 5% (L101).
- **After**: All show honest "—" when the field is missing (explicit `!= null` checks); device bars render 0% width + "—"; progress bar renders 0% when no data.

### F23 — `frontend/src/app/(admin)/admin/analytics/page.tsx`
- **Before**: `data?.top_zones.map(...) ?? fallback` — fallback row only when `top_zones` nullish; empty array rendered a header-only table.
- **After**: Explicit `data?.top_zones && data.top_zones.length > 0` branch; otherwise empty-state row "Chưa có dữ liệu domain." (or "Đang tải dữ liệu domain..." while loading).

### F24 — `frontend/src/app/(admin)/layout.tsx`
- **Before**: Inline 403 screen with no navigation; nothing linking to `ROUTES`.
- **After**: Kept as client-side fallback (middleware redirects to `ROUTES.ERROR.FORBIDDEN` for the canonical page — noted with `// ponytail:`), added "Về Trang Chủ" `next/link` to `ROUTES.HOME`, styled to match the group's orange button convention. Judge: minimal fix — a link to `ROUTES.ERROR.FORBIDDEN` would be self-referential (same 403), so HOME is the useful escape hatch.

### Reviewer minor — `frontend/src/services/comics/story.service.ts` `fetchStoriesByIds`
- **Before**: `supabase .in('id', ids)` returned rows in DB order — input order lost (`user/dashboard` reading history assumed input order).
- **After**: Rows re-ordered by input `ids` index via `Map<id, Story>`; missing ids filtered out (preserves prior behavior of only returning found rows). Added `// ponytail:` note on the silent `[]` total-failure path (acceptable for current callers).

---

## Verification

- `npm run build` — PASS (all routes, Proxy (Middleware) ✓)
- `npm run test:run` — PASS: **45 test files, 385 tests passed**
- `npm run lint` — PASS (echo script, project standard)

## Commit

- `fix(admin): honest empty states, VI not-found, order-stable fetchStoriesByIds (task 10b)`
- Hash: see `git rev-parse HEAD` (recorded below)
