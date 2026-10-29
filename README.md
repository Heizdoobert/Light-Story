# Light-Story

## Development Checklist

> This README is intended for developers to quickly verify that the repository is set up correctly and that the core CI steps run without errors.

### 1️⃣ Install dependencies (run from the repository root)
```bash
npm install
```

### 2️⃣ Verify the code base
- **Lint**
```bash
npm run lint
```
- **Type‑check**
```bash
npm run typecheck
```
- **Run tests** (all packages)
```bash
npm --prefix packages/sdk test
npm --prefix packages/ui test
npm --prefix frontend run test:run
```

### 3️⃣ Build the frontend
```bash
npm run build
```

### 4️⃣ Local development server
```bash
npm run dev   # runs the Next.js dev server (App Router)
```
*(If `npm run dev` is not defined, use `npm run start` or `next dev` manually.)*

### 5️⃣ CI / CD sanity check
- List recent production workflow runs:
```bash
gh run list --workflow production.yml --branch main
```
- Manually trigger a run (optional):
```bash
gh workflow run production.yml
```

### 6️⃣ Environment variables (required for Local dev & CI)
Create a `.env.local` (or export) with the following keys:
```
NEXT_PUBLIC_SITE_URL=https://lightstory.app
NEXT_PUBLIC_GATEWAY_URL_PRODUCTION=https://kv-worker.hhhuygiau.workers.dev
CLOUDFLARE_API_TOKEN=<your-token>   # required for the Deploy job
SUPABASE_ACCESS_TOKEN=<optional-token>
```

### 7️⃣ Quick sanity test
After a successful build, hit the API endpoint to confirm the worker is reachable:
```bash
curl -sf "https://kv-worker.hhhuygiau.workers.dev/api/stories?page=1&pageSize=5" && echo "✅ API reachable"
```

---
*All commands are meant to be run from the repository root. Adjust paths if you are inside a sub‑package.*
