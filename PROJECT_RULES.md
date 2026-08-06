# QUY TẮC DỰ ÁN LIGHT-STORY (NEXT.JS APP ROUTER + SUPABASE + CLOUDFLARE R2)

Các quy tắc bắt buộc áp dụng khi kiểm tra, review code và phát triển dự án này:

## 1. CẤU TRÚC THƯ MỤC CHUẨN
- `app/(public)/*`: Route không cần đăng nhập, layout có header/footer chung.
- `app/(user)/*`: Yêu cầu đăng nhập, layout có sidebar/profile menu. URL bắt đầu bằng `/user` (ví dụ `/user/dashboard`).
- `app/(admin)/*`: Yêu cầu quyền admin, layout có sidebar quản trị. URL bắt đầu bằng `/admin`.
- `app/api/*`: Chỉ chứa route handlers (webhook, health...).
- `components/ui/*`: Các thành phần cơ bản (button, input...), có barrel export `index.ts`.
- `components/comic/`, `admin/`, `user/`, `layout/`: Các thành phần chuyên biệt.
- `lib/actions/*`: CHỈ chứa async function có `'use server'`, không export bất kỳ thứ gì khác.
- `lib/schemas/*`: Zod schemas (KHÔNG có `'use server'`), dùng chung cho client và server.
- `lib/supabase/server.ts`: Server client, dùng `cookies()`, chỉ dùng ở backend.
- `lib/supabase/client.ts`: Browser client, dùng `NEXT_PUBLIC_*`, chỉ dùng ở frontend.
- `lib/constants/*`: Hằng số dùng chung, đặc biệt `routes.ts` tập trung tất cả đường dẫn.
- `hooks/*`: Custom hooks, chỉ dùng trong Client Components.
- `providers/*`: React providers (theme, supabase, query), là Client Components.

## 2. SERVER ACTIONS ('use server')
- File actions phải bắt đầu bằng `'use server'`.
- CHỈ export async function.
- Luôn validate input bằng zod schema (import từ `lib/schemas/`).
- Luôn xác thực người dùng và kiểm tra quyền (auth + role) trước khi thực hiện logic.
- Trả về `{ ok: true, data }` hoặc `{ ok: false, error: string }`, không throw lỗi.
- Gọi `revalidateTag`/`revalidatePath` sau khi thay đổi dữ liệu, chỉ dùng 1 tham số cho `revalidateTag`.
- KHÔNG gọi Server Action từ Server Component (nếu cần thì tách service).
- KHÔNG export bất kỳ object, schema, hay hàm không async từ file `'use server'`.

## 3. CLIENT COMPONENTS vs SERVER COMPONENTS
- Mặc định là Server Component, chỉ thêm `'use client'` khi cần state, effect, event, browser API.
- Client Component chỉ nhận dữ liệu qua props từ Server Component.
- Form submit trong Client Component gọi Server Action (không fetch API nội bộ).
- KHÔNG import Server Component vào Client Component.

## 4. XÁC THỰC & PHÂN QUYỀN
- Middleware phải refresh session cho MỌI request (trừ static files).
- Middleware chặn route `/admin/*` nếu user không có role trong `ADMIN_ROLES`.
- Middleware chặn route `/user/*` nếu chưa đăng nhập.
- Role lấy từ `app_metadata.role` hoặc fallback `profiles.role` (nên đồng bộ vào `app_metadata` để tránh query DB trong middleware).
- Mọi Server Action liên quan đến quản lý đều phải kiểm tra quyền admin.
- Supabase RLS phải được bật trên tất cả các bảng.

## 5. BIẾN MÔI TRƯỜNG
- Biến public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (thống nhất tên `ANON_KEY`).
- Biến server: `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`... KHÔNG có `NEXT_PUBLIC_`.
- KHÔNG hardcode giá trị fallback trong code production; nếu thiếu thì throw lỗi.
- Kiểm tra biến môi trường tồn tại trước khi dùng.

## 6. BẢO MẬT
- `Content-Security-Policy` header phải được set trong middleware, tách biệt dev/prod (không `localhost:*` trong production).
- API webhook (Supabase) phải xác thực chữ ký.
- KHÔNG expose service role key ra client.
- KHÔNG để `'unsafe-eval'` trong CSP production trừ khi thực sự cần.
- Ảnh từ R2 phải qua presigned URL nếu bucket private, hoặc CORS cấu hình chặt chẽ nếu public.

## 7. HIỆU NĂNG & TỐI ƯU
- Dùng `next/image` cho ảnh bìa nếu có thể; với ảnh chapter từ R2 có thể dùng `<img>` lazy load.
- Dynamic import (`next/dynamic`) cho component nặng như `chapter-reader`, `image-uploader`.
- Fetch dữ liệu song song (`Promise.all`) để tránh waterfall.
- Luôn phân trang khi lấy danh sách.

## 8. XỬ LÝ LỖI
- Mỗi route group nên có `error.tsx` boundary.
- Server Action phải bọc lỗi và trả về `{ ok: false, error }`.
- Client hiển thị toast lỗi thân thiện, không dump raw error.

## 9. ĐẶT TÊN & TỔ CHỨC
- Tên file/thư mục: kebab-case (`chapter-reader.tsx`).
- Hàm/biến: camelCase.
- Route động: `[id]`, `[slug]`, `[...catchAll]`.
- Tập trung tất cả đường dẫn vào `lib/constants/routes.ts`, không hardcode URL trong code.
- Mỗi thư mục components nên có `index.ts` barrel export.

## 10. NHỮNG ĐIỀU CẤM (KHÔNG BAO GIỜ ĐƯỢC LÀM)
- KHÔNG import server client vào client component.
- KHÔNG export schema từ file `'use server'`.
- KHÔNG gọi database trực tiếp từ client (trừ browser client với RLS).
- KHÔNG dùng fetch đến API route nội bộ từ client (dùng Server Action).
- KHÔNG truyền class, Date, Map qua Server Action.
- KHÔNG lưu service key vào `NEXT_PUBLIC_*`.
- KHÔNG thiếu kiểm tra quyền trong Server Action.
- KHÔNG gọi `revalidateTag` với 2 tham số.
