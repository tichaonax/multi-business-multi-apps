# Sibling Expense Accounts - Data Migration Testing Guide

## Overview

This guide provides procedures for testing the data migration required for the sibling expense accounts feature. The migration adds new fields to the expense accounts table and creates indexes for performance.

## Migration Changes

### Database Schema Changes

The migration adds the following fields to the `ExpenseAccount` table:

```sql
-- New columns for sibling account support
ALTER TABLE "ExpenseAccount" ADD COLUMN "isSibling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExpenseAccount" ADD COLUMN "parentAccountId" TEXT;
ALTER TABLE "ExpenseAccount" ADD COLUMN "siblingNumber" INTEGER;
ALTER TABLE "ExpenseAccount" ADD COLUMN "canMerge" BOOLEAN NOT NULL DEFAULT true;

-- Foreign key constraint
ALTER TABLE "ExpenseAccount" ADD CONSTRAINT "ExpenseAccount_parentAccountId_fkey"
  FOREIGN KEY ("parentAccountId") REFERENCES "ExpenseAccount"("id") ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX "ExpenseAccount_parentAccountId_idx" ON "ExpenseAccount"("parentAccountId");
CREATE INDEX "ExpenseAccount_isSibling_idx" ON "ExpenseAccount"("isSibling");
CREATE INDEX "ExpenseAccount_siblingNumber_idx" ON "ExpenseAccount"("siblingNumber");
```

### Migration Script Location

- **Prisma Migration:** `prisma/migrations/[timestamp]_add_sibling_expense_accounts/`
- **Manual Script:** `scripts/migrate-sibling-accounts.js`
- **Rollback Script:** `scripts/rollback-sibling-accounts.js`

## Pre-Migration Testing

### 1. Database Backup Verification

```bash
# Verify backup exists and is recent
ls -la backups/
# Should show backup file from within last 24 hours

# Check backup integrity
pg_restore --list backup_file.dump > /dev/null
echo "Backup integrity: $?"
```

### 2. Current Data Assessment

```sql
-- Count existing expense accounts
SELECT COUNT(*) as total_accounts FROM "ExpenseAccount";

-- Check for any existing sibling-like data
SELECT COUNT(*) as potential_conflicts
FROM "ExpenseAccount"
WHERE "accountNumber" LIKE '%-%'
   OR "accountName" LIKE '%sibling%'
   OR "accountName" LIKE '%historical%';

-- Verify no existing foreign key conflicts
SELECT COUNT(*) as orphaned_accounts
FROM "ExpenseAccount" ea
LEFT JOIN "Business" b ON ea."businessId" = b.id
WHERE b.id IS NULL;
```

### 3. Application Health Check

```bash
# Test current application functionality
npm run test:integration
npm run test:e2e:smoke

# Check for any existing issues
grep -r "ExpenseAccount" logs/ | tail -20
```

## Migration Execution

### Step 1: Run Migration in Staging

```bash
# Ensure we're in staging environment
echo $NODE_ENV
# Should output: staging

# Run Prisma migration
npx prisma migrate deploy

# Alternative: Run manual migration script
node scripts/migrate-sibling-accounts.js
```

### Step 2: Verify Migration Success

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ExpenseAccount'
  AND column_name IN ('isSibling', 'parentAccountId', 'siblingNumber', 'canMerge')
ORDER BY column_name;

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ExpenseAccount'
  AND indexname LIKE '%sibling%';

-- Check foreign key constraint
SELECT conname, conrelid::regclass, confrelid::regclass, confupdtype, confdeltype
FROM pg_constraint
WHERE conname = 'ExpenseAccount_parentAccountId_fkey';
```

### Step 3: Data Integrity Check

```sql
-- Verify all accounts have default values
SELECT COUNT(*) as total_accounts,
       COUNT(CASE WHEN "isSibling" = false THEN 1 END) as regular_accounts,
       COUNT(CASE WHEN "isSibling" IS NULL THEN 1 END) as null_isSibling
FROM "ExpenseAccount";

-- Check no orphaned parent references
SELECT COUNT(*) as orphaned_siblings
FROM "ExpenseAccount"
WHERE "isSibling" = true
  AND "parentAccountId" NOT IN (
    SELECT id FROM "ExpenseAccount" WHERE "isSibling" = false
  );
```

## Post-Migration Testing

### 1. Application Functionality Tests

```bash
# Run full test suite
npm run test

# Run sibling-specific tests
npm run test -- --testPathPattern=sibling

# Test API endpoints
node scripts/test-sibling-apis.js
```

### 2. Data Consistency Tests

```javascript
// test-sibling-migration.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSiblingMigration() {
  console.log('Testing sibling account migration...')

  // Test 1: All accounts have isSibling field
  const accountsWithoutIsSibling = await prisma.expenseAccount.findMany({
    where: { isSibling: null }
  })
  console.log(`Accounts without isSibling: ${accountsWithoutIsSibling.length}`)

  // Test 2: No invalid parent references
  const invalidSiblings = await prisma.expenseAccount.findMany({
    where: {
      isSibling: true,
      parentAccountId: { not: null },
      parentAccount: null
    }
  })
  console.log(`Invalid sibling references: ${invalidSiblings.length}`)

  // Test 3: Sibling numbers are sequential
  const siblingsByParent = await prisma.expenseAccount.groupBy({
    by: ['parentAccountId'],
    where: { isSibling: true },
    _count: true
  })
  console.log('Sibling counts by parent:', siblingsByParent)

  console.log('Migration tests completed')
}

testSiblingMigration().catch(console.error)
```

### 3. Performance Impact Assessment

```sql
-- Measure query performance before/after migration
EXPLAIN ANALYZE
SELECT * FROM "ExpenseAccount"
WHERE "businessId" = 'test-business-id'
ORDER BY "createdAt" DESC;

-- Test sibling-specific queries
EXPLAIN ANALYZE
SELECT * FROM "ExpenseAccount"
WHERE "parentAccountId" = 'test-parent-id'
  AND "isSibling" = true
ORDER BY "siblingNumber" ASC;
```

### 4. UI Testing

```bash
# Start staging application
npm run dev:staging

# Run automated UI tests
npm run test:e2e:sibling-accounts

# Manual testing checklist:
# - Create sibling account ✓
# - Enter historical payment ✓
# - View sibling in list ✓
# - Merge sibling account ✓
# - Verify data integrity ✓
```

## Rollback Testing

### Emergency Rollback Procedure

```bash
# Stop application
pm2 stop all

# Run rollback migration
npx prisma migrate reset --force

# Alternative: Manual rollback
node scripts/rollback-sibling-accounts.js

# Restore from backup if needed
pg_restore -d database_name backup_file.dump

# Restart application
pm2 restart all
```

### Rollback Verification

```sql
-- Verify columns removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'ExpenseAccount'
  AND column_name IN ('isSibling', 'parentAccountId', 'siblingNumber', 'canMerge');

-- Should return no rows
```

## Load Testing

### 1. Create Test Data

```javascript
// create-test-siblings.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createTestSiblings() {
  // Create parent accounts
  const parents = await prisma.expenseAccount.findMany({ take: 10 })

  for (const parent of parents) {
    // Create 5 siblings per parent
    for (let i = 1; i <= 5; i++) {
      await prisma.expenseAccount.create({
        data: {
          accountNumber: `${parent.accountNumber}-${i.toString().padStart(2, '0')}`,
          accountName: `Test Sibling ${i}`,
          businessId: parent.businessId,
          isSibling: true,
          parentAccountId: parent.id,
          siblingNumber: i,
          balance: Math.random() * 1000,
        }
      })
    }
  }

  console.log('Test siblings created')
}

createTestSiblings().catch(console.error)
```

### 2. Performance Testing

```bash
# Load test sibling creation
artillery quick --count 50 --num 10 http://staging-api.com/api/expense-account/test-parent/sibling

# Test sibling listing
artillery quick --count 100 --num 5 http://staging-api.com/api/expense-account/test-parent/sibling

# Test merging
artillery quick --count 20 --num 2 http://staging-api.com/api/expense-account/test-sibling/merge
```

## Monitoring & Alerts

### Key Metrics to Monitor

```sql
-- Sibling account creation rate
SELECT
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as siblings_created
FROM "ExpenseAccount"
WHERE "isSibling" = true
  AND "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Merge operation success rate
SELECT
  COUNT(*) as total_merges,
  COUNT(CASE WHEN success = true THEN 1 END) as successful_merges
FROM "AuditLog"
WHERE action = 'sibling_merge'
  AND "createdAt" >= NOW() - INTERVAL '24 hours';
```

### Alert Conditions

- Migration fails: Immediate alert to DevOps
- Data inconsistency detected: High priority alert
- Performance degradation > 20%: Warning alert
- Sibling creation errors > 5%: Medium priority alert

## Success Criteria

### ✅ Migration Success
- [ ] All new columns created successfully
- [ ] Indexes created and functioning
- [ ] Foreign key constraints active
- [ ] No data loss or corruption

### ✅ Application Functionality
- [ ] All existing features work unchanged
- [ ] New sibling features work correctly
- [ ] API endpoints respond correctly
- [ ] UI components render properly

### ✅ Performance Requirements
- [ ] Query performance within 10% of baseline
- [ ] Page load times acceptable
- [ ] No memory leaks detected

### ✅ Data Integrity
- [ ] All existing data preserved
- [ ] New default values applied correctly
- [ ] Referential integrity maintained

## Production Deployment Readiness

### Final Checklist
- [ ] Migration tested on staging with production-like data
- [ ] Rollback procedures tested and documented
- [ ] Monitoring alerts configured
- [ ] Support team trained on new features
- [ ] User communication prepared
- [ ] Emergency contact list updated

### Go/No-Go Decision Criteria
- **GO:** All tests pass, no critical issues, performance acceptable
- **NO-GO:** Data corruption, critical functionality broken, performance degradation > 25%

---

**Migration Test Date:** _______________
**Tested By:** __________________
**Migration Script Version:** 1.0.0
**Database Version:** _______________

**Test Results:**
- Migration Time: _____ seconds
- Data Integrity: ✅ PASS / ❌ FAIL
- Performance Impact: _____ %
- Rollback Tested: ✅ YES / ❌ NO