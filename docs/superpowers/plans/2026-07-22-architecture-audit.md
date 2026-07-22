# Clean Architecture & Domain Worker Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit domain workers, refactor gateway routing, enforce strict Clean Architecture layer separation, and run multi-worker type checks.

**Architecture:** Refactor `workers/unified-gateway/src/routes/comics.ts` to keep gateway routing 100% declarative, verify all 5 workers compile cleanly with `tsc --noEmit`.

---

### Task 1: Refactor Gateway Comics Router for Pure Declarative Dispatch

**Files:**
- Modify: `workers/unified-gateway/src/routes/comics.ts`

- [ ] **Step 1: Clean up `handleComicRecommendations` in `comics.ts`**

Keep handler declarative, cleanly parsing parameters and delegating Supabase querying with typed helper.

- [ ] **Step 2: Commit**

```bash
git add workers/unified-gateway/src/routes/comics.ts
git commit -m "refactor(gateway): clean up comics recommendation gateway handler"
```

---

### Task 2: Type-Check All 5 Workers & Verification

**Files:**
- Audit: `workers/unified-gateway`
- Audit: `workers/stories-worker`
- Audit: `workers/comics-worker`
- Audit: `workers/admin-worker`
- Audit: `workers/analytics-worker`

- [ ] **Step 1: Verify all 5 workers build cleanly with `tsc --noEmit`**

Run: `npx tsc --noEmit` in each worker directory.

- [ ] **Step 2: Run full verification suite**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 3: Commit & Update Graphify**

```bash
git add .
git commit -m "arch: complete Clean Architecture & domain worker audit across all 5 workers"
graphify update .
```
