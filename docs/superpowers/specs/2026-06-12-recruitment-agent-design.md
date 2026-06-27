---
date: 2026-06-12
topic: "Intelligent Recruitment Agent"
status: draft
---

## Problem Statement

Light Story needs to grow its creator base — comic authors and artists who publish on the platform. Manual creator scouting and evaluation doesn't scale. The platform needs an intelligent agent that autonomously scouts talent across web, evaluates portfolios using AI, and surfaces qualified candidates for admin review and onboarding.

## Constraints

- Deploy as Cloudflare Worker (existing unified-gateway pattern)
- Use Cloudflare Agents SDK for stateful, durable execution
- No new external databases — Supabase (existing) + DO SQLite (implicit with Agents SDK)
- Admin must approve all invites (no auto-onboarding)
- Must handle multi-source scraping (Pixiv, DeviantArt, ArtStation, Twitter/X, Behance, Webtoon, Tapas, MangaPlus + manual URLs)
- Real-time admin dashboard via WebSocket sync
- @google/genai already installed in frontend but unused — use for vision evaluation or switch to Workers AI binding

## Approach

**Full Agents SDK Worker** — new `recruitment-agent` worker with a single `RecruitmentAgent` Durable Object class. Each admin session maps to one agent instance. Agent holds scout sessions, evaluation queue, and decisions in DO SQLite, synced to Supabase for long-term storage.

**Why not stateless:** Recruitment is inherently stateful — long-running scout sessions, evaluation queues, admin decisions over time. Stateless cron + polling would lose durability and real-time sync.

## Architecture

```
recruitment-agent Worker
├── RecruitmentAgent (DO) — per-admin session
│   ├── ScoutScheduler — cron-based web crawler
│   ├── CreatorEvaluator — AI portfolio analysis
│   ├── AdminRPCHandler — callable methods for dashboard
│   ├── InviteSender — email composer/dispatcher
│   └── SupabaseSync — dual-write evaluations + decisions
├── wrangler.jsonc — durable_objects + email binding + AI binding
└── package.json — agents, @cloudflare/ai-chat
```

**Admin Dashboard** (in frontend next app):
- `useAgent` React hook for real-time state sync
- Scout queue view (pending candidates)
- Candidate cards with scores, samples, AI report
- Approve/Reject/Invite actions

## Admin Dashboard Integration

New tab in existing admin layout:

| File | Change |
|---|---|
| `frontend/src/lib/adminNavigation.ts` | Add `recruitment` to `AdminMenuId`, add menu item (UserSearch icon) |
| `frontend/src/app/admin/_components/RecruitmentTab.tsx` | New component — lazy-loaded via `useAgent` hook |
| `frontend/src/app/admin/_components/AdminDashboard.tsx` | Add `<RecruitmentTab>` import + case in render map |

Dashboard uses `useAgent({ agent: "RecruitmentAgent", name: admin.userId })` for real-time sync. State updates flow via WebSocket automatically.

## Components

### RecruitmentAgent (DO)

Single agent class. Instantiated per admin user ID. Holds all state:

```typescript
type State = {
  adminId: string;
  scoutSessions: ScoutSession[];
  pendingCandidates: Candidate[];
  evaluatedCandidates: Candidate[];
  decisions: Decision[];
  lastCronRun: number;
};
```

Key `@callable()` methods:
- `getDashboard()` — full state snapshot
- `approveCandidate(candidateId, notes)`
- `rejectCandidate(candidateId, reason)`
- `sendInvite(candidateId)`
- `addManualUrl(url)`

### ScoutScheduler

- `scheduleEvery(86400)` — daily crawl
- For each source: fetch recent popular/new creators
- Deduplicate against existing candidates
- `this.queue()` each new candidate for evaluation
- Store last successful run per source

**Per-source scraping strategy:**

| Source | Method | Notes |
|---|---|---|
| Pixiv | Pixiv Public API (OAuth) | `/v1/user/search`, `/v2/user/detail`, `/v2/illust/follow` |
| DeviantArt | DeviantArt API (client_credentials) | `/user/watchers`, `/gallery/`, `/user/profile` |
| ArtStation | ArtStation API (public) | `/users/search.json`, `/users/{slug}.json`, /projects/ |
| Twitter/X | Twitter API v2 (OAuth 2.0) | `/2/users/search`, `/2/tweets`, media URL extraction |
| Behance | Behance API (public) | `/v2/users/`, `/v2/projects/` |
| Webtoon | RSS feed + HTML scrape | No public API — parse RSS for recent series, scrape creator profile |
| Tapas | HTML scrape | No public API — scrape series pages for creator info |
| MangaPlus | HTML scrape | No public API — scrape series list for creator attribution |
| Manual URL | Direct fetch | Parse URL to detect platform, route to corresponding handler |

Rate limiting: configurable per-source delay (default 5s between requests). Queue with jitter for retry-after headers.

### CreatorEvaluator

Triggered via `this.queue()` per candidate:
1. Fetch creator profile page + metadata
2. Fetch 10-15 sample images from portfolio
3. Create `AIChatAgent` session with Workers AI vision model
4. Analyze against criteria: technique, style consistency, genre match, originality, professionalism
5. Output structured evaluation: `{ score: 0-100, strengths: string[], gaps: string[], genreMatch: number, verdict: 'strong_match' | 'potential' | 'mismatch' }`
6. Write to DO SQLite + Supabase
7. `broadcast()` new evaluation to admin client

**Image handling:** Images fetched in-memory via `fetch()` — pass as data URIs or Workers AI vision input. No persistent storage needed. 10-15 images × ~500KB average = ~5-7.5MB per evaluation, well within DO memory limits. Large images downscaled client-side before submission to LLM.

### AdminRPCHandler

Implements all RPC methods. Uses `validateStateChange` for guard rails (e.g., cannot approve already-rejected candidate).

### InviteSender

- Composes personalized email from template
- Sends via Cloudflare Email Service binding
- Track invite status (sent, opened, accepted, expired)
- Retry on send failure via `this.retry()`

### SupabaseSync

Dual-write pattern:
- Hot data: DO SQLite (agent state)
- Cold data: Supabase table `recruitment_candidates` + `recruitment_decisions` + `recruitment_invites`
- Sync on each state change: `onStateUpdate` triggers Supabase write

New Supabase tables:
- `recruitment_candidates` — id, source_url, source_platform, score, evaluation_json, status, created_at
- `recruitment_decisions` — id, candidate_id, admin_id, action (approve/reject/invite), notes, created_at
- `recruitment_invites` — id, candidate_id, status, sent_at, opened_at, accepted_at

## Data Flow

```
Cron tick → ScoutScheduler.run()
  → scrape sources → dedup → queue(candidate)
  → CreatorEvaluator.process()
    → fetch samples → AIChatAgent vision analysis
    → structured score → DO SQLite + Supabase + broadcast
  → Admin Dashboard (real-time via useAgent)
    → admin reviews card → approve()/reject()
    → sendInvite() → Email Service
```

## Error Handling

| Scenario | Strategy |
|---|---|
| Scrape timeout | `this.retry()` with backoff, max 3 attempts |
| LLM rate limit | `this.queue()` with jitter, max 5 retries then skip |
| Portfolio has no images | Score 0, flag `insufficient_samples` |
| Email send failure | Retry queue, broadcast admin alert on permanent fail |
| Admin disconnects | DO persists, reconnects on return |
| DO eviction during scrape | `runFiber()` with `stash()` checkpoint |

**Durability principle:** No evaluation is lost. Dual-write ensures admin always sees consistent state.

## LLM Strategy

Two options for the vision evaluation:

1. **Workers AI binding** (preferred) — Keep everything inside Cloudflare. Use `@cf/meta/llama-3.2-11b-vision-instruct` or similar vision model. No external API key management.

2. **@google/genai** — Already in frontend package.json. Use Gemini 2.0 Flash for vision. Requires API key via secret. Latency may be higher.

Decision: Start with Workers AI (lower latency, no external deps). Fall back to Gemini if vision quality insufficient.

## Testing Strategy

| Layer | Scope | Tool |
|---|---|---|
| Unit | Scoring logic, dedup, template render | Vitest |
| Agent | State transitions, RPC, scheduling | Vitest + DO test helpers |
| Integration | Pipeline: scrape→evaluate→persist→broadcast | wrangler dev + test DO |
| Admin API | CRUD via callable methods | Vitest with DO mock |
| E2E | Admin session flow | Playwright |

## Open Questions

- Rate limits on scraped platforms — per-source throttle config (5s default, adjustable). Exact rate limits TBD per platform during implementation
- Candidate onboarding flow after invite — existing registration or new creator flow? Needs design decision. Lean toward existing registration with `invite_code` link that pre-fills role/permissions
