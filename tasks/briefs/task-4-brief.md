# Task 4: Root files review

## Description
Review the 10 root files of `frontend/src/app/` for metadata/SEO, provider ordering, and conventions. Report-only — no fixes.

## Acceptance criteria
- [ ] Every root file read and assessed
- [ ] Metadata: `layout.tsx` metadata present; `metadataBase` issue (build warns it's unset) assessed as finding; `generateMetadata` used where dynamic (I.1 note: static metadata in layout is fine for static routes)
- [ ] `providers.tsx` ordering correct (Auth → Language → QueryClient etc. per actual dependency)
- [ ] No `'use client'` where server component suffices (I.1); no server-client imports into client files (III)
- [ ] `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `globals.css` sane; `@/` aliases used (I.5)
- [ ] Findings table: file:line, issue, severity (High/Med/Low), rule ID

## Verification
- [ ] Report file written, zero code changes

## Dependencies
None.

## Files likely touched
- NONE (report only)

## Context / constraints
- Root files: `layout.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `providers.tsx`, `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `globals.css`.
- `metadataBase` missing = build warns twice (social/OG URLs fall back to localhost:3000). Assess severity + correct fix (set in root layout metadata).
- PowerShell shell; workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Report file: `D:\Light-Story\tasks\reports\task-4-report.md` — per-file verdict + findings with severity + rule ID.
