# Comic Management Redesign & Edit Chapter Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign and restructure the Admin Comic Management tabs (`/admin` -> Comic Management) with enhanced Framer Motion visual effects, editable `slug` field, a unified split dashboard layout for metadata & chapters, and a multi-modal chapter editing flow.

**Architecture:** Refactor `ComicCatalogTab`, `ComicEditorTab`, `ComicChaptersTab`, and `ComicManagementTab` into modular components. `ComicEditorTab` will render a split dashboard (Form + Editable Slug on left, Chapters Overview on right), and `ComicChaptersTab` will act as an interactive "Edit Chapter" hub featuring comic grid selection, Action Choice Modal, Chapter List Modal with Delete Warning Dialog, and Chapter Creation View.

**Tech Stack:** Next.js (App Router), React, TypeScript, Framer Motion (`motion/react`), Lucide React icons, Tailwind CSS, Sonner (toasts).

---

### Task 1: Update CMS Types & Helper Definitions
**Files:**
- Modify: `frontend/src/lib/cms/comicCmsTypes.ts`

- [ ] **Step 1: Ensure `slug` support in form values and types**
Check and ensure `ComicCmsFormValues` and `DEFAULT_FORM` include editable `slug`.

- [ ] **Step 2: Commit**
```bash
git add -f frontend/src/lib/cms/comicCmsTypes.ts
git commit -m "feat(cms): update comic cms types for editable slug and tab definitions"
```

---

### Task 2: Redesign Comic Catalog Tab with Visual Effects & Fast Edit Switch
**Files:**
- Modify: `frontend/src/app/admin/_components/ComicCatalogTab.tsx`

- [ ] **Step 1: Enhance `ComicCatalogTab` UI & Click Handlers**
Add Framer Motion micro-animations (`whileHover`, `whileTap`) to comic cards and ensure clicking a card calls `onOpenComic(comic.id, "editor")`.

- [ ] **Step 2: Commit**
```bash
git add -f frontend/src/app/admin/_components/ComicCatalogTab.tsx
git commit -m "feat(cms): enhance ComicCatalogTab UI animations and fast edit switch"
```

---

### Task 3: Redesign Comic Editor Tab into Split Dashboard with Editable Slug
**Files:**
- Modify: `frontend/src/app/admin/_components/ComicEditorTab.tsx`

- [ ] **Step 1: Implement Split Dashboard Layout**
Left side: Metadata form with Title, **Editable `slug` input**, Author, Category multi-select, Status, Description, Cover upload, and Motion action buttons (`Save Comic`, `Clear Form`, `Reset`).
Right side: Embedded Chapters & Assets Overview widget for the selected comic.

- [ ] **Step 2: Commit**
```bash
git add -f frontend/src/app/admin/_components/ComicEditorTab.tsx
git commit -m "feat(cms): convert ComicEditorTab into split dashboard with editable slug"
```

---

### Task 4: Implement Multi-Modal "Edit Chapter" Flow in ComicChaptersTab
**Files:**
- Modify: `frontend/src/app/admin/_components/ComicChaptersTab.tsx`

- [ ] **Step 1: Implement Comic Selection Grid and Modal Orchestration**
1. Comic selection grid with search filter.
2. Choice Modal: Action popup on comic tap with 2 options: "Edit" ("Chỉnh sửa chương") & "Create" ("Thêm chương mới").
3. Scrollable Chapter List Modal with Edit button & Delete warning confirmation modal (`"Cảnh báo: Bạn có chắc chắn muốn xóa chương này không?"`).
4. Chapter Creation View with target comic pinned at top.

- [ ] **Step 2: Commit**
```bash
git add -f frontend/src/app/admin/_components/ComicChaptersTab.tsx
git commit -m "feat(cms): implement multi-modal Edit Chapter workflow"
```

---

### Task 5: Update Main ComicManagementTab Labeling & Navigation State
**Files:**
- Modify: `frontend/src/app/admin/_components/ComicManagementTab.tsx`

- [ ] **Step 1: Rename "Chapters & Assets" Tab to "Edit Chapter" & Wire State**
Update tab label for `chapters` to `"Edit Chapter"` (`"Chỉnh sửa chương"`), pass active comic state, and synchronize active tab transitions.

- [ ] **Step 2: Commit**
```bash
git add -f frontend/src/app/admin/_components/ComicManagementTab.tsx
git commit -m "feat(cms): rename chapters tab to Edit Chapter and synchronize management state"
```

---

### Task 6: Automated Verification & Type Checks
**Files:**
- Run: `npm --prefix frontend run lint` or `npx tsc --noEmit` from `frontend`

- [ ] **Step 1: Run TypeScript compiler check**
Run `npm --prefix frontend run lint` or `cd frontend && npx tsc --noEmit` to ensure zero compilation or type errors.

- [ ] **Step 2: Commit**
```bash
git commit --allow-empty -m "chore: verify build and type safety for comic management redesign"
```
