# Hướng Dẫn Setup Light Story Cho Developer Mới

## 1. Yêu Cầu

- Node.js >= 20
- npm
- Git
- Tài khoản Cloudflare (để deploy worker)
- Quyền truy cập Supabase project

## 2. Clone & Cài Dependencies

```bash
git clone <repo-url>
cd light-story
npm install
npm --prefix frontend install
```

## 3. Biến Môi Trường

### 3a. Frontend

Tạo `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=<hỏi leader>
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8787
```

### 3b. Gateway Worker

```bash
cp workers/unified-gateway/.dev.vars.example workers/unified-gateway/.dev.vars
```

Sửa `workers/unified-gateway/.dev.vars` với giá trị thật.

> `.dev.vars` chứa secret — không commit lên Git.

## 4. Chạy Local

Terminal 1 — Gateway Worker (port 8787):

```bash
npm run dev:gateway
```

Terminal 2 — Frontend (port 3001):

```bash
npm run dev
```

Mở `http://localhost:3001`.

## 5. Deploy Worker Lên Cloudflare

Worker cần 3 secrets để kết nối Supabase:

```bash
cd workers/unified-gateway

# Set secret cho worker trên Cloudflare
echo "<SUPABASE_URL>" | npx wrangler secret put SUPABASE_URL
echo "<SUPABASE_ANON_KEY>" | npx wrangler secret put SUPABASE_ANON_KEY
echo "<SUPABASE_JWKS_URL>" | npx wrangler secret put SUPABASE_JWKS_URL

# Deploy
npx wrangler deploy
```

> **`wrangler secret put` là gì?** — Upload biến môi trường lên Cloudflare dạng mã hóa. Worker đọc các biến này khi chạy production, tương tự `.dev.vars` cho local. Hiệu lực ngay, không cần redeploy.

## 6. Seed Dữ Liệu Mẫu

```bash
node scripts/seed-demo.mjs
```

Tạo: 10 categories, 7 authors, 8 stories, 13 chapters, 7 site settings.

## 7. Kiểm Tra

```bash
cd frontend
npx vitest run --config vitest.integration.config.ts
```

29 tests (8 Supabase + 21 Cloudflare) — tất cả phải pass.

## 8. Cấu Trúc Quan Trọng

```
workers/
  unified-gateway/    — API Gateway duy nhất (auth, route đến Supabase, xử lý stories/chapters/admin/analytics)
  r2-signed-url/      — Proxy R2 assets (repo riêng: cloudR2-woker)

frontend/src/
  services/           — API client → gateway
  infrastructure/     — Supabase client
  app/                — Next.js App Router pages
```

> **Lưu ý:** Các worker `stories-worker`, `comics-worker`, `admin-worker`, `analytics-worker` cũ đã được gộp vào `unified-gateway`.

## 9. Liên Hệ

Hỏi leader để được cấp:
- `SUPABASE_SERVICE_ROLE_KEY`
- R2 credentials
- `CLOUDFLARE_API_TOKEN`
