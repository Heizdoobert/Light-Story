# Comic Management Redesign & Edit Chapter Flow Specification

**Date:** 2026-07-23  
**Status:** Approved by User  
**Target Components:**
- `frontend/src/app/admin/_components/ComicManagementTab.tsx`
- `frontend/src/app/admin/_components/ComicCatalogTab.tsx`
- `frontend/src/app/admin/_components/ComicEditorTab.tsx`
- `frontend/src/app/admin/_components/ComicChaptersTab.tsx`
- `frontend/src/lib/cms/comicCmsTypes.ts`

---

## 1. Executive Summary

This spec outlines the design and structural overhaul for the Admin Comic Management tabs (`/admin` -> Comic Management). The updates modernize the user experience with Framer Motion animations, streamline metadata and asset editing into a unified split view, enable custom `slug` editing, rename "Chapters & Assets" to "Edit Chapter", and introduce a multi-modal selection & management workflow for chapters.

---

## 2. Component Design & Navigation Flow

### 2.1 Tab Navigation (`ComicManagementTab.tsx`)
- Tab structure remains based on `TabKey`: `"catalog" | "editor" | "chapters" | "moderation"`.
- Display label for tab `"chapters"` updated from `"Chapters & Assets"` to **`"Edit Chapter"`** (`"Chỉnh sửa chương"`).
- State synchronization:
  - Selecting a comic in Catalog automatically updates `selectedComicId` and switches `activeTab` to `"editor"`.
  - Sub-views and modals inside "Edit Chapter" dynamically bind to `selectedComicId`.

---

### 2.2 Tab 1: Catalog Redesign (`ComicCatalogTab.tsx`)
- **Visual Design & Micro-animations**:
  - Cards feature hover elevation (`whileHover={{ y: -4, scale: 1.01 }}`), smooth shadow drop, and glow border indicators for status (Published, Draft, Completed).
  - Motion button effects for search, refresh, filter toggle, and "Create New Comic" floating action button.
- **Interaction**:
  - Tapping any comic card triggers `openComic(comic.id, "editor")`, instantly transitioning the admin to the Edit view with pre-loaded data.

---

### 2.3 Tab 2: Create & Edit Comic (`ComicEditorTab.tsx`)
- **Split Dashboard Layout**:
  - **Left Column: Metadata & Configuration Form**:
    - **Editable Slug Input**: Field `slug` is exposed to the user. On new comic creation, `slug` auto-populates from `title` via slugify helper, but remains fully editable by the user at all times.
    - Fields: Title, Slug, Author, Description, Status, Category Multi-select, and Cover Image Upload Dropzone.
    - Action Buttons: Animated submit, clear, and reset buttons with Framer Motion `whileTap` and `whileHover` spring transitions.
  - **Right Column: Integrated Chapters & Assets Summary**:
    - Embedded chapter list for the selected comic.
    - Quick metrics: Total chapter count, total page count, last update timestamp.
    - Quick action button to jump directly to chapter editing.

---

### 2.4 Tab 3: Edit Chapter Flow (`ComicChaptersTab.tsx`)
- **Phase 1: Comic Selection Grid**:
  - Displays all comics in catalog with cover thumbnails, title, author, and current chapter count.
  - Includes a search bar to quickly locate comics.

- **Phase 2: Target Action Choice Modal**:
  - Triggered upon clicking any comic item card.
  - Modal title: `"Quản lý chương - [Comic Title]"`.
  - Presents 2 prominent options:
    1. **Option "Edit" ("Danh sách chương")**:
       - Opens **Chapter List Modal** (scrollable).
       - Lists all chapters with chapter number, title, page count, and creation date.
       - Actions per chapter item:
         - **Edit Button**: Loads selected chapter data into chapter editing mode (pages reordering, page addition, CBZ archive import).
         - **Delete Button**: Triggers **Warning Confirmation Modal** (`"Cảnh báo: Bạn có chắc chắn muốn xóa chương này không? Hành động này không thể hoàn tác."`).
    2. **Option "Create" ("Tạo chương mới")**:
       - Opens **Chapter Creation View/Modal**.
       - Displays pinned target banner at top: `"Đang thêm chương mới cho: [Comic Title]"`.
       - Supports CBZ archive auto-extraction and batch image upload.

---

## 3. Data Integrity & Validation

- `slug` field validation: sanitized slug string format (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
- Confirmation dialogs prevent accidental deletion of chapters or assets.
- Auto-save integration for draft changes in metadata.
