# Technical Architecture Blueprint: Project Cleanup & Reorganization
**Version:** 1.0  
**Status:** SUPERSEDED  
**Date:** May 10, 2026 (superseded by `plan_FEBE.md` on May 16, 2026)  
**TechLead:** Architecture Design Document  
**Scope:** Complete root-level reorganization following Clean Architecture standards  

> **⚠️ SUPERSEDED:** This plan has been superseded by `plan_FEBE.md` (FE/BE Decoupling & Migration Blueprint).  
> The cleanup tasks outlined here were partially executed (git tag `cleanup-baseline-2026-05-10` created, `packages/api-types/` established).  
> Remaining cleanup items (archiving, documentation consolidation) are now tracked in `plan_FEBE.md`.  
> Keep this file for historical reference; do not use as an active execution plan.

---

## EXECUTIVE SUMMARY

This blueprint provides the **precise technical implementation pathway** to reduce root-level bloat (38 items → 10 items) while maintaining Clean Architecture integrity and production code safety. The plan is sequential (6 phases), dependency-aware, and includes explicit verification gates at each phase.

**Key Constraints:**
- ✅ Zero production code breaking changes
- ✅ All layer imports must point inward only
- ✅ Single source of truth for each documentation topic
- ✅ Instant rollback capability via git tags
- ✅ Build validation before/after each major phase

**Output Metrics:**
- Files in root: 38 → 10 (73% reduction)
- Documentation consolidation: 5 overlapping docs → 3 consolidated
- Archive depth: 1 level (docs/ARCHIVE/)
- Total execution: ~6-7 hours developer time

---

# 1. TARGET DIRECTORY STRUCTURE SPECIFICATION

## 1.1 Root Level - Target State

```
Light-Story/
├── .env                           # Local config (in .gitignore)
├── .env.example                   # Template for local setup
├── .gitignore                     # Git exclusions
├── .github/                       # CI/CD workflows (unchanged)
├── CONTRIBUTING.md                # GitHub standard location
├── LICENSE                        # MIT or project license (if exists)
├── README.md                      # Trimmed root navigation guide
├── package.json                   # Monorepo/root manifest
├── package-lock.json              # Dependency lock
├── skills-lock.json               # Agent skills lock (keep as-is)
├── tsconfig.json                  # Root TypeScript config
├── wrangler.jsonc                 # Cloudflare Workers root config
│
├── .agents/                       # Agent system (unchanged)
├── .grapuco/                      # Grapuco context/memory (unchanged)
├── .vscode/                       # VS Code settings (unchanged)
├── .claude/                       # Claude context (unchanged)
│
├── agent/                         # Agent execution (unchanged)
├── backend-d1-saas/               # D1 SaaS backend (unchanged)
├── backend-supabase/              # Supabase backend (unchanged)
├── frontend/                      # React frontend (unchanged)
├── scripts/                       # Root scripts (unchanged)
├── src/                           # Root src (unchanged)
│
├── docs/                          # CONSOLIDATED documentation
│   ├── ARCHITECTURE.md            # ROOT: Project architecture overview
│   ├── TESTING.md                 # ROOT: Testing & QA guide
│   ├── REAL_DATA.md               # ROOT: Real data setup guide
│   ├── CONTRIBUTING.md            # Full CONTRIBUTING guide
│   ├── MONITORING.md              # Monitoring/observability (existing)
│   ├── STAGING_RUNBOOK.md         # Deployment procedures (existing)
│   ├── architecture/              # Detailed architecture docs
│   │   ├── LAYERS.md              # Layer definitions & dependencies
│   │   ├── CLEAN_ARCHITECTURE.md  # CA principles applied here
│   │   ├── BACKEND_D1.md          # D1 backend architecture
│   │   ├── BACKEND_SUPABASE.md    # Supabase backend architecture
│   │   ├── FRONTEND.md            # Frontend layer architecture
│   │   └── DATA_FLOWS.md          # End-to-end data flows
│   ├── ARCHIVE/                   # Deprecated/historical docs
│   │   ├── README.md              # Archive index
│   │   ├── sprints/               # Sprint roadmaps (by date)
│   │   │   └── SPRINT_3_ROADMAP.md
│   │   ├── audits/                # Audit reports (by date)
│   │   │   └── AUDIT_REPORT.md
│   │   ├── sql-examples/          # SQL schema examples
│   │   │   ├── supabase_schema.sql
│   │   │   ├── supabase_setup.sql
│   │   │   └── database.sql.example
│   │   └── root-cleanup-2026-05-10/ # This cleanup's originals (temp)
│   │       ├── ARCHITECTURE.md.bak
│   │       ├── LOCAL_TESTING_GUIDE.md.bak
│   │       ├── DEPLOYMENT_CHECKLIST_COMICS.md.bak
│   │       └── REAL_DATA_QUICKSTART.md.bak
└── docs/CLEANUP/                  # Cleanup execution artifacts (temporary)
    ├── root_inventory_report.md
    ├── import_dependency_map.md
    ├── documentation_redundancy_map.md
    └── CLEANUP_COMPLETE_REPORT.md
```

## 1.2 Before/After Comparison

### **BEFORE (Current Root - 38 items)**
```
Root Files: 24 files
- documentation (6): ARCHITECTURE.md, LOCAL_TESTING_GUIDE.md, 
  REAL_DATA_*.md (x2), DEPLOYMENT_CHECKLIST_COMICS.md, etc.
- scripts (3): setup-real-data.ps1, setup-real-data.sh, run_audit_tests.ps1
- config (5): metadata.json, skills-lock.json, wrangler-analytics.toml, 
  tsconfig.json, wrangler.jsonc
- examples (3): database.sql.example, schema.sql.example, CI artifacts
- stale/unclear (3): ci-trigger.txt, Code_changes.diff, Register.tsx, 
  PR_60_REVIEW.md
- essential (4): package.json, README.md, CONTRIBUTING.md, 
  .gitignore/.env

Root Dirs: 14 directories
- production code: frontend/, backend-supabase/, backend-d1-saas/, 
  scripts/, src/
- infrastructure: .github/, .grapuco/, .agents/, .vscode/, .claude/
- metadata: agent/, docs/
- lock files: node_modules/ (not shown but exists)
```

### **AFTER (Target Root - 10 items)**
```
Root Files: 10 files
- essential config (4): package.json, package-lock.json, 
  tsconfig.json, wrangler.jsonc
- essential dotfiles (3): .gitignore, .env.example, CONTRIBUTING.md
- documentation (2): README.md (trimmed to ~250 lines), LICENSE
- agent lock (1): skills-lock.json

Root Dirs: 7-8 directories
- production code (5): frontend/, backend-supabase/, backend-d1-saas/, 
  scripts/, src/, agent/
- infrastructure (2): .github/, .grapuco/, .agents/, .vscode/, .claude/
- consolidated docs (1): docs/ (all docs + archives organized)
```

**Result: 73% reduction in root clutter, improved navigation clarity**

---

## 1.3 File Dependency Mapping

### Critical Dependencies Before Cleanup

| File | Depends On | Dependents | Action |
|------|-----------|-----------|--------|
| `Register.tsx` | React, Tsx syntax | (None found - orphaned) | **DELETE** |
| `CI_Testing_Instructions.md` | Docs structure | (Referenced in?) | **AUDIT → ARCHIVE** |
| `setup-real-data.ps1` | Supabase CLI | CI scripts? | **AUDIT → ARCHIVE** |
| `supabase_schema.sql` | Supabase version | Frontend? Backend? | **ARCHIVE to docs/ARCHIVE/** |
| `ARCHITECTURE.md` (root) | Project standards | frontend/ARCHITECTURE.md | **CONSOLIDATE** |
| `LOCAL_TESTING_GUIDE.md` | Project setup | CI/docs | **CONSOLIDATE** |

### Import Dependency Graph (Key Paths)
```
Frontend imports:
  ✅ frontend/lib/client.ts → supabase library (OK)
  ✅ frontend/src/App.tsx → components/ (OK)
  ❌ frontend/src/??? → Register.tsx ? (Verify in Phase 1)

Backend Supabase imports:
  ✅ backend-supabase/supabase/functions/** → edge functions (OK)
  ✅ backend-supabase/workers/** → Cloudflare SDK (OK)

Backend D1 imports:
  ✅ backend-d1-saas/src/** → Workers SDK (OK)

Root imports into production code:
  ❌ grep -r "import.*from.*\.\.\/" backend-* frontend/ src/
     → Should find 0 results (root is not imported)
```

---

# 2. FILE DISPOSITION MATRIX - COMPLETE INVENTORY

All 38+ root-level files with exact disposition, rationale, and risk assessment.

## 2.1 Files to DELETE (Confirmed Safe)

| File | Size | Purpose | Verify | Risk | Action | Verification |
|------|------|---------|--------|------|--------|--------------|
| `ci-trigger.txt` | <1KB | CI artifact (stale) | grep -r "ci-trigger" .github/ | NONE | DELETE | Grep returns 0 results |
| `Code_changes.diff` | ? | Old patch (abandoned) | Check git history date | NONE | DELETE | Not referenced in any CI |
| `Register.tsx` | ~3KB | Orphaned React component | grep -r "Register" frontend/ src/ | LOW | DELETE | No imports found |
| `PR_60_REVIEW.md` | ~2KB | Old review notes | Check date | NONE | DELETE | Not referenced in docs |
| `API_Testing_Instructions.md` | ~5KB | Superseded by docs/ | Compare with docs/TESTING.md | LOW | DELETE/ARCHIVE | Content moved to consolidated TESTING.md |

**Phase 1 Verification:** Run dependency scan on each file before deletion
**Phase 3 Checkpoint:** Build must pass after deletion; no TS/import errors

---

## 2.2 Files to MOVE to `docs/ARCHIVE/`

| File | Destination | Reason | Risk | Verification |
|------|------------|--------|------|--------------|
| `SPRINT_3_ROADMAP.md` | `docs/ARCHIVE/sprints/SPRINT_3_ROADMAP.md` | Historical; reference only | NONE | Accessible via archive index |
| `AUDIT_REPORT.md` | `docs/ARCHIVE/audits/AUDIT_REPORT_2026-05-10.md` | Point-in-time audit; keep for reference | NONE | Archive indexed |
| `supabase_schema.sql` | `docs/ARCHIVE/sql-examples/supabase_schema.sql` | Example; replaced by migration system | NONE | Comments in backend-supabase/ point to archive |
| `supabase_setup.sql` | `docs/ARCHIVE/sql-examples/supabase_setup.sql` | Example; replaced by seed system | NONE | Comments in backend-supabase/ point to archive |
| `database.sql.example` | `docs/ARCHIVE/sql-examples/database.sql.example` | Old template; superseded | NONE | No production references |
| `schema.sql.example` | `docs/ARCHIVE/sql-examples/schema.sql.example` | Old template; superseded | NONE | No production references |
| `setup-real-data.ps1` | `docs/ARCHIVE/scripts-deprecated/setup-real-data.ps1` | Deprecated; use docs/REAL_DATA.md instead | MEDIUM | Update docs/REAL_DATA.md with migration notes |
| `setup-real-data.sh` | `docs/ARCHIVE/scripts-deprecated/setup-real-data.sh` | Deprecated; use docs/REAL_DATA.md instead | MEDIUM | Update docs/REAL_DATA.md with migration notes |
| `run_audit_tests.ps1` | `docs/ARCHIVE/scripts-deprecated/run_audit_tests.ps1` | Replaced by automated testing | LOW | CI should not call this |

**Archive Index:** `docs/ARCHIVE/README.md` lists all archived items with rationale and access instructions
**Access Pattern:** Links from docs/ to archive/ explained in CONTRIBUTING.md

---

## 2.3 Files to CONSOLIDATE (Documentation)

| Source Files | Target File | Strategy | Owner | Effort |
|--------------|------------|----------|-------|--------|
| `ARCHITECTURE.md` (root) + `frontend/ARCHITECTURE.md` + `ARCHITECTURE` section in root README | `docs/ARCHITECTURE.md` | Merge generic arch (root) + frontend-specific → separate layers | TechLead | 30m |
| `LOCAL_TESTING_GUIDE.md` (root) + `backend-supabase/TESTING.md` + `backend-d1-saas/` test docs | `docs/TESTING.md` | Create unified testing guide; reference backend-specific sections | TechLead | 40m |
| `REAL_DATA_QUICKSTART.md` + `REAL_DATA_SETUP.md` | `docs/REAL_DATA.md` | Merge into single source; archive originals | Dev | 20m |
| `DEPLOYMENT_CHECKLIST_COMICS.md` + `docs/STAGING_RUNBOOK.md` | `docs/STAGING_RUNBOOK.md` (keep as source) | Audit for duplication; archive DEPLOYMENT_CHECKLIST if duplicate | Dev | 15m |
| `README.md` (root) general sections | Trim to 250 lines; links to `docs/` | Extract architecture, setup, contributing to docs/; keep overview + quick links | Dev | 20m |

**Consolidation Verification:**
- Phase 1: Confirm previously identified source files and decision log
- Phase 4: Create consolidated docs in docs/
- Phase 4: Verify 100% content preservation (no data loss)
- Phase 6: Verify 0 broken links in new docs

---

## 2.4 Files to KEEP in Root (No Action)

| File | Reason | Notes |
|------|--------|-------|
| `.gitignore` | Git standard; required | No action |
| `.env.example` | Template for local development | No action |
| `.env` | Local config (in .gitignore) | Not visible in git |
| `package.json` | Monorepo manifest | No action |
| `package-lock.json` | Dependency lock | No action |
| `README.md` | Root navigation (to be trimmed) | Reduce from ~500 to ~250 lines in Phase 4 |
| `CONTRIBUTING.md` | GitHub standard location | No action |
| `LICENSE` | Project license | No action (if exists) |
| `tsconfig.json` | Root TypeScript config | No action |
| `wrangler.jsonc` | Root Cloudflare config | No action |
| `skills-lock.json` | Agent skills dependency lock | No action (internal) |
| `.github/` | CI/CD workflows | No action |
| `.grapuco/` | Grapuco context memory | No action |
| `.agents/` | Agent system | No action |
| `.vscode/` | Editor settings | No action |
| `.claude/` | Claude context | No action |

**Total KEEP in Root:** 12 files + 5 directories

---

## 2.5 Conditional Files (Requires Phase 1 Audit)

| File | Decision Point | If Keep | If Delete/Archive |
|------|---------------|---------|-------------------|
| `metadata.json` | "Is it used by build/test?" | Keep in root | Move to docs/ARCHIVE/ |
| `wrangler-analytics.toml` | "Is it actively used?" | Keep if referenced by CI | Move to docs/ARCHIVE/configs/ |
| `re` | "What is this file?" | Investigate - may be typo | DELETE if test artifact |

**Phase 1 Task:** Decision log for conditional files (5 min audit)

---

# 3. CLEAN ARCHITECTURE ALIGNMENT VERIFICATION

## 3.1 Current Clean Architecture Layers

### **Layer Definition Reference**
From [ARCHITECTURE.md](ARCHITECTURE.md) and [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md):

```
Layer Stack (dependencies point inward):

        ┌─────────────────────────────────┐
        │  PRESENTATION LAYER             │
        │  (Routes, Controllers, UI)      │
        └──────────┬──────────────────────┘
                   │ imports
        ┌──────────▼──────────────────────┐
        │  APPLICATION LAYER              │
        │  (Use Cases, DTOs, Validators)  │
        └──────────┬──────────────────────┘
                   │ imports
        ┌──────────▼──────────────────────┐
        │  DOMAIN LAYER                   │
        │  (Entities, Business Rules)     │
        └──────────┬──────────────────────┘
                   │ imports
        ┌──────────▼──────────────────────┐
        │  INFRASTRUCTURE LAYER           │
        │  (DB, APIs, External Services)  │
        └──────────┬──────────────────────┘
                   │ imports
        ┌──────────▼──────────────────────┐
        │  SHARED/CORE LAYER              │
        │  (Logging, Errors, Base Classes)│
        └─────────────────────────────────┘
```

### **Frontend Layer Locations**
```
frontend/src/
├── shared/core/           ← SHARED: BaseService, Logger, DomainError, exceptions
├── domain/                ← DOMAIN: entities, repository interfaces
├── application/           ← APPLICATION: DTOs, use cases, validators
├── infrastructure/        ← INFRASTRUCTURE: Supabase adapters, HTTP clients
├── presentation/          ← PRESENTATION: routes, components (UI logic only)
├── services/analytics.ts  ← INFRASTRUCTURE: analytics integration (must be browser-safe)
└── components/            ← PRESENTATION: UI components (pure React)
```

### **Backend Supabase Layer Locations**
```
backend-supabase/
├── supabase/functions/    ← PRESENTATION: edge function handlers
├── supabase/migrations/   ← INFRASTRUCTURE: database schema
├── workers/               ← PRESENTATION/INFRASTRUCTURE: Cloudflare worker
└── docs/                  ← DOCUMENTATION: DB schema, RLS policies
```

### **Backend D1 SaaS Layer Locations**
```
backend-d1-saas/src/
├── shared/core/           ← SHARED: utilities, error handling, logging
├── application/           ← APPLICATION: use cases, DTOs
├── infrastructure/        ← INFRASTRUCTURE: D1 client, provisioning
└── presentation/          ← PRESENTATION: worker entry points
```

---

## 3.2 Cleanup Impact on Layer Integrity

### **Files Being Moved/Deleted and Their Layer Status**

| File | Current Layer | After Cleanup | Layer Impact |
|------|--------------|--------------|-------------|
| `Register.tsx` | PRESENTATION (orphaned) | DELETE | ✅ No impact (not in use) |
| `ARCHITECTURE.md` (root) | DOCUMENTATION | Move to `docs/ARCHITECTURE.md` | ✅ Docs consolidation |
| `LOCAL_TESTING_GUIDE.md` | DOCUMENTATION | Move to `docs/TESTING.md` | ✅ Docs consolidation |
| SQL examples | INFRASTRUCTURE (deprecated) | Move to `docs/ARCHIVE/sql-examples/` | ✅ No code impact |
| Setup scripts | INFRASTRUCTURE (deprecated) | Move to `docs/ARCHIVE/scripts/` | ✅ No code impact |

**Layer Verification:** No files are being moved that would violate layer boundaries (i.e., no presentation code moved to infrastructure)

---

## 3.3 Validation Rules (To Enforce During Cleanup)

### **Rule 1: Import Direction**
```bash
# After cleanup, verify NO layer violations:
# PRESENTATION should not import from INFRASTRUCTURE
# INFRASTRUCTURE should not import from APPLICATION
# DOMAIN should only import from SHARED

grep -r "from.*infrastructure" frontend/src/presentation/ | wc -l  # Must be 0
grep -r "from.*presentation" frontend/src/infrastructure/ | wc -l  # Must be 0
```

### **Rule 2: No Root-Level Imports in Production**
```bash
# After cleanup, verify production code doesn't import from root:
grep -r "from.*\.\.\/" backend-* frontend/src/ src/ | grep -v "\.test\." | wc -l  # Must be 0
```

### **Rule 3: Documentation Files Don't Break Builds**
```bash
# After moving docs files, verify builds still pass:
cd frontend && npm run build  # Must pass
cd backend-d1-saas && npm run build  # Must pass
```

---

# 4. DOCUMENTATION STRUCTURE - TAXONOMY & CONSOLIDATION

## 4.1 Current Documentation State (Before Cleanup)

```
Root Level (6 docs):
├── ARCHITECTURE.md           ✅ Generic architecture
├── LOCAL_TESTING_GUIDE.md    ✅ Testing setup
├── REAL_DATA_QUICKSTART.md   ✅ Quick start for real data
├── REAL_DATA_SETUP.md        ✅ Detailed setup steps
├── DEPLOYMENT_CHECKLIST_COMICS.md ⚠️  Outdated/mixed with humor
├── API_Testing_Instructions.md ⚠️  May duplicate docs/

frontend/ (1 doc):
├── frontend/ARCHITECTURE.md  ✅ Frontend-specific architecture

backend-supabase/ (3+ docs):
├── backend-supabase/TESTING.md ✅ Supabase testing
├── backend-supabase/docs/db-schema.md ✅ DB schema reference
├── backend-supabase/docs/rls-policies.md ✅ RLS policy guide
├── backend-supabase/docs/storage.md ✅ Storage guide

docs/ (5+ docs):
├── docs/MONITORING.md        ✅ Monitoring/observability
├── docs/STAGING_RUNBOOK.md   ✅ Deployment procedures
├── docs/AUDIT_VALIDATION.md  ✅ Audit validation
└── [other docs]

Total: 15-18 files with potential overlap
```

## 4.2 Target Documentation State (After Cleanup)

```
Root Level (1-2 docs):
├── README.md                 ← Trimmed to 250 lines; main entry point
└── CONTRIBUTING.md           ← GitHub standard

docs/ (Root documentation - sources of truth):
├── ARCHITECTURE.md           ← Consolidated: merged from root + frontend
├── TESTING.md                ← Consolidated: merged from backend + root
├── REAL_DATA.md              ← Consolidated: QUICKSTART + SETUP merged
├── CONTRIBUTING.md           ← Full guidelines (linked from root)
├── MONITORING.md             ← Existing (unchanged)
├── STAGING_RUNBOOK.md        ← Existing, audited for duplicates

docs/architecture/ (Detailed architecture):
├── LAYERS.md                 ← Layer definitions & dependency rules
├── CLEAN_ARCHITECTURE.md     ← CA principles & patterns
├── BACKEND_D1.md             ← D1 SaaS backend architecture
├── BACKEND_SUPABASE.md       ← Supabase backend architecture (moved from backend-supabase/docs/)
├── FRONTEND.md               ← Frontend architecture (moved from frontend/ARCHITECTURE.md)
└── DATA_FLOWS.md             ← End-to-end data flows & interactions

docs/ARCHIVE/ (Deprecated/historical docs):
├── README.md                 ← Archive index
├── sprints/
│   └── SPRINT_3_ROADMAP.md   ← Historical roadmap
├── audits/
│   └── AUDIT_REPORT_2026-05-10.md ← Point-in-time audit
├── sql-examples/             ← Old SQL templates
│   ├── supabase_schema.sql
│   ├── supabase_setup.sql
│   ├── database.sql.example
│   └── schema.sql.example
└── scripts-deprecated/       ← Deprecated setup scripts
    ├── setup-real-data.ps1
    ├── setup-real-data.sh
    └── run_audit_tests.ps1

backend-supabase/docs/ (Backend-specific - preserved):
├── db-schema.md              ← Database schema (reference)
├── rls-policies.md           ← RLS policy guide (reference)
└── storage.md                ← Storage guide (reference)

Total: 6 root docs → 12-14 organized docs (better structure, no duplication)
```

## 4.3 Consolidation Mapping

| Topic | Sources | Target | Merge Strategy |
|-------|---------|--------|-----------------|
| **Architecture** | `ARCHITECTURE.md` (root) + `frontend/ARCHITECTURE.md` | `docs/ARCHITECTURE.md` + `docs/architecture/LAYERS.md` | Generic arch → root docs/ARCHITECTURE.md; layer-specific → docs/architecture/ |
| **Testing** | `LOCAL_TESTING_GUIDE.md` + `backend-supabase/TESTING.md` + `backend-d1-saas/tests/` | `docs/TESTING.md` | Unified testing guide with backend-specific sections (cross-references) |
| **Real Data** | `REAL_DATA_QUICKSTART.md` + `REAL_DATA_SETUP.md` | `docs/REAL_DATA.md` | Merge into single doc; quick start = section 1; detailed steps = section 2 |
| **Deployment** | `DEPLOYMENT_CHECKLIST_COMICS.md` + `docs/STAGING_RUNBOOK.md` | `docs/STAGING_RUNBOOK.md` | Audit for duplication; keep runbook as single source |
| **Root Docs** | `README.md` | Trimmed `README.md` (250 lines) | Extract sections → link to docs/; keep overview + quick links |

---

## 4.4 Source of Truth Registry

**After cleanup, this is the single reference point for each topic:**

| Topic | Source of Truth | Location | Scope |
|-------|-----------------|----------|-------|
| Project Architecture | `docs/ARCHITECTURE.md` | Root docs | Generic layers + patterns |
| Layer Definitions | `docs/architecture/LAYERS.md` | Architecture subdir | CA rules, import directions |
| Frontend Architecture | `docs/architecture/FRONTEND.md` | Architecture subdir | Frontend-specific patterns |
| Backend Supabase Architecture | `docs/architecture/BACKEND_SUPABASE.md` | Architecture subdir | Supabase-specific patterns |
| Backend D1 Architecture | `docs/architecture/BACKEND_D1.md` | Architecture subdir | D1 SaaS patterns |
| Testing Procedures | `docs/TESTING.md` | Root docs | Setup, execution, CI integration |
| Real Data Setup | `docs/REAL_DATA.md` | Root docs | Setup scripts & procedures |
| Deployment | `docs/STAGING_RUNBOOK.md` | Root docs | Release procedures |
| Contributing | `docs/CONTRIBUTING.md` or `root/CONTRIBUTING.md` | Root or docs | Contribution guidelines |
| Monitoring | `docs/MONITORING.md` | Root docs | Observability, metrics |
| Database Schema | `backend-supabase/docs/db-schema.md` | Backend-specific | Schema reference |
| RLS Policies | `backend-supabase/docs/rls-policies.md` | Backend-specific | Security policies |

---

## 4.5 Documentation Link Strategy

**All docs files will include navigation links:**

```markdown
# Root README.md (after consolidation)
Quick Links:
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Testing Guide](docs/TESTING.md)
- [Real Data Setup](docs/REAL_DATA.md)
- [Detailed Architecture](docs/architecture/)
- [Deployment Guide](docs/STAGING_RUNBOOK.md)

# docs/ARCHITECTURE.md (after consolidation)
Navigate:
- [Layer Architecture](architecture/LAYERS.md)
- [Frontend Architecture](architecture/FRONTEND.md)
- [Backend Supabase](architecture/BACKEND_SUPABASE.md)
- [Backend D1](architecture/BACKEND_D1.md)
- [Testing](TESTING.md)
- [Archived Docs](ARCHIVE/README.md)
```

---

# 5. IMPLEMENTATION SEQUENCE - DEPENDENCY-ORDERED PHASES

## 5.1 Phase Dependency Graph

```
Phase 1: Verification & Safety Checks (read-only, no mutations)
    │ provides input for Phase 2
    ├─→ Audit root inventory
    ├─→ Check production imports
    ├─→ Audit doc redundancy
    ├─→ Identify stale scripts
    └─→ Validate DB files

Phase 2: Backup & Documentation (setup, no mutations to code)
    │ requires Phase 1 approval
    ├─→ Create git backup tag
    ├─→ Document cleanup scope
    └─→ Create archive directories
    │ enables Phase 3-5

Phase 3: Orphaned File Removal (first mutations - DELETE)
    │ requires Phase 2 backup
    ├─→ Delete 5-7 orphaned files (ci-trigger.txt, Register.tsx, etc.)
    ├─→ Archive deprecated scripts (setup-real-data.*, run_audit_tests.ps1)
    ├─→ Build verification checkpoint (must pass)
    └─→ Type check checkpoint (must pass)

Phase 4: Documentation Consolidation (second mutations - CONSOLIDATE)
    │ requires Phase 3 success
    ├─→ Merge ARCHITECTURE docs
    ├─→ Merge TESTING docs
    ├─→ Merge REAL_DATA docs
    ├─→ Trim root README
    ├─→ Update archive index
    └─→ Create docs/ARCHIVE/README.md

Phase 5: File Organization & Root Cleanup (third mutations - MOVE)
    │ requires Phase 4 success
    ├─→ Move SQL examples to archive
    ├─→ Move sprint/audit docs to archive
    ├─→ Verify root structure (8-12 files)
    └─→ Clean phase artifacts

Phase 6: Validation & Testing (final checks + reporting)
    │ requires Phase 5 success
    ├─→ Full build & test suite
    ├─→ Validate doc links
    ├─→ Generate cleanup report
    └─→ Final commit & tag

                            ↓
                    Project Cleaned ✅
```

---

## 5.2 Detailed Phase Sequence with Parallelization

### **PHASE 1: VERIFICATION & SAFETY CHECKS (1.5 hours)**
**Goal:** Identify every file's disposition WITHOUT touching anything  
**Owner:** TechLead + Developer  
**Risk Level:** NONE (read-only)

#### Parallel Tasks (can run together):

**Task 1.1: Root File Inventory**
```
Execution:
  ls -lhS / | grep -E "\.md|\.tsx|\.sql|\.ps1|\.sh|\.toml|\.json|\.txt|\.diff"
  → Output: Size, date, purpose of each file

  Categorize:
    - Essential (keep): package.json, README.md, CONTRIBUTING.md, tsconfig.json, wrangler.jsonc, skills-lock.json
    - Config (evaluate): metadata.json, wrangler-analytics.toml
    - Docs (consolidate): ARCHITECTURE.md, LOCAL_TESTING_GUIDE.md, REAL_DATA_*.md, etc.
    - Scripts (archive): setup-real-data.*, run_audit_tests.ps1
    - Examples (archive): *.sql.example, *.sql (supabase_*.sql)
    - Orphaned (delete): ci-trigger.txt, Code_changes.diff, Register.tsx, PR_60_REVIEW.md
    - Unknown (audit): re, metadata.json

Output: docs/CLEANUP/root_inventory_report.md (100% files listed + categorized)
Success: TechLead approval on categorization
Effort: 20 min
```

**Task 1.2: Production Code Dependency Scan** (parallel to 1.1)
```
Execution:
  For each file marked DELETE or ARCHIVE:
    grep -r "import.*{filename}" backend-* frontend/ src/ scripts/
    grep -r "require.*{filename}" backend-* frontend/ src/ scripts/
    grep -r "from.*{filename}" backend-* frontend/ src/ scripts/

  For each SQL example file:
    grep -r "supabase_schema\|supabase_setup\|database.sql\|schema.sql" backend-* | wc -l
    → Should be 0 or only in version control references

  For each setup script:
    grep -r "setup-real-data" .github/ backend-* frontend/ | wc -l
    → Identify if used in CI or referenced in code

Output: docs/CLEANUP/import_dependency_map.md
  - List all files marked for deletion/archive
  - For each: list of production files that import it
  - Risk assessment: HIGH if imports found, NONE if 0 imports

Success: 0 production imports of any file marked DELETE/ARCHIVE
Effort: 25 min
```

**Task 1.3: Documentation Redundancy Audit** (parallel to 1.1-1.2)
```
Execution:
  1. Read ARCHITECTURE.md (root) → extract topics (layers, patterns, validation)
     Read frontend/ARCHITECTURE.md → extract topics
     Overlap check: what's in both? what's frontend-specific? what's generic?

  2. Read LOCAL_TESTING_GUIDE.md → extract sections
     Read backend-supabase/TESTING.md → extract sections
     Overlap check: setup, execution, CI integration?

  3. Read REAL_DATA_QUICKSTART.md + REAL_DATA_SETUP.md
     Overlap check: same content? different scope (quick vs detailed)?

  4. Read DEPLOYMENT_CHECKLIST_COMICS.md + docs/STAGING_RUNBOOK.md
     Overlap check: same procedures? overlap in steps?

  5. Read API_Testing_Instructions.md + docs/TESTING.md
     Overlap check: same testing procedures?

Output: docs/CLEANUP/documentation_redundancy_map.md
  - List each doc pair
  - Overlap percentage (0-100%)
  - Merge recommendation (which is source of truth?)
  - Content to preserve (don't lose data)

Success: 5+ redundant pairs identified; merge targets clear
Effort: 30 min
```

**Task 1.4: Script Usage Audit** (parallel to others)
```
Execution:
  For each script:
    - setup-real-data.ps1: Last commit date? Used in CI? 
      grep -r "setup-real-data" .github/workflows/
    - setup-real-data.sh: Same check
    - run_audit_tests.ps1: Used in CI? run_in_terminal history?
    - frontend/scripts/*.mjs: Purpose? Last used date?

Output: docs/CLEANUP/scripts_usage_audit.md
  - Script name, location, purpose, last commit date
  - CI usage: yes/no
  - Recommendation: keep/archive/delete
  - Migration notes (if deprecated)

Success: All scripts have clear disposition
Effort: 20 min
```

**Task 1.5: DB/Config File Validation** (parallel to others)
```
Execution:
  - supabase_schema.sql: Version? Conflicts with migrations/?
  - supabase_setup.sql: Used by seed scripts? Part of CI?
  - database.sql.example, schema.sql.example: Required for setup? Outdated?
  - metadata.json: Used by build? npm scripts?
  - wrangler-analytics.toml: Active config or superseded by main wrangler.jsonc?

Output: docs/CLEANUP/config_files_audit.md
  - File name, purpose, version, dependencies
  - Recommendation: keep/archive/delete

Success: No concerns identified; archival plan clear
Effort: 15 min
```

**Phase 1 Deliverables:**
- ✅ `docs/CLEANUP/root_inventory_report.md` (100% files categorized)
- ✅ `docs/CLEANUP/import_dependency_map.md` (0 production risks)
- ✅ `docs/CLEANUP/documentation_redundancy_map.md` (merge targets marked)
- ✅ `docs/CLEANUP/scripts_usage_audit.md` (script disposition clear)
- ✅ `docs/CLEANUP/config_files_audit.md` (config review complete)
- ✅ TechLead approval → proceed to Phase 2

**Checkpoint:** If any risks found in import_dependency_map, escalate to TechLead before Phase 2

---

### **PHASE 2: BACKUP & DOCUMENTATION (1 hour)**
**Goal:** Create snapshot + document cleanup scope before any mutations  
**Owner:** Developer  
**Risk Level:** LOW (no mutations yet)

#### Sequential Tasks:

**Task 2.1: Create Git Backup Tag**
```
Execution:
  git tag cleanup-baseline-2026-05-10 -m "Baseline before cleanup"
  git push origin cleanup-baseline-2026-05-10

Verification:
  git tag --list | grep cleanup-baseline-2026-05-10  # Should exist
  git show cleanup-baseline-2026-05-10 | head -20   # Should show commit

Success: Tag accessible from GitHub releases
Effort: 5 min
```

**Task 2.2: Document Cleanup Scope**
```
Create: CLEANUP_SCOPE.md (temporary - will delete in Phase 6.4)

Content:
  # Cleanup Scope - May 10, 2026

  ## Files to DELETE (7 items)
  - ci-trigger.txt (stale CI artifact)
  - Code_changes.diff (abandoned patch)
  - Register.tsx (orphaned component)
  - PR_60_REVIEW.md (old review notes)
  - API_Testing_Instructions.md (superseded by docs/TESTING.md)
  - [verify others from Phase 1]

  ## Files to ARCHIVE (9 items)
  - Destination: docs/ARCHIVE/
  - Scripts: setup-real-data.ps1, setup-real-data.sh, run_audit_tests.ps1
  - Examples: supabase_schema.sql, supabase_setup.sql, database.sql.example, schema.sql.example
  - Docs: SPRINT_3_ROADMAP.md, AUDIT_REPORT.md, [others]

  ## Documentation to CONSOLIDATE (5 merges)
  - ARCHITECTURE.md + frontend/ARCHITECTURE.md → docs/ARCHITECTURE.md
  - LOCAL_TESTING_GUIDE.md + backend-supabase/TESTING.md → docs/TESTING.md
  - REAL_DATA_*.md (x2) → docs/REAL_DATA.md
  - DEPLOYMENT_CHECKLIST_COMICS.md → audit vs docs/STAGING_RUNBOOK.md
  - README.md → trim to 250 lines

  ## Verification Steps
  - Phase 3: Build must pass after deletions
  - Phase 4: Doc consolidation; no content loss
  - Phase 6: All links verified; 0 broken links

  ## Rollback Procedure (if needed)
  git reset --hard cleanup-baseline-2026-05-10
  git push -f origin main

Output: root/CLEANUP_SCOPE.md
Success: Reviewable by TechLead + Product Owner
Effort: 20 min
```

**Task 2.3: Create Archive Directory Structure**
```
Execution:
  mkdir -p docs/ARCHIVE
  mkdir -p docs/ARCHIVE/sprints
  mkdir -p docs/ARCHIVE/audits
  mkdir -p docs/ARCHIVE/sql-examples
  mkdir -p docs/ARCHIVE/scripts-deprecated
  mkdir -p docs/ARCHIVE/configs (if needed)
  mkdir -p docs/CLEANUP (for phase artifacts)

Verification:
  find docs/ARCHIVE -type d  # Should list all subdirs

Success: Directory structure created
Effort: 5 min
```

**Task 2.4: Create Cleanup Metadata**
```
Create: docs/CLEANUP/metadata.json

Content:
{
  "cleanup_date": "2026-05-10",
  "baseline_tag": "cleanup-baseline-2026-05-10",
  "phases": 6,
  "target_root_items": "8-12 files",
  "before_root_items": 38,
  "files_to_delete": 5-7,
  "files_to_archive": 9-10,
  "docs_to_consolidate": 5,
  "risk_level": "MEDIUM",
  "rollback_command": "git reset --hard cleanup-baseline-2026-05-10"
}

Success: Metadata recorded
Effort: 5 min
```

**Phase 2 Deliverables:**
- ✅ Git tag: `cleanup-baseline-2026-05-10`
- ✅ `CLEANUP_SCOPE.md` (approved by TechLead)
- ✅ Archive directories created (ready for Phase 3-5)
- ✅ `docs/CLEANUP/metadata.json` (cleanup tracked)

---

### **PHASE 3: ORPHANED FILE REMOVAL (1.5 hours)**
**Goal:** Delete confirmed safe files; verify no breakage  
**Owner:** Developer  
**Risk Level:** MEDIUM (first mutations)

#### Sequential Tasks (Must verify each before proceeding):

**Task 3.1: Delete Confirmed Orphaned Files**
```
Pre-check (from Phase 1 dependency map):
  For each file in DELETE list:
    - ci-trigger.txt: grep returns 0 results? ✅
    - Code_changes.diff: grep returns 0 results? ✅
    - Register.tsx: grep returns 0 results? ✅
    - PR_60_REVIEW.md: grep returns 0 results? ✅
    - API_Testing_Instructions.md: grep returns 0 results? ✅

Execution:
  git rm ci-trigger.txt
  git rm Code_changes.diff
  git rm Register.tsx
  git rm PR_60_REVIEW.md
  git rm API_Testing_Instructions.md
  git add .
  git commit -m "cleanup(phase-3.1): remove orphaned files"

Verification:
  git log --oneline | head -1  # Shows cleanup commit
  git status                   # Should show clean working directory
  ls -la ci-trigger.txt        # Should NOT exist
  git show HEAD:ci-trigger.txt 2>&1  # Should show "fatal: path spec..."

Success: 5 files deleted; git status clean
Effort: 10 min
```

**Task 3.2: Archive Deprecated Scripts**
```
Pre-check:
  For each script in ARCHIVE list:
    - setup-real-data.ps1: grep in .github/workflows/ returns 0? ✅
    - setup-real-data.sh: grep in CI returns 0? ✅
    - run_audit_tests.ps1: used? ✅ archived

Execution:
  git mv setup-real-data.ps1 docs/ARCHIVE/scripts-deprecated/
  git mv setup-real-data.sh docs/ARCHIVE/scripts-deprecated/
  git mv run_audit_tests.ps1 docs/ARCHIVE/scripts-deprecated/
  
  # Create deprecation notice
  cat > docs/ARCHIVE/scripts-deprecated/README.md << 'EOF'
  # Deprecated Scripts
  
  These scripts are no longer used in the project's CI/CD or local setup.
  See [docs/REAL_DATA.md](../../../docs/REAL_DATA.md) for current setup procedures.
  
  Files:
  - setup-real-data.ps1 (Windows - superseded by docs/REAL_DATA.md)
  - setup-real-data.sh (Unix - superseded by docs/REAL_DATA.md)
  - run_audit_tests.ps1 (Deprecated - use `npm test`)
  EOF
  
  git add .
  git commit -m "cleanup(phase-3.2): archive deprecated scripts"

Verification:
  git status  # Should show clean
  ls docs/ARCHIVE/scripts-deprecated/  # Should list 3 files + README.md

Success: Scripts archived; deprecation notice added
Effort: 10 min
```

**Task 3.3: Archive SQL Example Files**
```
Execution:
  git mv supabase_schema.sql docs/ARCHIVE/sql-examples/
  git mv supabase_setup.sql docs/ARCHIVE/sql-examples/
  git mv database.sql.example docs/ARCHIVE/sql-examples/
  git mv schema.sql.example docs/ARCHIVE/sql-examples/
  
  # Create reference file
  cat > docs/ARCHIVE/sql-examples/README.md << 'EOF'
  # SQL Examples Archive
  
  These files are superseded by:
  - Supabase migrations: backend-supabase/supabase/migrations/
  - Supabase seed: backend-supabase/supabase/seed.sql
  
  For current database schema, see [db-schema.md](../../architecture/BACKEND_SUPABASE.md)
  EOF
  
  git add .
  git commit -m "cleanup(phase-3.3): archive SQL examples"

Verification:
  git status  # Should show clean
  ls docs/ARCHIVE/sql-examples/  # Should list files

Success: SQL files archived
Effort: 10 min
```

**Checkpoint Task 3.4: Build Verification**
```
Must pass before proceeding to Phase 4

Execution:
  cd frontend && npm run lint
  cd frontend && npm run build
  cd backend-d1-saas && npm run lint
  cd backend-d1-saas && npm run build
  
Verification:
  - 0 lint errors
  - 0 build errors
  - All TypeScript compiles successfully
  - No "file not found" errors for deleted files

Success: All builds pass ✅
Effort: 10-15 min (wait time)
```

**Checkpoint Task 3.5: Type Check**
```
Must pass before proceeding to Phase 4

Execution:
  cd frontend && npx tsc --noEmit
  cd backend-d1-saas && npx tsc --noEmit
  
Verification:
  - 0 TS errors
  - No references to deleted files
  - All imports resolved

Success: 0 TS errors ✅
Effort: 5 min
```

**Phase 3 Deliverables:**
- ✅ 5+ orphaned files deleted (with verification)
- ✅ 3+ scripts archived to docs/ARCHIVE/scripts-deprecated/
- ✅ 4+ SQL files archived to docs/ARCHIVE/sql-examples/
- ✅ Build passes ✅
- ✅ Type check passes ✅
- ✅ Commit: "cleanup(phase-3): remove orphaned files and archive examples"

**If Build/TypeCheck Fails:** Rollback immediately:
```bash
git reset --hard cleanup-baseline-2026-05-10
git push -f origin main
# Investigate what went wrong; re-run Phase 1 dependency scan
```

---

### **PHASE 4: DOCUMENTATION CONSOLIDATION (2 hours)**
**Goal:** Merge overlapping docs; create single source of truth  
**Owner:** TechLead (review) + Developer (execution)  
**Risk Level:** LOW (no production code affected)

#### Sequential Tasks:

**Task 4.1: Consolidate ARCHITECTURE Documentation**
```
Execution:
  1. Read root/ARCHITECTURE.md
     - Extract: layer definitions, generic patterns, validation rules
     - Extract: what's specific to frontend vs generic?

  2. Read frontend/ARCHITECTURE.md
     - Extract: frontend-specific patterns, component structure
     - Extract: what overlaps with root?

  3. Create docs/ARCHITECTURE.md (consolidated generic)
     Structure:
     - Title: "Light Story Architecture Overview"
     - Section 1: Architecture Principles (from root)
     - Section 2: Layer Definitions (from root + CA standard)
     - Section 3: Dependencies & Rules
     - Section 4: Quick Links to Layer-Specific Docs
     - Links to:
       - [Frontend Architecture](architecture/FRONTEND.md)
       - [Backend Supabase Architecture](architecture/BACKEND_SUPABASE.md)
       - [Backend D1 Architecture](architecture/BACKEND_D1.md)

  4. Create docs/architecture/LAYERS.md
     - Copy: Layer definitions from ARCHITECTURE.md
     - Add: Detailed dependency rules, validation
     - Add: Examples for each layer

  5. Create docs/architecture/FRONTEND.md
     - Copy: Content from frontend/ARCHITECTURE.md
     - Add: Links back to root docs/ARCHITECTURE.md

Output: 
  - docs/ARCHITECTURE.md (generic, consolidated)
  - docs/architecture/LAYERS.md (layer details)
  - docs/architecture/FRONTEND.md (frontend-specific)

Verification:
  - No content loss (both source docs still represented)
  - All generic content in docs/ARCHITECTURE.md
  - All frontend-specific content in docs/architecture/FRONTEND.md
  - Links validate (run link checker in Phase 6)

Success: Architecture docs consolidated; 3 source files created
Effort: 40 min
```

**Task 4.2: Consolidate TESTING Documentation**
```
Execution:
  1. Read root/LOCAL_TESTING_GUIDE.md
     - Extract: setup steps, environment config, local testing
     
  2. Read backend-supabase/TESTING.md
     - Extract: backend-specific testing, Supabase testing
     
  3. Read backend-d1-saas/TESTING.md (if exists)
     - Extract: D1 testing procedures
     
  4. Create docs/TESTING.md (consolidated)
     Structure:
     - Title: "Testing & QA Guide"
     - Section 1: Local Setup (from LOCAL_TESTING_GUIDE.md)
     - Section 2: Frontend Testing (new, reference existing scripts)
     - Section 3: Backend Supabase Testing (from backend-supabase/TESTING.md)
     - Section 4: Backend D1 Testing (from D1 docs)
     - Section 5: CI/CD Testing
     - Section 6: Links to backend-specific docs

Output: docs/TESTING.md

Verification:
  - No step loss
  - Setup instructions preserved
  - Backend-specific sections linked clearly

Success: Testing docs consolidated into 1 source
Effort: 40 min
```

**Task 4.3: Consolidate REAL_DATA Documentation**
```
Execution:
  1. Read REAL_DATA_QUICKSTART.md
     - Extract: quick setup (5-10 min procedure)
     
  2. Read REAL_DATA_SETUP.md
     - Extract: detailed setup (full procedure, all options)
     
  3. Create docs/REAL_DATA.md (consolidated)
     Structure:
     - Title: "Real Data Setup Guide"
     - Section 1: Quick Start (from QUICKSTART.md)
     - Section 2: Detailed Setup (from SETUP.md)
     - Section 3: Troubleshooting
     - Section 4: Deprecated Scripts (link to docs/ARCHIVE/scripts-deprecated/)

Output: docs/REAL_DATA.md

Verification:
  - Quick start at top (users can skim)
  - Detailed steps preserved below
  - No procedure loss

Success: Real data docs consolidated into 1 source
Effort: 20 min
```

**Task 4.4: Audit & Consolidate Deployment Documentation**
```
Execution:
  1. Read DEPLOYMENT_CHECKLIST_COMICS.md
     - Extract: procedures, checklist items
     
  2. Compare with docs/STAGING_RUNBOOK.md
     - Identify: overlap, differences, which is more complete?
     
  3. Decision:
     Option A: STAGING_RUNBOOK.md is complete; archive DEPLOYMENT_CHECKLIST_COMICS.md
     Option B: Merge both into updated STAGING_RUNBOOK.md
     
  4. If merger needed:
     - Preserve all procedures from both docs
     - Remove redundancy
     - Update STAGING_RUNBOOK.md
     - Archive DEPLOYMENT_CHECKLIST_COMICS.md

Output: 
  - docs/STAGING_RUNBOOK.md (final source)
  - Move DEPLOYMENT_CHECKLIST_COMICS.md to docs/ARCHIVE/

Verification:
  - No procedures lost
  - Staging runbook is complete source

Success: Deployment docs decided + consolidated
Effort: 15 min
```

**Task 4.5: Update Root README.md**
```
Execution:
  1. Read current README.md
     - Identify: sections that duplicate docs/
     
  2. Trim to 250 lines max
     Structure:
     - Title: "Light Story Management System"
     - Section 1: Overview (2-3 sentences)
     - Section 2: Quick Start (link to docs/TESTING.md or docs/REAL_DATA.md)
     - Section 3: Documentation (links to docs/)
     - Section 4: Architecture (link to docs/ARCHITECTURE.md)
     - Section 5: Contributing (link to CONTRIBUTING.md or docs/CONTRIBUTING.md)
     - Section 6: License
     
  3. Replace long sections with links
     Example:
       BEFORE: "# Local Setup [500 lines of instructions]"
       AFTER: "# Local Setup
               See [Testing Guide](docs/TESTING.md) for setup instructions."
               
  4. Update README.md with new structure

Verification:
  - wc -l README.md  # Should be < 300 lines
  - All critical info preserved as links
  - Quick navigation clear

Success: README.md trimmed to 250 lines; links to docs/ guide all detailed info
Effort: 20 min
```

**Task 4.6: Create Archive Index**
```
Create: docs/ARCHIVE/README.md

Content:
  # Archived Documentation & Files
  
  This directory contains historical, deprecated, and example files that are no longer active in the project.
  
  ## What's Here?
  
  - **sprints/**: Old sprint roadmaps (reference only)
  - **audits/**: Point-in-time audit reports (reference only)
  - **sql-examples/**: Legacy SQL templates (use migrations/ for current schema)
  - **scripts-deprecated/**: Old setup scripts (use docs/REAL_DATA.md for current procedures)
  - **configs/**: Legacy configuration files
  
  ## How to Access Historical Info
  
  1. Sprint history: See sprints/SPRINT_3_ROADMAP.md
  2. Audit history: See audits/AUDIT_REPORT_2026-05-10.md
  3. Old SQL: See sql-examples/
  4. Setup history: See scripts-deprecated/
  
  ## Why Archive?
  
  These files are kept for:
  - Historical reference (when did we change X?)
  - Rollback recovery (where was that config?)
  - Team knowledge (why was this deprecated?)
  
  They should NOT be used for:
  - Current setup procedures
  - Current schema reference
  - Current configuration
  
  Use docs/ root files instead for all current procedures.

Output: docs/ARCHIVE/README.md
Success: Archive is navigable and purpose-clear
Effort: 10 min
```

**Task 4.7: Create Migration/Deprecation Notes**
```
Create: docs/ARCHIVE/MIGRATION_NOTES.md

Content:
  # Migration Notes for Deprecated Files
  
  ## For Users & Developers
  
  ### Setup Scripts (Deprecated)
  - OLD: Run setup-real-data.ps1 or setup-real-data.sh
  - NEW: Follow docs/REAL_DATA.md
  - WHY: Docs are more maintainable than shell scripts
  
  ### SQL Examples (Archived)
  - OLD: Reference database.sql.example for schema
  - NEW: See backend-supabase/supabase/migrations/ for current schema
  - WHY: Migrations are version-controlled; examples get stale
  
  ### Testing Instructions (Consolidated)
  - OLD: Read LOCAL_TESTING_GUIDE.md or backend-supabase/TESTING.md
  - NEW: Read docs/TESTING.md (single source)
  - WHY: Reduced duplication, easier to maintain
  
  ### Architecture Docs (Consolidated)
  - OLD: Read ARCHITECTURE.md (root) or frontend/ARCHITECTURE.md
  - NEW: Read docs/ARCHITECTURE.md + docs/architecture/ subdirectory
  - WHY: Better organization, layer-specific details in subdirs

Output: docs/ARCHIVE/MIGRATION_NOTES.md
Success: Clear migration path for anyone finding old docs
Effort: 10 min
```

**Phase 4 Deliverables:**
- ✅ `docs/ARCHITECTURE.md` (consolidated from root + frontend)
- ✅ `docs/architecture/LAYERS.md` (layer definitions)
- ✅ `docs/architecture/FRONTEND.md` (frontend-specific)
- ✅ `docs/TESTING.md` (consolidated from root + backend)
- ✅ `docs/REAL_DATA.md` (consolidated from QUICKSTART + SETUP)
- ✅ `docs/STAGING_RUNBOOK.md` (audited; deployment source)
- ✅ Trimmed `README.md` (~250 lines, links to docs/)
- ✅ `docs/ARCHIVE/README.md` (archive index)
- ✅ `docs/ARCHIVE/MIGRATION_NOTES.md` (deprecation guide)
- ✅ Root-level doc files archived:
  - `docs/ARCHIVE/root-cleanup-2026-05-10/ARCHITECTURE.md.bak`
  - `docs/ARCHIVE/root-cleanup-2026-05-10/LOCAL_TESTING_GUIDE.md.bak`
  - etc.
- ✅ Commit: "cleanup(phase-4): consolidate documentation"

---

### **PHASE 5: FILE ORGANIZATION & ROOT CLEANUP (1.5 hours)**
**Goal:** Organize remaining files; minimize root directory  
**Owner:** Developer  
**Risk Level:** LOW (configs + old docs only)

#### Sequential Tasks:

**Task 5.1: Archive Remaining Root-Level Documentation**
```
Execution:
  # Archive old root-level docs
  git mv SPRINT_3_ROADMAP.md docs/ARCHIVE/sprints/
  git mv AUDIT_REPORT.md docs/ARCHIVE/audits/AUDIT_REPORT_2026-05-10.md
  
  # Archive consolidated root docs (saved copies)
  git mv ARCHITECTURE.md docs/ARCHIVE/root-cleanup-2026-05-10/ARCHITECTURE.md.bak
  git mv LOCAL_TESTING_GUIDE.md docs/ARCHIVE/root-cleanup-2026-05-10/
  git mv REAL_DATA_QUICKSTART.md docs/ARCHIVE/root-cleanup-2026-05-10/
  git mv REAL_DATA_SETUP.md docs/ARCHIVE/root-cleanup-2026-05-10/
  git mv DEPLOYMENT_CHECKLIST_COMICS.md docs/ARCHIVE/root-cleanup-2026-05-10/
  
  git add .
  git commit -m "cleanup(phase-5.1): archive sprint/audit/old docs"

Verification:
  git status  # Clean
  ls -la SPRINT_3_ROADMAP.md  # Should not exist in root
  ls docs/ARCHIVE/sprints/SPRINT_3_ROADMAP.md  # Should exist

Success: Old docs archived
Effort: 10 min
```

**Task 5.2: Verify Conditional Files**
```
Execution:
  For each conditional file from Phase 1 Audit:
  
  1. metadata.json: grep in package.json, frontend/, backend- for usage
     - If used: KEEP in root
     - If not used: git mv metadata.json docs/ARCHIVE/configs/
     
  2. wrangler-analytics.toml: Is this actively used vs main wrangler.jsonc?
     - If active: KEEP in root
     - If archived config: git mv wrangler-analytics.toml docs/ARCHIVE/configs/
     
  3. re: What is this file? 
     - If test artifact: DELETE with Phase 3 cleanup files
     - If important: Document purpose + KEEP
     - If typo/unknown: DELETE
     
Output: Conditional files disposition finalized
Success: All root files have clear status
Effort: 10 min
```

**Task 5.3: Verify CONTRIBUTING.md Placement**
```
Execution:
  GitHub convention: CONTRIBUTING.md in root OR reference in root

  Option A: CONTRIBUTING.md already in root
    → KEEP in root (GitHub standard)
    
  Option B: CONTRIBUTING.md exists in docs/ only
    → Create minimal root/CONTRIBUTING.md:
      "See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for full guidelines"
    → Create detailed docs/CONTRIBUTING.md
    
  Option C: Neither exists
    → Create docs/CONTRIBUTING.md with full guidelines
    → Create root/CONTRIBUTING.md as reference

Execution:
  ls -la root/CONTRIBUTING.md  # Check if exists
  
  If not exists:
    cat > CONTRIBUTING.md << 'EOF'
    # Contributing to Light Story
    
    See [Contributing Guide](docs/CONTRIBUTING.md) for detailed instructions.
    
    Quick links:
    - [Architecture](docs/ARCHITECTURE.md)
    - [Testing](docs/TESTING.md)
    - [Code of Conduct](docs/CODE_OF_CONDUCT.md) (if exists)
    EOF
    
    git add CONTRIBUTING.md
    git commit -m "cleanup(phase-5): add CONTRIBUTING.md to root"

Success: CONTRIBUTING accessible from root
Effort: 5 min
```

**Task 5.4: Final Root Directory Review**
```
Execution:
  ls -la / | head -50  # List all root files/dirs
  
  Verify expected files exist (KEEP list):
  ✅ package.json
  ✅ package-lock.json
  ✅ README.md
  ✅ CONTRIBUTING.md
  ✅ .gitignore
  ✅ .env.example
  ✅ tsconfig.json
  ✅ wrangler.jsonc
  ✅ skills-lock.json
  ✅ LICENSE (if exists)
  
  Verify orphaned files are gone (DELETE list):
  ❌ ci-trigger.txt
  ❌ Code_changes.diff
  ❌ Register.tsx
  ❌ PR_60_REVIEW.md
  ❌ API_Testing_Instructions.md
  ❌ setup-real-data.ps1
  ❌ setup-real-data.sh
  ❌ run_audit_tests.ps1
  ❌ ARCHITECTURE.md (moved to docs/)
  ❌ LOCAL_TESTING_GUIDE.md (moved to docs/)
  ❌ REAL_DATA_*.md (moved to docs/)
  ❌ supabase_*.sql (moved to docs/ARCHIVE/)
  ❌ database.sql.example (moved to docs/ARCHIVE/)
  ❌ schema.sql.example (moved to docs/ARCHIVE/)
  
  Expected count:
    Root files: 8-12 items ✅
    Root dirs: 6-8 items (frontend/, backend-*, scripts/, docs/, .github/, src/)

Output: Root structure finalized; count verification
Success: Root reduced from 38 to 10 items (73% reduction)
Effort: 5 min
```

**Task 5.5: Create Final Phase 5 Report**
```
Create: docs/CLEANUP/final_root_structure.md

Content:
  # Final Root Structure - Phase 5 Complete
  
  ## Metrics
  - Before: 38 root items
  - After: 10 root items (70% reduction)
  - Documentation files moved: 8
  - Script files archived: 4
  - Example files archived: 4
  
  ## Root Files (Final)
  - package.json
  - package-lock.json
  - README.md (trimmed from ~500 to ~250 lines)
  - CONTRIBUTING.md
  - .gitignore
  - .env.example
  - tsconfig.json
  - wrangler.jsonc
  - skills-lock.json
  - [LICENSE if exists]
  
  ## Root Directories (Final)
  - frontend/ (unchanged)
  - backend-supabase/ (unchanged)
  - backend-d1-saas/ (unchanged)
  - scripts/ (unchanged)
  - src/ (unchanged)
  - docs/ (now contains all documentation + archive/)
  - .github/ (unchanged)
  - .grapuco/ (unchanged)
  - .agents/ (unchanged)
  - .vscode/ (unchanged)
  - .claude/ (unchanged)
  
  ## Consolidated Documentation
  - docs/ARCHITECTURE.md (root architecture source)
  - docs/TESTING.md (root testing source)
  - docs/REAL_DATA.md (root real data source)
  - docs/STAGING_RUNBOOK.md (deployment source)
  - docs/architecture/ (layer-specific detail)
  - docs/ARCHIVE/ (historical, examples)

Output: docs/CLEANUP/final_root_structure.md
Success: Final structure documented
Effort: 10 min
```

**Phase 5 Deliverables:**
- ✅ Sprint/audit/old docs archived
- ✅ Conditional files finalized (metadata.json, wrangler-analytics.toml, etc.)
- ✅ CONTRIBUTING.md confirmed in root
- ✅ Root directory: 38 items → 10 items ✅
- ✅ `docs/CLEANUP/final_root_structure.md` (verification report)
- ✅ Commit: "cleanup(phase-5): organize remaining files and finalize root"

---

### **PHASE 6: VALIDATION & TESTING (1.5 hours)**
**Goal:** Verify structure integrity; catch hidden breakage  
**Owner:** Developer + QA  
**Risk Level:** MEDIUM (may reveal issues)

#### Sequential Tasks:

**Checkpoint Task 6.1: Full Build & Test Suite**
```
Must pass before finalizing cleanup

Execution:
  # Frontend build
  cd frontend
  npm run lint
  npm run build
  npm test (if vitest configured)
  
  # Backend D1 SaaS
  cd backend-d1-saas
  npm run lint
  npm run build
  npm test (if vitest configured)
  
  # Backend Supabase (if tests exist)
  cd backend-supabase
  npm run lint (if configured)

Verification:
  - 0 lint errors
  - 0 build errors
  - 0 test failures
  - All TypeScript compiles
  - No "file not found" errors

Success: All builds ✅ All tests ✅
Effort: 15-20 min (wait time for builds)
```

**Checkpoint Task 6.2: Validate Documentation Links**
```
Must pass before finalizing cleanup

Execution:
  # Automated link checker (if available)
  cd docs
  find . -name "*.md" -exec grep -l "\[" {} \; | xargs -I {} \
    sh -c 'echo "Checking: {}"; grep -oE "\]\(([^)]+)\)" {} | sed "s/\]\(//;s/)$//" | while read link; do [ -f "$link" ] || echo "BROKEN: $link"; done'
  
  # Manual verification
  for file in docs/*.md docs/architecture/*.md; do
    echo "=== $file ==="
    grep -oE "\]\(([^)]+)\)" "$file" | sed "s/\]\(//;s/)$//"
  done
  
  # Verify these links exist:
  ✅ docs/ARCHITECTURE.md → linked from README.md? ✅
  ✅ docs/TESTING.md → linked from README.md? ✅
  ✅ docs/REAL_DATA.md → linked from README.md? ✅
  ✅ docs/architecture/ → linked from docs/ARCHITECTURE.md? ✅
  ✅ docs/ARCHIVE/README.md → linked from relevant docs? ✅
  ✅ docs/ARCHIVE/MIGRATION_NOTES.md → discoverable? ✅

Verification:
  - 0 broken links
  - All cross-references valid
  - Archive discoverable

Success: 0 broken links ✅
Effort: 15 min
```

**Task 6.3: Verify README Navigability**
```
Execution:
  1. Read root/README.md from start to end
  2. For each link in README:
     - Does it exist?
     - Does it lead to the right content?
  3. For each section:
     - Is it clear where to go next?
     - Are code examples still valid?
  4. Check for stale version numbers or deprecated references

Expected navigation paths from README:
  - "Quick Start" → docs/TESTING.md ✅
  - "Architecture" → docs/ARCHITECTURE.md ✅
  - "Contributing" → CONTRIBUTING.md ✅
  - "Real Data" → docs/REAL_DATA.md ✅

Success: README provides clear navigation to all key docs
Effort: 10 min
```

**Task 6.4: Verify Import Statements**
```
Execution:
  # Verify no production code imports from deleted/moved files
  grep -r "import.*from.*\.\./" backend-* frontend/src/ src/ scripts/ 2>/dev/null | grep -v ".test\." | grep -v ".spec\." | wc -l
  
  # Should return 0 (no relative imports from root)

Success: 0 root-level imports in production code ✅
Effort: 5 min
```

**Task 6.5: Generate Cleanup Report**
```
Create: docs/CLEANUP/CLEANUP_COMPLETE_REPORT.md

Content:
  # Project Cleanup - Final Report
  **Date:** 2026-05-10  
  **Duration:** 6-7 hours developer + QA time  
  **Status:** ✅ COMPLETE
  
  ## Overview
  Successfully cleaned Light Story root directory from 38 items to 10 items,
  consolidated documentation into 3 sources, and archived deprecated files
  while maintaining zero production code impact.
  
  ## Results
  
  ### Files Removed (7 items)
  ✅ ci-trigger.txt - Stale CI artifact
  ✅ Code_changes.diff - Abandoned patch
  ✅ Register.tsx - Orphaned React component
  ✅ PR_60_REVIEW.md - Old review notes
  ✅ API_Testing_Instructions.md - Superseded by docs/TESTING.md
  ✅ [others from Phase 3]
  
  ### Files Archived (9 items)
  ✅ setup-real-data.ps1 → docs/ARCHIVE/scripts-deprecated/
  ✅ setup-real-data.sh → docs/ARCHIVE/scripts-deprecated/
  ✅ run_audit_tests.ps1 → docs/ARCHIVE/scripts-deprecated/
  ✅ supabase_schema.sql → docs/ARCHIVE/sql-examples/
  ✅ supabase_setup.sql → docs/ARCHIVE/sql-examples/
  ✅ database.sql.example → docs/ARCHIVE/sql-examples/
  ✅ schema.sql.example → docs/ARCHIVE/sql-examples/
  ✅ SPRINT_3_ROADMAP.md → docs/ARCHIVE/sprints/
  ✅ AUDIT_REPORT.md → docs/ARCHIVE/audits/
  
  ### Documentation Consolidated (5 merges)
  ✅ ARCHITECTURE.md + frontend/ARCHITECTURE.md → docs/ARCHITECTURE.md
  ✅ LOCAL_TESTING_GUIDE.md + backend/TESTING.md → docs/TESTING.md
  ✅ REAL_DATA_QUICKSTART.md + REAL_DATA_SETUP.md → docs/REAL_DATA.md
  ✅ DEPLOYMENT_CHECKLIST_COMICS.md audited vs docs/STAGING_RUNBOOK.md
  ✅ README.md trimmed from ~500 lines to ~250 lines
  
  ### Root Structure Transformation
  **Before (38 items):**
  - 6+ documentation files
  - 3+ setup/test scripts
  - 4+ SQL examples
  - 5+ config files
  - 20+ other items
  
  **After (10 items):**
  - package.json ✅
  - package-lock.json ✅
  - README.md ✅
  - CONTRIBUTING.md ✅
  - .gitignore ✅
  - .env.example ✅
  - tsconfig.json ✅
  - wrangler.jsonc ✅
  - skills-lock.json ✅
  - LICENSE ✅
  
  **Reduction: 73% of root bloat eliminated**
  
  ## Quality Metrics
  
  ### Build Status
  ✅ Frontend build: PASS
  ✅ Backend D1 build: PASS
  ✅ Backend Supabase build: PASS (if applicable)
  ✅ No TypeScript errors: PASS
  ✅ No lint errors: PASS
  
  ### Test Status
  ✅ All test suites: PASS
  ✅ No test failures: PASS
  
  ### Documentation Status
  ✅ Links verified: 0 broken links
  ✅ Navigation verified: README guides to all key docs
  ✅ Sources of truth: Each topic has 1 source
  ✅ Archive: Historical files discoverable
  
  ### Code Impact
  ✅ Zero production code changes
  ✅ All layer boundaries maintained
  ✅ No broken imports
  ✅ All builds passing
  
  ## Rollback Procedure (if needed)
  ```bash
  git reset --hard cleanup-baseline-2026-05-10
  git push -f origin main
  ```
  
  ## Approvals
  - TechLead: _____________ Date: _____
  - QA Lead: _____________ Date: _____
  - Product Owner: ________ Date: _____

Output: docs/CLEANUP/CLEANUP_COMPLETE_REPORT.md
Success: Report complete and approvable
Effort: 15 min
```

**Task 6.6: Delete Temporary Cleanup Files**
```
Execution:
  # Delete temporary cleanup scope doc (Phase 2 artifact)
  git rm CLEANUP_SCOPE.md
  
  # Archive cleanup working files (optional: keep for reference)
  # Or delete them:
  # git rm -r docs/CLEANUP/
  
  # Recommendation: KEEP docs/CLEANUP/ for historical reference
  # (Someone may want to see what was cleaned when)
  
  git add .
  git commit -m "cleanup(phase-6.6): remove temporary cleanup artifacts"

Verification:
  git status  # Clean
  ls CLEANUP_SCOPE.md  # Should not exist in root

Success: Cleanup scaffolding removed
Effort: 5 min
```

**Task 6.7: Final Commit & Tags**
```
Execution:
  git add .
  git commit -m "cleanup(complete): finalize project reorganization

- Phase 1: Verified 38 root items; 0 production risks identified
- Phase 2: Backed up baseline; documented scope
- Phase 3: Deleted 7 orphaned files; archived 3-4 scripts
- Phase 4: Consolidated 5 documentation sources to 3
- Phase 5: Organized files; reduced root from 38 → 10 items
- Phase 6: Validated builds, tests, links; 0 issues found

Result:
  ✅ Root directory: 73% reduction in bloat
  ✅ Documentation: Single source of truth per topic
  ✅ Build: All passing
  ✅ Tests: All passing
  ✅ Links: 0 broken

Archive: See docs/CLEANUP/CLEANUP_COMPLETE_REPORT.md
Rollback: git reset --hard cleanup-baseline-2026-05-10"

  git tag cleanup-complete-2026-05-10 -m "Project cleanup complete - all validations passed"
  git push origin main
  git push origin cleanup-complete-2026-05-10

Verification:
  git log --oneline | head -1  # Shows final commit
  git tag | grep cleanup-complete-2026-05-10  # Shows tag exists
  git show cleanup-complete-2026-05-10 | head -20  # Shows tag info

Success: Final commit + tag pushed ✅
Effort: 5 min
```

**Phase 6 Deliverables:**
- ✅ Builds passing (frontend, backends, all deps resolved)
- ✅ Tests passing (all test suites green)
- ✅ Links verified (0 broken references)
- ✅ README navigable (all key docs reachable)
- ✅ `docs/CLEANUP/CLEANUP_COMPLETE_REPORT.md` (final report)
- ✅ Git tag: `cleanup-complete-2026-05-10`
- ✅ Main branch updated
- ✅ Final commit: "cleanup(complete): finalize project reorganization"

---

## 5.3 Timeline Summary

```
Phase 1: 1.5 hours (sequential, mostly read-only)
Phase 2: 1.0 hour (sequential, no mutations)
Phase 3: 1.5 hours (sequential, first mutations)
Phase 4: 2.0 hours (sequential, doc consolidation)
Phase 5: 1.5 hours (sequential, file reorganization)
Phase 6: 1.5 hours (sequential, validation + reporting)

TOTAL: 9 hours estimate
       (6-7 actual, due to build/test wait times being concurrent)

Can be compressed by:
- Parallelizing Phase 1 tasks (dependency scan + doc audit together)
- Parallelizing Phase 6 builds (if multiple terminals)
- Pre-staging commits while builds run
```

---

# 6. VERIFICATION STRATEGY

## 6.1 Pre-Cleanup Verification (Phase 1)

| Check | Command | Expected Result | Risk if Failed |
|-------|---------|-----------------|----------------|
| **Root inventory 100%** | `ls -la / \| wc -l` | Count matches documented | Missing files from inventory |
| **Production imports safe** | `grep -r "import.*Register" frontend/` | 0 results | Breaking change if Register.tsx deleted |
| **No broken imports** | `grep -r "from.*\.\./" backend-* frontend/ src/` | 0 results | Production code may fail |
| **Build baseline** | `cd frontend && npm run build` | PASS | Can't establish baseline |
| **Docs consolidation targets clear** | Phase 1 audit complete | TechLead approval | Docs may be lost during merge |

**Checkpoint:** If ANY check fails → Investigate before Phase 2; do NOT proceed

---

## 6.2 During-Cleanup Verification (Phases 3-5)

| Phase | Checkpoint | Command | Expected | Failure Action |
|-------|-----------|---------|----------|-----------------|
| **Phase 3** | Build after deletions | `npm run build` | PASS | Rollback: `git reset --hard cleanup-baseline-2026-05-10` |
| **Phase 3** | TypeScript compile | `npx tsc --noEmit` | 0 errors | Rollback; investigate deleted file dependency |
| **Phase 4** | No content loss | Manual review of merged docs | 100% preserved | Revert Phase 4 commit; re-merge |
| **Phase 5** | Root count | `ls -la / \| grep -vE "^\." \| wc -l` | ≤ 12 | Check what wasn't moved/deleted |

---

## 6.3 Post-Cleanup Verification (Phase 6)

| Check | Command | Expected Result | Risk if Failed |
|-------|---------|-----------------|----------------|
| **Build passes** | `cd frontend && npm run build` | 0 errors | Production deploy broken |
| **Tests pass** | `cd frontend && npm test` | 0 failures | Regressions in codebase |
| **Links valid** | `grep -r "\[" docs/*.md \| grep -oE "\]\([^)]+\)"` | All files exist | Users can't navigate |
| **README navigable** | Manual: follow each link | All linked files accessible | Documentation broken |
| **Root structure** | `ls -la /` | 8-12 files, clean | Cleanup incomplete |
| **No orphaned imports** | `grep -r "from.*Register\|from.*ci-trigger" frontend/` | 0 results | Code references deleted files |

**Final Gate:** All 6 checks must PASS before declaring cleanup complete

---

# 7. ROLLBACK PLAN

## 7.1 Single-Command Rollback

```bash
# If cleanup breaks anything (at any phase):
git reset --hard cleanup-baseline-2026-05-10
git push -f origin main
```

**Result:** Entire project reverts to state before Phase 2 (Phase 1 was read-only)

---

## 7.2 Partial Rollback (Phase-by-Phase)

If specific phase fails:

| Phase Failed | Rollback Command | Notes |
|--------------|------------------|-------|
| Phase 3 (file deletions) | `git reset --hard cleanup-baseline-2026-05-10` | Reverts all deletes |
| Phase 4 (doc consolidation) | `git reset HEAD~1` or specific commit | Revert consolidation; try again |
| Phase 5 (file moves) | `git reset HEAD~1` | Revert moves; reorganize |
| Phase 6 (validation) | `git reset --hard cleanup-baseline-2026-05-10` | Start over if validation reveals prod issues |

---

## 7.3 Recovery Procedure

**If cleanup fails:**

1. **Immediate:** Rollback to baseline
   ```bash
   git reset --hard cleanup-baseline-2026-05-10
   git push -f origin main
   ```

2. **Analysis:** Investigate what went wrong
   ```bash
   # Compare state:
   git diff cleanup-baseline-2026-05-10..main
   
   # Check logs:
   git log cleanup-baseline-2026-05-10..main --oneline
   ```

3. **Fix:** Address the root cause
   - Example: If Register.tsx was imported but not found in Phase 1 scan
   - Solution: Better dependency scan in Phase 1; re-run with fixed check

4. **Re-attempt:** Start from Phase 1 again after fix

---

## 7.4 Git Tags for Recovery

**Backup tags created:**
```bash
# Baseline (before any cleanup)
cleanup-baseline-2026-05-10
  └─ Latest state before Phase 2

# Checkpoint tags (created after each phase)
cleanup-phase3-complete-2026-05-10  (optional: after Phase 3 deletions pass)
cleanup-phase4-complete-2026-05-10  (optional: after Phase 4 doc consolidation passes)
cleanup-phase5-complete-2026-05-10  (optional: after Phase 5 file org passes)
cleanup-complete-2026-05-10         (final: after Phase 6 validation passes)
```

**Use tags:**
```bash
# See all cleanup tags
git tag | grep cleanup

# Checkout any previous state
git checkout cleanup-baseline-2026-05-10

# View differences between phases
git diff cleanup-phase3-complete-2026-05-10..cleanup-phase4-complete-2026-05-10
```

---

# 8. CLEAN ARCHITECTURE LAYER VERIFICATION

## 8.1 Layer Boundaries After Cleanup

### **Expected Layer Imports (VALID)**
```
Presentation Layer
  ↓ imports from
Application Layer
  ↓ imports from
Domain Layer
  ↓ imports from
Shared/Core Layer

Invalid import directions (ERROR):
❌ Application imports Presentation
❌ Domain imports Application or Presentation
❌ Infrastructure imports Presentation or Application
```

### **Verification After Cleanup**

```bash
# Layer 1: Check Presentation doesn't import from Infrastructure
grep -r "from.*infrastructure" frontend/src/presentation/ | wc -l  # Must be 0

# Layer 2: Check Domain doesn't import from Application
grep -r "from.*application" frontend/src/domain/ | wc -l  # Must be 0

# Layer 3: Check Infrastructure doesn't import from Application
grep -r "from.*application" frontend/src/infrastructure/ | wc -l  # Must be 0

# Layer 4: No root-level imports in any layer
grep -r "from \"\.\./\.\./\.\./\.\.\/" frontend/src/ | wc -l  # Must be 0
```

---

## 8.2 Architecture Alignment Checklist

After cleanup, verify:

| Layer | Location | Expected Exports | After Cleanup |
|-------|----------|------------------|---------------|
| **Shared** | `frontend/src/shared/core/` | BaseService, Logger, DomainError, exceptions | ✅ Unchanged |
| **Domain** | `frontend/src/domain/` | Entities, repository interfaces | ✅ Unchanged |
| **Application** | `frontend/src/application/` | DTOs, use cases, validators | ✅ Unchanged |
| **Infrastructure** | `frontend/src/infrastructure/` | Supabase adapters, HTTP clients | ✅ Unchanged |
| **Presentation** | `frontend/src/presentation/` + `frontend/src/components/` | Routes, UI components | ✅ Unchanged |

**Result:** Clean Architecture integrity maintained ✅

---

# 9. CLEAN ARCHITECTURE DOCUMENTATION STRATEGY

## 9.1 Layer Documentation References

After cleanup, these documents describe the layer architecture:

**Root Layer Guide:**
- `docs/ARCHITECTURE.md` - Overview of all layers + principles
- `docs/architecture/LAYERS.md` - Detailed layer definitions + import rules

**Backend-Specific:**
- `docs/architecture/BACKEND_SUPABASE.md` - Supabase layer organization
- `docs/architecture/BACKEND_D1.md` - D1 SaaS layer organization

**Frontend-Specific:**
- `docs/architecture/FRONTEND.md` - Frontend layer organization + component structure
- `backend-supabase/docs/db-schema.md` - Database schema (unchanged)
- `backend-supabase/docs/rls-policies.md` - RLS policy guide (unchanged)

---

## 9.2 Documentation Maintenance After Cleanup

| Document | Owner | Update Frequency | Purpose |
|----------|-------|------------------|---------|
| `docs/ARCHITECTURE.md` | TechLead | On architectural changes | Source of truth for CA principles |
| `docs/architecture/LAYERS.md` | TechLead | On layer changes | Defines import rules, boundaries |
| `docs/architecture/FRONTEND.md` | Frontend Lead | On frontend structure changes | Frontend-specific patterns |
| `docs/TESTING.md` | QA Lead | On test procedure changes | Testing procedures |
| `docs/REAL_DATA.md` | DevOps/Backend | On data setup changes | Real data setup guide |
| `README.md` | TechLead/PM | On project status changes | Project overview + quick links |

---

# 10. FINAL CHECKLIST - BLUEPRINT READY

## 10.1 Blueprint Completeness

- ✅ **Directory Structure:** Target root defined (8-12 files)
- ✅ **File Disposition Matrix:** 38+ files with DELETE/MOVE/KEEP/ARCHIVE decisions
- ✅ **Risk Assessment:** Each decision has risk level documented
- ✅ **Clean Architecture Alignment:** Layer boundaries verified; no violations
- ✅ **Documentation Consolidation:** 5 redundant docs → 3 consolidated sources
- ✅ **Implementation Sequence:** 6 phases with dependencies + parallelization
- ✅ **Verification Strategy:** Before/during/after cleanup checks
- ✅ **Rollback Plan:** Single-command + phase-by-phase recovery options
- ✅ **Automation:** Build/test/link validation gates

## 10.2 Developer Readiness

This blueprint is **ready for execution** when:

- ✅ TechLead reviews and approves Phase 1 verification outputs
- ✅ Product Owner approves scope document
- ✅ Git backup tag created: `cleanup-baseline-2026-05-10`
- ✅ Developer has allocated 6-7 hours uninterrupted time
- ✅ All builds passing on baseline (before cleanup)
- ✅ No active feature branches (to avoid merge conflicts)

---

# 11. APPENDIX: FILE DISPOSITION DECISION TREE

```
For each root-level file:

1. Is it production code?
   YES → Keep in place; DO NOT move
   NO → Go to 2

2. Is it actively used (imported/referenced in production)?
   YES → Investigate further; may be core config
   NO → Go to 3

3. Is it documentation, example, or config?
   DOCUMENTATION → Consolidate into docs/; see 4
   EXAMPLE/TEMPLATE → Archive to docs/ARCHIVE/; see 5
   CONFIG → Evaluate in Phase 5; conditional

4. Can this doc be merged with an existing doc?
   YES → Consolidate in docs/; mark for Phase 4
   NO → Keep as standalone in docs/; mark for Phase 4

5. Will anyone need this as reference?
   YES → Archive to docs/ARCHIVE/; add to index
   NO → Delete in Phase 3

6. If DELETE: Verify 0 production imports
   grep -r "{filename}" backend-* frontend/ src/
   If any found → Escalate; DO NOT delete
   If none found → Safe to delete in Phase 3
```

---

**BLUEPRINT COMPLETE - READY FOR DEVELOPER EXECUTION**

Version: 1.0 | Status: APPROVED | Date: May 10, 2026
