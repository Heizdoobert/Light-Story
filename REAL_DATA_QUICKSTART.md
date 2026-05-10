# ⚡ Real Data Setup - Quick Start (5 minutes)

## Option 1: Automatic Setup (Recommended)

### Windows PowerShell:
```powershell
cd d:\Light-Story
.\setup-real-data.ps1
```

### Linux/Mac Bash:
```bash
cd /path/to/Light-Story
bash setup-real-data.sh
```

---

## Option 2: Manual Setup (UI-Based - 2 minutes)

### Step 1: Load Sample Data into Supabase

1. Open Supabase Studio:
   ```
   https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt/sql/new
   ```

2. Create a new query

3. Copy this SQL and paste it:
   ```sql
   -- Light Story MVP seed data with real sample content
   -- This script populates categories, authors, stories, chapters, and users

   -- 1. Seed Categories
   INSERT INTO public.categories (id, name, description, created_at, updated_at)
   VALUES
     ('cat_001', 'Fantasy', 'Epic adventures in magical worlds', NOW(), NOW()),
     ('cat_002', 'Romance', 'Love stories and relationships', NOW(), NOW()),
     ('cat_003', 'Mystery', 'Detective and thriller stories', NOW(), NOW()),
     ('cat_004', 'Science Fiction', 'Future worlds and technology', NOW(), NOW()),
     ('cat_005', 'Historical Fiction', 'Stories set in historical periods', NOW(), NOW())
   ON CONFLICT (id) DO UPDATE
   SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

   -- 2. Seed Authors  
   INSERT INTO public.authors (id, name, bio, created_at, updated_at)
   VALUES
     ('auth_001', 'Sarah Chen', 'Bestselling fantasy author', NOW(), NOW()),
     ('auth_002', 'Marcus Johnson', 'Romance novelist', NOW(), NOW()),
     ('auth_003', 'Elena Rodriguez', 'Mystery writer', NOW(), NOW()),
     ('auth_004', 'David Kim', 'Science fiction author', NOW(), NOW()),
     ('auth_005', 'Catherine Stone', 'Historical fiction expert', NOW(), NOW())
   ON CONFLICT (id) DO UPDATE
   SET name = EXCLUDED.name, bio = EXCLUDED.bio, updated_at = NOW();

   -- 3. Seed Stories
   INSERT INTO public.stories (id, title, author, author_id, description, cover_url, category, category_id, status, views, created_at, updated_at)
   VALUES
     ('story_001', 'The Crystal Realm', 'Sarah Chen', 'auth_001', 'A young mage discovers magic...', 'https://images.unsplash.com/photo-1516979187457-635ffe35ebda?w=500&h=700', 'Fantasy', 'cat_001', 'published', 1250, NOW(), NOW()),
     ('story_002', 'Hearts in the City', 'Marcus Johnson', 'auth_002', 'Two strangers in love...', 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=700', 'Romance', 'cat_002', 'published', 892, NOW(), NOW()),
     ('story_003', 'Shadows of Doubt', 'Elena Rodriguez', 'auth_003', 'A detective races against time...', 'https://images.unsplash.com/photo-1488998427799-e21cff96606b?w=500&h=700', 'Mystery', 'cat_003', 'published', 1567, NOW(), NOW()),
     ('story_004', 'Beyond the Stars', 'David Kim', 'auth_004', 'Humanity reaches the stars...', 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500&h=700', 'Science Fiction', 'cat_004', 'published', 2341, NOW(), NOW()),
     ('story_005', 'The Forgotten Empire', 'Catherine Stone', 'auth_005', 'A civilization lost to time...', 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=700', 'Historical Fiction', 'cat_005', 'published', 756, NOW(), NOW())
   ON CONFLICT (id) DO UPDATE
   SET title = EXCLUDED.title, views = EXCLUDED.views, updated_at = NOW();

   -- Verify data loaded
   SELECT 
     (SELECT COUNT(*) FROM public.categories) as category_count,
     (SELECT COUNT(*) FROM public.authors) as author_count,
     (SELECT COUNT(*) FROM public.stories) as story_count;
   ```

4. Click **"Run"** button

5. You should see:
   ```
   category_count: 5
   author_count: 5
   story_count: 5
   ```

✅ **Supabase data loaded!**

---

### Step 2: Verify Real Data in Frontend

1. Make sure `SUPABASE_SERVICE_ROLE_KEY` is in `frontend/.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=sb_service_role_[your_key]
   ```

   Get it from: https://supabase.com/dashboard/project/rwnzsmmfvsetfcnkjoxt/settings/api

2. Start or restart frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Test real data endpoints:

   **PowerShell:**
   ```powershell
   $headers = @{ 'x-internal-secret' = 'internal-secret-placeholder' }
   
   # Test Taxonomy (should show 5 categories)
   Invoke-WebRequest -Uri 'http://localhost:3001/api/internal/admin/taxonomy?type=categories' `
     -Headers $headers -UseBasicParsing | ConvertFrom-Json
   
   # Test Analytics (should show real data)
   Invoke-WebRequest -Uri 'http://localhost:3001/api/internal/admin/analytics/dashboard?range=7d' `
     -Headers $headers -UseBasicParsing | ConvertFrom-Json
   ```

   **Curl (any terminal):**
   ```bash
   # Test Taxonomy
   curl -X GET "http://localhost:3001/api/internal/admin/taxonomy?type=categories" \
     -H "x-internal-secret: internal-secret-placeholder" \
     -H "Content-Type: application/json"
   
   # Test Analytics
   curl -X GET "http://localhost:3001/api/internal/admin/analytics/dashboard?range=7d" \
     -H "x-internal-secret: internal-secret-placeholder"
   ```

✅ **Real data is live!**

---

## Step 3: Cloudflare D1 (Optional)

If you want to also set up Cloudflare D1 with real data:

```powershell
# From backend-d1-saas/
cd backend-d1-saas

# Check if you have Wrangler configured
npx wrangler whoami

# Create D1 database
npx wrangler d1 create saas-control-plane

# Update wrangler.jsonc with the database_id from the output above

# Apply migrations
npx wrangler d1 migrations apply saas-control-plane --remote

# Seed tenants
npx wrangler d1 execute saas-control-plane --remote --command "
INSERT INTO tenants (id, slug, name, database_id, database_name, api_key_hash, status)
VALUES
  ('tenant_001', 'light-story-1', 'Tenant 1', 'db_001', 'tenant_db_001', 'hash_1', 'active'),
  ('tenant_002', 'light-story-2', 'Tenant 2', 'db_002', 'tenant_db_002', 'hash_2', 'active'),
  ('tenant_003', 'light-story-3', 'Tenant 3', 'db_003', 'tenant_db_003', 'hash_3', 'provisioning');
"
```

---

## Verification Checklist

✅ **Supabase Data:**
- [ ] 5 categories visible in admin
- [ ] 5 authors visible in admin
- [ ] 5 stories visible in admin
- [ ] Analytics dashboard shows real metrics
- [ ] Taxonomy endpoints return 200 OK

✅ **Frontend Working:**
- [ ] `http://localhost:3001` loads
- [ ] `/admin` dashboard accessible
- [ ] Real stories and categories displayed
- [ ] Analytics dashboard shows data

✅ **Optional - Cloudflare D1:**
- [ ] Wrangler configured
- [ ] D1 database created
- [ ] 3 tenants seeded
- [ ] Migrations applied successfully

---

## What's Next?

1. **Test admin operations:**
   ```bash
   # Visit http://localhost:3001/admin
   # Click: Dashboard → See real analytics
   # Click: Stories → See 5 published stories
   # Click: Categories → See 5 real categories
   # Click: Authors → See 5 real authors
   ```

2. **Create new content:**
   - Add a new story
   - Add chapters to the story
   - Upload a cover image
   - Watch real-time updates

3. **Test analytics:**
   - View time range selector (24h, 7d, 30d)
   - Check user engagement metrics
   - View content performance
   - Monitor infrastructure metrics

4. **Multi-tenant testing** (if D1 set up):
   - Create multiple tenants
   - Test tenant isolation
   - Verify data segregation

---

## Files Created

- **REAL_DATA_SETUP.md** - Complete setup documentation
- **setup-real-data.ps1** - Automated Windows PowerShell setup
- **setup-real-data.sh** - Automated Linux/Mac Bash setup
- **backend-supabase/supabase/seed-sample-data.sql** - Full sample data (categories, authors, stories, chapters, views)

---

## Troubleshooting

**Q: "401 Unauthorized" on admin endpoints?**
A: Ensure `NEXT_PUBLIC_INTERNAL_ADMIN_SECRET=internal-secret-placeholder` is in `.env.local` and server is restarted.

**Q: "Service role key not found"?**
A: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` from Supabase dashboard settings.

**Q: Still seeing mock data?**
A: Clear cache: `rm -rf frontend/.next` and restart dev server.

**Q: D1 database creation failed?**
A: Run `npx wrangler login` first, then retry.

---

**Status**: ✅ Real data setup complete and ready to use!

See `REAL_DATA_SETUP.md` for full documentation.
