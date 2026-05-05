# Project Manager – PM_plan

## Task List

| ID | Description | Priority | Est. Hours | Dependencies |
| --- | ----------- | -------- | ---------- | ------------ |
| T1 | Add migration for `comics` and `chapters` tables (including RLS policies) | High | 2 | – |
| T2 | Update `upload_to_r2` edge function to validate auth token for comic images | Medium | 1 | T1 |
| T3 | Implement `create_comic` edge function to accept `cover_url` and store in Supabase | High | 2 | T1, T2 |
| T4 | Implement `add_chapter` edge function that receives an array of image URLs and stores them in a new `chapter_images` table (or JSONB column) | High | 3 | T1, T2 |
| T5 | Frontend UI – **Create Comic** tab with cover upload flow (R2 upload → `create_comic`) | High | 3 | T2, T3 |
| T6 | Frontend UI – **Add Chapter** tab with multi‑image upload (R2 → `add_chapter`) | High | 4 | T2, T4, T5 |
| T7 | Write unit tests for new migrations, edge functions, and UI components | Medium | 3 | T1‑T6 |
| T8 | Update CI pipeline to run Supabase smoke tests and new unit tests | Low | 1 | T7 |

## Roadmap (phases)

1. **Database & Security** – T1, T2
2. **Backend Edge Functions** – T3, T4
3. **Frontend UI** – T5, T6
4. **Testing & CI** – T7, T8

## Risk Assessment

- RLS misconfiguration could block legitimate owners – mitigate by writing explicit tests (T7).
- R2 upload latency – use async parallel uploads in the UI.
- Schema changes may affect existing story modules – ensure migrations are additive and run in a maintenance window.
