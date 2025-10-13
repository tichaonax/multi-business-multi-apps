# Deployment & Service Installation Issues - Root Cause Analysis

**Date:** 2025-10-13
**Status:** CRITICAL - Multiple blocking issues identified

---

## 🔴 Critical Issues Summary

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| Prisma schema naming violations | 🔴 CRITICAL | Seed scripts fail, models not found | Identified |
| Seed script model name mismatches | 🔴 CRITICAL | Reference data not seeded | Identified |
| Sync service DATABASE_URL access | 🔴 CRITICAL | Service can't run migrations | Identified |
| Column naming inconsistency | 🟡 HIGH | Mixed snake_case/camelCase breaks convention | Identified |

---

## Issue #1: Prisma Schema Naming Convention Violations

### **Stated Convention (from CLAUDE.md):**
- ✅ **Models:** PascalCase (User, Employee, JobTitle)
- ✅ **Table names:** snake_case with `@@map("table_name")`
- ✅ **Columns:** camelCase (userId, createdAt, isActive)

### **Actual Schema State (lines 1-915):**

#### ❌ Models using snake_case names directly:
```prisma
model accounts { ... }           // Should be: model Accounts { @@map("accounts") }
model audit_logs { ... }          // Should be: model AuditLogs { @@map("audit_logs") }
model benefit_types { ... }       // Should be: model BenefitTypes { @@map("benefit_types") }
model business_accounts { ... }   // Should be: model BusinessAccounts { @@map("business_accounts") }
model business_brands { ... }     // Should be: model BusinessBrands { @@map("business_brands") }
model business_categories { ... } // Should be: model BusinessCategories { @@map("business_categories") }
model business_customers { ... }  // Should be: model BusinessCustomers { @@map("business_customers") }
model business_memberships { ... }// Should be: model BusinessMemberships { @@map("business_memberships") }
... (continues for 100+ models)
```

#### ❌ Mixed column naming (snake_case AND camelCase):
```prisma
model benefit_types {
  id                     String                   @id
  name                   String                   @unique
  description            String?
  type                   String
  createdAt              DateTime                 @default(now())  // ✅ camelCase
  defaultAmount          Decimal?                 // ✅ camelCase
  isActive               Boolean                  @default(true)   // ✅ camelCase
  isPercentage           Boolean                  @default(false)  // ✅ camelCase
  updatedAt              DateTime                 @default(now())  // ✅ camelCase

  // BUT table name should be mapped:
  @@map("benefit_types")  // ❌ MISSING!
}

model id_format_templates {
  id          String      @id
  name        String
  description String?
  pattern     String
  example     String
  countryCode String?     // ✅ camelCase column
  createdAt   DateTime    // ✅ camelCase column
  isActive    Boolean     // ✅ camelCase column
  updatedAt   DateTime    // ✅ camelCase column

  @@map missing!  // ❌ Should be: @@map("id_format_templates")
}
```

### **Impact:**

When you run `npx prisma generate`, Prisma creates:
```typescript
// Current (WRONG):
prisma.accounts         // lowercase model name
prisma.audit_logs       // snake_case model name
prisma.benefit_types    // snake_case model name
prisma.id_format_templates  // snake_case model name

// Expected (CORRECT per convention):
prisma.accounts         // from model Accounts
prisma.auditLogs        // from model AuditLogs
prisma.benefitTypes     // from model BenefitTypes
prisma.idFormatTemplates // from model IdFormatTemplates
```

**Seed scripts expect camelCase, but get snake_case → FAILS!**

---

## Issue #2: Seed Script Model Name Mismatches

### **seed-migration-data.js expectations:**

```javascript
// Line 107: Expects camelCase Prisma client property
await prisma.idFormatTemplates.upsert({ ... })

// Line 192: Expects camelCase
await prisma.jobTitles.upsert({ ... })

// Line 239: Expects camelCase
await prisma.compensationTypes.upsert({ ... })

// Line 309: Expects camelCase
await prisma.benefitTypes.upsert({ ... })
```

### **Actual generated Prisma client:**
```typescript
// Generated from model id_format_templates (snake_case model name)
prisma.id_format_templates.upsert()  // ❌ WRONG

// Not available:
prisma.idFormatTemplates  // ❌ undefined
```

### **Error Result:**
```
TypeError: Cannot read properties of undefined (reading 'upsert')
at seedIdTemplates (seed-migration-data.js:107:34)
```

### **Affected Scripts:**
1. ✅ `seed-migration-data.js` - Used by service startup
2. ✅ `production-setup.js` - Used by fresh install
3. ✅ `seed-all-employee-data.js` - Used by database reset recovery
4. ✅ `setup-after-pull.js` - Calls above scripts

**All seeding FAILS → App has no reference data → Dropdowns empty → Forms broken!**

---

## Issue #3: Sync Service DATABASE_URL Access

### **Current Flow:**

1. **Hook triggers:** `setup-after-pull.js` (on git pull)
2. **Builds service:** `npm run build:service` → creates `dist/service/sync-service-runner.js`
3. **User installs:** `npm run service:install` → registers Windows service
4. **User starts:** `npm run service:start` → service wrapper calls sync-service-runner.js
5. **Service startup sequence:**
   ```typescript
   // sync-service-runner.ts line 98-118
   async runDatabaseSetup() {
     // Tries to run migrations
     await execAsync('npx prisma migrate deploy')  // ❌ May not have DATABASE_URL!

     // Tries to seed
     await execAsync('npm run seed:migration')  // ❌ Will fail (Issue #2)
   }
   ```

### **Problem:**

Windows services run under different user context (Local System) and may not inherit environment variables from `.env` file!

**Potential failures:**
1. **Environment not loaded:** `DATABASE_URL` is undefined
2. **Prisma can't connect:** Migrations fail
3. **Seed scripts fail:** Even if DB connects, seed fails due to Issue #2

### **Current Mitigation (Partial):**

```typescript
// sync-service-runner.ts lines 8-14
import dotenv from 'dotenv'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })
```

✅ **Good:** Explicitly loads .env
❌ **Problem:** `process.cwd()` may not be the app directory when run as Windows service!

---

## Issue #4: Git Hook Deployment Flow

### **Current Flow (setup-after-pull.js):**

```javascript
// Line 150-178: Detects fresh install vs upgrade
async function isFreshInstall() {
  // PRIMARY: Database doesn't exist
  const dbExists = await checkDatabaseExists()
  if (!dbExists) return true

  // SECONDARY: Database exists but empty
  const hasUsers = await checkHasUsers()
  return !hasUsers
}

// Line 184-286: Fresh install handler
async function handleFreshInstall() {
  // Runs schema setup
  run('node scripts/setup-database-schema.js')

  // Runs production seeding
  run('node scripts/production-setup.js')  // ❌ WILL FAIL (Issue #2)

  // Runs UI validation
  run('node scripts/validate-ui-relations.js')
}
```

### **Problems:**

1. **No schema validation:** Doesn't check if schema follows naming convention
2. **Seed failure not caught:** Seeding fails silently, app continues
3. **Service starts anyway:** Even without reference data
4. **UI validation premature:** Runs before migrations complete

### **Result:**
- ✅ Service installs successfully
- ✅ Service starts successfully
- ❌ App doesn't work (no reference data in dropdowns)
- ❌ Forms fail validation (missing job titles, compensation types, etc.)

---

## 🔧 **Recommended Fix Priority**

### **Phase 1: Emergency Hotfix (Immediate)**
1. ✅ Fix `seed-migration-data.js` to use actual generated model names
2. ✅ Fix `production-setup.js` to use actual generated model names
3. ✅ Fix sync service DATABASE_URL loading
4. ✅ Test fresh install flow

### **Phase 2: Schema Consistency (Next Sprint)**
1. ⏳ Convert all models to PascalCase with @@map()
2. ⏳ Ensure all columns are camelCase
3. ⏳ Update ALL API routes to use correct Prisma client names
4. ⏳ Regenerate Prisma client
5. ⏳ Full regression testing

### **Phase 3: Process Improvements (Future)**
1. ⏳ Add pre-commit hook to validate schema naming
2. ⏳ Add CI/CD validation for Prisma client generation
3. ⏳ Document naming convention enforcement

---

## 📝 **Detailed Fix Steps**

### **Fix #1: Update Seed Scripts (Emergency)**

**Target Files:**
- `scripts/seed-migration-data.js`
- `scripts/production-setup.js`
- `scripts/seed-all-employee-data.js`

**Changes Required:**

```javascript
// BEFORE (expecting camelCase):
await prisma.idFormatTemplates.upsert({ ... })
await prisma.jobTitles.upsert({ ... })
await prisma.compensationTypes.upsert({ ... })
await prisma.benefitTypes.upsert({ ... })

// AFTER (using actual snake_case generated names):
await prisma.id_format_templates.upsert({ ... })
await prisma.job_titles.upsert({ ... })
await prisma.compensation_types.upsert({ ... })
await prisma.benefit_types.upsert({ ... })
```

**Verification:**
```bash
# 1. Check generated Prisma client
cat node_modules/.prisma/client/index.d.ts | grep "export.*Delegate"

# 2. Confirm model names
# Should see: id_format_templates, job_titles, compensation_types, benefit_types
```

### **Fix #2: Sync Service DATABASE_URL**

**File:** `src/service/sync-service-runner.ts`

**Current (line 8-14):**
```typescript
import dotenv from 'dotenv'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })
```

**Fix:**
```typescript
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Get actual script directory (not cwd which may be wrong in service context)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..', '..')

// Load .env from actual app root
dotenv.config({ path: path.join(ROOT_DIR, '.env.local') })
dotenv.config({ path: path.join(ROOT_DIR, '.env') })

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL not found in environment!')
  console.error('Checked paths:')
  console.error(`  - ${path.join(ROOT_DIR, '.env.local')}`)
  console.error(`  - ${path.join(ROOT_DIR, '.env')}`)
  process.exit(1)
}
```

### **Fix #3: Add Preflight Checks**

**File:** `scripts/setup-after-pull.js`

Add before running seeds:

```javascript
async function validatePrismaClient() {
  console.log('🔍 Validating Prisma client generation...')

  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // Check if expected models exist
    const requiredModels = [
      'id_format_templates',
      'job_titles',
      'compensation_types',
      'benefit_types',
      'users'
    ]

    for (const model of requiredModels) {
      if (!prisma[model]) {
        throw new Error(`Required Prisma model not found: ${model}`)
      }
    }

    console.log('✅ Prisma client validation passed')
    return true
  } catch (error) {
    console.error('❌ Prisma client validation FAILED:', error.message)
    return false
  }
}

// Call before seeding
if (!await validatePrismaClient()) {
  console.error('Cannot proceed - Prisma client invalid')
  process.exit(1)
}
```

---

## 🧪 **Testing Plan**

### **Test 1: Fresh Install**
```bash
# 1. Reset database
npm run db:reset

# 2. Run fresh install
npm run deploy:fresh

# 3. Verify reference data
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.job_titles.count().then(c => console.log('Job titles:', c))"

# Expected: Job titles: 29
```

### **Test 2: Service Installation**
```bash
# 1. Build service
npm run build:service

# 2. Install (as Admin)
npm run service:install

# 3. Start (as Admin)
npm run service:start

# 4. Check logs
type logs\sync-service.log

# Expected: No DATABASE_URL errors, migrations complete, seeding successful
```

### **Test 3: Upgrade Flow**
```bash
# 1. Simulate git pull
git pull origin main

# 2. Hook runs automatically
# Check output for seed errors

# 3. Restart service
npm run service:restart

# 4. Verify app works
# Test employee creation form - dropdowns should populate
```

---

## 📚 **Reference: Correct Naming Convention**

### **Electricity-Tokens Pattern (Working Reference):**

```prisma
// ✅ CORRECT Example from electricity-tokens:
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  name                  String
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  contributions     UserContribution[]
  createdPurchases  TokenPurchase[]

  @@map("users")  // Maps PascalCase model to snake_case table
}

model TokenPurchase {
  id           String   @id @default(cuid())
  totalTokens  Float
  totalPayment Float
  createdById  String

  createdBy    User               @relation(fields: [createdById], references: [id])
  contribution UserContribution?

  @@map("token_purchases")  // Maps PascalCase to snake_case
}
```

### **API Usage (electricity-tokens):**
```typescript
// Prisma generates camelCase properties from PascalCase models:
const users = await prisma.user.findMany()  // ✅ camelCase client property
const purchases = await prisma.tokenPurchase.findMany()  // ✅ camelCase
const contributions = await prisma.userContribution.findMany()  // ✅ camelCase
```

---

## 🎯 **Success Criteria**

### **Immediate (Phase 1):**
- ✅ Fresh install completes without errors
- ✅ Reference data seeded successfully
- ✅ Service starts and runs migrations
- ✅ App forms work (dropdowns populate)

### **Medium-term (Phase 2):**
- ⏳ All models follow PascalCase convention
- ⏳ All columns are camelCase
- ⏳ All API routes use correct Prisma client names
- ⏳ Convention documented and enforced

### **Long-term (Phase 3):**
- ⏳ Pre-commit hooks prevent violations
- ⏳ CI/CD validates naming consistency
- ⏳ Zero naming-related issues in production

---

## 📞 **Next Steps**

1. **Review this analysis** with the team
2. **Approve Phase 1 emergency fixes**
3. **Execute fixes** in order of priority
4. **Test thoroughly** using test plan
5. **Schedule Phase 2** for schema refactoring

---

**Document Owner:** Claude (AI Assistant)
**Last Updated:** 2025-10-13
**Status:** Ready for Review
