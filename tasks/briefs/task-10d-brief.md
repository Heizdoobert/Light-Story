# Fix Dispatch: Batch-4 reviewer findings

## Findings to fix (from reviewer, verified in source)

1. **Important** — `frontend/src/app/(admin)/admin/dashboard/page.tsx:121`: `{infraStats?.cache_hit_ratio_pct ?? 99.5}%` — faked default percentage. Fix: `infraStats?.cache_hit_ratio_pct != null ? ... : "—"` (same honest-empty pattern already applied in `admin/analytics/page.tsx`). Also convert the sibling static "Live"/"Bound" badges (:149-151, :159-161) to the same "Chưa kiểm tra" treatment used for the fixed "Port 8787" row (same no-data-source class).
2. **Minor** — `frontend/src/app/(admin)/admin/analytics/page.tsx:52,98`: `r2_allocated_gb ?? 10` renders "Trên tổng 10 GB" with no data — render "—" when missing (same pattern as the rest of the file).
3. **Minor** — accuracy note only: fix the task-10c report claim about byte-identical output for `chapterId ?? ""` (it's `…/chapter/` vs `…/chapter/undefined` — both broken links, no worse). No code change; correct the report text.

## Acceptance criteria
- [ ] Dashboard shows no faked numbers when data missing ("—" / "Chưa kiểm tra"), matching analytics pattern
- [ ] `npm run build` + `npm run test:run` green (workdir D:\Light-Story\frontend)
- [ ] Commit (conventional) + note hash
- [ ] Covering tests: run `npm run test:run` and report output (no dedicated test file for these components exists — suite run is the gate)

## Files likely touched
- `frontend/src/app/(admin)/admin/dashboard/page.tsx`
- `frontend/src/app/(admin)/admin/analytics/page.tsx`
- `tasks/reports/task-10c-report.md` (note text only)

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Append your fix report to `tasks/reports/task-10c-report.md` (section "Fix round (reviewer findings)"): findings fixed, test command + output.
- Final message: status, commit hash, test output summary.
