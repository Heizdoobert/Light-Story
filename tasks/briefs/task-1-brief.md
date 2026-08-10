# Task 1: Build + test baseline

## Description
Establish the baseline state of the frontend before the audit. Run the build and unit tests, fix only what blocks compilation, and report exact numbers so later tasks can compare.

## Acceptance criteria
- [ ] `npm run build` run inside `frontend/` — output recorded (success or exact error list)
- [ ] `npm run test:run` run inside `frontend/` — pass/fail count recorded
- [ ] Any compile-blocking errors fixed with the minimal change (no refactors, no bonus fixes)
- [ ] Build green after fixes

## Verification
- [ ] `npm run build` exits 0 in `frontend/`
- [ ] `npm run test:run` result recorded in report

## Dependencies
None.

## Files likely touched
- `frontend/src/**` (only if compile blockers exist)

## Estimated scope
Small (1-2 files max, possibly zero).

## Context / constraints
- This project's `lint` script is fake (`echo Lint ok`) — do NOT rely on it; `next build` is the real typecheck+compile gate.
- Working dir for all commands: `D:\Light-Story\frontend`. PowerShell shell (no bash). Windows paths.
- Do not modify `opencode.json` (has pre-existing local modifications — leave it).
- Branch `preview`.
- Minimal changes only. If a blocker needs a design decision, stop and report instead of guessing.
