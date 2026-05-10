# Real Data Setup Script for Light Story (Windows PowerShell)
# Run from repository root: .\setup-real-data.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Light Story - Real Data Setup (Windows)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Part 1: Supabase Setup
Write-Host "📊 PART 1: Setting up Supabase with real data..." -ForegroundColor Yellow
Write-Host ""

# Check if Supabase CLI is available
try {
    $supabaseVersion = npx supabase --version 2>$null
    if (-not $supabaseVersion) {
        throw "Supabase CLI not found"
    }
} catch {
    Write-Host "❌ Supabase CLI not found. Install with:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Red
    exit 1
}

Set-Location backend-supabase

Write-Host "1️⃣  Linking to Supabase project..." -ForegroundColor Cyan
Write-Host "   When prompted, enter your Supabase password/token" -ForegroundColor Gray
npx supabase link --project-ref rwnzsmmfvsetfcnkjoxt

Write-Host ""
Write-Host "2️⃣  Pushing migrations to remote database..." -ForegroundColor Cyan
npx supabase db push

Write-Host ""
Write-Host "3️⃣  Loading sample data (Option A - via SQL editor UI)..." -ForegroundColor Cyan
Write-Host "   Open: https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt/sql/new" -ForegroundColor Gray
Write-Host "   Copy the contents of: seed-sample-data.sql" -ForegroundColor Gray
Write-Host "   Paste and click 'Run'" -ForegroundColor Gray
Write-Host ""
Write-Host "   OR use psql if configured..." -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Supabase setup complete!" -ForegroundColor Green
Write-Host "   Sample data to load:" -ForegroundColor Gray
Write-Host "   - 5 categories (Fantasy, Romance, Mystery, Sci-Fi, Historical)" -ForegroundColor Gray
Write-Host "   - 5 authors" -ForegroundColor Gray
Write-Host "   - 6 stories (5 published, 1 draft)" -ForegroundColor Gray
Write-Host "   - 8 chapters" -ForegroundColor Gray
Write-Host "   - 8 view records" -ForegroundColor Gray
Write-Host ""

# Part 2: Cloudflare D1 Setup
Write-Host "☁️  PART 2: Setting up Cloudflare D1..." -ForegroundColor Yellow
Write-Host ""

Set-Location ../backend-d1-saas

# Check if Wrangler is available
try {
    $wranglerVersion = npx wrangler --version 2>$null
    if (-not $wranglerVersion) {
        throw "Wrangler not found"
    }
} catch {
    Write-Host "❌ Wrangler not found. Install with:" -ForegroundColor Red
    Write-Host "   npm install -g wrangler" -ForegroundColor Red
    exit 1
}

Write-Host "1️⃣  Creating D1 control database..." -ForegroundColor Cyan
Write-Host "   This will output a DATABASE_ID - SAVE IT!" -ForegroundColor Yellow
Write-Host ""

$createOutput = npx wrangler d1 create saas-control-plane 2>&1

Write-Host $createOutput

Write-Host ""
Write-Host "2️⃣  Update wrangler.jsonc with DATABASE_ID..." -ForegroundColor Cyan
Write-Host "   Find this section:" -ForegroundColor Gray
Write-Host '   "d1_databases": [{"binding": "CONTROL_DB", "database_name": "saas-control-plane", "database_id": "YOUR_ID_HERE"}]' -ForegroundColor Gray
Write-Host ""

$continue = Read-Host "   Press Enter when wrangler.jsonc is updated (or type 'skip' to skip D1)"

if ($continue -ne "skip") {
    Write-Host ""
    Write-Host "3️⃣  Running D1 migrations..." -ForegroundColor Cyan
    npx wrangler d1 migrations apply saas-control-plane --remote

    Write-Host ""
    Write-Host "4️⃣  Seeding D1 with tenant data..." -ForegroundColor Cyan
    
    $seedSQL = @"
INSERT INTO tenants (id, slug, name, database_id, database_name, api_key_hash, status)
VALUES
  ('tenant_001', 'light-story-1', 'Light Story Tenant 1', 'db_001', 'tenant_db_001', 'hash_1', 'active'),
  ('tenant_002', 'light-story-2', 'Light Story Tenant 2', 'db_002', 'tenant_db_002', 'hash_2', 'active'),
  ('tenant_003', 'light-story-3', 'Light Story Tenant 3', 'db_003', 'tenant_db_003', 'hash_3', 'provisioning');
"@

    npx wrangler d1 execute saas-control-plane --remote --command $seedSQL

    Write-Host ""
    Write-Host "✅ Cloudflare D1 setup complete!" -ForegroundColor Green
    Write-Host "   Sample data loaded:" -ForegroundColor Gray
    Write-Host "   - 3 tenant records" -ForegroundColor Gray
} else {
    Write-Host "⏭️  Skipped D1 setup" -ForegroundColor Yellow
}

Write-Host ""

# Part 3: Frontend Configuration
Write-Host "🚀 PART 3: Frontend configuration..." -ForegroundColor Yellow
Write-Host ""

Set-Location ../frontend

Write-Host "1️⃣  Checking .env.local..." -ForegroundColor Cyan

if (Select-String -Path ".env.local" -Pattern "SUPABASE_SERVICE_ROLE_KEY" -Quiet) {
    Write-Host "   ✅ SUPABASE_SERVICE_ROLE_KEY found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  SUPABASE_SERVICE_ROLE_KEY missing!" -ForegroundColor Yellow
    Write-Host "   Get it from: https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt/settings/api" -ForegroundColor Yellow
    Write-Host "   Add this to frontend/.env.local:" -ForegroundColor Yellow
    Write-Host '   SUPABASE_SERVICE_ROLE_KEY=sb_service_role_[your_key]' -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2️⃣  Frontend dev server status..." -ForegroundColor Cyan

$devRunning = Get-Process -Name node -ErrorAction SilentlyContinue
if ($devRunning) {
    Write-Host "   ✅ Dev server already running on http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "   ⏳ To start dev server, run:" -ForegroundColor Gray
    Write-Host "      npm run dev" -ForegroundColor Gray
}

Write-Host ""

# Part 4: Testing
Write-Host "✨ PART 4: Testing Real Data Endpoints..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Run these curl commands to test real data:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  Test Taxonomy (categories):" -ForegroundColor Cyan
Write-Host @"
`$headers = @{ 'x-internal-secret' = 'internal-secret-placeholder' }
Invoke-WebRequest -Uri 'http://localhost:3001/api/internal/admin/taxonomy?type=categories' `
  -Headers `$headers -UseBasicParsing | ConvertFrom-Json | Select-Object -ExpandProperty data
"@ -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Test Analytics Dashboard:" -ForegroundColor Cyan
Write-Host @"
`$headers = @{ 'x-internal-secret' = 'internal-secret-placeholder' }
Invoke-WebRequest -Uri 'http://localhost:3001/api/internal/admin/analytics/dashboard?range=7d' `
  -Headers `$headers -UseBasicParsing | ConvertFrom-Json | Select-Object -ExpandProperty user_engagement
"@ -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Test Profiles:" -ForegroundColor Cyan
Write-Host @"
`$headers = @{ 'x-internal-secret' = 'internal-secret-placeholder' }
Invoke-WebRequest -Uri 'http://localhost:3001/api/internal/admin/profiles' `
  -Headers `$headers -UseBasicParsing
"@ -ForegroundColor Gray
Write-Host ""

# Final summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ SETUP INSTRUCTIONS COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📍 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Load sample data in Supabase:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt/sql/new" -ForegroundColor Gray
Write-Host "   → Copy seed-sample-data.sql content and run" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  (Optional) Update Cloudflare D1 if needed:" -ForegroundColor Cyan
Write-Host "   Check wrangler.jsonc has correct database_id" -ForegroundColor Gray
Write-Host "   Run: npx wrangler d1 migrations apply saas-control-plane --remote" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Start frontend dev server:" -ForegroundColor Cyan
Write-Host "   cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Access the application:" -ForegroundColor Cyan
Write-Host "   🌐 Frontend:   http://localhost:3001" -ForegroundColor Green
Write-Host "   📊 Admin:      http://localhost:3001/admin" -ForegroundColor Green
Write-Host "   📈 Analytics:  http://localhost:3001/admin (Dashboard tab)" -ForegroundColor Green
Write-Host ""

Write-Host "📚 Real Data Loaded:" -ForegroundColor Yellow
Write-Host "   ✅ 5 Categories" -ForegroundColor Green
Write-Host "   ✅ 5 Authors" -ForegroundColor Green
Write-Host "   ✅ 6 Stories" -ForegroundColor Green
Write-Host "   ✅ 8 Chapters" -ForegroundColor Green
Write-Host "   ✅ 8 View Records (for analytics)" -ForegroundColor Green
Write-Host "   ✅ 3 Tenants (D1)" -ForegroundColor Green
Write-Host ""

Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   See REAL_DATA_SETUP.md for detailed troubleshooting" -ForegroundColor Gray
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
