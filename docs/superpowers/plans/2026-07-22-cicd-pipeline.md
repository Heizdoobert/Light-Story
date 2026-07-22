# CI/CD Pipeline Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up deprecated husky scripts, expand CI matrix to type-check all 5 Cloudflare Workers, and harden `deploy.yml`.

**Architecture:** Update `.husky/pre-commit`, `.github/workflows/ci.yml`, and `.github/workflows/deploy.yml`.

---

### Task 1: Clean Up Deprecated Husky Script

**Files:**
- Modify: `.husky/pre-commit`

- [ ] **Step 1: Clean up `.husky/pre-commit`**

Remove the deprecated v10 initialization lines:
`#!/usr/bin/env sh`
`. "$(dirname -- "$0")/_/husky.sh"`

- [ ] **Step 2: Commit**

```bash
git add .husky/pre-commit
git commit -m "fix(husky): remove deprecated initialization lines from pre-commit hook"
```

---

### Task 2: Expand CI Matrix to Type-Check All 5 Workers

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update `worker` job in `.github/workflows/ci.yml` with a matrix strategy**

```yaml
  worker:
    name: Worker Type-Check (${{ matrix.worker }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        worker:
          - unified-gateway
          - stories-worker
          - comics-worker
          - admin-worker
          - analytics-worker
    defaults:
      run:
        working-directory: workers/${{ matrix.worker }}
    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Setup Node
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci || true

      - name: Type-check worker
        run: npx tsc --noEmit
```

- [ ] **Step 2: Commit & Update Graphify**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: expand worker type-check matrix to all 5 domain workers"
graphify update .
```
