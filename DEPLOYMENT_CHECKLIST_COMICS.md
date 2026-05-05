# Comic Management Module - Deployment Checklist

**Status**: Ready for staging/production deployment (May 5, 2026)

## ✅ Completed Tasks

### Backend (Supabase)
- [x] Database migrations applied to cloud Supabase
  - `comics`, `chapters`, `chapter_images` tables created
  - RLS policies enforcing owner-only CRUD
- [x] Edge functions deployed
  - `create_comic` — validates JWT, inserts comic with owner_id
  - `upload_to_r2` — handles multi-file R2 uploads using native Deno fetch API
- [x] Service role key configured for edge functions

### Frontend
- [x] TypeScript build passes (no errors/warnings)
- [x] All 45 frontend tests passing (adPolicy suite)
- [x] Tailwind CSS styling applied to new pages:
  - `frontend/src/app/comics/create/page.tsx`
  - `frontend/src/app/comics/[comicId]/add-chapter/page.tsx`
- [x] Dashboard integration complete
  - Comic management tabs visible in admin menu
  - Role-based access control applied
- [x] Unused imports/variables removed for clean build

### Version Control
- [x] Branch `mas/agent-readme` up-to-date
- [x] PR #82 created and ready for review
- [x] All changes committed and pushed

## 🚀 Deployment Steps

### Step 1: Frontend Deployment (Vercel/Netlify/Hosting Provider)
```bash
# If using Vercel:
vercel deploy --prod

# If using Netlify:
netlify deploy --prod

# Or your hosting provider's CLI
```

**Environment Variables Required** (set in hosting provider):
```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
NEXT_PUBLIC_R2_BUCKET_COVERS=<your-covers-bucket>
NEXT_PUBLIC_R2_BUCKET_CHAPTERS=<your-chapters-bucket>

# Server-side only (backend):
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
INTERNAL_ADMIN_SECRET=<your-internal-secret>
```

### Step 2: Verify Edge Functions (Already Deployed)
```bash
# From backend-supabase directory, verify functions are live:
supabase functions list

# Expected functions deployed:
#   - create_comic
#   - upload_to_r2
#   - [other existing functions]
```

### Step 3: Verify Cloudflare R2 Configuration
1. Ensure R2 bucket names match environment variables:
   - `NEXT_PUBLIC_R2_BUCKET_COVERS` 
   - `NEXT_PUBLIC_R2_BUCKET_CHAPTERS`
2. Verify R2 CORS settings allow requests from your domain
3. Confirm R2 credentials are set in Supabase secrets:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_ACCOUNT_ID`

### Step 4: Manual Smoke Tests
```bash
# 1. Navigate to admin dashboard
# 2. Click "Create Comic" tab
# 3. Fill in title/description and upload cover image
# 4. Verify comic appears with cover URL from R2
# 5. Click "Add Chapter" link
# 6. Upload 3+ images
# 7. Reorder images (drag up/down or use buttons)
# 8. Submit chapter
# 9. Verify chapter created with images in correct order
```

## 📋 Post-Deployment Validation

- [ ] Frontend loads without errors (no 500s)
- [ ] Admin can create comics with cover uploads
- [ ] Admin can add chapters with multi-image uploads
- [ ] Images stored in R2 with public URLs
- [ ] Database records saved with correct owner_id
- [ ] RLS policies prevent other users from modifying comics
- [ ] Test user roles can/cannot access based on permissions

## 🔄 Rollback Plan

If issues arise:

1. **Revert to main branch** (if needed):
   ```bash
   git revert <commit-hash>
   ```

2. **Roll back frontend** to previous deployment (via hosting provider)

3. **Roll back database** (create migration with DROP TABLE statements):
   ```bash
   # Create new migration reversing the changes
   supabase db push
   ```

4. **Roll back functions**:
   ```bash
   supabase functions delete create_comic
   supabase functions delete upload_to_r2
   ```

## 📞 Support

For issues during deployment:
- Check Supabase dashboard for error logs
- Review browser console for frontend errors
- Verify R2 credentials and CORS settings
- Run SQL audit in Supabase: `SELECT * FROM app_private.check_rls_policies();`

---

**Deployment Ready**: PR #82 and branch `mas/agent-readme` are stable and tested.
**Next Steps**: Merge PR → trigger CI/CD deploy → run smoke tests → validate in production.
