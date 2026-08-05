# Plan: Next.js App Router Architecture, SEO & Pipeline

## Strategy
Sequential 4-phase rollout:
1. Environment & SEO Root setup (`env.mjs`, `layout.tsx`).
2. Dynamic OG Image generator (`app/opengraph-image.tsx` using Edge runtime).
3. Health check Route Handler (`app/api/health/route.ts`).
4. Standalone build verification (`npm run build`).

## Risks & Mitigation
- **Risk**: Edge Runtime font loading in OG image.
  - **Mitigation**: Use default system/sans font in `next/og` `ImageResponse`.
- **Risk**: Environment variable missing at build time.
  - **Mitigation**: Safe fallback handling in `src/env.mjs`.

## Verification Checkpoints
- Checkpoint 1: `layout.tsx` has `metadataBase`.
- Checkpoint 2: `/api/health` returns HTTP 200.
- Checkpoint 3: `npm run build` cleanly generates standalone build.
