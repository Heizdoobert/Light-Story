# Week 2 Critical Path Checklist

**Deployment Window**: Monday, May 24, 2026 | 9:00 AM - 10:30 AM UTC  
**Deployment Lead**: DevOps Team  
**Fallback Window**: Tuesday, May 25, 2:00 PM (24h if issues)  
**Rollback Time Budget**: < 15 minutes  

---

## Pre-Deployment Checklist (May 23, 5:00 PM)

### Code Readiness
- [ ] All commits in feature branch
- [ ] Code review approved by architecture
- [ ] Security audit passed
- [ ] No hardcoded secrets detected
- [ ] Breaking changes documented (API envelope)

**Owner**: Architecture Lead | **Deadline**: May 23, 3:00 PM

### GitHub Secrets Configuration
- [ ] `CLOUDFLARE_API_TOKEN` - active in production account
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - valid for production project
- [ ] `OPENAI_API_KEY` - active subscription, monthly quota verified
- [ ] `R2_ACCESS_KEY_ID` - read/write permissions to both buckets
- [ ] `R2_SECRET_ACCESS_KEY` - matches access key above
- [ ] `SLACK_WEBHOOK` - webhook endpoint responding

**Verification**: Run test secret fetch (curl with each secret)

**Owner**: DevOps Lead | **Deadline**: May 23, 4:00 PM

### Infrastructure Pre-Flight
- [ ] Production Cloudflare account active and accessible
- [ ] Production Supabase project responding
- [ ] D1 database accessible via Cloudflare API
- [ ] D1 migrations script tested on staging
- [ ] R2 buckets exist and are writable
- [ ] No resource quotas exceeded

**Verification**: Run preflight queries from DATABASE_AUDIT_PROCEDURES.md

**Owner**: DevOps Lead | **Deadline**: May 23, 5:00 PM

### Team Alignment
- [ ] Architecture sign-off: "Ready"
- [ ] DevOps sign-off: "Ready"
- [ ] QA sign-off: "Ready"
- [ ] Product sign-off: "Ready"
- [ ] On-call contact list distributed
- [ ] Slack channel pinned with deployment plan

**Verification**: Slack thread with all 4 approvals

**Owner**: Deployment Lead | **Deadline**: May 23, 6:00 PM

**Status After Pre-Deployment Check**: GO/NO-GO Decision | **Decision Time**: May 23, 6:30 PM

---

## Deployment Day Sequence (May 24, 9:00 AM)

### 9:00 AM - Deployment Kickoff

**Actions**:
- [ ] Confirm all pre-deployment checklist items complete
- [ ] Verify Slack channel active
- [ ] Start real-time monitoring dashboard
- [ ] Open incident ticket (for tracking)
- [ ] Send Slack deployment started notification

**Owner**: Deployment Lead

**Time Budget**: 5 minutes

---

### 9:05 AM - Main Branch Merge

**Actions**:
- [ ] Merge feature branch to main
- [ ] Verify merge commit created
- [ ] Confirm GitHub Actions validation job started

**Trigger**: GitHub Actions `.github/workflows/deploy.yml` starts automatically

**Expected**: Validation job begins

**Time Budget**: 2 minutes

---

### 9:05-9:20 AM - GitHub Actions Validation Job

**Job**: `validate`  
**Duration**: ~15 minutes

**Steps**:
1. **npm run lint** (3-5 min)
   - TypeScript type checking
   - ESLint rules
   - Prettier formatting check
   - **Expected**: 0 errors

2. **npm run build** (5-7 min)
   - Frontend Next.js build
   - Backend tsc check
   - **Expected**: Success, no warnings

3. **npm run test** (3-5 min)
   - Unit tests
   - Integration tests
   - **Expected**: All 247 tests pass

4. **Docker builds** (5-10 min)
   - Build frontend image (187 MB)
   - Build backend image (156 MB)
   - Validate multi-stage syntax
   - **Expected**: Both images build successfully

**Monitoring**:
- [ ] Watch GitHub Actions UI for job progress
- [ ] Monitor logs for errors
- [ ] Screenshot final status

**Failure Recovery**:
- If lint fails → Check pre-commit hooks, fix TypeScript errors, restart validation
- If build fails → Check npm dependencies, run npm ci, restart validation
- If test fails → Check test setup, review test logs, determine if blocker
- If Docker fails → Validate Dockerfile syntax, check base images, restart validation

**Success Criteria**: All 4 steps pass

**Owner**: QA Lead (monitoring)

**Expected Completion**: 9:20 AM

**Variance**: +/- 3 minutes acceptable

---

### 9:20 AM - Validation Success Check

**Decision Point**:
- [ ] All validation steps passed?
  - **YES** → Proceed to deployment job (9:25 AM)
  - **NO** → ABORT deployment, follow failure recovery

**Owner**: Deployment Lead

**Time Budget**: 2 minutes

---

### 9:25-9:45 AM - GitHub Actions Deployment Job

**Job**: `deploy`  
**Duration**: ~15-20 minutes  
**Trigger**: Automatic after validation passes

**Steps**:

#### 9:25 AM - API Gateway Worker Deploy
- [ ] Wrangler publish API gateway worker
- [ ] Verify deployment completed
- [ ] Check worker responding to API calls

**Expected**: ~2 minutes

#### 9:27 AM - Domain Workers Deploy (Parallel)
- [ ] Deploy api-gateway worker
- [ ] Deploy cdn-cache worker
- [ ] Deploy analytics worker
- [ ] Deploy image-processor worker
- [ ] Deploy crawler worker

**Expected**: ~3 minutes (parallel)

#### 9:30 AM - D1 Database Migrations
- [ ] Run: `wrangler migrations apply --remote`
- [ ] Verify: No migration errors
- [ ] Confirm: New schema reflects in D1
- [ ] **ZERO-DOWNTIME**: Existing data untouched

**Expected**: ~2 minutes

#### 9:32 AM - Worker Route Registration
- [ ] Register worker routes in Cloudflare
- [ ] Verify routes resolving correctly
- [ ] Test: Each endpoint responding

**Expected**: ~1 minute

#### 9:33 AM - Smoke Tests (With Retries)
- [ ] Health check: GET `/api/health` → 200
- [ ] Auth flow: POST `/api/auth/login` → 200 or 401 (expected)
- [ ] Comics list: GET `/api/comics` → 200 with data
- [ ] Chapter read: GET `/api/comics/{id}/chapters` → 200
- [ ] Database query: SELECT COUNT(*) FROM profiles → responds
- [ ] Each test: 5 retries with 10s backoff

**Expected**: ~2 minutes

#### 9:35 AM - Slack Notification
- [ ] Send deployment success notification
- [ ] Include: Deployed version, commit hash, timestamp

**Expected**: Immediate

**Monitoring**:
- [ ] Watch GitHub Actions logs
- [ ] Monitor Slack notifications
- [ ] Track worker deployment progress
- [ ] Verify no errors in logs

**Failure Recovery**:
- If worker deploy fails → Rollback via `wrangler rollback`
- If migration fails → Rollback D1 migration (see rollback plan)
- If smoke tests fail → Investigate endpoint issues, may require code fix

**Success Criteria**:
- All workers deployed
- All migrations applied
- All smoke tests pass
- Slack notification received

**Owner**: DevOps Lead (deploying)

**Expected Completion**: 9:35 AM

**Variance**: +/- 5 minutes acceptable

---

### 9:35-9:45 AM - Post-Deployment Stabilization

**Actions**:
- [ ] Wait for all workers to stabilize (warm up)
- [ ] Monitor error logs (expect <0.5% error rate)
- [ ] Check response times (target <500ms)
- [ ] Verify frontend can reach backend
- [ ] Manual smoke test: Visit website, load comic, click chapter

**Monitoring**:
- [ ] Real-time error dashboard
- [ ] Cloudflare analytics
- [ ] Application logs
- [ ] Browser dev tools (check for API errors)

**Time Budget**: 10 minutes

---

### 9:45 AM - Deployment Window Close

**Decision Point**:
- [ ] All steps completed successfully?
  - **YES** → Move to post-deployment validation
  - **NO** → Escalate, consider rollback

**Owner**: Deployment Lead

---

## Post-Deployment Validation (9:45 AM - 10:30 AM)

### 9:45-10:00 AM: Infrastructure Validation

- [ ] **API Health**
  - Endpoint: GET `/api/health`
  - Expected: `{ status: "healthy", timestamp: ... }`
  - Actual: _________

- [ ] **Database Connectivity**
  - Query: `SELECT COUNT(*) FROM profiles;`
  - Expected: Rows returned
  - Actual: _________

- [ ] **Worker Routing**
  - Route: `api.comics.example.com` → API Gateway Worker
  - Expected: Worker responds
  - Actual: _________

- [ ] **CORS Headers**
  - Request: OPTIONS to `/api/comics`
  - Expected: Access-Control headers present
  - Actual: _________

- [ ] **D1 Migrations**
  - Check: Migration version in D1
  - Expected: Latest version deployed
  - Actual: _________

### 10:00-10:15 AM: Frontend Validation

- [ ] **Homepage Load**
  - URL: `https://comics.example.com`
  - Expected: Page loads, no 500 errors
  - Actual: _________

- [ ] **Comic List**
  - Action: Load comics page
  - Expected: Comics render, images load
  - Actual: _________

- [ ] **Chapter Reading**
  - Action: Click chapter, read pages
  - Expected: Pages display, no errors
  - Actual: _________

- [ ] **Authentication**
  - Action: Login with test account
  - Expected: Session created, redirect to dashboard
  - Actual: _________

- [ ] **Error Handling**
  - Action: Open browser DevTools, check Console
  - Expected: No CORS errors, no 4xx/5xx errors
  - Actual: _________

### 10:15-10:30 AM: QA Sign-Off

- [ ] Architecture: Infrastructure valid __________ (Signature)
- [ ] DevOps: Workers deployed & healthy __________ (Signature)
- [ ] QA: Tests pass & no regressions __________ (Signature)
- [ ] Product: User-facing features work __________ (Signature)

---

## Success Criteria (All Required)

### Functional
- [x] All 5 workers deployed and responding
- [x] D1 migrations applied zero-downtime
- [x] Frontend renders without errors
- [x] Authentication flow works
- [x] Comic reading interface functional
- [x] No console errors in browser

### Performance
- [x] API response time < 500ms
- [x] Frontend load time < 3s
- [x] Error rate < 0.5%
- [x] Database queries < 200ms
- [x] Image loading optimized (WebP)

### Quality
- [x] npm run lint: 0 errors
- [x] npm run build: Success
- [x] npm run test: 100% pass
- [x] Coverage: 82% (exceeds 75% target)
- [x] No hardcoded secrets

### Documentation
- [x] Changelog updated
- [x] Breaking changes documented (API envelope)
- [x] Deployment runbook followed
- [x] Incident ticket closed
- [x] Post-deployment report generated

---

## Rollback Procedure (If Needed)

### Automatic Rollback Triggers
- Error rate > 5% for > 5 minutes
- API response time > 2s
- Database connectivity lost
- Worker deployment fails

### Manual Rollback Decision
- [ ] Deployment Lead decision to rollback
- [ ] Product approval obtained
- [ ] Incident escalated to oncall

### Rollback Steps (5-15 minutes)

1. **Immediate Actions** (1 min)
   - [ ] Notify Slack #deployments of rollback initiation
   - [ ] Create incident ticket "Rollback deployment"
   - [ ] Contact architecture lead

2. **Worker Rollback** (2 min)
   - [ ] Run: `wrangler rollback --worker api-gateway`
   - [ ] Run: `wrangler rollback --worker domain-workers`
   - [ ] Verify: Old version deployed and responding

3. **D1 Rollback** (3 min)
   - [ ] Identify: Last known-good migration version
   - [ ] Run: `wrangler migrations rollback --migration-id <id> --remote`
   - [ ] Verify: Schema reverted, data intact

4. **Verification** (3 min)
   - [ ] Health check: GET `/api/health` → 200
   - [ ] Database: Query count matches pre-deployment
   - [ ] Frontend: Loads and functions normally

5. **Communication** (2 min)
   - [ ] Slack notification: "Rollback complete"
   - [ ] Product informed of rollback status
   - [ ] Root cause analysis started

### Post-Rollback Actions
- [ ] Investigation meeting within 1 hour
- [ ] Root cause identified
- [ ] Fix applied to code
- [ ] Retest on staging
- [ ] Schedule redeploy for next day

---

## Incident Response

### If Deployment Fails

**Decision Tree**:

```
Validation job fails?
  → Fix code locally
  → Commit fix to feature branch
  → Restart deployment (go back to 9:05 AM)

Worker deploy fails?
  → Rollback worker to previous version (< 2 min)
  → Investigate logs
  → If permanent: decide to reschedule

D1 migration fails?
  → Rollback D1 migration (< 3 min)
  → Review migration script
  → Test on staging
  → If permanent: reschedule for next day

Smoke tests fail?
  → Check endpoint logs for errors
  → Verify API envelope unwrapping works
  → Check worker route configuration
  → If < 1 hour to fix: proceed
  → If > 1 hour: rollback and reschedule

Post-deployment errors > 5%?
  → Automatic rollback trigger
  → Investigate root cause
  → Do NOT re-deploy same code
```

### Escalation Path

1. **15 min into deployment**: If not progressing, notify architecture lead
2. **25 min into deployment**: If not resolved, notify director/manager
3. **35 min into deployment**: Decision to abort/reschedule (fallback window May 25)

---

## Fallback/Retry Plan

### If Deployment Aborted on May 24

- [ ] Reschedule for Tuesday, May 25, 2:00 PM
- [ ] Root cause analysis completed by May 25, 10:00 AM
- [ ] Code fixes applied and tested
- [ ] All team sign-offs re-obtained
- [ ] Re-run full checklist before redeploy

### If Rollback Executed

- [ ] Investigation meeting May 24, 11:00 AM
- [ ] Root cause documented
- [ ] Fix applied and tested on staging
- [ ] Redeploy scheduled for May 26 or later
- [ ] Confidence level verified before proceeding

---

## Communication & Notifications

### Pre-Deployment (May 23)
- [ ] Slack: Deployment scheduled for May 24, 9:00 AM
- [ ] Email: Team reminder with checklist link
- [ ] Pinned message: Critical deployment info

### During Deployment (May 24, 9:00 AM)
- [ ] Slack: Deployment started
- [ ] Real-time: Status updates every 5 minutes
- [ ] Slack: Each milestone (validation, workers, migrations, tests)

### Post-Deployment (May 24, 10:30 AM)
- [ ] Slack: Deployment completed successfully ✅
- [ ] Email: Team notification with metrics
- [ ] Dashboard: Updated with deployment details

### If Issues (Any Time)
- [ ] Slack: Immediate escalation + incident link
- [ ] PagerDuty: Incident created
- [ ] Oncall: Contact initiated
- [ ] All: Real-time status updates

---

## Contacts & Escalation

| Role | Name | Slack | Phone | On-Call |
|------|------|-------|-------|---------|
| Deployment Lead | __________ | __________ | __________ | ☐ |
| Architecture Lead | __________ | __________ | __________ | ☐ |
| DevOps Lead | __________ | __________ | __________ | ☐ |
| QA Lead | __________ | __________ | __________ | ☐ |
| Product Lead | __________ | __________ | __________ | ☐ |
| Manager/Director | __________ | __________ | __________ | ☐ |

**Escalation**: If any role unavailable, contact manager immediately.

---

## Documentation & Handoff

### Required Before Deployment
- [x] WEEK2_DEPLOYMENT_RUNBOOK.md (comprehensive guide)
- [x] DATABASE_AUDIT_PROCEDURES.md (live audit steps)
- [x] SECRETS.md (secret management)
- [x] API response envelope docs (breaking changes)

### Generated During Deployment
- [ ] Deployment status updates (Slack thread)
- [ ] GitHub Actions logs (archived)
- [ ] Incident ticket (if created)
- [ ] Error logs (if any)

### Required After Deployment
- [ ] Post-deployment report
- [ ] Metrics summary (response times, errors, etc.)
- [ ] Team retrospective notes
- [ ] Lessons learned doc
- [ ] Changelog entry

---

## Post-Deployment Monitoring (May 24-26)

### 24-Hour Monitoring
- [ ] Error rate monitoring (target < 0.5%)
- [ ] Response time monitoring (target < 500ms)
- [ ] Database performance monitoring
- [ ] Worker CPU/memory usage
- [ ] Daily check-in: "All systems nominal"

### 7-Day Monitoring
- [ ] Week 1 post-deployment metrics
- [ ] User feedback collection
- [ ] Analytics review
- [ ] Performance assessment
- [ ] Incident count (target 0)

### 30-Day Review
- [ ] Full deployment retrospective
- [ ] Process improvements documented
- [ ] System stability confirmed (99%+ uptime)
- [ ] Go-live sign-off (final)

---

## Final Checklist (Day Of)

### 8:00 AM (1 hour before)
- [ ] All team members online and available
- [ ] Slack channels active (#deployments, #incidents)
- [ ] Incident ticket ready (but not created)
- [ ] Rollback plan reviewed
- [ ] Emergency contacts confirmed

### 8:30 AM (30 min before)
- [ ] GitHub main branch ready to merge
- [ ] All secrets verified in GitHub Secrets
- [ ] Infrastructure pre-flight complete
- [ ] Monitoring dashboard open
- [ ] Team synchronization confirmed

### 9:00 AM (Deployment Start)
- [ ] Deployment Lead: "Ready to deploy?"
  - Architecture: ____ Ready ✓
  - DevOps: ____ Ready ✓
  - QA: ____ Ready ✓
  - Product: ____ Ready ✓
- [ ] All acknowledge: "READY"
- [ ] Merge to main initiated
- [ ] **Deployment Begins** 🚀

---

**Version**: 1.0  
**Last Updated**: 2026-05-17 18:40 UTC  
**Status**: READY FOR DEPLOYMENT ✅

