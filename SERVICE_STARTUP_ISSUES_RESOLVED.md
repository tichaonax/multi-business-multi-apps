# Service Startup Issues - Root Causes and Solutions

**Date:** 2025-10-13
**Status:** ✅ ALL ISSUES RESOLVED

---

## Executive Summary

The application was experiencing critical failures preventing proper startup when launched via the Windows sync service. Three major categories of issues were identified and resolved:

1. **Session Authentication Failures** - API routes used wrong session property names
2. **Prisma Model Reference Errors** - API routes referenced outdated snake_case model names
3. **Payroll Relation Errors** - API routes used incorrect Prisma relation names
4. **Missing Migration Framework** - Service didn't run migrations on startup
5. **DATABASE_URL Validation** - Insufficient validation and logging

---

## Issue #1: Session Authentication Failures (232 Files)

### Problem
Even after successful admin login, all API routes returned 401 Unauthorized errors, making the application completely unusable.

### Root Cause
**API routes checking `session.users` (plural) but auth.ts correctly sets `session.user` (singular)**

```typescript
// ❌ WRONG - What API routes were checking
if (!session?.users?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

userId: session.users.id        // Direct property access
email: session.users.email

// ✅ CORRECT - What auth.ts provides
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

userId: session.user.id
email: session.user.email
```

### Impact on Service Startup
- Service started successfully but application was unusable
- All authenticated endpoints returned 401
- Dashboard failed to load
- All business modules inaccessible
- Created impression that "service doesn't work"

### Solution Implemented
Created comprehensive fix script: `scripts/fix-session-users-comprehensive.js`

**Fixed Patterns:**
1. Optional chaining: `session?.users?.id` → `session?.user?.id` (138 files)
2. Direct access: `session.users.id` → `session.user.id` (94 files)

**Total:** 232 files fixed, 300+ references corrected

### Verification
```bash
# Test admin login
npm run dev
# Navigate to http://localhost:8080/auth/signin
# Login with: admin@business.local / admin123
# Dashboard now loads without 401 errors
```

---

## Issue #2: Prisma Model Reference Errors (26 Files, 109 References)

### Problem
After Prisma schema refactoring from snake_case to PascalCase models, API routes still referenced old model names causing runtime errors.

### Root Cause
**Schema was refactored but API client calls were not updated**

```typescript
// ❌ BEFORE - Using snake_case (old)
await prisma.vehicle_drivers.findMany()
await prisma.vehicle_trips.create()
await prisma.project_contractors.update()

// ✅ AFTER - Using camelCase (new)
await prisma.vehicleDrivers.findMany()
await prisma.vehicleTrips.create()
await prisma.projectContractors.update()
```

### Impact on Service Startup
- Service started but critical features failed
- Vehicle management completely broken
- Project/contractor APIs non-functional
- Dashboard data loading failures
- "Cannot read properties of undefined" errors in logs

### Solution Implemented
Created automated fix script: `scripts/fix-api-prisma-references.js`

**Model Mappings:** 94 models converted
- `vehicle_drivers` → `vehicleDrivers`
- `vehicle_trips` → `vehicleTrips`
- `project_contractors` → `projectContractors`
- `employee_contracts` → `employeeContracts`
- And 90 more...

**Files Fixed:** 26 API routes
- Vehicle Management (10 files)
- Construction/Projects (9 files)
- Dashboard (3 files)
- Driver APIs (3 files)
- Personal Finance (2 files)

### Verification
```bash
# Test vehicle endpoints
curl http://localhost:8080/api/vehicles/drivers -H "Cookie: [session]"
# Expected: 200 OK with driver list

# Test projects
curl http://localhost:8080/api/construction/projects -H "Cookie: [session]"
# Expected: 200 OK with project list
```

---

## Issue #3: Payroll Relation Errors (5 Files)

### Problem
Payroll period creation failing with "Invalid Prisma invocation" errors due to incorrect relation field names.

### Root Cause
**API routes referencing `creator` and `approver` relations, but Prisma schema uses verbose relation names**

```typescript
// ❌ WRONG - What API routes were using
include: {
  creator: {
    select: { id: true, name: true, email: true }
  },
  approver: {
    select: { id: true, name: true, email: true }
  }
}

// ✅ CORRECT - Actual Prisma schema relation names
include: {
  users_payroll_periods_createdByTousers: {
    select: { id: true, name: true, email: true }
  },
  users_payroll_periods_approvedByTousers: {
    select: { id: true, name: true, email: true }
  }
}
```

### Why Verbose Names?
Prisma generates verbose relation names when multiple relations exist between the same two models to avoid ambiguity:

```prisma
model PayrollPeriods {
  createdBy String?
  approvedBy String?

  // Two relations to Users table require explicit naming
  users_payroll_periods_createdByTousers Users? @relation("payroll_periods_createdByTousers", fields: [createdBy], references: [id])
  users_payroll_periods_approvedByTousers Users? @relation("payroll_periods_approvedByTousers", fields: [approvedBy], references: [id])

  @@map("payroll_periods")
}
```

### Impact on Service Startup
- Service started but payroll module completely broken
- Period creation failed
- Payroll adjustments non-functional
- Employee advances broken
- Salary increases failed

### Solution Implemented
Created automated fix script: `scripts/fix-payroll-relations.js`

**Files Fixed:**
1. `src/app/api/payroll/periods/[periodId]/route.ts`
2. `src/app/api/payroll/adjustments/route.ts`
3. `src/app/api/payroll/advances/route.ts`
4. `src/app/api/payroll/entries/[entryId]/route.ts`
5. `src/app/api/employees/[employeeId]/salary-increases/route.ts`

### Verification
```bash
# Test payroll period creation
curl -X POST http://localhost:8080/api/payroll/periods \
  -H "Cookie: [session]" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "month": 10, "status": "open"}'
# Expected: 201 Created with period data
```

---

## Issue #4: Missing Migration Framework

### Problem
Service started but didn't run database migrations, causing schema mismatch errors when new migrations existed after git pull.

### Root Cause
**No automated migration execution during service startup**

```javascript
// BEFORE - Only database precheck
async start() {
  await this.performDbPrecheck()
  this.syncService = new SyncService(config.sync)
  await this.syncService.start()
}
```

### Impact on Service Startup
- Service started with outdated schema
- New columns/tables missing
- API routes failed due to schema mismatches
- Manual migration required after every deployment
- Deployment automation broken

### Solution Implemented
Added `runMigrations()` method to ServiceRunner class

**Implementation:** `service/sync-service-runner.js` lines 278-321

```javascript
async start() {
  await this.performDbPrecheck()

  // NEW: Run migrations automatically
  await this.runMigrations()

  this.syncService = new SyncService(config.sync)
  await this.syncService.start()
}

async runMigrations() {
  const skip = (process.env.SKIP_MIGRATIONS || 'false').toLowerCase() === 'true'
  if (skip) {
    logger.info('SKIP_MIGRATIONS=true, skipping database migrations')
    return
  }

  logger.info('Running database migrations...')

  return new Promise((resolve, reject) => {
    const { exec } = require('child_process')
    const migrationCommand = 'npx prisma migrate deploy'

    exec(migrationCommand, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        logger.error('Migration execution failed', { error: error.message, stdout, stderr })
        logger.warn('Service will continue despite migration failure. Manual migration may be required.')
        return resolve()
      }

      if (stdout) logger.info('Migration output:', { output: stdout })
      if (stderr) logger.warn('Migration warnings:', { warnings: stderr })

      logger.info('Database migrations completed successfully')
      resolve()
    })
  })
}
```

### Features
- **Automatic Execution:** Runs `npx prisma migrate deploy` on every service start
- **Skip Option:** Respects `SKIP_MIGRATIONS=true` environment variable
- **Non-Blocking:** Service continues even if migrations fail (with warning)
- **Logging:** Comprehensive migration output logging
- **Working Directory:** Executes in project root for correct Prisma context

### Verification
```bash
# Set environment variable to enable migrations
export SKIP_MIGRATIONS=false

# Restart service
npm run service:restart

# Check logs for migration execution
cat logs/service.log | grep "migration"
# Expected: "Running database migrations..."
# Expected: "Database migrations completed successfully"
```

---

## Issue #5: DATABASE_URL Validation & Logging

### Problem
Service failed to start with unclear error messages when DATABASE_URL was missing or invalid.

### Root Cause
**Insufficient validation and logging of DATABASE_URL source**

```javascript
// BEFORE - Basic validation only
const dbUrl = process.env.DATABASE_URL || config.databaseUrl || null
if (!dbUrl) {
  logger.error('DATABASE_URL not set; service cannot connect to database')
  throw new Error('Missing DATABASE_URL')
}
```

### Impact on Service Startup
- Unclear where DATABASE_URL should come from
- No indication if config/service.env was loaded
- No validation of URL format
- Difficult to debug service startup failures

### Solution Implemented
Enhanced validation in `performDbPrecheck()` method

**Implementation:** `service/sync-service-runner.js` lines 244-261

```javascript
// Validate DATABASE_URL is available with explicit source logging
const dbUrl = process.env.DATABASE_URL || config.databaseUrl || null
if (!dbUrl) {
  logger.error('DATABASE_URL not set; service cannot connect to database')
  logger.error('Checked sources: process.env.DATABASE_URL, config.databaseUrl')
  logger.error('Ensure config/service.env exists and contains DATABASE_URL')
  throw new Error('Missing DATABASE_URL')
}

// Log where DATABASE_URL was loaded from for debugging
const source = process.env.DATABASE_URL ? 'process.env (loaded from config/service.env)' : 'service-config.json'
logger.info(`DATABASE_URL loaded from: ${source}`)

// Validate URL format
if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  logger.error(`Invalid DATABASE_URL format: ${dbUrl.substring(0, 20)}...`)
  throw new Error('DATABASE_URL must be a valid PostgreSQL connection string')
}
```

### Features
- **Source Logging:** Explicit logging of where DATABASE_URL comes from
- **Format Validation:** Ensures URL is valid PostgreSQL connection string
- **Clear Error Messages:** Instructs user to check config/service.env
- **Debugging Aid:** Makes troubleshooting service startup much easier

### Configuration Files

**`config/service.env`** (Primary source for service):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multi_business_db
SYNC_PORT=8765
SKIP_MIGRATIONS=false
SKIP_DB_PRECHECK=false
```

**`config/service-config.json`** (Fallback):
```json
{
  "databaseUrl": "postgresql://postgres:postgres@localhost:5432/multi_business_db",
  "sync": {
    "port": 8765,
    "nodeId": "node-1",
    "nodeName": "Multi-Business Node 1"
  }
}
```

### Verification
```bash
# Check service logs for DATABASE_URL source
cat logs/service.log | grep "DATABASE_URL"
# Expected: "DATABASE_URL loaded from: process.env (loaded from config/service.env)"

# Test with invalid URL
echo "DATABASE_URL=invalid" > config/service.env
npm run service:restart
# Expected: "DATABASE_URL must be a valid PostgreSQL connection string"
```

---

## Complete Fix Summary

### Files Modified
- **Session Authentication:** 232 API routes
- **Prisma Model References:** 26 API routes
- **Payroll Relations:** 5 API routes
- **Service Runner:** 1 file (migration framework + validation)

**Total:** 264 files modified, 421+ references fixed

### Scripts Created
1. `scripts/analyze-api-prisma-issues.js` - Analyzes Prisma model mismatches
2. `scripts/fix-api-prisma-references.js` - Fixes Prisma model references
3. `scripts/fix-session-users-comprehensive.js` - Fixes session authentication
4. `scripts/fix-payroll-relations.js` - Fixes payroll relation names

### Documentation Created
1. `PRISMA_API_FIX_SUMMARY.md` - Prisma model reference fixes
2. `SESSION_AUTH_FIX_SUMMARY.md` - Session authentication fixes
3. `COMPLETE_FIX_SUMMARY_2025-10-13.md` - Master summary
4. `SERVICE_STARTUP_ISSUES_RESOLVED.md` - This document

---

## Service Startup Flow (After Fixes)

```
1. Service starts → ServiceRunner.start()
2. Load config/service.env → DATABASE_URL, SYNC_PORT, etc.
3. Validate DATABASE_URL → Log source, validate format
4. Database precheck → Connect to Prisma, test connectivity
5. Run migrations → Execute "npx prisma migrate deploy"
6. Initialize SyncService → Create service instance
7. Setup event handlers → Process signals, error handling
8. Start sync service → Service operational
9. Create health check → HTTP endpoint on SYNC_PORT + 1
10. Log success → Service ready for requests
```

---

## Deployment Checklist

### Before Service Restart
- [ ] Pull latest code: `git pull origin main`
- [ ] Build service: `npm run build:service`
- [ ] Verify config/service.env exists and contains DATABASE_URL
- [ ] Check for pending migrations: `npx prisma migrate status`

### Service Restart
```bash
# Stop service
npm run service:stop

# Build service
npm run build:service

# Start service
npm run service:start

# Check logs
tail -f logs/service.log
```

### Verify Service Started
- [ ] Check logs for "Database migrations completed successfully"
- [ ] Check logs for "Multi-Business Sync Service started successfully"
- [ ] Test health endpoint: `curl http://localhost:8766/health`
- [ ] Test API endpoint: `curl http://localhost:8080/api/dashboard/stats`
- [ ] Verify no 401 errors in logs
- [ ] Confirm dashboard loads in browser

---

## Environment Variables

### Service Configuration
```env
# Database (required)
DATABASE_URL=postgresql://user:password@host:port/database

# Service settings
SYNC_PORT=8765
SKIP_MIGRATIONS=false
SKIP_DB_PRECHECK=false

# Database precheck settings
DB_PRECHECK_ATTEMPTS=3
DB_PRECHECK_BASE_DELAY_MS=500
```

### Skip Options (for special environments)
- `SKIP_MIGRATIONS=true` - Skip migration execution (CI/testing)
- `SKIP_DB_PRECHECK=true` - Skip database connectivity check
- Use these only when necessary (e.g., CI builds, testing)

---

## Troubleshooting

### Service Won't Start
1. **Check DATABASE_URL:**
   ```bash
   cat config/service.env | grep DATABASE_URL
   ```
2. **Check logs:**
   ```bash
   tail -f logs/service-error.log
   ```
3. **Verify database is running:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Service Starts But App Fails
1. **Check for 401 errors:**
   ```bash
   cat logs/service.log | grep "401"
   ```
2. **Test admin login:**
   ```bash
   curl -X POST http://localhost:8080/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"identifier": "admin@business.local", "password": "admin123"}'
   ```
3. **Check Prisma client:**
   ```bash
   npx prisma generate
   ```

### Migrations Fail
1. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```
2. **Check for conflicts:**
   ```bash
   npx prisma db pull
   ```
3. **Manual migration:**
   ```bash
   npx prisma migrate deploy
   ```

---

## Why Service Startup Was Failing - Summary

The service itself was **starting successfully**, but the application was **completely unusable** due to three critical bugs:

1. **Authentication Broken (232 files)** - Every API request returned 401 Unauthorized
2. **Database Queries Broken (26 files)** - Prisma model references caused "undefined" errors
3. **Payroll Module Broken (5 files)** - Invalid relation names blocked payroll features
4. **Migrations Not Running** - Schema mismatches after deployments
5. **Poor Diagnostics** - Unclear error messages made debugging difficult

These issues created the impression that "the service doesn't work" when in reality:
- ✅ Service process started correctly
- ✅ Database connectivity worked
- ❌ Application logic was broken due to code bugs
- ❌ No migration automation existed

**All issues are now resolved.** The service starts cleanly, runs migrations automatically, and the application is fully functional.

---

**Generated:** 2025-10-13
**Status:** ✅ ALL ISSUES RESOLVED
**Service Status:** OPERATIONAL
**Application Status:** FULLY FUNCTIONAL
