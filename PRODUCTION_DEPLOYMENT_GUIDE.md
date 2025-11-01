# Production Deployment Guide - Fresh Install

**Date**: October 31, 2025  
**Issue**: Migration conflicts during production deployment  
**Solution**: Fresh database install with all migrations

## Quick Fresh Install (Recommended)

### Step 1: Stop All Services

```bash
# Stop the sync service if running
npm run stop

# Or manually kill any Node processes
taskkill /F /IM node.exe
```

### Step 2: Backup Existing Database (Safety)

```bash
# Create backup first (just in case you need data)
pg_dump -U postgres -d multi_business_db > backup_pre_fresh_install_$(date +%Y%m%d_%H%M%S).sql

# Or via psql
psql -U postgres -c "SELECT pg_dump('multi_business_db')" > backup.sql
```

### Step 3: Drop and Recreate Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Drop existing database
DROP DATABASE IF EXISTS multi_business_db;

# Create fresh database
CREATE DATABASE multi_business_db;

# Exit psql
\q
```

### Step 4: Apply All Migrations Fresh

```bash
# Clear any migration locks
rm -f prisma/.prisma-migration-lock

# Reset Prisma client
npx prisma generate

# Apply all migrations fresh (production mode)
npx prisma migrate deploy

# OR for development mode (includes seeding)
npx prisma migrate dev
```

### Step 5: Verify Migration Success

```bash
# Check migration status
npx prisma migrate status

# Expected output: "Database schema is up to date!"
```

### Step 6: Start Services

```bash
# Start the application
npm run start:prod

# Or start sync service
npm run start
```

## Alternative: Fix Existing Database (If You Have Critical Data)

If you absolutely need to keep existing data:

### Step 1: Check for Duplicate Expense Categories

```sql
-- Connect to database
psql -U postgres -d multi_business_db

-- Find duplicates
SELECT "domainId", name, COUNT(*)
FROM expense_categories
GROUP BY "domainId", name
HAVING COUNT(*) > 1;
```

### Step 2: Remove Duplicates (if any found)

```sql
-- Keep first, delete rest
DELETE FROM expense_categories
WHERE id NOT IN (
  SELECT MIN(id)
  FROM expense_categories
  GROUP BY "domainId", name
);
```

### Step 3: Clear Migration Lock

```bash
# Remove lock file
rm -f prisma/.prisma-migration-lock

# Or via database
psql -U postgres -d multi_business_db
DELETE FROM _prisma_migrations WHERE finished_at IS NULL;
\q
```

### Step 4: Apply Migrations with Data Loss Flag

```bash
# This accepts potential data loss
npx prisma db push --accept-data-loss

# Then apply pending migrations
npx prisma migrate deploy
```

## Recommended Approach for Your Situation

Since you mentioned "not much data" and it's a single production server, I strongly recommend:

### ✅ Option 1: Fresh Install (5 minutes)

```bash
# 1. Stop services
npm run stop

# 2. Recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS multi_business_db"
psql -U postgres -c "CREATE DATABASE multi_business_db"

# 3. Apply all migrations
npx prisma migrate deploy

# 4. Start services
npm run start:prod
```

**Pros:**
- ✅ No data conflicts
- ✅ Clean migration history
- ✅ All new features (supplier sharing) included
- ✅ Fast (< 5 minutes)
- ✅ Can test upgrade path later

**Cons:**
- ❌ Loses existing data (but you said "not much")

### ⚠️ Option 2: Fix and Upgrade (15-30 minutes)

Only if you have critical data to preserve:

```bash
# 1. Backup first
pg_dump -U postgres multi_business_db > backup.sql

# 2. Fix duplicates (run SQL above)

# 3. Clear locks
rm -f prisma/.prisma-migration-lock

# 4. Force push schema
npx prisma db push --accept-data-loss

# 5. Apply migrations
npx prisma migrate deploy
```

**Pros:**
- ✅ Keeps existing data

**Cons:**
- ❌ More complex
- ❌ May have other hidden data conflicts
- ❌ Takes longer
- ❌ Risk of partial migration state

## Post-Installation Checklist

After either approach:

### 1. Verify Database Schema

```bash
# Check all tables exist
psql -U postgres -d multi_business_db -c "\dt"

# Check migration history
npx prisma migrate status
```

### 2. Verify Supplier Sharing Migration

```bash
# Check if businessType supplier constraint exists
psql -U postgres -d multi_business_db

SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'business_suppliers' 
AND constraint_type = 'UNIQUE';

# Expected: business_suppliers_businessType_supplierNumber_key
```

### 3. Test Application

```bash
# Start application
npm run start:prod

# Check health
curl http://localhost:8080/api/health

# Login and verify suppliers work correctly
```

## Creating Test Data After Fresh Install

```bash
# Seed demo data (if you have seeders)
npm run seed

# Or manually create test business
# Use the web UI to create:
# 1. User account
# 2. Business
# 3. Suppliers
# 4. Inventory items
```

## Future-Proofing: Proper Upgrade Path

For future deployments with real data:

### 1. Create Pre-Migration Scripts

Create `scripts/pre-migration-checks.ts`:
```typescript
// Check for duplicate expense categories
// Check for data integrity
// Backup critical data
```

### 2. Update Deployment Script

Modify `scripts/start-service.ts` to:
- Run pre-migration checks
- Create automatic backups
- Handle duplicate cleanup
- Apply migrations safely

### 3. Test Upgrades

Before production:
- Test upgrade on staging with production-like data
- Document any manual steps needed
- Create rollback procedures

## My Strong Recommendation

Given your situation:

🎯 **Do the Fresh Install Now**

Reasons:
1. ✅ Fastest solution (5 minutes)
2. ✅ No data conflicts
3. ✅ Includes all new Phase 3-6 changes
4. ✅ Clean migration history
5. ✅ Can test upgrade path later with controlled data

Then:
1. Document the fresh install process (done above)
2. Create test data scenarios
3. Test the upgrade path on a copy later
4. Build proper migration tooling for future

## Commands Summary

### Fresh Install (Recommended):
```bash
npm run stop
psql -U postgres -c "DROP DATABASE IF EXISTS multi_business_db"
psql -U postgres -c "CREATE DATABASE multi_business_db"
npx prisma migrate deploy
npm run start:prod
```

### Fix Existing (If needed):
```bash
npm run stop
# Fix duplicates in psql (see SQL above)
rm -f prisma/.prisma-migration-lock
npx prisma db push --accept-data-loss
npx prisma migrate deploy
npm run start:prod
```

## Need Help?

If you encounter issues:

1. Check database connectivity: `npm run diagnose:database`
2. Check migration status: `npx prisma migrate status`
3. View migration history: `psql -U postgres -d multi_business_db -c "SELECT * FROM _prisma_migrations"`
4. Check logs: Look in logs/ directory

Let me know which approach you'd like to take and I can guide you through it!
