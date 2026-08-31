# Deployment Checklist - MBM-116
## Multi-Expense Account Management Platform

**Project:** Multi-Expense Account Management Platform
**Ticket:** MBM-116
**Deployment Date:** _____________
**Deployed By:** _____________
**Environment:** ☐ Staging ☐ Production
**Database Backup Created:** ☐ Yes ☐ No
**Backup Location:** _____________

---

## Pre-Deployment Checklist

### 1. Code Review & Quality

- [ ] All code merged to main branch
- [ ] No console.log statements in production code
- [ ] No TODO/FIXME comments remaining
- [ ] All TypeScript compilation errors resolved
- [ ] ESLint/Prettier checks pass
- [ ] Git status clean (no uncommitted changes)
- [ ] Latest code pulled from repository

**Verification Command:**
```bash
npm run build
npm run lint (if exists)
git status
```

---

### 2. Database Preparation

- [ ] Database backup created and verified
- [ ] Backup stored in secure location
- [ ] Backup restoration tested (in non-prod environment)
- [ ] Database connection string configured
- [ ] Database user has sufficient permissions (CREATE, ALTER, SELECT, INSERT, UPDATE, DELETE)

**Backup Command:**
```bash
# PostgreSQL backup
pg_dump -U postgres -h localhost -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file size
ls -lh backup_*.sql
```

**Verification:**
- [ ] Backup file size > 0 bytes
- [ ] Backup file readable
- [ ] Test restore in separate database (optional but recommended)

---

### 3. Environment Variables

- [ ] `DATABASE_URL` configured correctly
- [ ] `NEXTAUTH_SECRET` set (production secret, not dev)
- [ ] `NEXTAUTH_URL` points to correct domain
- [ ] All required environment variables present
- [ ] No sensitive data in code (only in .env)
- [ ] `.env.production` file created (if used)

**Environment Variables Needed:**
```env
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=<your-production-secret-32-chars-min>
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production
```

**Verification:**
```bash
# Check environment variables (DO NOT RUN IN PRODUCTION - security risk)
# node -e "console.log(process.env.DATABASE_URL)"
```

---

### 4. Dependencies

- [ ] All npm dependencies installed
- [ ] No dependency vulnerabilities (high/critical)
- [ ] Prisma client generated
- [ ] node_modules up to date

**Installation Commands:**
```bash
npm install --production
npm audit
npx prisma generate
```

**Verification:**
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] `node_modules` directory exists
- [ ] `node_modules/.prisma/client` exists

---

## Deployment Steps

### Phase 1: Database Migration

#### Step 1.1: Apply Core Schema Migration

- [ ] Review migration file: `prisma/migrations/*_add_expense_accounts/migration.sql`
- [ ] Verify migration adds expected tables
- [ ] Run migration in staging first (if available)

**Migration Command:**
```bash
npx prisma migrate deploy
```

**Expected Output:**
```
✓ Applied migration: add_expense_accounts
```

**Verification Queries:**
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('expense_accounts', 'expense_account_deposits', 'expense_account_payments');

-- Should return 3 rows
```

- [ ] `expense_accounts` table exists
- [ ] `expense_account_deposits` table exists
- [ ] `expense_account_payments` table exists

#### Step 1.2: Apply Performance Indexes Migration

- [ ] Review migration file: `prisma/migrations/add_expense_account_indexes/migration.sql`
- [ ] Verify migration adds expected indexes (17 indexes)

**Migration Command:**
```bash
# Apply the indexes migration manually (if not already in Prisma migrations)
psql -U postgres -d your_database -f prisma/migrations/add_expense_account_indexes/migration.sql
```

**Verification Query:**
```sql
-- Count indexes on expense account tables
SELECT
  schemaname,
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN ('expense_accounts', 'expense_account_deposits', 'expense_account_payments')
GROUP BY schemaname, tablename;
```

**Expected Results:**
- `expense_account_payments`: ~10-12 indexes
- `expense_account_deposits`: ~4-5 indexes
- `expense_accounts`: ~4-5 indexes

- [ ] All indexes created successfully
- [ ] No index creation errors in logs

#### Step 1.3: Seed Expense Categories (if not already seeded)

- [ ] Check if expense categories exist

**Check Query:**
```sql
SELECT COUNT(*) FROM expense_categories;
```

If count = 0, run seed script:
```bash
node scripts/seed-expense-categories.js
```

- [ ] Expense categories seeded (expected: 15-20 categories)

---

### Phase 2: Code Deployment

#### Step 2.1: Build Application

- [ ] Build Next.js application
- [ ] Verify build completes without errors
- [ ] Check build output size

**Build Command:**
```bash
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

**Verification:**
- [ ] `.next` directory created
- [ ] No build errors
- [ ] Build warnings reviewed (if any)

#### Step 2.2: Deploy Application Files

**Deployment Method:** ☐ Vercel ☐ AWS ☐ Docker ☐ Manual Server ☐ Other: _______

**For Manual Server Deployment:**
```bash
# Copy files to server
rsync -avz --exclude 'node_modules' --exclude '.git' ./ user@server:/path/to/app/

# On server: Install dependencies
ssh user@server "cd /path/to/app && npm install --production"

# On server: Build application
ssh user@server "cd /path/to/app && npm run build"

# On server: Restart application
ssh user@server "cd /path/to/app && pm2 restart app-name"
```

**For Vercel/Netlify:**
- [ ] Push to main branch
- [ ] Verify automatic deployment triggered
- [ ] Monitor deployment logs

- [ ] Application deployed successfully
- [ ] Deployment logs reviewed (no errors)

---

### Phase 3: Post-Deployment Verification

#### Step 3.1: Health Checks

- [ ] Application starts without errors
- [ ] Database connection successful
- [ ] Homepage loads correctly
- [ ] Login functionality works
- [ ] Session management works

**Health Check URLs:**
```
Homepage: https://your-domain.com
Login: https://your-domain.com/api/auth/signin
Dashboard: https://your-domain.com/dashboard
```

**Verification:**
- [ ] All pages return 200 status
- [ ] No 500 errors in logs
- [ ] No database connection errors

#### Step 3.2: API Endpoint Verification

Test each expense account endpoint:

**1. List Accounts**
```bash
curl -X GET https://your-domain.com/api/expense-account \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Returns empty array or existing accounts

**2. Create Account**
```bash
curl -X POST https://your-domain.com/api/expense-account \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Test Deployment Account",
    "description": "Testing deployment",
    "lowBalanceThreshold": 500
  }'
```
- [ ] Returns 201 Created
- [ ] Account number generated (ACC-XXXX format)
- [ ] Account appears in database

**3. Get Account Details**
```bash
curl -X GET https://your-domain.com/api/expense-account/[accountId] \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Account details returned correctly

**4. Add Deposit**
```bash
curl -X POST https://your-domain.com/api/expense-account/[accountId]/deposits \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "depositType": "MANUAL",
    "notes": "Test deposit"
  }'
```
- [ ] Returns 201 Created
- [ ] Balance updates correctly
- [ ] Deposit appears in transaction history

**5. Create Payment**
```bash
curl -X POST https://your-domain.com/api/expense-account/[accountId]/payments \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payeeType": "EMPLOYEE",
    "payeeEmployeeId": "emp_xxx",
    "amount": 100,
    "categoryId": "cat_xxx",
    "notes": "Test payment"
  }'
```
- [ ] Returns 201 Created
- [ ] Balance decreases correctly
- [ ] Payment appears in transaction history

**6. Transaction History**
```bash
curl -X GET https://your-domain.com/api/expense-account/[accountId]/transactions \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Shows deposits and payments
- [ ] Running balance calculated correctly

**7. Reports**
```bash
curl -X GET https://your-domain.com/api/expense-account/[accountId]/reports \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Chart data formatted correctly

**8. Payee Payments**
```bash
curl -X GET https://your-domain.com/api/expense-account/payees/EMPLOYEE/emp_xxx/payments \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Payments grouped by account

**9. Payee Reports**
```bash
curl -X GET https://your-domain.com/api/expense-account/payees/EMPLOYEE/emp_xxx/reports \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Analytics data returned

**10. List Payees**
```bash
curl -X GET https://your-domain.com/api/expense-account/payees?type=EMPLOYEE \
  -H "Cookie: session-token=YOUR_SESSION_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Payee list returned

#### Step 3.3: UI Functionality Verification

**Expense Accounts Pages:**
- [ ] Navigate to `/expense-accounts`
- [ ] Account list displays correctly
- [ ] "Create Account" button visible (for users with permission)
- [ ] Click on an account → detail page loads
- [ ] All tabs visible: Overview, Deposits, Payments, Transactions
- [ ] "View Reports" button works

**Account Detail Page:**
- [ ] Balance displays correctly
- [ ] Account number shows in correct format (ACC-XXXX)
- [ ] Low balance alert shows if balance < threshold

**Deposits Tab:**
- [ ] Manual deposit form works
- [ ] Business transfer dropdown populates
- [ ] Deposit submission updates balance
- [ ] Success message appears

**Payments Tab:**
- [ ] Payee selector works
- [ ] Category dropdown populates
- [ ] Single payment submission works
- [ ] Batch payment section visible
- [ ] Add to batch works
- [ ] Submit batch works
- [ ] Insufficient funds error shows correctly

**Transaction History Tab:**
- [ ] All transactions display
- [ ] Date filtering works
- [ ] Type filtering works
- [ ] Running balance calculates correctly

**Reports Page:**
- [ ] Navigate to `/expense-accounts/[accountId]/reports`
- [ ] Summary statistics display
- [ ] Pie chart renders (expenses by category)
- [ ] Bar chart renders (expenses by payee type)
- [ ] Line chart renders (payment trends)
- [ ] Date range filter works

**Employee Detail Page Integration:**
- [ ] Navigate to `/employees/[id]`
- [ ] "Expense Payments" tab visible
- [ ] PayeeExpenseSummary displays
- [ ] PayeePaymentsTable displays
- [ ] PayeeExpenseReport displays (if permission)
- [ ] Account links work (navigate to account detail)

**Dashboard Alerts:**
- [ ] Navigate to `/dashboard`
- [ ] Low balance alert appears (if accounts below threshold)
- [ ] Alert links to account detail page

#### Step 3.4: Permission Verification

**Test with different user roles:**

**Admin User:**
- [ ] Can see "Expense Accounts" menu
- [ ] Can create accounts
- [ ] Can add deposits
- [ ] Can make payments
- [ ] Can view reports

**Finance Manager (canMakePayments only):**
- [ ] Can see "Expense Accounts" menu
- [ ] Cannot create accounts
- [ ] Cannot add deposits
- [ ] Can make payments
- [ ] Can view reports

**Regular Employee (no permissions):**
- [ ] Cannot see "Expense Accounts" menu
- [ ] Cannot access `/expense-accounts` (redirects)
- [ ] Cannot see "Expense Payments" tab on own employee page

---

### Phase 4: Data Validation

#### Step 4.1: Run Validation Scripts

**System Validation:**
```bash
node scripts/validate-expense-account-system.js
```

**Expected Output:**
```
=== Expense Account System Validation ===

✓ All accounts have valid account numbers (ACC-XXXX format)
✓ All balances calculated correctly
✓ No orphaned payments found
✓ Decimal precision correct (2 decimal places)
✓ All payee relationships intact

Summary:
  Accounts: X pass, 0 fail
  Balances: X pass, 0 fail
  Payments: X pass, 0 fail

Overall: PASS ✓
```

- [ ] All validation checks pass
- [ ] No data integrity issues

**Edge Case Testing:**
```bash
node scripts/test-edge-cases.js
```

**Expected Output:**
```
=== Edge Case Testing ===

1. Zero balance accounts: ✓
2. Low balance accounts: X accounts (expected)
3. Decimal precision: ✓ All correct
4. Orphaned payments: ✓ None found
5. Old transactions: X found (expected)
...

All checks complete.
```

- [ ] No critical issues (🔴) found
- [ ] Warnings (⚠️) reviewed and acceptable

---

### Phase 5: Performance Verification

#### Step 5.1: Query Performance Testing

**Test indexed queries:**

```sql
-- Test 1: Account payments query (should be fast with index)
EXPLAIN ANALYZE
SELECT * FROM expense_account_payments
WHERE "expenseAccountId" = 'acc_xxx' AND status = 'SUBMITTED';
```

**Expected:** Execution time < 50ms (with index)

```sql
-- Test 2: Payee payments query (should be fast with index)
EXPLAIN ANALYZE
SELECT * FROM expense_account_payments
WHERE "payeeEmployeeId" = 'emp_xxx' AND status = 'SUBMITTED';
```

**Expected:** Execution time < 50ms (with index)

- [ ] Query execution times acceptable
- [ ] Indexes being used (check EXPLAIN output)

#### Step 5.2: Page Load Performance

**Test key pages:**
- [ ] Account list page loads in < 2 seconds
- [ ] Account detail page loads in < 2 seconds
- [ ] Reports page loads in < 3 seconds
- [ ] Employee expense tab loads in < 2 seconds

**Tools to use:**
- Browser DevTools Network tab
- Lighthouse performance audit
- Real user testing

---

### Phase 6: Security Verification

#### Step 6.1: Authentication & Authorization

- [ ] Unauthenticated requests return 401
- [ ] Unauthorized requests return 403
- [ ] Session expiration works correctly
- [ ] CSRF protection enabled (Next.js default)

**Test Unauthenticated Access:**
```bash
curl -X GET https://your-domain.com/api/expense-account
# Expected: 401 Unauthorized
```

**Test Unauthorized Access:**
```bash
# Login as user without permissions, then:
curl -X POST https://your-domain.com/api/expense-account \
  -H "Cookie: session-token=LIMITED_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountName": "Test"}'
# Expected: 403 Forbidden
```

- [ ] All permission checks working correctly

#### Step 6.2: Input Validation

**Test invalid inputs:**

**Negative amounts:**
```bash
curl -X POST https://your-domain.com/api/expense-account/[accountId]/deposits \
  -H "Cookie: session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": -100, "depositType": "MANUAL"}'
# Expected: 400 Bad Request with validation error
```

**Invalid decimal precision:**
```bash
curl -X POST https://your-domain.com/api/expense-account/[accountId]/payments \
  -H "Cookie: session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.999, "payeeType": "EMPLOYEE", "payeeEmployeeId": "emp_xxx"}'
# Expected: 400 Bad Request or amount rounded to 101.00
```

- [ ] All input validation working
- [ ] Appropriate error messages returned

#### Step 6.3: SQL Injection Prevention

- [ ] Using Prisma ORM (parameterized queries) ✓
- [ ] No raw SQL with user input
- [ ] All queries use Prisma client

**Verification:** Code review confirms no `prisma.$executeRaw` with unsanitized user input

#### Step 6.4: XSS Prevention

- [ ] Using React (auto-escaping) ✓
- [ ] No `dangerouslySetInnerHTML` usage
- [ ] All user inputs properly escaped

**Verification:** Code review confirms no XSS vulnerabilities

---

### Phase 7: Monitoring & Logging Setup

#### Step 7.1: Error Logging

- [ ] Error logging service configured (Sentry, Datadog, etc.)
- [ ] API errors logged with context
- [ ] Client errors captured
- [ ] Log retention policy set

**Test Error Logging:**
```bash
# Trigger a controlled error
curl -X GET https://your-domain.com/api/expense-account/invalid-id
# Expected: Error logged to monitoring service
```

- [ ] Error appears in monitoring dashboard
- [ ] Error includes stack trace and context

#### Step 7.2: Performance Monitoring

- [ ] API response time monitoring enabled
- [ ] Database query performance tracking enabled
- [ ] Slow query alerts configured (> 1 second)
- [ ] Error rate alerts configured (> 1%)

**Monitoring Metrics to Track:**
- API endpoint response times
- Database query duration
- Error rates by endpoint
- Request volume
- Active users

#### Step 7.3: Application Logs

- [ ] Application logs accessible
- [ ] Log level set appropriately (WARN or ERROR for production)
- [ ] Sensitive data not logged (passwords, tokens, etc.)

---

### Phase 8: Rollback Plan

#### Rollback Procedure (in case of critical issues)

**Database Rollback:**
```bash
# 1. Stop application
pm2 stop app-name  # or equivalent

# 2. Restore database from backup
psql -U postgres -d your_database < backup_YYYYMMDD_HHMMSS.sql

# 3. Verify restoration
psql -U postgres -d your_database -c "SELECT COUNT(*) FROM expense_accounts;"
```

**Code Rollback:**
```bash
# 1. Revert to previous git commit
git revert HEAD
git push origin main

# 2. Redeploy previous version
# (depends on deployment method)
```

**Rollback Decision Criteria:**
- [ ] Critical bug causing data corruption → ROLLBACK IMMEDIATELY
- [ ] Critical bug preventing core functionality → ROLLBACK
- [ ] Security vulnerability discovered → ROLLBACK
- [ ] Minor UI issue → DO NOT ROLLBACK (fix forward)
- [ ] Performance degradation → EVALUATE (may not need rollback)

**Rollback Approval:** _______________ (Name/Role)

---

## Post-Deployment Monitoring

### First 24 Hours

**Monitor every 2-4 hours:**
- [ ] Error rate (should be < 1%)
- [ ] API response times (should be < 2 seconds average)
- [ ] Database performance (no slow queries > 1 second)
- [ ] User-reported issues (support tickets, emails)
- [ ] Server resources (CPU, memory, disk)

**Action Items if issues found:**
- Document issue in deployment notes
- Assess severity (critical, high, medium, low)
- Fix critical issues immediately
- Schedule fixes for high/medium issues
- Log low priority issues for future sprint

### First Week

**Monitor daily:**
- [ ] Application uptime (should be > 99.5%)
- [ ] Error trends (increasing or decreasing)
- [ ] Performance trends (improving or degrading)
- [ ] User feedback (positive or negative)
- [ ] Feature adoption (are users using expense accounts?)

**Metrics to collect:**
- Number of expense accounts created
- Number of deposits made
- Number of payments made
- Average payment amount
- Most used categories
- Most active users

### First Month

**Weekly review:**
- [ ] Aggregate performance data
- [ ] Identify optimization opportunities
- [ ] Plan Phase 21 enhancements based on usage
- [ ] Review and close deployment ticket

---

## Success Criteria

**Deployment is considered successful if:**

- [x] All database migrations applied successfully
- [x] All API endpoints responding correctly
- [x] All UI pages loading without errors
- [x] All permission scenarios working correctly
- [x] No critical bugs reported in first 24 hours
- [x] Error rate < 1%
- [x] API response times < 2 seconds average
- [x] All validation scripts pass
- [x] Monitoring and logging operational
- [x] User acceptance testing passed

**Final Sign-Off:**

Deployment Team:
- Developer: _______________ Date: _______
- QA Lead: _______________ Date: _______
- DevOps: _______________ Date: _______
- Product Owner: _______________ Date: _______

**Deployment Status:** ☐ Success ☐ Success with minor issues ☐ Rollback required

**Issues Found (if any):**
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

**Remediation Plan:**
_____________________________________________
_____________________________________________

---

## Appendix

### A. Database Migration Files

1. `prisma/migrations/*_add_expense_accounts/migration.sql` - Core schema
2. `prisma/migrations/add_expense_account_indexes/migration.sql` - Performance indexes

### B. Validation Scripts

1. `scripts/validate-expense-account-system.js` - Data integrity validation
2. `scripts/test-edge-cases.js` - Edge case testing
3. `scripts/test-payee-payment-api.js` - API testing

### C. Documentation References

1. `API-DOCUMENTATION-EXPENSE-ACCOUNTS.md` - API reference
2. `USER-GUIDE-EXPENSE-ACCOUNTS.md` - End user guide
3. `CODE-CLEANUP-RECOMMENDATIONS.md` - Performance optimization guide
4. `E2E-TEST-VALIDATION-CHECKLIST.md` - Full testing checklist
5. `PERMISSION-TESTING-SCENARIOS.md` - Permission scenarios

### D. Emergency Contacts

**Technical Issues:**
- Lead Developer: _______________
- DevOps Engineer: _______________
- Database Administrator: _______________

**Business Issues:**
- Product Owner: _______________
- Project Manager: _______________

**24/7 On-Call:** _______________

---

**End of Deployment Checklist**
