# Production Deployment Procedure
## Multi-Expense Account Management Platform (MBM-116)

**Version:** 1.0
**Last Updated:** November 26, 2025
**Deployment Team:** Development, QA, DevOps
**Estimated Deployment Time:** 2-3 hours

---

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Deployment Timeline](#deployment-timeline)
3. [Deployment Steps](#deployment-steps)
4. [Verification Procedures](#verification-procedures)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Deployment Monitoring](#post-deployment-monitoring)
7. [Communication Plan](#communication-plan)
8. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Requirements

### Required Documents

- [x] `DEPLOYMENT-CHECKLIST-MBM-116.md` - Comprehensive deployment checklist
- [x] `SECURITY-AUDIT-EXPENSE-ACCOUNTS.md` - Security audit report (approved)
- [x] `E2E-TEST-VALIDATION-CHECKLIST.md` - Testing validation (completed)
- [x] `API-DOCUMENTATION-EXPENSE-ACCOUNTS.md` - API reference
- [x] `USER-GUIDE-EXPENSE-ACCOUNTS.md` - End user documentation

### Required Approvals

- [ ] Product Owner approval
- [ ] Security team approval
- [ ] QA team sign-off (all tests passed)
- [ ] DevOps team readiness confirmation

### Pre-Deployment Meeting

**Date/Time:** _____________
**Attendees:** Product Owner, Lead Developer, QA Lead, DevOps Engineer
**Agenda:**
1. Review deployment checklist
2. Review security audit findings
3. Review test results
4. Confirm rollback plan
5. Assign roles and responsibilities
6. Set communication channels

---

## Deployment Timeline

### Recommended Deployment Window

**Day of Week:** Saturday or Sunday (low traffic)
**Time:** 2:00 AM - 5:00 AM (timezone: ________)
**Duration:** 2-3 hours
**Maintenance Window:** 4 hours (allows buffer for issues)

### Timeline Breakdown

| Time | Activity | Duration | Responsible |
|------|----------|----------|-------------|
| T-24h | Send maintenance notification to users | - | Product Owner |
| T-4h | Final staging verification | 30 min | QA Team |
| T-2h | Team assembly and final go/no-go | 15 min | All |
| T-1h | Database backup | 30 min | DevOps |
| T-0 | BEGIN DEPLOYMENT | - | - |
| T+0 | Enable maintenance mode | 5 min | DevOps |
| T+5 | Apply database migrations | 15 min | DevOps |
| T+20 | Deploy application code | 20 min | DevOps |
| T+40 | Run smoke tests | 20 min | QA |
| T+60 | Disable maintenance mode | 5 min | DevOps |
| T+65 | Run full verification | 30 min | QA |
| T+95 | Monitor initial traffic | 30 min | All |
| T+125 | Deployment complete / Go-live | - | All |
| T+4h | Post-deployment review meeting | 30 min | All |

---

## Deployment Steps

### Phase 1: Pre-Deployment (T-1h to T-0)

#### Step 1.1: Create Database Backup

**Responsible:** DevOps Engineer

```bash
# Connect to production database server
ssh production-db-server

# Create backup with timestamp
BACKUP_FILE="backup_expense_accounts_$(date +%Y%m%d_%H%M%S).sql"

pg_dump -U postgres \
  -h localhost \
  -d production_database \
  --clean \
  --if-exists \
  > /backups/${BACKUP_FILE}

# Verify backup created
ls -lh /backups/${BACKUP_FILE}

# Compress backup
gzip /backups/${BACKUP_FILE}

# Copy backup to secure offsite location
aws s3 cp /backups/${BACKUP_FILE}.gz s3://backups-bucket/expense-accounts/
```

**Verification:**
- [ ] Backup file exists and size > 0
- [ ] Backup compressed successfully
- [ ] Backup copied to offsite storage
- [ ] Backup integrity verified (optional: test restore in separate database)

**Rollback Point:** Backup location documented: _______________

---

#### Step 1.2: Final Staging Verification

**Responsible:** QA Lead

```bash
# Run validation scripts on staging
node scripts/validate-expense-account-system.js
node scripts/test-edge-cases.js

# Run quick smoke test
npm run test:e2e:critical (if automated tests exist)
```

**Verification:**
- [ ] All validation scripts pass
- [ ] No errors in staging
- [ ] Staging database in good state

---

#### Step 1.3: Team Assembly & Go/No-Go Decision

**Responsible:** Product Owner (meeting facilitator)

**Go/No-Go Checklist:**
- [ ] All approvals received
- [ ] Database backup verified
- [ ] Staging tests passed
- [ ] Team ready (all key personnel present)
- [ ] Rollback plan reviewed and understood
- [ ] Communication channels established

**Decision:** ☐ GO ☐ NO-GO (postpone)

If NO-GO, document reason: _______________

---

### Phase 2: Deployment Execution (T-0 to T+60)

#### Step 2.1: Enable Maintenance Mode

**Responsible:** DevOps Engineer

```bash
# Set maintenance mode flag (implementation depends on your setup)
# Option 1: Environment variable
export MAINTENANCE_MODE=true

# Option 2: Create maintenance file
touch /var/www/app/.maintenance

# Option 3: Update Next.js middleware
# Edit src/middleware.ts to show maintenance page
```

**Maintenance Page Message:**
```
System Maintenance in Progress

We're currently performing scheduled maintenance to improve our services.

Expected completion: [TIME]

We apologize for any inconvenience.
```

**Verification:**
- [ ] Maintenance mode enabled
- [ ] Users see maintenance page
- [ ] API returns 503 Service Unavailable

**Time Completed:** _______

---

#### Step 2.2: Apply Database Migrations

**Responsible:** DevOps Engineer

**Migration 1: Core Schema**

```bash
# Verify current migration status
npx prisma migrate status

# Apply core expense account schema
npx prisma migrate deploy

# Expected output:
# ✓ Applied migration: add_expense_accounts
```

**Verification:**
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'expense_accounts',
  'expense_account_deposits',
  'expense_account_payments'
);

-- Should return 3 rows
```

**Migration Status:** ☐ Success ☐ Failed

If failed, stop deployment and begin rollback. Error: _______________

---

**Migration 2: Performance Indexes**

```bash
# Apply indexes migration
psql -U postgres -d production_database \
  -f prisma/migrations/add_expense_account_indexes/migration.sql

# Expected output: CREATE INDEX (repeated for each index)
```

**Verification:**
```sql
-- Count indexes on expense account tables
SELECT tablename, COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN (
  'expense_accounts',
  'expense_account_deposits',
  'expense_account_payments'
)
GROUP BY tablename;

-- Expected:
-- expense_account_payments: ~10-12 indexes
-- expense_account_deposits: ~4-5 indexes
-- expense_accounts: ~4-5 indexes
```

**Migration Status:** ☐ Success ☐ Failed

If failed, indexes can be added post-deployment (non-blocking)

**Time Completed:** _______

---

**Migration 3: Seed Expense Categories (if needed)**

```bash
# Check if categories already exist
psql -U postgres -d production_database -c "SELECT COUNT(*) FROM expense_categories;"

# If count = 0, run seed
node scripts/seed-expense-categories.js
```

**Verification:**
- [ ] Expense categories seeded (15-20 categories expected)
- [ ] Sample query returns categories:
  ```sql
  SELECT name, emoji FROM expense_categories LIMIT 5;
  ```

**Time Completed:** _______

---

#### Step 2.3: Deploy Application Code

**Responsible:** DevOps Engineer

**Deployment Method: Vercel/Netlify/Cloud Platform**

```bash
# Push to production branch (triggers automatic deployment)
git checkout main
git pull origin main
git tag -a v1.0.0-expense-accounts -m "Initial release of expense account management"
git push origin v1.0.0-expense-accounts

# Monitor deployment on platform dashboard
```

**Deployment Method: Docker**

```bash
# Build production Docker image
docker build -t app:expense-accounts-v1.0.0 .

# Push to container registry
docker push registry.example.com/app:expense-accounts-v1.0.0

# Pull and restart on production server
ssh production-server
docker pull registry.example.com/app:expense-accounts-v1.0.0
docker stop app-container
docker run -d --name app-container \
  --env-file .env.production \
  -p 3000:3000 \
  registry.example.com/app:expense-accounts-v1.0.0
```

**Deployment Method: Manual Server**

```bash
# Copy files to production server
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env.local' \
  ./ user@production-server:/var/www/app/

# On production server
ssh user@production-server << 'ENDSSH'
cd /var/www/app

# Install dependencies
npm install --production

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Restart application
pm2 restart app-name
# OR: systemctl restart app-service
ENDSSH
```

**Verification:**
- [ ] Code deployed successfully
- [ ] No deployment errors
- [ ] Application process running

**Deployment Logs:** (review for errors)

**Time Completed:** _______

---

#### Step 2.4: Run Smoke Tests (Before Disabling Maintenance)

**Responsible:** QA Lead

**Internal smoke tests (while in maintenance mode):**

```bash
# Test 1: Application starts
curl -I http://localhost:3000
# Expected: 200 OK or 503 (maintenance mode)

# Test 2: Database connection
node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.expenseAccounts.findMany().then(() => {
    console.log('✓ Database connection successful');
    process.exit(0);
  }).catch((e) => {
    console.error('✗ Database connection failed:', e);
    process.exit(1);
  });
"
# Expected: ✓ Database connection successful

# Test 3: Tables exist
psql -U postgres -d production_database -c \
  "SELECT COUNT(*) FROM expense_accounts;"
# Expected: Number (even if 0)
```

**Smoke Test Results:**
- [ ] Application starts successfully
- [ ] Database connection works
- [ ] Core tables accessible
- [ ] No critical errors in logs

If smoke tests fail, STOP and begin rollback.

**Time Completed:** _______

---

#### Step 2.5: Disable Maintenance Mode

**Responsible:** DevOps Engineer

```bash
# Remove maintenance mode flag
unset MAINTENANCE_MODE
# OR: rm /var/www/app/.maintenance
# OR: Revert middleware changes

# Restart application to apply changes
pm2 restart app-name
# OR: systemctl restart app-service

# Verify application accessible
curl -I https://your-domain.com
# Expected: 200 OK
```

**Verification:**
- [ ] Maintenance mode disabled
- [ ] Homepage loads correctly
- [ ] No 503 errors

**Time Completed:** _______

---

### Phase 3: Post-Deployment Verification (T+60 to T+95)

#### Step 3.1: API Endpoint Verification

**Responsible:** QA Lead

Use the deployment checklist Section "Step 3.2: API Endpoint Verification" for detailed tests.

**Quick verification (10 critical endpoints):**

```bash
# Set session token (login as admin first)
export SESSION_TOKEN="your-session-token"

# 1. List accounts
curl -X GET https://your-domain.com/api/expense-account \
  -H "Cookie: session-token=${SESSION_TOKEN}"
# Expected: 200 OK with array (empty or populated)

# 2. Create test account
curl -X POST https://your-domain.com/api/expense-account \
  -H "Cookie: session-token=${SESSION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "DEPLOYMENT TEST ACCOUNT",
    "description": "Created during deployment verification",
    "lowBalanceThreshold": 100
  }'
# Expected: 201 Created with account ID

# Store account ID for next tests
export ACCOUNT_ID="[returned-account-id]"

# 3. Get account details
curl -X GET https://your-domain.com/api/expense-account/${ACCOUNT_ID} \
  -H "Cookie: session-token=${SESSION_TOKEN}"
# Expected: 200 OK with account details

# 4. Add deposit
curl -X POST https://your-domain.com/api/expense-account/${ACCOUNT_ID}/deposits \
  -H "Cookie: session-token=${SESSION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "depositType": "MANUAL",
    "notes": "Deployment test deposit"
  }'
# Expected: 201 Created, balance = 1000

# 5. Get balance
curl -X GET https://your-domain.com/api/expense-account/${ACCOUNT_ID}/balance \
  -H "Cookie: session-token=${SESSION_TOKEN}"
# Expected: 200 OK with balance = 1000

# 6-10: Continue with remaining endpoints...
```

**API Test Results:**
- [ ] All 10 endpoints return expected status codes
- [ ] No 500 errors
- [ ] Data persists correctly

**Time Completed:** _______

---

#### Step 3.2: UI Verification

**Responsible:** QA Lead

**Manual UI tests:**

1. **Account List Page**
   - [ ] Navigate to `/expense-accounts`
   - [ ] Page loads without errors
   - [ ] "DEPLOYMENT TEST ACCOUNT" appears in list
   - [ ] Balance shows as $1,000.00

2. **Account Detail Page**
   - [ ] Click on test account
   - [ ] All tabs visible (Overview, Deposits, Payments, Transactions)
   - [ ] Balance displays correctly
   - [ ] Deposit appears in transaction history

3. **Create Payment**
   - [ ] Go to Payments tab
   - [ ] Select a test employee
   - [ ] Enter amount: $50
   - [ ] Select category
   - [ ] Submit payment
   - [ ] Success message appears
   - [ ] Balance updates to $950

4. **Reports**
   - [ ] Click "View Reports"
   - [ ] Charts render correctly
   - [ ] Summary statistics display

5. **Employee Integration**
   - [ ] Navigate to employee detail page
   - [ ] "Expense Payments" tab visible
   - [ ] $50 payment appears

**UI Test Results:**
- [ ] All pages load correctly
- [ ] No JavaScript errors in console
- [ ] All functionality works

**Time Completed:** _______

---

#### Step 3.3: Permission Verification

**Responsible:** QA Lead

**Test with different user roles:**

1. **Admin User**
   - [ ] Can see Expense Accounts menu
   - [ ] Can create account
   - [ ] Can make payment
   - [ ] Can view reports

2. **Limited User (no permissions)**
   - [ ] Cannot see Expense Accounts menu
   - [ ] Direct URL access redirects

**Permission Test Results:**
- [ ] All permission checks working correctly

**Time Completed:** _______

---

#### Step 3.4: Data Integrity Validation

**Responsible:** DevOps Engineer

```bash
# Run validation script
node scripts/validate-expense-account-system.js

# Expected output:
# ✓ All accounts have valid account numbers
# ✓ All balances calculated correctly
# ✓ No orphaned payments
# ✓ Decimal precision correct
#
# Summary: PASS ✓
```

**Validation Results:**
- [ ] All validation checks pass
- [ ] No data integrity issues

**Time Completed:** _______

---

### Phase 4: Go-Live (T+95)

#### Step 4.1: Final Go/No-Go Decision

**Responsible:** Product Owner

**Go-Live Checklist:**
- [ ] All API endpoints verified
- [ ] All UI pages verified
- [ ] All permissions verified
- [ ] Data integrity validated
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] Team consensus to go live

**Decision:** ☐ GO-LIVE ☐ ROLLBACK

If ROLLBACK, proceed to Rollback Procedures section.

**Approved By:** _______________
**Time:** _______

---

#### Step 4.2: Send Go-Live Notification

**Responsible:** Product Owner

**Email Template:**

```
Subject: System Maintenance Complete - Expense Account Management Now Available

Dear Users,

The scheduled system maintenance has been completed successfully.

NEW FEATURE: Expense Account Management

We're excited to announce the launch of our new Expense Account Management system,
allowing you to:
- Create dedicated expense accounts for projects/departments
- Track payments to employees, contractors, and vendors
- Generate detailed expense reports and analytics
- Manage budgets with low-balance alerts

For more information, please see the user guide: [LINK TO USER-GUIDE]

If you have any questions or encounter any issues, please contact support.

Thank you for your patience during the maintenance window.

Best regards,
[Your Team]
```

**Notification Sent:** ☐ Yes Time: _______

---

## Verification Procedures

### Immediate Verification (First Hour)

**Monitor:**
- [ ] Error logs (no critical errors)
- [ ] API response times (< 2 seconds average)
- [ ] Database connection pool (no exhaustion)
- [ ] Server resources (CPU < 70%, Memory < 80%)

**Tools:**
- Application logs
- Database logs
- Monitoring dashboard (if available)

---

### First 24 Hours Verification

**Monitor every 2-4 hours:**
- [ ] Error rate (< 1%)
- [ ] User-reported issues (support tickets)
- [ ] Performance metrics
- [ ] Feature adoption (accounts created, payments made)

---

## Rollback Procedures

### When to Rollback

**Immediate rollback if:**
- Critical bug causing data corruption
- Critical bug preventing core functionality
- Security vulnerability discovered
- Database migration failed
- >10% error rate

**Evaluate rollback if:**
- Non-critical bugs affecting some users
- Performance degradation >50%
- User complaints >10 in first hour

---

### Rollback Steps

#### Step R1: Decision to Rollback

**Decision maker:** Product Owner (after consulting team)

**Document reason:** _______________

**Time rollback initiated:** _______

---

#### Step R2: Enable Maintenance Mode

```bash
export MAINTENANCE_MODE=true
pm2 restart app-name
```

---

#### Step R3: Restore Database

```bash
# Stop application
pm2 stop app-name

# Restore from backup
BACKUP_FILE="backup_expense_accounts_YYYYMMDD_HHMMSS.sql.gz"

gunzip /backups/${BACKUP_FILE}

psql -U postgres -d production_database < /backups/backup_expense_accounts_YYYYMMDD_HHMMSS.sql

# Verify restoration
psql -U postgres -d production_database -c \
  "SELECT COUNT(*) FROM expense_accounts WHERE accountNumber LIKE 'ACC-%';"
```

**Verification:**
- [ ] Database restored successfully
- [ ] Data integrity verified

---

#### Step R4: Revert Code

```bash
# Option 1: Revert Git commit
git revert HEAD
git push origin main

# Option 2: Redeploy previous version
git checkout [previous-tag]
# Deploy using original method

# Option 3: Restore from Docker image
docker run -d --name app-container previous-image:tag
```

---

#### Step R5: Verify Rollback

```bash
# Test homepage
curl -I https://your-domain.com

# Test database
psql -U postgres -d production_database -c \
  "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'expense%';"

# Should return 0 rows (tables removed)
```

---

#### Step R6: Disable Maintenance Mode

```bash
unset MAINTENANCE_MODE
pm2 restart app-name
```

---

#### Step R7: Post-Rollback Communication

**Email notification:**

```
Subject: System Maintenance Extended - Service Restored

Dear Users,

Due to technical issues discovered during our maintenance, we have rolled back
the planned updates and restored the system to its previous state.

The system is now fully operational. We apologize for the extended downtime.

We will reschedule the maintenance after resolving the issues.

Thank you for your patience and understanding.

Best regards,
[Your Team]
```

---

## Post-Deployment Monitoring

### First 24 Hours

**Monitoring Checklist:**
- [ ] Check error logs every 2 hours
- [ ] Monitor API response times (dashboard)
- [ ] Monitor database performance
- [ ] Check for user-reported issues
- [ ] Review feature usage (accounts created, payments made)

**On-call person:** _______________

---

### First Week

**Daily monitoring:**
- [ ] Review error trends
- [ ] Review performance metrics
- [ ] Analyze feature adoption
- [ ] Collect user feedback

**Weekly review meeting:** _______________ (date/time)

---

### First Month

**Weekly metrics to collect:**
- Number of expense accounts created
- Number of deposits made
- Number of payments made
- Most used expense categories
- Average account balance
- User engagement

---

## Communication Plan

### Stakeholder Notifications

**Before Deployment (T-24h):**
- [ ] Email to all users (maintenance window notification)
- [ ] Internal team notification (Slack/Teams)
- [ ] Update status page (if available)

**During Deployment:**
- [ ] Real-time updates in team chat
- [ ] Maintenance page displayed to users

**After Deployment:**
- [ ] Go-live notification email
- [ ] Internal team success message
- [ ] Update status page

---

### Communication Channels

**Team coordination:**
- Platform: _____________ (Slack, Teams, etc.)
- Channel: #deployment-expense-accounts
- Video call: _____________ (Zoom, Meet link)

**User communication:**
- Email distribution list: all-users@company.com
- Status page: https://status.yourcompany.com

---

## Emergency Contacts

### Deployment Team

**Product Owner:**
- Name: _______________
- Phone: _______________
- Email: _______________

**Lead Developer:**
- Name: _______________
- Phone: _______________
- Email: _______________

**QA Lead:**
- Name: _______________
- Phone: _______________
- Email: _______________

**DevOps Engineer:**
- Name: _______________
- Phone: _______________
- Email: _______________

**Database Administrator:**
- Name: _______________
- Phone: _______________
- Email: _______________

### Escalation Path

**Level 1:** DevOps Engineer (technical issues)
**Level 2:** Lead Developer (critical bugs)
**Level 3:** Product Owner (business decisions, rollback approval)

---

## Post-Deployment Review

### Review Meeting

**Date/Time:** _____________ (T+4h or next business day)
**Attendees:** All deployment team members

**Agenda:**
1. Deployment timeline review (actual vs. planned)
2. Issues encountered and resolutions
3. Rollback decision (if applicable)
4. Lessons learned
5. Improvements for next deployment
6. Action items for follow-up

**Minutes/Notes:** _____________

---

## Sign-Off

**Deployment Completed Successfully:** ☐ Yes ☐ No (rollback performed)

**Deployment Start Time:** _______
**Deployment End Time:** _______
**Total Duration:** _______

**Final Sign-Off:**

- Product Owner: _______________ Date: _______
- Lead Developer: _______________ Date: _______
- QA Lead: _______________ Date: _______
- DevOps Engineer: _______________ Date: _______

**Deployment Status:** ☐ Success ☐ Success with minor issues ☐ Rolled back

**Next Steps:**
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

**End of Production Deployment Procedure**
