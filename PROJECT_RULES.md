# BỘ QUY TẮC DỰ ÁN LIGHT-STORY (NEXT.JS APP ROUTER + SUPABASE + CLOUDFLARE R2)

CẤU TRÚC THƯ MỤC CHÍNH:
- app/               # Routing, layouts, pages, api routes
- component/ (components/) # UI components (dùng chung và chuyên biệt)
- context/           # React Context providers (client-side)
- hooks/             # Custom React hooks (chỉ client)
- lib/               # Logic dùng chung, actions, schemas, clients, utils, constants
- services/          # Business logic (backend services)
- types/             # TypeScript type definitions

I. QUY TẮC CHUNG (ÁP DỤNG TOÀN DỰ ÁN)
1. Tất cả file `page.tsx`, `layout.tsx` mặc định là Server Component. 
   Chỉ thêm `'use client'` khi cần state, effect, event, browser API.
2. Phân biệt rõ frontend (components/, context/, hooks/) và backend (app/api/, lib/actions/, services/, lib/supabase/server.ts, middleware.ts).
3. Frontend không được import trực tiếp server client, service role key, hoặc các module chỉ dành cho server.
4. Backend không import từ components/, hooks/, context/.
5. Dùng alias `@/` thay vì relative path dài.
6. Tất cả đường dẫn trong app phải được định nghĩa tập trung trong `lib/constants/routes.ts`, không hardcode URL trong code.
7. Sử dụng Zod schema từ `lib/schemas/` để validate mọi input từ client hoặc external API.
8. Xác thực và phân quyền phải có ở mọi Server Action và API route nhạy cảm. 
   Role được lấy từ `app_metadata.role` (ưu tiên) hoặc `profiles.role`.
9. Mọi thao tác thay đổi dữ liệu phải gọi `revalidateTag` (chỉ 1 tham số) hoặc `revalidatePath`.
10. Không export bất kỳ thứ gì không phải async function từ file có `'use server'`.

II. QUY TẮC THEO THƯ MỤC

1. app/
   - Chỉ chứa route, layout, page, loading, error, not-found, route handlers.
   - Route Groups: (public) không cần auth; (user) yêu cầu đăng nhập, URL bắt đầu `/user`; (admin) yêu cầu quyền admin, URL bắt đầu `/admin`.
   - Layout phải kiểm tra auth/role (song song với middleware) như một lớp phụ.
   - Mỗi route group nên có file error.tsx và loading.tsx.
   - API routes (app/api/) phải có xác thực và bảo vệ phù hợp (webhook phải kiểm tra chữ ký Supabase).
   - Không đặt logic nghiệp vụ trực tiếp trong page hoặc layout; gọi service hoặc action.
   - Sử dụng generateMetadata cho SEO.

2. components/ (component/)
   - Chứa các UI component tái sử dụng.
   - Phân nhóm: ui/ (primitives: Button, Input), comic/ (ComicCard, ChapterReader), admin/ (DataTable), layout/ (Header, Footer, Sidebar), user/ (BookmarkButton).
   - Mỗi nhóm phải có barrel export index.ts.
   - Các component nặng (ChapterReader, ImageUploader) phải được dynamic import với next/dynamic.
   - Client Components chỉ nhận dữ liệu qua props, không tự ý fetch dữ liệu nhạy cảm.
   - Hình ảnh dùng next/image nếu có thể; ảnh từ R2 có thể dùng <img> với lazy loading.

3. context/
   - Chứa các React Context Provider (theme, supabase browser client, react-query).
   - Tất cả file trong context/ đều là Client Components (`'use client'`).
   - Mỗi provider nên export hook riêng (useTheme, useSupabase) để truy cập context.
   - Provider được bọc trong root layout.

4. hooks/
   - Chỉ chứa custom React hooks chạy trên client.
   - Có thể sử dụng supabase browser client, không được dùng server client.
   - Tên file phản ánh mục đích: useUser, useChapterImages, useDebounce.
   - Không chứa JSX.

5. lib/
   - lib/actions/: CHỈ chứa Server Actions. Mỗi file bắt đầu bằng `'use server'`. 
     Chỉ export async function. Luôn validate input, kiểm tra quyền, trả về { ok, data/error }.
   - lib/schemas/: Zod schemas, KHÔNG có `'use server'`. Dùng cho cả client (form) và server (action).
   - lib/supabase/server.ts: tạo server client dùng cookies(), chỉ dùng trong Server Components, Server Actions, API routes.
   - lib/supabase/client.ts: tạo browser client, chỉ dùng trong Client Components, hooks, providers.
   - lib/r2/: các hàm upload, presigned URL, chỉ chạy trên server.
   - lib/constants/: cache tags, routes, enums... không chứa logic động.
   - lib/utils/: các hàm thuần tuý (cn, formatDate) có thể dùng cả client và server.

6. services/
   - Chứa business logic phía server (có thể gọi từ Server Actions hoặc Server Components).
   - Không import từ components/, hooks/, context/.
   - Sử dụng supabase server client (lib/supabase/server.ts).
   - Mỗi service nên tập trung vào một domain (comic.service.ts, chapter.service.ts).
   - Không throw lỗi trực tiếp; trả về kết quả hoặc throw lỗi có kiểm soát để action bắt.

7. types/
   - Định nghĩa các TypeScript interface, type, enum dùng chung toàn dự án.
   - Không chứa logic, chỉ khai báo kiểu.
   - Tổ chức theo domain: comic.types.ts, user.types.ts, api.types.ts.
   - Export các type cần thiết; tránh any nếu không thực sự cần.

III. CÁC ĐIỀU CẤM (KHÔNG BAO GIỜ ĐƯỢC LÀM)
- ❌ Import server client vào client component.
- ❌ Export schema hoặc object từ file 'use server'.
- ❌ Gọi database trực tiếp từ client (trừ supabase browser client với RLS đúng).
- ❌ Sử dụng fetch đến API route nội bộ từ client (dùng Server Action).
- ❌ Truyền class, Date, Map qua Server Action (chỉ truyền plain object).
- ❌ Đặt service key (SUPABASE_SERVICE_ROLE_KEY) vào NEXT_PUBLIC_.
- ❌ Thiếu kiểm tra quyền trong Server Action.
- ❌ Gọi revalidateTag với 2 tham số.
- ❌ Hardcode giá trị fallback cho biến môi trường.
- ❌ Cho phép localhost:* trong CSP production.
- ❌ Đặt component không phải layout vào thư mục components/layout/.

IV. KIỂM TRA ĐẶC BIỆT
- Middleware phải refresh session cho mọi request, áp dụng CSP tách biệt dev/prod.
- Tất cả bảng Supabase phải bật RLS với policy phù hợp.
- Webhook Supabase phải xác thực chữ ký.
- Ảnh từ R2 phải được bảo vệ (presigned URL nếu bucket private).
