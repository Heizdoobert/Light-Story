# Báo Cáo Rà Soát & Chuẩn Hóa Debugging & Troubleshooting (2026-11-10)

## 1. Thông Tin Chung
- **Dự án**: Light-Story Monorepo
- **Thời gian**: 2026-11-10
- **Phạm vi**: 8 đầu mục debugging và troubleshooting toàn hệ thống (Frontend, Edge Worker, Supabase, SDK).

## 2. Kết Quả Rà Soát Theo 8 Đầu Mục
1. **Đọc log và trace lỗi ở đâu**:
   - Client: Console, Error Boundaries (`error.tsx`, `global-error.tsx`) với traceId 1-click copy.
   - Next.js Server: Stdout + `onRequestError` instrumentation hook chuyển tiếp tới structured logger.
   - Edge Worker: `wrangler tail` streaming JSON format `[Event:<name>]`.
   - Database / Admin: `public.system_logs` bảng có index + giao diện `/admin/system-logs`.
   - Trace correlation: `x-request-id` được truyền xuyên suốt SDK -> Worker -> Supabase -> Error Boundary UI.
2. **Reproduce bug như thế nào**:
   - Phân tầng 4 Tier: Tier 1 (Unit), Tier 2 (Boundary), Tier 3 (Presenters/UI), Tier 4 (E2E Playwright).
   - Local stack: `docker-compose.yml`, `supabase start`, `doctor.mjs`.
3. **Phân tích root cause**:
   - `scripts/doctor.mjs` chẩn đoán 18 chỉ số sức khỏe tự động.
   - Subagent War Room protocol qua skill `folder-group-debug` & `debugging-and-error-recovery`.
4. **Debug production system**:
   - `wrangler tail --env production`, Supabase Log Explorer & SQL Console, in-app `/admin/system-logs`, Sentry exception capture.
5. **Sử dụng monitoring tools**:
   - Cloudflare Analytics Engine ingestion qua `logEvent`.
   - Health probes (`/api/health`, SDK health client).
   - Sentry alerts.
6. **Khoanh vùng lỗi nhanh**:
   - Truy vết theo `requestId` qua các tầng.
   - Kiểm tra health qua `node scripts/doctor.mjs` trong ~30s.
7. **Viết log có cấu trúc**:
   - Chuẩn hóa schema `LogEntry` (level, message, service, metadata, error_stack, user_id, request_id, created_at).
   - Tự động làm sạch dữ liệu nhạy cảm bằng `redactMetadata` (mật khẩu, token, bí mật).
   - Next.js 16 `onRequestError` hook tập trung hóa bắt lỗi server.
   - Server Actions `act()` tự động log structured error.
8. **Test coverage cho phần debug**:
   - Frontend `logger.test.ts`: 12 tests (level switching, redactMetadata, circular references, Sentry fallback, Supabase persistence, logger dispatch).
   - Edge Worker `logger.test.ts`: 5 tests (`logEvent` JSON, circular ref safety, Analytics Engine).
   - Monorepo doctor: 18/18 checks passed 100%.

## 3. Các File Đã Nâng Cấp & Bổ Sung
- [`frontend/src/sdk/logger.ts`](file:///D:/Light-Story/frontend/src/sdk/logger.ts)
- [`frontend/instrumentation.ts`](file:///D:/Light-Story/frontend/instrumentation.ts)
- [`frontend/src/actions/result.ts`](file:///D:/Light-Story/frontend/src/actions/result.ts)
- [`frontend/src/__tests__/tier1/logger.test.ts`](file:///D:/Light-Story/frontend/src/__tests__/tier1/logger.test.ts)
- [`workers/kv-worker/src/__tests__/logger.test.ts`](file:///D:/Light-Story/workers/kv-worker/src/__tests__/logger.test.ts)
- [`docs/TROUBLESHOOTING.md`](file:///D:/Light-Story/docs/TROUBLESHOOTING.md)
