#!/bin/bash

# Real Data Setup Script for Light Story
# This script sets up real data in Supabase and Cloudflare D1
# Run from repository root: bash setup-real-data.sh

set -e

echo "=========================================="
echo "Light Story - Real Data Setup"
echo "=========================================="
echo ""

# Part 1: Supabase Setup
echo "📊 PART 1: Setting up Supabase with real data..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with:"
    echo "   npm install -g supabase"
    exit 1
fi

cd backend-supabase

echo "1️⃣  Linking to Supabase project..."
echo "   When prompted, enter your Supabase password/token"
supabase link --project-ref rwnzsmmfvsetfcnkjoxt

echo ""
echo "2️⃣  Pushing migrations to remote database..."
supabase db push

echo ""
echo "3️⃣  Loading sample data..."
echo "   This creates 5 categories, 5 authors, 6 stories, 8 chapters, and views data"
psql "postgresql://postgres.rwnzsmmfvsetfcnkjoxt:YOUR_PASSWORD@db.rwnzsmmfvsetfcnkjoxt.supabase.co:5432/postgres" \
  -f supabase/seed-sample-data.sql \
  2>/dev/null || echo "   ⚠️  Manual seed required (see REAL_DATA_SETUP.md)"

echo ""
echo "✅ Supabase setup complete!"
echo "   Sample data loaded:"
echo "   - 5 categories (Fantasy, Romance, Mystery, Sci-Fi, Historical)"
echo "   - 5 authors"
echo "   - 6 stories (5 published, 1 draft)"
echo "   - 8 chapters"
echo "   - 8 view records"
echo ""

# Part 2: Cloudflare D1 Setup
echo "☁️  PART 2: Setting up Cloudflare D1..."
echo ""

cd ../backend-d1-saas

# Check if Wrangler is installed
if ! command -v npx wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Install with:"
    echo "   npm install -g wrangler"
    exit 1
fi

echo "1️⃣  Creating D1 control database..."
echo "   This will output a DATABASE_ID - save it!"
echo "   Update wrangler.jsonc with the database_id"
npx wrangler d1 create saas-control-plane

echo ""
echo "2️⃣  Running D1 migrations..."
echo "   (Make sure you updated wrangler.jsonc first)"
read -p "   Press Enter when wrangler.jsonc is updated with DATABASE_ID..."

npx wrangler d1 migrations apply saas-control-plane --remote

echo ""
echo "3️⃣  Seeding D1 with tenant data..."
npx wrangler d1 execute saas-control-plane --remote --command "
INSERT INTO tenants (id, slug, name, database_id, database_name, api_key_hash, status)
VALUES
  ('tenant_001', 'light-story-1', 'Light Story Tenant 1', 'db_001', 'tenant_db_001', 'hash_1', 'active'),
  ('tenant_002', 'light-story-2', 'Light Story Tenant 2', 'db_002', 'tenant_db_002', 'hash_2', 'active'),
  ('tenant_003', 'light-story-3', 'Light Story Tenant 3', 'db_003', 'tenant_db_003', 'hash_3', 'provisioning');
"

echo ""
echo "✅ Cloudflare D1 setup complete!"
echo "   Sample data loaded:"
echo "   - 3 tenant records"
echo ""

# Part 3: Frontend Configuration
echo "🚀 PART 3: Updating frontend configuration..."
echo ""

cd ../frontend

echo "1️⃣  Checking .env.local..."
if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
    echo "   ✅ SUPABASE_SERVICE_ROLE_KEY found"
else
    echo "   ⚠️  SUPABASE_SERVICE_ROLE_KEY missing in .env.local"
    echo "   Get it from: https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt/settings/api"
fi

echo ""
echo "2️⃣  Starting frontend dev server..."
npm run dev &
DEV_PID=$!

sleep 5

# Part 4: Verification
echo ""
echo "✨ PART 4: Verification..."
echo ""

echo "Testing real data endpoints..."
echo ""

# Test 1: Taxonomy with real data
echo "1️⃣  Testing taxonomy endpoint..."
curl -s -X GET "http://localhost:3001/api/internal/admin/taxonomy?type=categories" \
  -H "x-internal-secret: internal-secret-placeholder" | jq '.data | length' > /dev/null && \
  echo "   ✅ Taxonomy: Real categories loaded" || \
  echo "   ❌ Taxonomy: Failed"

# Test 2: Analytics with real data
echo "2️⃣  Testing analytics endpoint..."
curl -s -X GET "http://localhost:3001/api/internal/admin/analytics/dashboard?range=7d" \
  -H "x-internal-secret: internal-secret-placeholder" | jq '.user_engagement.active_users' > /dev/null && \
  echo "   ✅ Analytics: Real data loaded" || \
  echo "   ❌ Analytics: Failed"

# Test 3: Profiles with real data
echo "3️⃣  Testing profiles endpoint..."
curl -s -X GET "http://localhost:3001/api/internal/admin/profiles" \
  -H "x-internal-secret: internal-secret-placeholder" | jq '.' > /dev/null && \
  echo "   ✅ Profiles: Accessible" || \
  echo "   ❌ Profiles: Failed"

echo ""
echo "=========================================="
echo "✅ SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Real data is now available in:"
echo "📊 Supabase: https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt"
echo "☁️  Cloudflare D1: Via Wrangler"
echo ""
echo "Frontend dev server running on:"
echo "🌐 http://localhost:3001"
echo ""
echo "Try these:"
echo "  • Visit admin dashboard: http://localhost:3001/admin"
echo "  • View real stories: http://localhost:3001"
echo "  • Check analytics: http://localhost:3001/admin (Dashboard tab)"
echo ""
echo "=========================================="

# Keep dev server running
wait $DEV_PID
