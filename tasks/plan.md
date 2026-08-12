# Implementation Plan: CSP img-src Allow r2.dev (Production Hotfix)

## Overview
Production images from `https://<bucket>.r2.dev` blocked by CSP. Header allows `*.r2.cloudflarestorage.com` (S3 API endpoint, `s3.ts:36`) but not `*.r2.dev` (public serving domain, `s3.ts:24`, `next.config.js:20`). Fix restricted to `main` branch only.

## Architecture Decisions
- Fix in `frontend/middleware.ts` only — authoritative header, overrides next.config.js (`set()` wins). next.config.js broad `https:` already covers r2.dev, untouched.
- Keep `*.r2.cloudflarestorage.com` — SDK-endpoint images possible, removal out of scope.
- Dev branch: commit + push dirty work BEFORE switching to main (prevents change carry-over, preserves dev work).
- No test file change on main — diff minimal; existing f10 test covers structure, manual console check covers fix.

## Task List

### Phase 1: Preserve dev branch
- [ ] Task 1: Commit + push dev work
  - Stage all tracked + untracked (`docker-entrypoint.sh`, `docker-local.ps1`, `frontend/opencode.json`)
  - Conventional commit, `git push origin dev`
  - AC: worktree clean on `dev`; `origin/dev` ahead by 1
  - Verify: `git status` clean, `git log origin/dev -1` shows new commit

### Phase 2: Production fix on main
- [ ] Task 2: Add `https://*.r2.dev` to img-src on main
  - `git checkout main`, `git pull`
  - `middleware.ts:15`: `img-src 'self' data: blob: https://*.r2.dev https://${r2Domain} https://placehold.co https://*.googlesyndication.com ${workerDomain};`
  - Commit `fix(security): allow r2.dev images in CSP img-src`, `git push origin main`
  - AC: header contains r2.dev; main pushed
  - Verify: `npm test -- __tests__/tier1/f10_middleware_csp_media.test.ts`, `npm run lint`, `npx tsc --noEmit`

### Checkpoint: Complete
- [ ] Both branches pushed
- [ ] Tests/lint/typecheck pass on main
- [ ] `git checkout dev` restores work context
- [ ] Manual prod check: no CSP violation for r2.dev images (after deploy)

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Uncommitted dev changes leak into main | Med | Commit dev first (Task 1 precedes Task 2) |
| Image blocked from other domain (e.g. custom CDN) | Low | Ask user for exact blocked URL from console before wider change |

## Open Questions
- None — blocked domain identified (`*.r2.dev` from code paths)
