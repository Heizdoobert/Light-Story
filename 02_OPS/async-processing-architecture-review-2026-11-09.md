---
type: ops-review
project: Light-Story
subsystem: architecture-async-processing
tags: [architecture, async-processing, queue, pubsub, retry, dlq, idempotency, event-driven, microservices, decoupling]
created: 2026-11-09
status: completed
---

# Báo Cáo Khảo Sát & Đánh Giá Kiến Trúc Xử Lý Bất Đồng Bộ (Async Processing) - Light-Story

> **Engine:** Closed-Loop Task Engine (`/close-workflow`) kết hợp `agent-system` và `folder-agent`  
> **Thời điểm thực hiện:** 2026-11-09  
> **Phạm vi khảo sát:** `workers/kv-worker`, `frontend`, `backend-supabase`, `packages/sdk`, `scripts`

---

## 1. TỔNG QUAN HIỆN TRẠNG KIẾN TRÚC BẤT ĐỒNG BỘ

Hệ thống Light-Story hiện tại đang ở trạng thái **Hybrid Transition**:
- **Tầng Client/Edge Gateway**: Đã có nền tảng cấu hình cho Cloudflare Queues (`LIGHTSTORY_QUEUE`), Workflows (`LIGHTSTORY_WORKFLOW`), Scheduled Cron (`0 2 * * *`), và Idempotency Middleware (`Idempotency-Key`).
- **Tầng Ứng dụng & Database**: Vẫn chịu ảnh hưởng lớn từ kiến trúc Monolith ban đầu (Next.js gọi Supabase PostgREST/Postgres trực tiếp hoặc qua RPC), đại đa số các tác vụ ghi (mutations) chạy **đồng bộ (blocking HTTP request/response)**.
- Các tác vụ phi tập trung chạy ngầm chủ yếu dựa vào `ctx.waitUntil()` trên Cloudflare Worker (vốn có vòng đời gắn chặt với request của client và không có tính bền bỉ - non-durable).

---

## 2. ĐÁNH GIÁ CHI TIẾT THEO 7 TRỤ CỘT BẤT ĐỒNG BỘ

### 2.1. Xử Lý Bất Đồng Bộ Bằng Queue (Message Queues)

#### Hiện trạng trong mã nguồn:
1. **Cloudflare Queues (`LIGHTSTORY_QUEUE`)**:
   - Trong [`workers/kv-worker/wrangler.jsonc`](file:///D:/Light-Story/workers/kv-worker/wrangler.jsonc#L32-L38):
     ```jsonc
     "queues": {
       "producers": [
         {
           "binding": "LIGHTSTORY_QUEUE",
           "queue": "lightstory-queue"
         }
       ]
     }
     ```
   - Trong [`workers/kv-worker/src/index.ts`](file:///D:/Light-Story/workers/kv-worker/src/index.ts#L752-L777): Đã định nghĩa consumer handler:
     ```typescript
     async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
       for (const message of batch.messages) {
         try {
           const payload = message.body;
           if (payload?.type === 'CACHE_INVALIDATION' && payload?.key && env.APP_KV) {
             await env.APP_KV.delete(payload.key);
           } else if (payload?.type === 'ANALYTICS_EVENT') { ... }
           message.ack();
         } catch (err) {
           message.retry();
         }
       }
     }
     ```
   - **LỖ HỔNG LỚN**: `wrangler.jsonc` **chỉ khai báo producer**, hoàn toàn **THIẾU khai báo consumer** (`"consumers": [{ "queue": "lightstory-queue" }]`). Do đó, trên Cloudflare runtime, Worker này **không bao giờ nhận được tin nhắn từ queue**!
   - Ngoài ra, trong toàn bộ mã nguồn không hề có bất kỳ câu lệnh `env.LIGHTSTORY_QUEUE.send(...)` nào. Queue hiện tại là **stub hoàn toàn chưa được kích hoạt**.
   - Tại [`wrangler.dev.jsonc`](file:///D:/Light-Story/workers/kv-worker/wrangler.dev.jsonc#L1-L5), queue producer binding bị loại bỏ có chủ đích vì `wrangler dev --remote` (wrangler 4.x) gây lỗi 503 nếu bind Queue.

2. **Database Queue (`moderation_queue`)**:
   - Khởi tạo tại [`backend-supabase/supabase/migrations/202604200001_mvp_init.sql`](file:///D:/Light-Story/backend-supabase/supabase/migrations/202604200001_mvp_init.sql#L948):
     Bảng `moderation_queue` với status `check (status in ('queued', 'running', 'succeeded', 'failed'))`.
   - **Thực tế**: Không có worker/cron nào quét (`SELECT ... FOR UPDATE SKIP LOCKED`) để tiêu thụ hàng đợi này. Bảng này hiện là "bảng mồ côi", chỉ được đếm row trong telemetry `get_table_counts.sql`.

3. **Client-side In-memory Queue**:
   - [`frontend/src/hooks/features/use-cbz-batch-import.ts`](file:///D:/Light-Story/frontend/src/hooks/features/use-cbz-batch-import.ts#L36-L70): Triển khai queue hàng đợi upload client-side bằng React State (`queued` -> `extracting` -> `uploading` -> `completed`/`error`), kiểm soát Concurrency Pooling (tối đa 6 files song song).
   - [`frontend/src/hooks/features/use-admin-chapters.ts`](file:///D:/Light-Story/frontend/src/hooks/features/use-admin-chapters.ts#L48): Dùng Promise Chain in-memory (`bulkQueue = useRef<Promise<void>>(Promise.resolve())`) để tuần tự hóa các lệnh cập nhật chapter hàng loạt, tránh conflict race condition trên trình duyệt.

---

### 2.2. Mô Hình Pub/Sub (Publish/Subscribe)

#### Hiện trạng:
1. **Supabase Realtime (WebSockets/Postgres CDC)**:
   - Trong `backend-supabase/supabase/migrations/`, **không có bảng nào** được add vào `supabase_realtime` publication (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`).
   - Phía Frontend (`frontend/src`), không hề import hay sử dụng `supabase.channel(...)` hay WebSocket.
   - Thay vào đó, hệ thống đang dùng **HTTP Polling** hoặc **Server Actions Tag Revalidation**:
     - `AdRenderer.tsx`: Dùng React Query polling `refetchInterval: 30_000` (30 giây/lần).
     - `notification-bell.tsx`: Dùng `setInterval` để fetch số lượng thông báo.
     - Server Actions: Dùng `revalidateTag(TAG, 'max')` để xóa cache tĩnh của Next.js App Router sau khi mutate.
2. **Workers KV Hot Counter Pub/Sub**:
   - Lượt xem truyện (`POST /stories/views`) không publish event pub/sub mà ghi vào bộ đệm KV `view:<story_id>` (tăng số đếm cục bộ).
   - Cron Trigger chạy hàng ngày lúc 02:00 UTC (`0 2 * * *`) qua [`scripts/redis_sync.ts`](file:///D:/Light-Story/scripts/redis_sync.ts#L7-L46) thực hiện quét `APP_KV.list({ prefix: 'view:' })` và đồng bộ số liệu gộp về Supabase Postgres (`increment_story_views`).
   - Nếu số đếm chạm ngưỡng `1000`, worker tự động flush inline ngay lập tức.

---

### 2.3. Cơ Chế Thử Lại (Retry Mechanism)

#### Hiện trạng:
1. **Tại `@light-story/sdk` ([`packages/sdk/src/retry.ts`](file:///D:/Light-Story/packages/sdk/src/retry.ts)) - RẤT TỐT (Chuẩn RFC 9110)**:
   - Hỗ trợ retry tự động tối đa 3 lần (`DEFAULT_MAX_RETRIES = 3`).
   - Chỉ retry trên **Idempotent Safe Methods**: `GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`. Các mutation không an toàn (`POST`, `PATCH`) **bắt buộc** phải có cờ opt-in tường minh `{ retry: true }`.
   - Bắt các mã lỗi mạng hoặc HTTP: `429`, `502`, `503`, `504`.
   - **Tôn trọng header `Retry-After`**: Hỗ trợ cả định dạng giây (`Retry-After: 5`) và HTTP Date.
   - Thuật toán **Exponential Backoff kết hợp Full Jitter** (`base * 2^attempt * (0.5 + random * 0.5)`), trần tối đa 5000ms.
   - Tích hợp an toàn với `AbortSignal` (`sleepWithSignal`).

2. **Tại Frontend Server Actions ([`frontend/src/actions/http.ts`](file:///D:/Light-Story/frontend/src/actions/http.ts)) - ĐIỂM NGHẼN**:
   - Hàm `fetchApi(path, init)` trong Server Actions đang dùng **Fetch API nguyên bản**, không thông qua `@light-story/sdk`.
   - **Hệ quả**: Bất kỳ sự cố chập chờn mạng (transient network glitch) hoặc lỗi 502/503/504 nào từ Gateway đều làm Server Action thất bại ngay lập tức mà không hề có retry hay backoff.

3. **Tại Cloudflare Queues (`workers/kv-worker/src/index.ts`)**:
   - Khi consumer gặp lỗi trong khối `try/catch`, gọi `message.retry()` để Cloudflare requeue tin nhắn.

---

### 2.4. Dead Letter Queue (DLQ)

#### Hiện trạng:
- **HOÀN TOÀN CHƯA CẤU HÌNH**:
  - Cloudflare Queues hỗ trợ `dead_letter_queue` và `max_retries` trong `wrangler.jsonc`, ví dụ:
    ```jsonc
    "consumers": [
      {
        "queue": "lightstory-queue",
        "max_batch_size": 10,
        "max_batch_timeout": 5,
        "max_retries": 5,
        "dead_letter_queue": "lightstory-dlq"
      }
    ]
    ```
  - Hiện tại, cả `dead_letter_queue` và queue consumer đều chưa tồn tại trong config.
  - **Rủi ro**: Nếu phát sinh "tin nhắn độc" (poison pill message - payload lỗi format hoặc crash logic), consumer sẽ gọi `message.retry()` vô hạn hoặc cho tới khi hết message retention period (tối đa 4 ngày), gây nghẽn hàng đợi và tốn quota Workers invocations vô ích.

---

### 2.5. Tính Bất Biến / Chống Trùng Lặp (Idempotency)

#### Hiện trạng:
1. **API Gateway Middleware ([`workers/kv-worker/src/middleware/idempotency.ts`](file:///D:/Light-Story/workers/kv-worker/src/middleware/idempotency.ts))**:
   - Hỗ trợ header `Idempotency-Key` hoặc `X-Idempotency-Key` trên các HTTP mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Key lưu trữ trong KV: `idempotency:${userId || 'anon'}:${idemKey.trim()}` với TTL 24 giờ (`expirationTtl: 86400`).
   - Khi hit cache, trả về nguyên trạng `Response` trước đó kèm header `X-Cache-Lookup: HIT-IDEMPOTENT`.
   - Quá trình lưu cache được thực hiện qua `ctx.waitUntil(saveIdempotency(...))`.
   - **LỖ HỔNG CONCURRENCY / RACE CONDITION**:
     - Middleware kiểm tra `kv.get()`. Nếu chưa có, request được chuyển tiếp tới Supabase để thực thi.
     - Nếu có 2 requests gửi đồng thời (trong khoảng vài ms) với cùng `Idempotency-Key`, cả hai đều đọc được `null` từ KV và **cùng thực thi đồng thời vào Database**!
     - Hiện **thiếu cơ chế In-Flight Lock** (chưa ghi trạng thái `PENDING` vào KV trước khi chuyển tiếp request).

2. **Tầng Database Postgres**:
   - Đã có rất nhiều ràng buộc duy nhất (Unique Constraints) bảo vệ chống trùng lặp dữ liệu:
     - `chapters(story_id, chapter_number)` UNIQUE.
     - `story_views(story_id, viewed_by, date_trunc('hour', viewed_at))` UNIQUE INDEX.
     - `bookmarks(user_id, comic_id)` UNIQUE.
     - `reading_history(user_id, comic_id)` UNIQUE.
     - `drive_cbz_index(comic_slug, chapter_number)` UNIQUE.
   - Các mutation quan trọng đều dùng `ON CONFLICT (id) DO UPDATE` hoặc `ON CONFLICT DO NOTHING` để đạt tính idempotent.

3. **Tầng Frontend**:
   - `fetchApi` trong Server Actions **chưa tự động sinh hoặc truyền header `Idempotency-Key`**.
   - Việc chống double-submit phụ thuộc hoàn toàn vào UI trạng thái `isPending` của `useTransition` / React Actions.

---

### 2.6. Kiến Trúc Hướng Sự Kiện (Event-Driven Architecture)

#### Hiện trạng:
1. **Mức độ áp dụng**:
   - Hệ thống hiện tại phần lớn là **Request/Response Synchronous RPC**, chưa phải là Event-Driven Architecture toàn diện.
2. **Cloudflare Workflows (`LIGHTSTORY_WORKFLOW`)**:
   - Khai báo tại `wrangler.jsonc` và export class `LightStoryWorkflow extends WorkflowEntrypoint` tại [`workers/kv-worker/src/index.ts:790`](file:///D:/Light-Story/workers/kv-worker/src/index.ts#L790).
   - Tuy nhiên, đây mới chỉ là **Stub boilerplate** (`step.do('execute-pipeline-step', ...)`). Không có route nào gọi `env.LIGHTSTORY_WORKFLOW.create(...)`.
3. **Telemetry qua Cloudflare Analytics Engine**:
   - Đã áp dụng mô hình fire-and-forget hướng sự kiện tốt: Mọi request đều gọi `recordAnalyticsEngineEvent(env, {...})` (đẩy dữ liệu vào dataset `lightstory_analytics` không gây nghẽn luồng chính).
4. **Hạn chế của `ctx.waitUntil()`**:
   - Gateway dùng `ctx.waitUntil()` ở 3 vị trí: Lưu Idempotency, Lưu Edge Cache, và Xúc tiến ảnh từ Google Drive fallback về R2 (`handleTieringFallback`).
   - `ctx.waitUntil()` không có tính bền bỉ: nếu Worker instance bị kill giữa chừng, tác vụ ngầm sẽ bị hủy và mất dữ liệu.

---

### 2.7. Tách Service & Giảm Coupling (Service Decoupling)

#### Đánh giá độ phân rã kiến trúc hiện tại:

```mermaid
flowchart TD
    Client["Browser / Mobile Client"]
    NextServer["Frontend Server Actions (Next.js 16)"]
    CFWorker["Cloudflare Worker Gateway (kv-worker)"]
    SupaDB[("Supabase PostgreSQL")]
    SupaAuth["Supabase GoTrue Auth"]
    R2Bucket[("Cloudflare R2 (Hot/Warm Cache)")]
    GDrive[("Google Drive (Cold Archive)")]

    Client -->|Public Reads & Direct Navigation| NextServer
    Client -->|Media & Static Assets| CFWorker
    NextServer -->|fetchApi - API calls| CFWorker
    NextServer -.->|Direct DB Query: getServerSupabase() - TIGHT COUPLING| SupaDB
    CFWorker -->|PostgREST RPC / REST| SupaDB
    CFWorker -->|JWT Validation / JWKS| SupaAuth
    CFWorker -->|Fast Hot Reads| R2Bucket
    CFWorker -->|On-demand Fallback Proxy| GDrive
```

#### Những điểm đã tách tốt (Loose Coupling):
1. **Tách biệt Storage Hot/Cold qua Gateway**: Client và Frontend không cần biết ảnh nằm ở R2 hay Google Drive. Worker Gateway tự động proxy, giải mã XOR header trên luồng (`ReadableStream.tee()`), và xúc tiến lưu trữ tự động.
2. **Phân quyền Gateway RBAC & JWT Validation**: Worker Gateway xác thực chữ ký JWT thông qua Supabase JWKS cục bộ, không gọi HTTP xác thực tới Supabase Auth trên mỗi request.
3. **Thư viện chuẩn hóa `@light-story/sdk`**: Không phụ thuộc runtime (`dependencies: {}`), tách rời logic giao tiếp mạng ra khỏi UI.

#### Những điểm coupling nặng cần tháo gỡ (Architectural Debt):
1. **Kiến trúc "Hai Đầu Nậu" Database (Double Gateway/Bypass)**:
   - Các Server Actions tại `frontend/src/actions/*.actions.ts` gọi qua Worker Gateway bằng `fetchApi`.
   - Nhưng các Server Actions tại `frontend/src/lib/actions/*.actions.ts` (`comic.actions.ts`, `chapter.actions.ts`, `settings.actions.ts`) lại import `getServerSupabase()` và kết nối thẳng vào PostgreSQL!
   - **Hệ quả**: Bỏ qua toàn bộ rate limiting, edge caching, audit logging, và idempotency middleware mà Worker Gateway đã dầy công xây dựng.
2. **Thiếu cơ chế Outbox Pattern**:
   - Khi admin tạo truyện hoặc đăng chapter, database update thành công nhưng cache KV hoặc tìm kiếm không được cập nhật qua event bus mà phải đợi manual invalidation hoặc cron scan.

---

## 3. KẾ HOẠCH NÂNG CẤP & ĐỀ XUẤT GIẢI PHÁP (ACTIONABLE ROADMAP)

Theo triết lý **Ponytail Protocol** (ưu tiên giải pháp ngắn gọn, tận dụng triệt để nền tảng có sẵn của Cloudflare và Postgres mà không phát sinh thêm dịch vụ ngoài như Kafka/RabbitMQ):

### Giai Đoạn 1: Vá Lỗ Hổng Cơ Bản Của Worker Queues & Idempotency (Ngắn hạn - 1-2 ngày)
1. **Kích hoạt Consumer & DLQ trong `wrangler.jsonc`**:
   Bổ sung cấu hình `consumers` và tạo hàng đợi `lightstory-dlq` để bắt tin nhắn lỗi sau 3 lần retry:
   ```jsonc
   "queues": {
     "producers": [{ "binding": "LIGHTSTORY_QUEUE", "queue": "lightstory-queue" }],
     "consumers": [
       {
         "queue": "lightstory-queue",
         "max_batch_size": 10,
         "max_batch_timeout": 5,
         "max_retries": 3,
         "dead_letter_queue": "lightstory-dlq"
       }
     ]
   }
   ```
2. **Khắc phục Race Condition trong Idempotency Middleware**:
   Trước khi chuyển tiếp request vào Supabase, ghi cờ `status: "PENDING"` vào KV với TTL 30s. Nếu request thứ hai đến trùng key trong lúc request đầu đang chạy, trả về `409 Conflict` (`"Request with this Idempotency-Key is currently in progress"`).
3. **Bọc `fetchApi` trong Server Actions bằng Client SDK**:
   Chuyển đổi `fetchApi` sang sử dụng `@light-story/sdk` để hưởng trọn vẹn cơ chế tự động retry (RFC 9110), exponential backoff, và tự động truyền `Idempotency-Key` cho các thao tác ghi.

### Giai Đoạn 2: Thống Nhất Cổng Giao Tiếp & Tháo Gỡ Coupling (Trung hạn - 1 tuần)
1. **Xóa bỏ kênh gọi trực tiếp `getServerSupabase()` trong Server Actions**:
   Chuyển toàn bộ các file tại `frontend/src/lib/actions/` sang gọi qua Worker Gateway API (`/api/admin/...`), thống nhất 100% mutation đi qua một cửa kiểm soát duy nhất.
2. **Kích hoạt Supabase Realtime cho tác vụ tốn thời gian**:
   Bật Realtime cho bảng `chapters` hoặc `moderation_queue` để Client nhận thông báo đẩy khi quá trình xử lý ảnh/nhập truyện hoàn tất, thay thế hoàn toàn HTTP polling `refetchInterval`.

### Giai Đoạn 3: Vận Hành Cloudflare Workflows Cho Comic Pipeline (Dài hạn)
1. **Hiện thực hóa `LightStoryWorkflow`**:
   Chuyển tác vụ phân giải file nén CBZ nặng từ client-side sang Cloudflare Workflows:
   - *Step 1*: Tải CBZ về Worker memory/R2 scratch.
   - *Step 2*: Giải nén và tối ưu hóa WebP.
   - *Step 3*: Lưu ảnh vào R2 Bucket.
   - *Step 4*: Cập nhật metadata vào Supabase và bắn event `CACHE_INVALIDATION` vào `LIGHTSTORY_QUEUE`.

---

## 4. TỔNG KẾT BẢNG SO SÁNH TRẠNG THÁI

| Hạng Mục | Hiện Trạng Codebase | Đánh Giá Rủi Ro | Giải Pháp Khuyến Nghị |
| :--- | :--- | :--- | :--- |
| **Queue** | Đã có producer `LIGHTSTORY_QUEUE` và `queue()` handler, nhưng **thiếu consumer binding** trong wrangler.jsonc; `moderation_queue` trong DB bị bỏ hoang. | ⚠️ Trung bình (Tính năng ngầm chưa chạy) | Bổ sung `consumers` vào `wrangler.jsonc`, kết nối lệnh `env.LIGHTSTORY_QUEUE.send(...)` khi mutate dữ liệu. |
| **Pub/Sub** | Chưa dùng Realtime/WebSocket; Frontend polling HTTP 30s. | ⚠️ Thấp - Trung bình (Tăng tải DB không cần thiết) | Bật `supabase_realtime` cho các trạng thái cần cập nhật tức thời. |
| **Retry** | SDK đã có chuẩn RFC 9110 retry + jitter + Retry-After rất tốt; nhưng `fetchApi` ở Server Actions lại dùng `fetch` raw không retry. | ⚠️ Trung bình (Dễ hỏng request khi chập chờn mạng) | Refactor `fetchApi` dùng `@light-story/sdk`. |
| **Dead Letter Queue** | Chưa cấu hình DLQ trong `wrangler.jsonc`. | 🔴 Cao (Nguy cơ nghẽn hàng đợi khi gặp poison pill message) | Khai báo `dead_letter_queue: "lightstory-dlq"` và `max_retries: 3`. |
| **Idempotency** | Đã có middleware `Idempotency-Key` với KV; DB có nhiều unique constraints. Tuy nhiên thiếu in-flight lock trong KV. | 🔴 Cao (Race condition ghi đúp nếu gửi 2 request cùng lúc) | Thêm khóa tạm `status: PENDING` trong KV. |
| **Event-Driven** | Chủ yếu là synchronous RPC; `LightStoryWorkflow` mới chỉ là stub. | ⚠️ Trung bình (Khó xử lý các job nặng > 30s) | Kích hoạt Workflows cho pipeline nhập truyện CBZ lớn. |
| **Tách Service** | Phân tầng R2/GDrive rất tốt; nhưng Server Actions đang bị xé lẻ giữa gọi Gateway và gọi thẳng Postgres. | 🔴 Cao (Bypass bảo mật, mất tính nhất quán kiến trúc) | Thống nhất mọi Server Actions gọi qua Gateway. |
