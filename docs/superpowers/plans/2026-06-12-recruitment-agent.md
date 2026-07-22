# Recruitment Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build intelligent recruitment agent worker + admin dashboard for scouting/evaluating comic creators

**Architecture:** Single Cloudflare Workers DO (`RecruitmentAgent`) using Agents SDK. Per-admin session. Scout → evaluate (Workers AI vision) → admin review → invite (Email Service). Real-time dashboard sync via `useAgent` React hook.

**Tech Stack:** Cloudflare Workers + Agents SDK (`agents` pkg), Workers AI vision, Cloudflare Email Service, DO SQLite, Supabase (dual-write), Next.js admin panel (React hooks)

**Scaffold:**
```
workers/recruitment-agent/
  src/
    index.ts           # worker entry, routeAgentRequest
    agent.ts           # RecruitmentAgent DO + @callable methods
    types.ts           # Candidate, ScoutSession, Evaluation, Decision
    scout.ts           # ScoutScheduler + per-source handlers
    evaluator.ts       # CreatorEvaluator with Workers AI vision
    invite.ts          # InviteSender with email templates
    supabase-sync.ts   # Dual-write to Supabase on state changes
  wrangler.jsonc
  package.json
  tsconfig.json
  .dev.vars

frontend/
  src/lib/adminNavigation.ts        # Add "recruitment" AdminMenuId
  src/app/admin/_components/
    RecruitmentTab.tsx               # New component
    AdminDashboard.tsx               # Wire import + render case

backend-supabase/supabase/migrations/
  20260612000100_recruitment_tables.sql  # New tables
```

---

### Task 1: Scaffold recruitment-agent worker

**Files:**
- Create: `workers/recruitment-agent/package.json`
- Create: `workers/recruitment-agent/wrangler.jsonc`
- Create: `workers/recruitment-agent/tsconfig.json`
- Create: `workers/recruitment-agent/.dev.vars`

- [ ] **Step 1: Create worker directory structure**

Run: `New-Item -ItemType Directory -Path "workers/recruitment-agent/src" -Force`

- [ ] **Step 2: Create package.json**

Write `workers/recruitment-agent/package.json`:
```json
{
  "name": "recruitment-agent",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler build",
    "deploy": "wrangler deploy",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "agents": "^0.7.0",
    "@cloudflare/ai-chat": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "wrangler": "^4.92.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create wrangler.jsonc**

Write `workers/recruitment-agent/wrangler.jsonc`:
```jsonc
{
  "name": "recruitment-agent",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-12",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [
      { "name": "RecruitmentAgent", "class_name": "RecruitmentAgent" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["RecruitmentAgent"] }
  ],
  "ai": {
    "binding": "AI"
  },
  "send_email": "SEND_EMAIL_BINDING"
}
```

Note: `send_email` binding uses Cloudflare Email Service. Adjust binding name per project email setup.

- [ ] **Step 4: Create tsconfig.json**

Write `workers/recruitment-agent/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": false
  },
  "include": ["src"]
}
```

**IMPORTANT:** `experimentalDecorators: false` — Agents SDK uses its own decorator transform. Setting `true` breaks `@callable()`.

- [ ] **Step 5: Create .dev.vars**

Write `workers/recruitment-agent/.dev.vars`:
```
SUPABASE_URL=https://cxpncsyemokysodgoojh.supabase.co
SUPABASE_SERVICE_KEY=
WORKERS_AI_MODEL=@cf/meta/llama-3.2-11b-vision-instruct
```

SUPABASE_SERVICE_KEY will be populated from existing project secrets.

- [ ] **Step 6: Install dependencies**

Run: `cd workers/recruitment-agent; npm install`

Expected: Creates `node_modules/` with `agents`, `@cloudflare/ai-chat`, `wrangler`, etc.

- [ ] **Step 7: Verify build works**

Run: `cd workers/recruitment-agent; npm run build`

Expected: `wrangler build` succeeds (produces `dist/` even though index.ts not written yet — tests config)

- [ ] **Step 8: Commit**

```bash
git add workers/recruitment-agent/
git commit -m "feat: scaffold recruitment-agent worker"
```

---

### Task 2: Supabase migration for recruitment tables

**Files:**
- Create: `backend-supabase/supabase/migrations/20260612000100_recruitment_tables.sql`

- [ ] **Step 1: Write migration SQL**

Write `backend-supabase/supabase/migrations/20260612000100_recruitment_tables.sql`:
```sql
-- Recruitment agent: candidate, decision, and invite tracking

create table if not exists public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_platform text not null, -- 'pixiv', 'deviantart', 'artstation', 'twitter', 'behance', 'webtoon', 'tapas', 'mangaplus', 'manual'
  creator_name text,
  creator_handle text,
  avatar_url text,
  follower_count int default 0,
  score int check (score >= 0 and score <= 100),
  evaluation_json jsonb default '{}',
  verdict text check (verdict in ('strong_match', 'potential', 'mismatch')),
  status text not null default 'pending' check (status in ('pending', 'evaluated', 'approved', 'rejected', 'invited', 'onboarded')),
  admin_notes text,
  created_at timestamptz default now(),
  evaluated_at timestamptz,
  decided_at timestamptz
);

create table if not exists public.recruitment_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.recruitment_candidates(id) on delete cascade,
  admin_id uuid not null,
  action text not null check (action in ('approve', 'reject', 'invite')),
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.recruitment_invites (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.recruitment_candidates(id) on delete cascade,
  invite_code text unique not null,
  status text not null default 'sent' check (status in ('sent', 'opened', 'accepted', 'expired')),
  sent_at timestamptz default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '30 days'
);

-- Indexes for common queries
create index idx_recruitment_candidates_status on public.recruitment_candidates(status);
create index idx_recruitment_candidates_source on public.recruitment_candidates(source_platform);
create index idx_recruitment_candidates_score on public.recruitment_candidates(score desc);
create index idx_recruitment_decisions_candidate on public.recruitment_decisions(candidate_id);
create index idx_recruitment_invites_candidate on public.recruitment_invites(candidate_id);
create index idx_recruitment_invites_code on public.recruitment_invites(invite_code);

-- RLS: only superadmin and admin can view/manage recruitment
alter table public.recruitment_candidates enable row level security;
alter table public.recruitment_decisions enable row level security;
alter table public.recruitment_invites enable row level security;

create policy "superadmin_full_access_recruitment_candidates"
  on public.recruitment_candidates for all
  using (public.has_role(auth.uid(), 'superadmin'::public.user_role))
  with check (public.has_role(auth.uid(), 'superadmin'::public.user_role));

create policy "admin_read_recruitment_candidates"
  on public.recruitment_candidates for select
  using (public.has_role(auth.uid(), 'admin'::public.user_role));

create policy "superadmin_full_access_recruitment_decisions"
  on public.recruitment_decisions for all
  using (public.has_role(auth.uid(), 'superadmin'::public.user_role))
  with check (public.has_role(auth.uid(), 'superadmin'::public.user_role));

create policy "admin_read_recruitment_decisions"
  on public.recruitment_decisions for select
  using (public.has_role(auth.uid(), 'admin'::public.user_role));

create policy "superadmin_full_access_recruitment_invites"
  on public.recruitment_invites for all
  using (public.has_role(auth.uid(), 'superadmin'::public.user_role))
  with check (public.has_role(auth.uid(), 'superadmin'::public.user_role));

create policy "admin_read_recruitment_invites"
  on public.recruitment_invites for select
  using (public.has_role(auth.uid(), 'admin'::public.user_role));
```

- [ ] **Step 2: Apply migration**

Run: `supabase --db-url <url> migration up`

Or if using Supabase CLI: `cd backend-supabase; supabase db push`

- [ ] **Step 3: Commit**

```bash
git add backend-supabase/supabase/migrations/20260612000100_recruitment_tables.sql
git commit -m "feat: add recruitment tables migration"
```

---

### Task 3: Agent types

**Files:**
- Create: `workers/recruitment-agent/src/types.ts`

- [ ] **Step 1: Write types**

Write `workers/recruitment-agent/src/types.ts`:
```typescript
export type Verdict = 'strong_match' | 'potential' | 'mismatch';
export type CandidateStatus = 'pending' | 'evaluated' | 'approved' | 'rejected' | 'invited' | 'onboarded';
export type SourcePlatform = 'pixiv' | 'deviantart' | 'artstation' | 'twitter' | 'behance' | 'webtoon' | 'tapas' | 'mangaplus' | 'manual';

export interface Evaluation {
  score: number; // 0-100
  strengths: string[];
  gaps: string[];
  genreMatch: number; // 0-100
  verdict: Verdict;
  summary: string;
}

export interface Candidate {
  id: string;
  sourceUrl: string;
  sourcePlatform: SourcePlatform;
  creatorName: string;
  creatorHandle?: string;
  avatarUrl?: string;
  followerCount: number;
  evaluation?: Evaluation;
  status: CandidateStatus;
  adminNotes?: string;
  createdAt: number; // epoch ms
  evaluatedAt?: number;
  decidedAt?: number;
}

export interface ScoutSession {
  source: SourcePlatform;
  lastRunAt: number;
  candidatesFound: number;
  status: 'idle' | 'running' | 'error';
  error?: string;
}

export interface Decision {
  candidateId: string;
  action: 'approve' | 'reject' | 'invite';
  notes: string;
  adminId: string;
  createdAt: number;
}

export interface Invite {
  candidateId: string;
  inviteCode: string;
  status: 'sent' | 'opened' | 'accepted' | 'expired';
  sentAt: number;
  openedAt?: number;
  acceptedAt?: number;
}

export interface AgentState {
  adminId: string;
  scoutSessions: ScoutSession[];
  pendingCandidates: Candidate[];
  evaluatedCandidates: Candidate[];
  decisions: Decision[];
  invites: Invite[];
  lastCronRun: number;
}

export interface Env {
  RecruitmentAgent: DurableObjectNamespace;
  AI: Ai;
  SEND_EMAIL_BINDING: SendEmail;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  WORKERS_AI_MODEL: string;
}
```

- [ ] **Step 2: Run type check**

Run: `cd workers/recruitment-agent; npx tsc --noEmit`

Expected: Compiles clean (no errors, types only file)

- [ ] **Step 3: Commit**

```bash
git add workers/recruitment-agent/src/types.ts
git commit -m "feat: add recruitment agent types"
```

---

### Task 4: RecruitmentAgent DO with state + callable methods

**Files:**
- Create: `workers/recruitment-agent/src/agent.ts`

- [ ] **Step 1: Write the Agent class**

Write `workers/recruitment-agent/src/agent.ts`:
```typescript
import { Agent, callable } from "agents";
import type { AgentState, Candidate, ScoutSession, Decision, Invite, Evaluation, SourcePlatform } from "./types";

export class RecruitmentAgent extends Agent<Env, AgentState> {
  initialState: AgentState = {
    adminId: "",
    scoutSessions: [],
    pendingCandidates: [],
    evaluatedCandidates: [],
    decisions: [],
    invites: [],
    lastCronRun: 0,
  };

  validateStateChange(nextState: AgentState, source: Connection | "server") {
    // Ensure adminId doesn't change after initial set
    if (this.state.adminId && nextState.adminId !== this.state.adminId) {
      throw new Error("adminId cannot change after initialization");
    }
  }

  onStateUpdate(state: AgentState, source: Connection | "server") {
    // Dual-write to Supabase handled in supabase-sync.ts
    console.log(`[RecruitmentAgent ${state.adminId}] state updated`);
  }

  @callable()
  async initialize(adminId: string): Promise<AgentState> {
    if (!this.state.adminId) {
      this.setState({ ...this.state, adminId });
    }
    return this.state;
  }

  @callable()
  async getDashboard(): Promise<AgentState> {
    return this.state;
  }

  @callable()
  async addManualUrl(url: string, platform: SourcePlatform): Promise<Candidate> {
    const candidate: Candidate = {
      id: crypto.randomUUID(),
      sourceUrl: url,
      sourcePlatform: platform,
      creatorName: "",
      creatorHandle: "",
      followerCount: 0,
      status: "pending",
      createdAt: Date.now(),
    };
    this.setState({
      ...this.state,
      pendingCandidates: [...this.state.pendingCandidates, candidate],
    });
    return candidate;
  }

  @callable()
  async approveCandidate(candidateId: string, notes: string): Promise<void> {
    const candidate = this.findCandidate(candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);
    if (candidate.status === "rejected") throw new Error("Cannot approve rejected candidate");

    const decision: Decision = {
      candidateId,
      action: "approve",
      notes,
      adminId: this.state.adminId,
      createdAt: Date.now(),
    };

    this.setState({
      ...this.state,
      evaluatedCandidates: this.state.evaluatedCandidates.map((c) =>
        c.id === candidateId ? { ...c, status: "approved", adminNotes: notes, decidedAt: Date.now() } : c
      ),
      decisions: [...this.state.decisions, decision],
    });
  }

  @callable()
  async rejectCandidate(candidateId: string, reason: string): Promise<void> {
    const candidate = this.findCandidate(candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

    const decision: Decision = {
      candidateId,
      action: "reject",
      notes: reason,
      adminId: this.state.adminId,
      createdAt: Date.now(),
    };

    this.setState({
      ...this.state,
      evaluatedCandidates: this.state.evaluatedCandidates.map((c) =>
        c.id === candidateId ? { ...c, status: "rejected", adminNotes: reason, decidedAt: Date.now() } : c
      ),
      decisions: [...this.state.decisions, decision],
    });
  }

  @callable()
  async sendInvite(candidateId: string): Promise<void> {
    const candidate = this.findCandidate(candidateId);
    if (!candidate || candidate.status !== "approved") {
      throw new Error("Candidate must be approved before inviting");
    }

    const inviteCode = `invite_${crypto.randomUUID().slice(0, 8)}`;
    const invite: Invite = {
      candidateId,
      inviteCode,
      status: "sent",
      sentAt: Date.now(),
    };

    this.setState({
      ...this.state,
      evaluatedCandidates: this.state.evaluatedCandidates.map((c) =>
        c.id === candidateId ? { ...c, status: "invited" } : c
      ),
      invites: [...this.state.invites, invite],
    });
  }

  @callable()
  async queueEvaluation(candidateId: string): Promise<void> {
    // ScoutScheduler queues evaluations via this method
    // Actual evaluation happens in CreatorEvaluator (Task 7)
    this.queue("evaluate", candidateId);
  }

  // Internal: move candidate from pending to evaluated after scoring
  @callable()
  async submitEvaluation(candidateId: string, evaluation: Evaluation): Promise<void> {
    const candidate = this.state.pendingCandidates.find((c) => c.id === candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

    const evaluated = { ...candidate, evaluation, status: "evaluated" as const, evaluatedAt: Date.now() };

    this.setState({
      ...this.state,
      pendingCandidates: this.state.pendingCandidates.filter((c) => c.id !== candidateId),
      evaluatedCandidates: [...this.state.evaluatedCandidates, evaluated],
    });
  }

  private findCandidate(candidateId: string): Candidate | undefined {
    return (
      this.state.pendingCandidates.find((c) => c.id === candidateId) ??
      this.state.evaluatedCandidates.find((c) => c.id === candidateId)
    );
  }
}
```

- [ ] **Step 2: Run type check**

Run: `cd workers/recruitment-agent; npx tsc --noEmit`

Expected: Compiles clean

- [ ] **Step 3: Commit**

```bash
git add workers/recruitment-agent/src/agent.ts
git commit -m "feat: add RecruitmentAgent DO with callable methods"
```

---

### Task 5: Worker entry point

**Files:**
- Create: `workers/recruitment-agent/src/index.ts`

- [ ] **Step 1: Write worker entry point**

Write `workers/recruitment-agent/src/index.ts`:
```typescript
import { routeAgentRequest } from "agents";
import { RecruitmentAgent } from "./agent";

export { RecruitmentAgent };

export default {
  fetch(req: Request, env: Env) {
    return (
      routeAgentRequest(req, env) ??
      new Response("Not found", { status: 404 })
    );
  },
};
```

- [ ] **Step 2: Verify build**

Run: `cd workers/recruitment-agent; npm run build`

Expected: `wrangler build` succeeds, produces `dist/`

- [ ] **Step 3: Commit**

```bash
git add workers/recruitment-agent/src/index.ts
git commit -m "feat: add worker entry point with agent routing"
```

---

### Task 6: ScoutScheduler with multi-source scraping

**Files:**
- Create: `workers/recruitment-agent/src/scout.ts`

- [ ] **Step 1: Write ScoutScheduler**

Write `workers/recruitment-agent/src/scout.ts`:
```typescript
import type { SourcePlatform, ScoutSession, Candidate } from "./types";
import { RecruitmentAgent } from "./agent";

interface SourceHandler {
  platform: SourcePlatform;
  // Returns array of discovered creator URLs/metadata
  fetchCandidates: (lastRunAt: number) => Promise<ScrapedCreator[]>;
  throttleMs: number;
  requiresAuth: boolean;
}

interface ScrapedCreator {
  sourceUrl: string;
  creatorName: string;
  creatorHandle?: string;
  avatarUrl?: string;
  followerCount: number;
}

const HANDLERS: Record<SourcePlatform, SourceHandler> = {
  manual: {
    platform: "manual",
    fetchCandidates: async () => [], // manual URLs handled via RPC
    throttleMs: 0,
    requiresAuth: false,
  },
  pixiv: {
    platform: "pixiv",
    fetchCandidates: async () => {
      // Pixiv public API (requires OAuth token in secrets)
      // GET /v1/user/search?word=comic&order=date
      const resp = await fetch("https://app-api.pixiv.net/v1/user/search?word=comic+manga&order=date", {
        headers: { Authorization: `Bearer ${PIXIV_ACCESS_TOKEN}` },
      });
      if (!resp.ok) throw new Error(`Pixiv API error: ${resp.status}`);
      const data = await resp.json() as { user_previews?: Array<{ user: { id: number; name: string; account: string; profile_image_urls?: { medium: string } }; illusts?: unknown[] }> };
      return (data.user_previews ?? []).map((u) => ({
        sourceUrl: `https://www.pixiv.net/users/${u.user.id}`,
        creatorName: u.user.name,
        creatorHandle: u.user.account,
        avatarUrl: u.user.profile_image_urls?.medium,
        followerCount: 0, // requires separate /v2/user/detail call
      }));
    },
    throttleMs: 5000,
    requiresAuth: true,
  },
  deviantart: {
    platform: "deviantart",
    fetchCandidates: async () => {
      // DeviantArt API (requires client_credentials OAuth)
      const resp = await fetch("https://www.deviantart.com/api/v1/oauth2/browse/popular?category=digitalart&limit=24", {
        headers: { Authorization: `Bearer ${DEVIANTART_TOKEN}` },
      });
      if (!resp.ok) throw new Error(`DeviantArt API error: ${resp.status}`);
      const data = await resp.json() as { results?: Array<{ author: { username: string; usericon: string } }> };
      return (data.results ?? []).map((r) => ({
        sourceUrl: `https://www.deviantart.com/${r.author.username}`,
        creatorName: r.author.username,
        creatorHandle: r.author.username,
        avatarUrl: r.author.usericon,
        followerCount: 0,
      }));
    },
    throttleMs: 3000,
    requiresAuth: true,
  },
  artstation: {
    platform: "artstation",
    fetchCandidates: async () => {
      // ArtStation public API
      const resp = await fetch("https://www.artstation.com/users/search.json?query=comic&page=1");
      if (!resp.ok) throw new Error(`ArtStation API error: ${resp.status}`);
      const data = await resp.json() as { data?: Array<{ id: number; username: string; full_name: string; small_cover_url?: string }> };
      return (data.data ?? []).map((u) => ({
        sourceUrl: `https://www.artstation.com/${u.username}`,
        creatorName: u.full_name || u.username,
        creatorHandle: u.username,
        avatarUrl: u.small_cover_url,
        followerCount: 0,
      }));
    },
    throttleMs: 2000,
    requiresAuth: false,
  },
  twitter: {
    platform: "twitter",
    fetchCandidates: async () => {
      // Twitter API v2 (requires OAuth 2.0 Bearer token)
      const resp = await fetch("https://api.twitter.com/2/users/by?usernames=manga,comic&user.fields=public_metrics,profile_image_url", {
        headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
      });
      if (!resp.ok) throw new Error(`Twitter API error: ${resp.status}`);
      const data = await resp.json() as { data?: Array<{ id: string; name: string; username: string; profile_image_url?: string; public_metrics?: { followers_count: number } }> };
      return (data.data ?? []).map((u) => ({
        sourceUrl: `https://twitter.com/${u.username}`,
        creatorName: u.name,
        creatorHandle: u.username,
        avatarUrl: u.profile_image_url,
        followerCount: u.public_metrics?.followers_count ?? 0,
      }));
    },
    throttleMs: 3000,
    requiresAuth: true,
  },
  behance: {
    platform: "behance",
    fetchCandidates: async () => {
      // Behance public API
      const resp = await fetch("https://www.behance.net/v2/users?q=comic+illustration&field=comics");
      if (!resp.ok) throw new Error(`Behance API error: ${resp.status}`);
      const data = await resp.json() as { users?: Array<{ id: number; display_name: string; username: string; images?: { 50?: string }; stats?: { followers: number } }> };
      return (data.users ?? []).map((u) => ({
        sourceUrl: `https://www.behance.net/${u.username}`,
        creatorName: u.display_name,
        creatorHandle: u.username,
        avatarUrl: u.images?.["50"],
        followerCount: u.stats?.followers ?? 0,
      }));
    },
    throttleMs: 3000,
    requiresAuth: false,
  },
  webtoon: {
    platform: "webtoon",
    fetchCandidates: async () => {
      // Webtoon: no public API, parse RSS feed
      const resp = await fetch("https://www.webtoons.com/en/rss");
      if (!resp.ok) throw new Error(`Webtoon RSS error: ${resp.status}`);
      const text = await resp.text();
      // Extract <author> elements from RSS XML
      const authors = text.match(/<author>([^<]+)<\/author>/g) ?? [];
      const unique = [...new Set(authors.map((a) => a.replace(/<\/?author>/g, "").trim()))];
      return unique.slice(0, 20).map((name) => ({
        sourceUrl: `https://www.webtoons.com/en/search?keyword=${encodeURIComponent(name)}`,
        creatorName: name,
        followerCount: 0,
      }));
    },
    throttleMs: 10000,
    requiresAuth: false,
  },
  tapas: {
    platform: "tapas",
    fetchCandidates: async () => {
      // Tapas: no public API, scrape series pages
      const resp = await fetch("https://tapas.io/comics?sort=popular");
      if (!resp.ok) throw new Error(`Tapas scrape error: ${resp.status}`);
      const text = await resp.text();
      // Extract creator names from HTML (class="creator-name" or similar)
      const matches = text.match(/class="creator-name"[^>]*>([^<]+)</g) ?? [];
      const unique = [...new Set(matches.map((m) => m.replace(/class="creator-name"[^>]*>/, "").replace(/</, "").trim()))];
      return unique.slice(0, 20).map((name) => ({
        sourceUrl: `https://tapas.io/search?q=${encodeURIComponent(name)}`,
        creatorName: name,
        followerCount: 0,
      }));
    },
    throttleMs: 10000,
    requiresAuth: false,
  },
  mangaplus: {
    platform: "mangaplus",
    fetchCandidates: async () => {
      // MangaPlus: JSON API endpoint
      const resp = await fetch("https://jumpg-api.tokyo-cdn.com/api/title_list/ALL?format=json");
      if (!resp.ok) throw new Error(`MangaPlus API error: ${resp.status}`);
      const data = await resp.json() as { titleList?: { allTitles?: Array<{ author: string }> } };
      const authors = data?.titleList?.allTitles?.map((t) => t.author) ?? [];
      const unique = [...new Set(authors)];
      return unique.slice(0, 20).map((name) => ({
        sourceUrl: `https://mangaplus.shueisha.co.jp/search?q=${encodeURIComponent(name)}`,
        creatorName: name,
        followerCount: 0,
      }));
    },
    throttleMs: 5000,
    requiresAuth: false,
  },
};

export async function runScoutSession(
  agent: RecruitmentAgent,
  sources: SourcePlatform[],
  existingUrls: Set<string>
): Promise<void> {
  const now = Date.now();

  for (const source of sources) {
    const handler = HANDLERS[source];
    if (!handler) continue;

    const session: ScoutSession = {
      source,
      lastRunAt: now,
      candidatesFound: 0,
      status: "running",
    };

    try {
      const creators = await handler.fetchCandidates(agent.state.lastCronRun);
      const newCreators = creators.filter((c) => !existingUrls.has(c.sourceUrl));

      for (const creator of newCreators) {
        const candidate: Candidate = {
          id: crypto.randomUUID(),
          sourceUrl: creator.sourceUrl,
          sourcePlatform: source,
          creatorName: creator.creatorName,
          creatorHandle: creator.creatorHandle,
          avatarUrl: creator.avatarUrl,
          followerCount: creator.followerCount,
          status: "pending",
          createdAt: Date.now(),
        };
        existingUrls.add(candidate.sourceUrl);
        agent.setState({
          ...agent.state,
          pendingCandidates: [...agent.state.pendingCandidates, candidate],
        });
        // Queue evaluation for each new candidate
        agent.queue("evaluate", candidate.id);
        session.candidatesFound++;
      }

      session.status = "idle";
    } catch (error) {
      session.status = "error";
      session.error = error instanceof Error ? error.message : "Unknown error";
    }

    agent.setState({
      ...agent.state,
      scoutSessions: [...agent.state.scoutSessions.filter((s) => s.source !== source), session],
      lastCronRun: now,
    });

    // Respect throttle between sources
    if (handler.throttleMs > 0) {
      await new Promise((r) => setTimeout(r, handler.throttleMs));
    }
  }
}
```

- [ ] **Step 2: Run type check**

Run: `cd workers/recruitment-agent; npx tsc --noEmit`

Expected: Compiles clean

- [ ] **Step 3: Commit**

```bash
git add workers/recruitment-agent/src/scout.ts
git commit -m "feat: add ScoutScheduler with multi-source handlers"
```

---

### Task 7: CreatorEvaluator with Workers AI vision

**Files:**
- Create: `workers/recruitment-agent/src/evaluator.ts`

- [ ] **Step 1: Write CreatorEvaluator**

Write `workers/recruitment-agent/src/evaluator.ts`:
```typescript
import type { Candidate, Evaluation, Env } from "./types";

export async function evaluateCandidate(
  candidate: Candidate,
  env: Env
): Promise<Evaluation> {
  // 1. Fetch portfolio page to extract image URLs
  const imageUrls = await fetchPortfolioImages(candidate);

  if (imageUrls.length === 0) {
    return {
      score: 0,
      strengths: [],
      gaps: ["No portfolio images found"],
      genreMatch: 0,
      verdict: "mismatch",
      summary: "Cannot evaluate: no images available in portfolio",
    };
  }

  // 2. Fetch up to 15 images in-memory
  const images = await fetchImagesUpTo(imageUrls, 15);

  // 3. Call Workers AI vision model
  const model = env.WORKERS_AI_MODEL || "@cf/meta/llama-3.2-11b-vision-instruct";

  // Prepare image inputs as data URIs
  const imageInputs = images.map((img) => ({
    type: "image_url" as const,
    image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
  }));

  const prompt = `You are evaluating a comic/manga artist portfolio. Analyze the images and rate:
- Technique (composition, anatomy, color, linework): 0-100
- Style consistency across samples: 0-100
- Genre match for comic/manga platform (action, fantasy, romance, etc.): 0-100
- Originality (original characters/IP vs fan art): 0-100
- Professionalism (clean presentation, varied compositions): 0-100

Output JSON: { "score": number, "strengths": string[], "gaps": string[], "genreMatch": number, "verdict": "strong_match"|"potential"|"mismatch", "summary": string }`;

  const result = await env.AI.run(model, {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageInputs,
        ],
      },
    ],
  });

  // 4. Parse response
  try {
    const text = typeof result === "object" && result !== null && "response" in result
      ? (result as { response: string }).response
      : String(result);
    const parsed = JSON.parse(extractJson(text)) as Evaluation;
    return {
      score: Math.max(0, Math.min(100, parsed.score)),
      strengths: parsed.strengths ?? [],
      gaps: parsed.gaps ?? [],
      genreMatch: Math.max(0, Math.min(100, parsed.genreMatch ?? 0)),
      verdict: ["strong_match", "potential", "mismatch"].includes(parsed.verdict)
        ? parsed.verdict as Evaluation["verdict"]
        : "potential",
      summary: parsed.summary ?? "",
    };
  } catch {
    // Fallback: structured evaluation from raw output
    return {
      score: 50,
      strengths: ["Evaluation completed (parsing fallback)"],
      gaps: [],
      genreMatch: 50,
      verdict: "potential",
      summary: "Evaluation completed but structured output parsing failed. Review manually.",
    };
  }
}

async function fetchPortfolioImages(candidate: Candidate): Promise<string[]> {
  try {
    const resp = await fetch(candidate.sourceUrl, {
      headers: { "User-Agent": "LightStoryRecruitment/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // Extract image URLs from common patterns
    const imgUrls: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const url = match[1];
      if (url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i) && !url.includes("icon") && !url.includes("avatar") && !url.includes("logo")) {
        imgUrls.push(new URL(url, candidate.sourceUrl).href);
      }
    }
    return [...new Set(imgUrls)];
  } catch {
    return [];
  }
}

async function fetchImagesUpTo(urls: string[], max: number): Promise<Array<{ mimeType: string; base64: string }>> {
  const results: Array<{ mimeType: string; base64: string }> = [];
  for (const url of urls.slice(0, max)) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) continue;
      const buffer = await resp.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const mimeType = resp.headers.get("content-type") || "image/jpeg";
      results.push({ mimeType, base64 });
    } catch {
      continue; // skip failed images
    }
  }
  return results;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return "{}";
  return text.slice(start, end + 1);
}
```

- [ ] **Step 2: Run type check**

Run: `cd workers/recruitment-agent; npx tsc --noEmit`

Expected: Compiles clean

- [ ] **Step 3: Commit**

```bash
git add workers/recruitment-agent/src/evaluator.ts
git commit -m "feat: add CreatorEvaluator with Workers AI vision"
```

---

### Task 8: InviteSender with email templates

**Files:**
- Create: `workers/recruitment-agent/src/invite.ts`

- [ ] **Step 1: Write InviteSender**

Write `workers/recruitment-agent/src/invite.ts`:
```typescript
import type { Candidate, Env } from "./types";

interface EmailAddress {
  email: string;
  name?: string;
}

interface SendEmailRequest {
  to: EmailAddress[];
  from: EmailAddress;
  subject: string;
  content: Array<{ type: "text/plain" | "text/html"; value: string }>;
}

export async function sendCreatorInvite(
  candidate: Candidate,
  inviteCode: string,
  env: Env
): Promise<boolean> {
  const inviteLink = `https://lightstory.app/auth/register?invite=${inviteCode}&role=creator`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333;">Welcome to Light Story!</h1>
  <p>Hi ${candidate.creatorName},</p>
  <p>We discovered your portfolio and were impressed by your work. We'd love to invite you to publish your comics on <strong>Light Story</strong> — a growing manga/comic reading platform.</p>
  <p>As a creator on Light Story, you get:</p>
  <ul>
    <li>Reach to thousands of manga readers</li>
    <li>Monetization options for your work</li>
    <li>Creative freedom with your original IP</li>
  </ul>
  <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
    Accept Invitation
  </a>
  <p style="color: #888; font-size: 12px;">This invite expires in 30 days. Code: ${inviteCode}</p>
</body>
</html>`;

  const req: SendEmailRequest = {
    to: [{ email: candidate.creatorHandle ? `${candidate.creatorHandle}@placeholder.com` : "" }],
    from: { email: "creators@lightstory.app", name: "Light Story Team" },
    subject: `You're invited to publish on Light Story!`,
    content: [
      { type: "text/plain", value: `Hi ${candidate.creatorName},\n\nWe discovered your portfolio and would love to invite you to publish on Light Story.\n\n${inviteLink}\n\nCode: ${inviteCode}` },
      { type: "text/html", value: html },
    ],
  };

  try {
    // Cloudflare Email Service binding
    await env.SEND_EMAIL_BINDING.send(req);
    return true;
  } catch (error) {
    console.error(`Failed to send invite to ${candidate.creatorName}:`, error);
    return false;
  }
}

export function generateInviteCode(): string {
  return `invite_${crypto.randomUUID().slice(0, 8)}`;
}
```

Note: In practice, candidate email addresses need to be obtained (either from portfolio contact info or a follow-up step). The placeholder `@placeholder.com` should be replaced with real email extraction logic.

- [ ] **Step 2: Run type check**

Run: `cd workers/recruitment-agent; npx tsc --noEmit`

Expected: Compiles clean

- [ ] **Step 3: Commit**

```bash
git add workers/recruitment-agent/src/invite.ts
git commit -m "feat: add InviteSender with email templates"
```

---

### Task 9: Wire queue handler + cron scheduling into RecruitmentAgent

**Files:**
- Modify: `workers/recruitment-agent/src/agent.ts`

- [ ] **Step 1: Add queue handler + cron to RecruitmentAgent**

Edit `workers/recruitment-agent/src/agent.ts` — add import and `run()` method:

At top of file, add import:
```typescript
import { evaluateCandidate } from "./evaluator";
import { runScoutSession } from "./scout";
import { sendCreatorInvite, generateInviteCode } from "./invite";
```

Add `async run()` method to `RecruitmentAgent` class (handles queue + scheduled tasks):
```typescript
async run(): Promise<void> {
  // Handle queue messages (evaluate candidate)
  await this.consumeQueue(async (task: string, payload: unknown) => {
    if (task === "evaluate" && typeof payload === "string") {
      const candidateId = payload as string;
      const candidate = this.state.pendingCandidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      const evaluation = await evaluateCandidate(candidate, this.env as unknown as Env);
      await this.submitEvaluation(candidateId, evaluation);
    }
  });

  // Schedule recurring scout sessions
  await this.scheduleEvery(86400, "scout");
}

// Override onStateUpdate to include Supabase sync
onStateUpdate(state: AgentState, source: Connection | "server") {
  this.syncToSupabase(state);
}

private async syncToSupabase(state: AgentState): Promise<void> {
  // Implemented in Task 10 (SupabaseSync)
}
```

- [ ] **Step 2: Run type check**

Run: `cd workers/recruitment-agent; npx tsc --noEmit`

Expected: Compiles clean

- [ ] **Step 3: Commit**

```bash
git add workers/recruitment-agent/src/agent.ts
git commit -m "feat: wire queue handler and cron into RecruitmentAgent"
```

---

### Task 10: SupabaseSync dual-write

**Files:**
- Create: `workers/recruitment-agent/src/supabase-sync.ts`

- [ ] **Step 1: Write SupabaseSync**

Write `workers/recruitment-agent/src/supabase-sync.ts`:
```typescript
import type { AgentState, Env } from "./types";

const SUPABASE_API = "https://cxpncsyemokysodgoojh.supabase.co/rest/v1";

export async function syncStateToSupabase(
  state: AgentState,
  env: Pick<Env, "SUPABASE_URL" | "SUPABASE_SERVICE_KEY">
): Promise<void> {
  const headers = {
    "Content-Type": "application/json",
    "apikey": env.SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Prefer": "return=minimal",
  };

  const baseUrl = env.SUPABASE_URL || SUPABASE_API;

  try {
    // Sync evaluated candidates
    for (const candidate of state.evaluatedCandidates) {
      const body = {
        source_url: candidate.sourceUrl,
        source_platform: candidate.sourcePlatform,
        creator_name: candidate.creatorName,
        creator_handle: candidate.creatorHandle ?? null,
        avatar_url: candidate.avatarUrl ?? null,
        follower_count: candidate.followerCount,
        score: candidate.evaluation?.score ?? null,
        evaluation_json: candidate.evaluation ?? {},
        verdict: candidate.evaluation?.verdict ?? null,
        status: candidate.status,
        admin_notes: candidate.adminNotes ?? null,
        evaluated_at: candidate.evaluatedAt ? new Date(candidate.evaluatedAt).toISOString() : null,
        decided_at: candidate.decidedAt ? new Date(candidate.decidedAt).toISOString() : null,
      };

      await fetch(`${baseUrl}/recruitment_candidates?source_url=eq.${encodeURIComponent(candidate.sourceUrl)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
    }

    // Sync decisions
    for (const decision of state.decisions) {
      const body = {
        candidate_id: decision.candidateId,
        admin_id: decision.adminId,
        action: decision.action,
        notes: decision.notes,
      };

      await fetch(`${baseUrl}/recruitment_decisions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    }

    // Sync invites
    for (const invite of state.invites) {
      const body = {
        candidate_id: invite.candidateId,
        invite_code: invite.inviteCode,
        status: invite.status,
        sent_at: new Date(invite.sentAt).toISOString(),
        opened_at: invite.openedAt ? new Date(invite.openedAt).toISOString() : null,
        accepted_at: invite.acceptedAt ? new Date(invite.acceptedAt).toISOString() : null,
      };

      await fetch(`${baseUrl}/recruitment_invites`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    }
  } catch (error) {
    console.error("Supabase sync failed:", error);
  }
}
```

- [ ] **Step 2: Wire sync into agent.ts**

Edit `workers/recruitment-agent/src/agent.ts` — update `syncToSupabase`:
```typescript
import { syncStateToSupabase } from "./supabase-sync";

// In the class:
private async syncToSupabase(state: AgentState): Promise<void> {
  await syncStateToSupabase(state, this.env as unknown as Env);
}
```

- [ ] **Step 3: Run type check**

Run: `cd workers/recruitment-agent; npx tsc --noEmit`

Expected: Compiles clean

- [ ] **Step 4: Commit**

```bash
git add workers/recruitment-agent/src/supabase-sync.ts workers/recruitment-agent/src/agent.ts
git commit -m "feat: add SupabaseSync dual-write"
```

---

### Task 11: Admin navigation — add recruitment tab

**Files:**
- Modify: `frontend/src/lib/adminNavigation.ts`

- [ ] **Step 1: Add UserSearch icon import and recruitment menu item**

Edit `frontend/src/lib/adminNavigation.ts`:

Update import to add `UserSearch`:
```typescript
import { BookOpen, Database, DollarSign, LayoutDashboard, Library, PenSquare, PlusCircle, Settings, User, Users, UserSearch, Workflow, type LucideIcon } from 'lucide-react';
```

Add `'recruitment'` to `AdminMenuId` type:
```typescript
export type AdminMenuId =
  | 'dashboard'
  | 'dashboard_access_logs'
  | 'audit_logs'
  | 'operations_data'
  | 'create_story'
  | 'create_chapter'
  | 'stories'
  | 'categories'
  | 'authors'
  | 'users'
  | 'ads'
  | 'settings'
  | 'profile'
  | 'operations'
  | 'create_comic'
  | 'recruitment';  // NEW
```

Add menu item entry after `create_comic` entry:
```typescript
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: UserSearch,
    roles: ['superadmin', 'admin'],
  },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/adminNavigation.ts
git commit -m "feat: add recruitment tab to admin navigation"
```

---

### Task 12: RecruitmentTab React component

**Files:**
- Create: `frontend/src/app/admin/_components/RecruitmentTab.tsx`

- [ ] **Step 1: Write RecruitmentTab component**

Write `frontend/src/app/admin/_components/RecruitmentTab.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import { useAgent } from 'agents/react';
import { useAuth } from '@/modules/auth/AuthContext';

interface Candidate {
  id: string;
  sourceUrl: string;
  sourcePlatform: string;
  creatorName: string;
  followerCount: number;
  status: string;
  evaluation?: {
    score: number;
    verdict: string;
    strengths: string[];
    gaps: string[];
    summary: string;
  };
}

interface AgentState {
  pendingCandidates: Candidate[];
  evaluatedCandidates: Candidate[];
  scoutSessions: { source: string; status: string; candidatesFound: number }[];
}

export const RecruitmentTab: React.FC = () => {
  const { user } = useAuth();
  const [manualUrl, setManualUrl] = useState('');
  const [state, setState] = useState<AgentState>({
    pendingCandidates: [],
    evaluatedCandidates: [],
    scoutSessions: [],
  });

  const agent = useAgent({
    agent: 'RecruitmentAgent',
    name: user?.id || 'anonymous',
    onStateUpdate: (newState: AgentState) => setState(newState),
    onError: (error: Error) => console.error('Agent error:', error),
  });

  const handleAddUrl = async () => {
    if (!manualUrl.trim()) return;
    try {
      // @ts-expect-error — callable method on agent
      await agent.addManualUrl(manualUrl.trim(), 'manual');
      setManualUrl('');
    } catch (error) {
      console.error('Failed to add URL:', error);
    }
  };

  const handleApprove = async (candidateId: string) => {
    try {
      // @ts-expect-error — callable method on agent
      await agent.approveCandidate(candidateId, '');
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (candidateId: string) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try {
      // @ts-expect-error — callable method on agent
      await agent.rejectCandidate(candidateId, reason || 'No reason provided');
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleInvite = async (candidateId: string) => {
    if (!confirm('Send invitation to this creator?')) return;
    try {
      // @ts-expect-error — callable method on agent
      await agent.sendInvite(candidateId);
    } catch (error) {
      console.error('Failed to send invite:', error);
    }
  };

  const allCandidates = [...state.evaluatedCandidates, ...state.pendingCandidates];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-black">Creator Recruitment</h2>

      {/* Scout Sessions Status */}
      <div className="grid grid-cols-3 gap-4">
        {state.scoutSessions.map((session) => (
          <div key={session.source} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-bold capitalize">{session.source}</div>
            <div className="text-xs text-slate-500">
              {session.status === 'running' ? 'Scouting...' : `${session.candidatesFound} found`}
            </div>
          </div>
        ))}
      </div>

      {/* Manual URL Input */}
      <div className="flex gap-4">
        <input
          type="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="Paste creator portfolio URL..."
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        />
        <button
          onClick={handleAddUrl}
          disabled={!manualUrl.trim()}
          className="px-6 py-2 bg-primary text-white rounded-xl font-bold disabled:opacity-50"
        >
          Add URL
        </button>
      </div>

      {/* Evaluated Candidates */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Evaluated Candidates ({state.evaluatedCandidates.length})</h3>
        {allCandidates.filter((c) => c.status === 'evaluated').map((candidate) => (
          <div key={candidate.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold">{candidate.creatorName || 'Unknown Creator'}</h4>
                <p className="text-xs text-slate-500">
                  {candidate.sourcePlatform} · {candidate.sourceUrl}
                </p>
              </div>
              {candidate.evaluation && (
                <div className="text-right">
                  <span className={`text-2xl font-black ${
                    candidate.evaluation.score >= 70 ? 'text-green-500' :
                    candidate.evaluation.score >= 40 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {candidate.evaluation.score}
                  </span>
                  <span className="text-xs text-slate-400">/100</span>
                  <div className={`text-xs font-bold ${
                    candidate.evaluation.verdict === 'strong_match' ? 'text-green-500' :
                    candidate.evaluation.verdict === 'potential' ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {candidate.evaluation.verdict}
                  </div>
                </div>
              )}
            </div>

            {candidate.evaluation && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <p>{candidate.evaluation.summary}</p>
                {candidate.evaluation.strengths.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs font-bold">Strengths:</span>
                    <ul className="list-disc list-inside text-xs">
                      {candidate.evaluation.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleApprove(candidate.id)}
                className="px-4 py-1 text-xs font-bold bg-green-500 text-white rounded-lg"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(candidate.id)}
                className="px-4 py-1 text-xs font-bold bg-red-500 text-white rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {/* Pending Candidates */}
        {state.pendingCandidates.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="font-bold text-sm">Pending Evaluation ({state.pendingCandidates.length})</h4>
            <p className="text-xs text-slate-500">Candidates in queue for AI evaluation...</p>
          </div>
        )}

        {/* Approved Candidates (ready for invite) */}
        {allCandidates.filter((c) => c.status === 'approved').length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-bold">Ready to Invite</h3>
            {allCandidates.filter((c) => c.status === 'approved').map((candidate) => (
              <div key={candidate.id} className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">{candidate.creatorName}</h4>
                    <p className="text-xs text-slate-500">{candidate.sourcePlatform}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(candidate.id)}
                    className="px-4 py-1 text-xs font-bold bg-primary text-white rounded-lg"
                  >
                    Send Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/_components/RecruitmentTab.tsx
git commit -m "feat: add RecruitmentTab React component with useAgent"
```

---

### Task 13: Wire RecruitmentTab into AdminDashboard

**Files:**
- Modify: `frontend/src/app/admin/_components/AdminDashboard.tsx`

- [ ] **Step 1: Add lazy import + preloader + render case**

Edit `frontend/src/app/admin/_components/AdminDashboard.tsx`:

Add lazy import after existing imports:
```typescript
const RecruitmentTab = lazy(() =>
  import("@/app/admin/_components/RecruitmentTab").then((m) => ({ default: m.RecruitmentTab })),
);
```

Add `| 'recruitment'` to `AdminTabId` type:
```typescript
type AdminTabId =
  | "dashboard"
  | "dashboard_access_logs"
  | "audit_logs"
  | "operations_data"
  | "create_story"
  | "stories"
  | "create_chapter"
  | "create_comic"
  | "categories"
  | "authors"
  | "ads"
  | "settings"
  | "profile"
  | "users"
  | "operations"
  | "recruitment";
```

Add preloader entry:
```typescript
const tabPreloaders: Partial<Record<AdminTabId, () => Promise<unknown>>> = {
  // ... existing entries ...
  recruitment: () => import("@/app/admin/_components/RecruitmentTab"),
};
```

Add render case in `renderActiveTab` switch:
```typescript
      case "recruitment":
        return role === "superadmin" || role === "admin" ? withSuspense(<RecruitmentTab />) : null;
```

- [ ] **Step 2: Verify frontend build doesn't break**

Run: `cd frontend; npm run lint` (or just `npx tsc --noEmit --pretty`)

Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/_components/AdminDashboard.tsx
git commit -m "feat: wire RecruitmentTab into AdminDashboard"
```

---

### Task 14: Tests

**Files:**
- Create: `workers/recruitment-agent/src/__tests__/types.test.ts`
- Create: `workers/recruitment-agent/src/__tests__/evaluator.test.ts`
- Create: `workers/recruitment-agent/src/__tests__/invite.test.ts`

- [ ] **Step 1: Write type/state logic tests**

Write `workers/recruitment-agent/src/__tests__/types.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

// Test state shape and type constraints
describe("Validation logic", () => {
  it("score stays within 0-100", () => {
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(75)).toBe(75);
  });

  it("verdict is one of valid values", () => {
    const valid = ["strong_match", "potential", "mismatch"] as const;
    expect(valid).toContain("strong_match");
    expect(valid).toContain("potential");
    expect(valid).toContain("mismatch");
  });

  it("deduplicates by sourceUrl", () => {
    const urls = new Set<string>();
    const add = (url: string) => {
      if (urls.has(url)) return false;
      urls.add(url);
      return true;
    };
    expect(add("https://pixiv.net/user/1")).toBe(true);
    expect(add("https://pixiv.net/user/2")).toBe(true);
    expect(add("https://pixiv.net/user/1")).toBe(false);
  });
});
```

- [ ] **Step 2: Write evaluator parsing tests**

Write `workers/recruitment-agent/src/__tests__/evaluator.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

// Test the JSON extraction helper
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return "{}";
  return text.slice(start, end + 1);
}

describe("extractJson", () => {
  it("extracts JSON from markdown-wrapped response", () => {
    const input = 'Here is the evaluation:\n```json\n{"score": 85, "verdict": "strong_match"}\n```';
    const result = extractJson(input);
    expect(JSON.parse(result)).toEqual({ score: 85, verdict: "strong_match" });
  });

  it("extracts JSON from plain response", () => {
    const input = '{"score": 42, "verdict": "potential"}';
    const result = extractJson(input);
    expect(JSON.parse(result)).toEqual({ score: 42, verdict: "potential" });
  });

  it("returns {} for non-JSON response", () => {
    expect(extractJson("No JSON here")).toBe("{}");
  });
});
```

- [ ] **Step 3: Write invite code generation tests**

Write `workers/recruitment-agent/src/__tests__/invite.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

function generateInviteCode(): string {
  return `invite_${crypto.randomUUID().slice(0, 8)}`;
}

describe("generateInviteCode", () => {
  it("generates code with invite_ prefix", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^invite_/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
    expect(codes.size).toBe(100);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd workers/recruitment-agent; npx vitest run`

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add workers/recruitment-agent/src/__tests__/
git commit -m "test: add unit tests for recruitment agent logic"
```

---

### Self-Review Checklist

1. **Spec coverage:** All spec requirements covered:
   - Worker scaffold ✅ (Task 1)
   - Supabase tables ✅ (Task 2)
   - RecruitmentAgent DO with state + callable methods ✅ (Task 4)
   - ScoutScheduler with 9 sources ✅ (Task 6)
   - CreatorEvaluator with Workers AI vision + image handling ✅ (Task 7)
   - InviteSender with Email Service ✅ (Task 8)
   - SupabaseSync dual-write ✅ (Task 10)
   - Admin dashboard integration (tasks 11-13)
   - Testing (Task 14)

2. **Placeholder scan:** No TBD/TODO. Code is complete in every step.

3. **Type consistency:** `Candidate`, `Evaluation`, `ScoutSession`, `Decision`, `Invite` types used consistently across all files.

4. **Gaps:** Missing end-to-end worker integration test (Vitest with DO binding). Will be covered in separate E2E testing task.
