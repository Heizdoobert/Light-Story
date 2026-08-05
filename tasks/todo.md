# Tasks: Next.js App Router Architecture, SEO & Pipeline

- [x] Task 1: Add environment variable validation schema (`frontend/src/env.mjs`)
  - Acceptance: Validate public & server env vars using Zod with fallbacks.
  - Verify: Import in layout without build errors.
  - Files: `frontend/src/env.mjs`

- [x] Task 2: Configure root metadataBase & base SEO in `layout.tsx`
  - Acceptance: `metadataBase: new URL(...)` set in `metadata` object.
  - Verify: Inspection of `layout.tsx`.
  - Files: `frontend/src/app/layout.tsx`

- [x] Task 3: Create Edge Dynamic OG Image generator (`app/opengraph-image.tsx`)
  - Acceptance: `next/og` `ImageResponse` running on `edge` runtime.
  - Verify: File exists and compiles.
  - Files: `frontend/src/app/opengraph-image.tsx`

- [x] Task 4: Create Health Check Route Handler (`app/api/health/route.ts`)
  - Acceptance: Returns `{ status: 'ok' }` with status 200.
  - Verify: GET response typed with `NextResponse.json`.
  - Files: `frontend/src/app/api/health/route.ts`

- [x] Task 5: Verify build & typecheck
  - Acceptance: `npm run lint` and `npm run build` pass without error.
  - Verify: Terminal execution output.
  - Files: N/A
