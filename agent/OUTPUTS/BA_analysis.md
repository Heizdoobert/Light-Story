# Business Analyst – BA_analysis

## Functional Requirements

- Create **comics** table (id, owner_id, title, description, cover_url, created_at, updated_at).
- Create **chapters** table (id, comic_id, chapter_number, title, content, created_at, updated_at).
- RLS: owners can insert/update/delete their own comics and chapters.
- Edge function `upload_to_r2` must upload cover and chapter images to Cloudflare R2 and return public URLs.
- Frontend **Create Comic** tab with cover upload (calls R2 then `create_comic` edge function).
- Frontend **Add Chapter** tab with multi‑image upload (uploads each image to R2, stores URLs in chapter record).

## Non‑Functional Requirements

- TypeScript throughout (backend edge functions and frontend).
- Clean architecture: repository layer, service layer, UI components.
- Images stored in R2 must be publicly accessible via HTTPS.
- All DB writes must respect Row‑Level Security.
- CI must run Supabase smoke tests and new unit tests.
