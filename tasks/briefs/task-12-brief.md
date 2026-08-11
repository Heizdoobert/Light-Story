# Fix Dispatch: Final-review items

## Items (final whole-branch review)

1. **Plan compliance** — `(errors)/` group lacks `layout.tsx` / `error.tsx` / `loading.tsx` (findings.md F2/T2-MED). Add all 3:
   - `frontend/src/app/(errors)/layout.tsx` — server component passthrough `<>{children}</>` (do NOT add chrome; pages are self-contained full-screen, same as `(public)/auth/layout.tsx` pattern)
   - `frontend/src/app/(errors)/error.tsx` — client error boundary matching `(auth)/error.tsx` exactly (copy it — same copy, dev-only error.message guard per the 10c pattern)
   - `frontend/src/app/(errors)/loading.tsx` — copy `(auth)/loading.tsx`
2. **Pre-existing URL literals** (same class as the M11 fixes):
   - `frontend/src/components/navigation/Header.tsx:244` — `href={`/comics/${comic.id}`}` → `ROUTES.COMIC_DETAIL(comic.id)`
   - `frontend/src/components/navigation/Header.tsx:268` — `href={`/search?keyword=...`}` → use `ROUTES.SEARCH` (check the constant; if it needs a query-string helper, use the ROUTES pattern used elsewhere — do NOT inline the literal)

## Acceptance criteria
- [ ] 3 (errors)/ files exist, mirroring the (auth)/ siblings
- [ ] Header literals → ROUTES constants
- [ ] `npm run build` + `npm run test:run` green (workdir D:\Light-Story\frontend)
- [ ] Commit (conventional) + note hash

## Files likely touched
- `frontend/src/app/(errors)/layout.tsx` (NEW)
- `frontend/src/app/(errors)/error.tsx` (NEW)
- `frontend/src/app/(errors)/loading.tsx` (NEW)
- `frontend/src/components/navigation/Header.tsx`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Copy patterns from the EXISTING (auth)/ files — read them first.
- Append fix report to `tasks/reports/task-10c-report.md` ("Final-review fix round"): items fixed, test output.
- Final message: status, commit hash, test summary.
