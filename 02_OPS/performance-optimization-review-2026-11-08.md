# Báo Cáo Closed-Workflow: Rà Soát & Kế Hoạch Cập Nhật Tối Ưu Hiệu Năng (Performance Optimization)

**Dự án:** Light-Story Monorepo  
**Thời gian:** 2026-11-08  
**Phương pháp:** 12-Step Closed-Loop Task Engine (`/close-workflow`) kết hợp `agent-system` & `folder-agent`  

---

## 1. Nghiên Cứu Thông Tin (Research Information)

Qua khảo sát toàn bộ thư mục bằng `agent-system` và `folder-agent`:
- **`workers/kv-worker`**: Gateway Cloudflare Worker với 138 tests passed. Đã có L1 Memory micro-cache (`isolate-l1-cache.ts`), KV cache (`cache.ts`), Idempotency, Rate-limiting, R2 conditional request, Tiering fallback (Google Drive).
- **`backend-supabase`**: Migration `20261108000001_add_batch_story_views_and_maintenance.sql` đã tạo `mv_story_catalog_search` (GIN trigram, GIN tag_list, GIN search_tsv), `batch_increment_story_views(jsonb)`, `touch_updated_at` chống churn index, `get_index_health_report()`.
- **`packages/sdk`**: 153 tests passed. Giữ vững invariant 0-runtime-dependency.
- **`packages/ui`**: 12 tests passed. Ant Design v5 đóng gói an toàn cho `(admin)`.
- **`frontend`**: Next.js 16 (App Router), Server Actions phân quyền `requireActionRole`.

---

## 2. Phân Tích Nguyên Nhân Gốc Rễ (Thinking Why - RCA)

Đối chiếu báo cáo sơ bộ trước đó với codebase thực tế:

| Điểm rà soát | Thực trạng trong code | Đánh giá / RCA |
|---|---|---|
| **Query kép `GET /stories`** | `stories.ts` gọi `sbGet` rồi gọi thêm `sbGetCount` (HEAD request). | **Bottleneck thật**: Gây ra 2 lượt HTTP network roundtrip tới Supabase thay vì 1. PostgREST hỗ trợ header `Prefer: count=exact` trên GET để trả về cả items và `content-range` trong 1 request. |
| **Hot Counter phân mảnh** | - `POST /stories/:id/view` (ở `index.ts`) dùng KV counter nhưng lại chặn bằng `requireActionRole` (chỉ admin mới gọi được!).<br>- `POST /stories/views` (ở `routes/stories.ts`) mở cho độc giả nhưng lại gọi thẳng Supabase RPC trên mỗi lượt đọc! | **Bottleneck thật**: Độc giả đọc truyện làm nghẽn DB Supabase vì bypass KV cache. Route có KV thì bị khóa quyền nhầm. |
| **Materialized View chưa tận dụng** | Migration `20261108000001` đã tạo `mv_story_catalog_search`, nhưng `routes/stories.ts` vẫn query trực tiếp bảng `stories` với `ilike` scan! | **Lãng phí tài nguyên**: Index GIN trigram và tsvector đã dựng nhưng gateway chưa trỏ endpoint đọc vào đây. |
| **JSON Parse/Stringify kép ở Worker** | Tại `index.ts` (dòng 685-742), mọi response từ cache khi đi qua pipeline đều bị `res.text()` -> `JSON.parse` -> `JSON.stringify`. | **Tốn CPU Worker**: Khi cache hit, việc giải mã rồi mã hóa lại JSON gây tốn CPU V8 không đáng có. |
| **Cache Key & Stale-While-Revalidate** | Đã được triển khai tại `cache.ts` (`buildCacheKey` FNV-1a và `publicCacheControl`). | **Đã có sẵn**: Báo cáo trước khuyến nghị thêm là thừa, code hiện tại đã tối ưu tốt phần này. |
| **Đề xuất thêm Redis** | Đề xuất dùng `@upstash/redis`. | **Vi phạm Ponytail & YAGNI**: Worker KV + L1 memory cache (0.1ms) đã đáp ứng tốt. Nếu cần Redis chỉ nên gọi REST API native fetch để bảo toàn 0-dependency. |

---

## 3. Giải Pháp Kỹ Thuật (How Can Do That)

1. **Gộp truy vấn danh sách & phân trang làm 1**: Viết hàm `sbGetWithCount` gửi `Prefer: count=exact` trong `GET`, lấy data từ JSON body và `total` từ header `content-range`. Cắt giảm 50% số request gateway -> database.
2. **Hợp nhất View Counter vào KV Buffer**: Cho phép độc giả gọi ghi nhận lượt xem vào `incrementStoryView` (KV buffer), sau đó batch flush về Supabase bằng `batch_increment_story_views` (đã có sẵn trong DB).
3. **Khai thác `mv_story_catalog_search`**: Đối với các truy vấn đọc catalog/tìm kiếm thông thường (status published/ongoing/completed), trỏ nguồn query vào materialized view để tận dụng GIN trigram và tsvector.
4. **Bỏ qua JSON re-serialization khi response đã hoàn chỉnh**: Kiểm tra flag hoặc header để trả thẳng cached Response stream mà không parse lại JSON.
5. **Bổ sung Benchmark Script**: Tạo `scripts/perf/load-test.k6.js` và `scripts/perf/benchmark.mjs` (chuẩn Node.js native, không cần cài thêm thư viện ngoài).

---

## 4. Kế Hoạch Khắc Phục (How Can Fix That)

Xem chi tiết trong mục 8 (Build / Proposed Diffs).

---

## 5. Đánh Giá Tác Động (Blast Radius & Zero Path Changes)

- **Đường dẫn & API Contract**: Giữ nguyên 100% path `/api/v1/stories`, `/api/v1/stories/views`, `/api/stories/*`. Không breaking change cho frontend hay SDK.
- **Invariants**:
  - Không cài package mới vào `packages/sdk` (duy trì 0 runtime dependencies).
  - Không vi phạm scoping Ant Design (giữ nguyên trong admin).
  - Đảm bảo 100% test suites (138 + 153 + 12 = 303 tests) tiếp tục PASS.

---

## 6. Đặc Tả (Spec)

- **Spec 1 - Single Roundtrip Pagination**:
  - Endpoint: `GET /stories`
  - Headers gửi Supabase: `Prefer: count=exact`
  - Output: `{ items: T[], total: number }` trong 1 query duy nhất.
- **Spec 2 - Public View Counter Buffering**:
  - Endpoint: `POST /stories/views` & `POST /stories/:id/view`
  - Behaviour: Ghi vào KV key `view:<storyId>`, trả về 200/204 ngay lập tức (<10ms).
  - Sync trigger: Flush khi chạm ngưỡng 1000 lượt hoặc qua scheduled cron worker gọi `batch_increment_story_views`.
- **Spec 3 - Zero-overhead Cache Passthrough**:
  - Khi Response mang header `x-cached-json: true`, Worker bypass bước `JSON.parse` / `JSON.stringify` ở tầng filter cuối.

---

## 7. Kế Hoạch Triển Khai (Plan)

- **Bước 1**: Cập nhật `workers/kv-worker/src/utils/supabase-client.ts` thêm `sbGetWithCount`.
- **Bước 2**: Tối ưu `workers/kv-worker/src/routes/stories.ts` để sử dụng `sbGetWithCount` và kết nối với KV buffer cho `POST /stories/views`.
- **Bước 3**: Điều chỉnh quyền route `POST /stories/:id/view` trong `workers/kv-worker/src/index.ts` để độc giả vãng lai có thể tăng view qua KV.
- **Bước 4**: Thêm script tải trọng `scripts/perf/load-test.k6.js` và benchmark Node `scripts/perf/benchmark.mjs`.
- **Bước 5**: Chạy toàn bộ test suites và xác nhận không có regression.
