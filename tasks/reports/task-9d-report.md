# Task 9d Report — Fix Batch 3d (admin users/categories/settings/ads)

- **Date**: 2026-08-09
- **Branch**: preview
- **Commit**: `2ec01e1` — "fix(admin): modal scroll, env supabase url, superadmin gating, server-side ad markup policy (task 9d)"
- **Status**: DONE — build + tests green

## Summary

5 acceptance criteria fixed across 4 files. `validateAdMarkup` was already isolated in the shared pure module `frontend/src/lib/admin/ad-policy.ts` (no client/server directive), so server-side enforcement reused it directly — no relocation needed.

## Per-finding before/after

### M19 — `frontend/src/app/(admin)/admin/users/page.tsx:121` (modal scroll)
- **Before**: modal container `bg-slate-900 ... rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4` — no height/scroll limits; tall role lists clipped on small viewports.
- **After**: added `max-h-[90vh] overflow-y-auto` per CLAUDE.md modal standard.

### M20 — `frontend/src/app/(admin)/admin/categories/page.tsx:82` (modal scroll)
- **Before**: same missing classes on the category create/edit modal.
- **After**: added `max-h-[90vh] overflow-y-auto`.

### F25 — `frontend/src/app/(admin)/admin/users/page.tsx:148` (superadmin option leak)
- **Before**: "Super Admin" `<option>` rendered for every admin — server rejects the grant (`user.actions.ts:61`) but the UI offered an action that always failed.
- **After**: page now calls `useUser()` (the same hook the `(admin)/layout.tsx` guard uses — app_metadata-preferred role source, mirroring the server gate) and renders the superadmin option only when `role === "superadmin"`. Client UX now matches the server-side gate.

### M21 — `frontend/src/app/(admin)/admin/settings/page.tsx:111` (hardcoded Supabase URL)
- **Before**: literal `https://xgtlrztskoomimvfpdoy.supabase.co` in the Infrastructure Status panel — wrong if env/project changes, and leaked the project ref in source.
- **After**: renders `process.env.NEXT_PUBLIC_SUPABASE_URL` (inlined at build, same source `src/lib/supabase/client.ts` uses) with a "Chưa cấu hình (NEXT_PUBLIC_SUPABASE_URL)" fallback when unset.

### M22 — `frontend/src/lib/actions/settings.actions.ts` (ad-markup policy client-only)
- **Before**: `saveSiteSettings` validated only via Zod (shape) then `upsert`ed directly; the ad-markup policy (`validateAdMarkup`: iframe/object/embed block, inline handlers, `javascript:` URLs, blocked terms, script host allowlist, size cap) ran only in the client hook `use-admin-ads.ts` as a pre-check. Server would persist any markup (ad/casino/fraud).
- **After**: the action imports `AD_SLOT_KEYS`, `parseSiteSettingsRows`, `validateAdMarkup` from the shared `src/lib/admin/ad-policy.ts` (already directive-free and importable from `'use server'` files). After Zod parse, it builds the runtime settings from the incoming entries (same defaults as the client's `DEFAULT_RUNTIME`), validates every ad-slot value with the exact same policy, and rejects the whole save with `Ad markup policy violation (<key>): <reason>` before any DB write. Non-ad keys (site_name, maintenance_mode, etc.) are unaffected. Client pre-check untouched — remains the UX layer.
- Note: `toSafeAdRows` (blanking sanitizer) already existed but the acceptance criterion asks for rejection, so the action returns an error instead of silently discarding.

## Files changed
- `frontend/src/app/(admin)/admin/users/page.tsx` (M19, F25)
- `frontend/src/app/(admin)/admin/categories/page.tsx` (M20)
- `frontend/src/app/(admin)/admin/settings/page.tsx` (M21)
- `frontend/src/lib/actions/settings.actions.ts` (M22)

## Verification

### Build (`npm run build`)
```
✓ Compiled successfully in 5.1s
✓ Finished TypeScript in 6.6s
✓ Generating static pages using 11 workers (41/41)
```
41 routes generated, no errors.

### Tests (`npm run test:run`)
```
Test Files  45 passed (45)
     Tests  385 passed (385)
```

### Lint (pre-commit hook)
```
Lint ok
```

## Concerns
- An admin opening the role modal on a **superadmin** user now sees a select whose value ("superadmin") has no matching visible option (shows blank until re-picked). Same pre-existing demote risk either way; cosmetic only. Clamping would risk silent accidental demotion, so left as-is.
- `useUser()` is now instantiated both in the admin layout and the users page → 2x auth/session loads on that route. Acceptable; dedupe would require lifting the hook to a shared provider (out of scope).
