# Database Schema Change Session Template

> **Template Type:** Database Schema Modification
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For adding, modifying, or removing database tables, columns, relationships, or indexes with proper migration planning.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents:

### Core Contexts (Always Load)
- `ai-contexts/code-workflow.md` - Standard workflow and task tracking
- `ai-contexts/master-context.md` - General principles and conventions
- `ai-contexts/backend/database-context.md` - Database patterns and Prisma conventions

### Backend-Specific Contexts (Always Load)
- `ai-contexts/backend/backend-api-context.md` - API integration impacts
- `CLAUDE.md` - Naming conventions (PascalCase models, camelCase fields, snake_case tables)

### Optional Contexts
- `ai-contexts/testing/unit-testing-context.md` - For testing database changes
- Domain-specific contexts for business logic

**How to load:** Use the Read tool to load each relevant context document before beginning schema changes.

---

## 🗄️ Schema Change Type

<!-- Select the type of schema change -->

**Change Category:**
- [x] New Table/Model
- [ ] Modify Existing Table
- [x] Add Relationship
- [ ] Remove Table/Column (Breaking Change)
- [x] Add Index for Performance
- [ ] Data Migration
- [ ] Constraint Changes

**Affected Models:**
- `Asset` (new model)
- `Business` (add relationship)
- `AssetAssignment` (new junction table)
- `Employee` (add relationship for assigned assets)

**Database:**
- [x] PostgreSQL
- [ ] MySQL
- [ ] SQLite
- [ ] Other:

---

## 📐 Current Schema

<!-- Document the current state -->

**Existing Model(s):**
```prisma
model Business {
  id                String   @id @default(cuid())
  businessName      String   @map("business_name")
  businessType      BusinessType @map("business_type")
  // ... other fields
  employees         Employee[]
  vehicles          Vehicle[]
  // No asset tracking currently

  @@map("businesses")
}

model Employee {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  businessId  String   @map("business_id")
  business    Business @relation(fields: [businessId], references: [id])
  // ... other fields
  // No asset assignments currently

  @@map("employees")
}
```

**Existing Relationships:**
- Business → Employee (one-to-many)
- Business → Vehicle (one-to-many)
- No asset tracking system exists

**Current Indexes:**
- `employees` table: index on `businessId`, `email` (unique)
- `businesses` table: index on `businessName`

---

## 🎯 Proposed Schema Changes

<!-- Define the new/modified schema -->

**New/Modified Model:**
```prisma
// New Asset model for tracking company equipment/property
model Asset {
  id              String   @id @default(cuid())
  assetTag        String   @unique @map("asset_tag")
  name            String
  description     String?
  category        AssetCategory
  purchaseDate    DateTime @map("purchase_date")
  purchasePrice   Decimal  @db.Decimal(10, 2) @map("purchase_price")
  currentValue    Decimal? @db.Decimal(10, 2) @map("current_value")
  serialNumber    String?  @map("serial_number")

  businessId      String   @map("business_id")
  business        Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  status          AssetStatus @default(ACTIVE)
  condition       AssetCondition @default(GOOD)
  location        String?

  assignments     AssetAssignment[]
  maintenanceLog  AssetMaintenance[]

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")
  createdBy       User     @relation(fields: [createdById], references: [id])

  @@map("assets")
  @@index([businessId, status])
  @@index([assetTag])
  @@index([category, status])
}

// Junction table for many-to-many relationship between Assets and Employees
model AssetAssignment {
  id            String   @id @default(cuid())
  assetId       String   @map("asset_id")
  asset         Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)

  employeeId    String   @map("employee_id")
  employee      Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  assignedDate  DateTime @default(now()) @map("assigned_date")
  returnedDate  DateTime? @map("returned_date")

  assignedById  String   @map("assigned_by_id")
  assignedBy    User     @relation("AssignedAssets", fields: [assignedById], references: [id])

  notes         String?
  condition     AssetCondition @default(GOOD)

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("asset_assignments")
  @@index([assetId, employeeId])
  @@index([employeeId])
  @@index([assignedDate, returnedDate])
}

// Optional maintenance tracking
model AssetMaintenance {
  id              String   @id @default(cuid())
  assetId         String   @map("asset_id")
  asset           Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)

  maintenanceDate DateTime @map("maintenance_date")
  maintenanceType MaintenanceType @map("maintenance_type")
  description     String
  cost            Decimal? @db.Decimal(10, 2)

  performedById   String   @map("performed_by_id")
  performedBy     User     @relation(fields: [performedById], references: [id])

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("asset_maintenance")
  @@index([assetId, maintenanceDate])
}

// Enums
enum AssetCategory {
  EQUIPMENT
  FURNITURE
  ELECTRONICS
  VEHICLE
  TOOLS
  OTHER
}

enum AssetStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
  RETIRED
  LOST
}

enum AssetCondition {
  EXCELLENT
  GOOD
  FAIR
  POOR
  DAMAGED
}

enum MaintenanceType {
  REPAIR
  INSPECTION
  CLEANING
  UPGRADE
  OTHER
}
```

**Update Existing Models:**
```prisma
model Business {
  // ... existing fields
  assets          Asset[]  // Add this relationship
}

model Employee {
  // ... existing fields
  assetAssignments AssetAssignment[]  // Add this relationship
}

model User {
  // ... existing fields
  createdAssets    Asset[]
  assignedAssets   AssetAssignment[] @relation("AssignedAssets")
  performedMaintenance AssetMaintenance[]
}
```

**Naming Conventions Check:**
- [x] Model name is PascalCase (`Asset`, `AssetAssignment`, `AssetMaintenance`)
- [x] Field names are camelCase (`assetTag`, `purchaseDate`, `currentValue`)
- [x] Table name (@map) is snake_case (`assets`, `asset_assignments`, `asset_maintenance`)
- [x] Column names (@map) are snake_case (`asset_tag`, `purchase_date`, `current_value`)
- [x] Foreign key fields follow convention (`assetId` not `asset_id` in model, but `asset_id` in DB)
- [x] Enum names are SCREAMING_SNAKE_CASE (`ACTIVE`, `GOOD`, `REPAIR`)

**Relationships:**
```prisma
// Business → Asset (one-to-many)
business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

// Asset → AssetAssignment (one-to-many)
assignments AssetAssignment[]

// Employee → AssetAssignment (one-to-many)
assetAssignments AssetAssignment[]

// User → Asset (one-to-many, creator)
createdBy User @relation(fields: [createdById], references: [id])
```

**Indexes:**
```prisma
// Asset indexes for common queries
@@index([businessId, status])  // Filter by business and status
@@index([assetTag])            // Lookup by unique asset tag
@@index([category, status])    // Reports by category

// AssetAssignment indexes
@@index([assetId, employeeId]) // Lookup specific assignment
@@index([employeeId])          // Find all assets for employee
@@index([assignedDate, returnedDate]) // Active assignments query

// AssetMaintenance indexes
@@index([assetId, maintenanceDate]) // Maintenance history for asset
```

**Constraints:**
```prisma
// Unique constraints
@unique on assetTag  // Each asset has unique identifier

// Cascade deletes
onDelete: Cascade    // Delete assignments when asset deleted
                     // Delete assignments when employee deleted
```

---

## 🔄 Migration Strategy

**Migration Type:**
- [x] Additive (Safe - adds new tables/columns)
- [ ] Destructive (Breaking - removes/renames columns)
- [ ] Data Transformation (Requires data migration)

**Migration Steps:**
1. Create `Asset` table with all fields
2. Create `AssetAssignment` junction table
3. Create `AssetMaintenance` table
4. Add foreign keys to `Business`, `Employee`, `User` tables
5. Create indexes on new tables
6. Add enums: `AssetCategory`, `AssetStatus`, `AssetCondition`, `MaintenanceType`
7. Run `npx prisma generate` to update Prisma client types
8. Run `npx prisma migrate dev --name add-asset-management`

**Rollback Plan:**
```sql
-- If migration fails or needs reverting
DROP TABLE IF EXISTS asset_maintenance CASCADE;
DROP TABLE IF EXISTS asset_assignments CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TYPE IF EXISTS AssetCategory;
DROP TYPE IF EXISTS AssetStatus;
DROP TYPE IF EXISTS AssetCondition;
DROP TYPE IF EXISTS MaintenanceType;
```

**Data Migration Required:**
- [ ] Yes - Describe:
- [x] No - This is a brand new feature, no existing data to migrate

---

## 📊 Impact Analysis

**Affected API Endpoints:**
- Need to create NEW endpoints (no existing endpoints affected):
  - `POST /api/assets` - Create asset
  - `GET /api/assets` - List assets for business
  - `GET /api/assets/[assetId]` - Get asset details
  - `PUT /api/assets/[assetId]` - Update asset
  - `DELETE /api/assets/[assetId]` - Delete/retire asset
  - `POST /api/assets/[assetId]/assign` - Assign to employee
  - `POST /api/assets/[assetId]/return` - Return from employee
  - `GET /api/employees/[employeeId]/assets` - List employee's assets

**Affected Components:**
- Need to create NEW components (no existing components affected):
  - `AssetListPage` - View all assets
  - `AssetDetailPage` - View single asset details
  - `AssetFormModal` - Create/edit asset
  - `AssetAssignmentForm` - Assign asset to employee
  - `AssetMaintenanceLog` - View/add maintenance records

**Breaking Changes:**
- [x] None - This is purely additive
- [ ] Yes - List:

**Performance Impact:**
- Query performance: New tables with proper indexes should perform well
- Storage impact: Estimate ~1KB per asset record, 500 bytes per assignment
  - For 100 assets: ~100KB
  - For 1000 assets: ~1MB
- Index requirements: All necessary indexes defined above
- Expected initial dataset: ~50 assets for test business

---

## 🔒 Data Integrity

**Constraints to Add:**
- [x] NOT NULL - Required fields: assetTag, name, category, purchaseDate, businessId
- [x] UNIQUE - assetTag must be unique across all assets
- [ ] CHECK constraints - None needed currently
- [x] Foreign Keys - All relationships have FK constraints

**Default Values:**
- `status`: ACTIVE (new assets start as active)
- `condition`: GOOD (assumed good condition on creation)
- `createdAt`: now() (automatic timestamp)
- `updatedAt`: now() + auto-update (automatic timestamp)

**Cascading Behavior:**
- [x] CASCADE on delete - Delete asset → delete all assignments and maintenance
- [x] CASCADE on delete - Delete employee → delete all their asset assignments
- [ ] SET NULL on delete
- [ ] RESTRICT on delete
- [ ] NO ACTION

**Rationale for CASCADE:**
- Asset deleted → All assignments become meaningless (safe to delete)
- Employee deleted → Their assignments become orphaned (safe to delete, historical data preserved in other models)
- This prevents orphaned records and maintains referential integrity

---

## 🧪 Testing Requirements

**Schema Validation:**
- [x] Prisma migration generates successfully
- [x] All existing tests still pass (no breaking changes)
- [x] New relationships work correctly (can query in both directions)
- [x] Cascade deletes work as expected

**Data Validation:**
- [x] Cannot create asset without required fields
- [x] assetTag uniqueness enforced
- [x] Cannot assign asset to non-existent employee
- [x] Cannot create asset for non-existent business
- [x] Decimal precision correct for currency (10,2)

**Test Data:**
```typescript
// Sample test data for new schema
const testAsset = {
  assetTag: "LAPTOP-001",
  name: "Dell XPS 15",
  description: "Developer laptop",
  category: "ELECTRONICS",
  purchaseDate: new Date("2023-01-15"),
  purchasePrice: 1499.99,
  currentValue: 1200.00,
  serialNumber: "SN123456789",
  businessId: "business-123",
  status: "ACTIVE",
  condition: "GOOD",
  location: "Office - 2nd Floor",
  createdById: "user-admin"
}

const testAssignment = {
  assetId: "asset-001",
  employeeId: "employee-123",
  assignedDate: new Date(),
  assignedById: "user-manager",
  notes: "Assigned for remote work",
  condition: "GOOD"
}
```

---

## 📦 Seed Data Changes

**Seed Script Updates Required:**
- [x] Yes - Describe:
  - Add sample assets for test businesses (5-10 assets per business)
  - Create sample assignments for some employees
  - Add maintenance records for a few assets

**Test Data:**
```typescript
// scripts/seed-assets.ts
const sampleAssets = [
  {
    assetTag: "LAPTOP-001",
    name: "MacBook Pro 16\"",
    category: "ELECTRONICS",
    purchaseDate: new Date("2023-01-15"),
    purchasePrice: 2499.00,
    currentValue: 2000.00
  },
  {
    assetTag: "DESK-001",
    name: "Standing Desk",
    category: "FURNITURE",
    purchaseDate: new Date("2023-02-20"),
    purchasePrice: 799.00,
    currentValue: 650.00
  },
  {
    assetTag: "DRILL-001",
    name: "DeWalt Cordless Drill",
    category: "TOOLS",
    purchaseDate: new Date("2023-03-10"),
    purchasePrice: 149.00,
    currentValue: 120.00
  }
]
```

---

## 🚨 Risk Assessment

**Data Loss Risk:**
- [x] None - No existing data affected (new tables only)
- [ ] Low
- [ ] Medium
- [ ] High

**Mitigation:**
- This is a purely additive change - no risk to existing data
- All new tables have proper constraints and validation
- Foreign keys ensure referential integrity

**Backup Strategy:**
- [x] Database backup before migration (automated in production)
- [ ] Export critical data
- [ ] Snapshot environment

**Migration Testing Strategy:**
1. Test on local development database first
2. Test on staging environment with production data copy
3. Verify all queries work as expected
4. Test rollback procedure
5. Deploy to production during low-traffic window

---

## 📋 Pre-Migration Checklist

- [x] Schema changes reviewed
- [x] Naming conventions verified (PascalCase/camelCase/snake_case)
- [ ] Migration script generated and reviewed (will do next)
- [x] Backup strategy in place (automated backups enabled)
- [x] Rollback plan documented (DROP TABLE statements above)
- [x] Affected code identified (new APIs needed, no breaking changes)
- [ ] Tests updated (will create tests after migration)
- [ ] Team notified of new feature (documentation pending)

---

## 📝 Session Notes

<!-- Add any additional context, constraints, or references -->

**Business Context:**
- Requested by operations team to track company equipment
- Current process uses Excel spreadsheet (error-prone)
- Need to track who has which laptop, tools, vehicles
- Need maintenance history for compliance
- Future: Depreciation tracking, asset valuation reports

**Design Decisions:**
- Separate `Asset` and `AssetAssignment` tables (many-to-many relationship)
  - Allows asset to be reassigned over time with history
  - Tracks who had asset when
- `AssetMaintenance` separate table (one-to-many)
  - Complete maintenance history
  - Can track costs over time
- Using Decimal type for currency (not Float)
  - Prevents rounding errors in financial calculations
- Enum for categories (not string)
  - Ensures data consistency
  - Easy to add new categories with migration

**Alternative Approaches Considered:**
1. Single `Asset` table with `currentEmployeeId` field
   - Simpler schema
   - Cons: Loses assignment history
   - Not chosen: History important for auditing

2. Store asset data in JSON field on Employee
   - Very simple, no new tables
   - Cons: Can't query/report efficiently, no referential integrity
   - Not chosen: Poor data modeling

3. Use existing Vehicle table and rename to Asset
   - Reuse existing infrastructure
   - Cons: Vehicles have specific fields (license plate, VIN), assets more generic
   - Not chosen: Different domains, better to separate

**Future Enhancements:**
- Asset depreciation calculation
- QR code generation for asset tags
- Photo upload for assets
- Asset checkout workflow with approval
- Asset reports (depreciation, utilization, cost analysis)
- Integration with purchasing system

---

## ✅ Start Session

Ready to begin database schema changes. Please:
1. Review current schema and proposed changes (all models above)
2. Verify naming conventions are followed (PascalCase/camelCase/snake_case)
3. Analyze impact on existing code and APIs (no breaking changes expected)
4. Propose migration strategy with safety measures:
   - Generate migration with descriptive name
   - Test on development database
   - Verify indexes created correctly
5. Identify risks and mitigation approaches (minimal risk - additive change)
6. Suggest testing and validation steps:
   - Create sample assets and assignments
   - Verify relationships work in both directions
   - Test cascade deletes
7. Generate Prisma migration script:
   - Run `npx prisma migrate dev --name add-asset-management-system`
8. Create seed data for testing (5-10 sample assets)
9. Create task plan: `projectplan-asset-management-schema-2025-10-18.md`

**Expected Migration Output:**
- 3 new tables: `assets`, `asset_assignments`, `asset_maintenance`
- 4 new enums: `AssetCategory`, `AssetStatus`, `AssetCondition`, `MaintenanceType`
- Multiple indexes for query performance
- Foreign key constraints to existing tables
- No breaking changes to existing schema

---
