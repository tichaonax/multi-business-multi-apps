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
- [ ] New Table/Model
- [ ] Modify Existing Table
- [ ] Add Relationship
- [ ] Remove Table/Column (Breaking Change)
- [ ] Add Index for Performance
- [ ] Data Migration
- [ ] Constraint Changes

**Affected Models:**


**Database:**
- [ ] PostgreSQL
- [ ] MySQL
- [ ] SQLite
- [ ] Other:

---

## 📐 Current Schema

<!-- Document the current state -->

**Existing Model(s):**
```prisma
// Paste current Prisma schema if modifying existing
model ExistingModel {
  id        String   @id @default(cuid())
  // ...
}
```

**Existing Relationships:**


**Current Indexes:**


---

## 🎯 Proposed Schema Changes

<!-- Define the new/modified schema -->

**New/Modified Model:**
```prisma
model NewModel {
  id        String   @id @default(cuid())
  // Add fields here following conventions:
  // - Model name: PascalCase
  // - Field names: camelCase
  // - Table name (@map): snake_case
  // - Column names (@map): snake_case

  @@map("new_model")
}
```

**Naming Conventions Check:**
- [ ] Model name is PascalCase
- [ ] Field names are camelCase
- [ ] Table name (@map) is snake_case
- [ ] Column names (@map) are snake_case
- [ ] Foreign key fields follow convention (e.g., `userId` not `user_id`)

**Relationships:**
```prisma
// Example:
// user       User     @relation(fields: [userId], references: [id])
// userId     String   @map("user_id")
```

**Indexes:**
```prisma
// Example:
// @@index([email])
// @@unique([businessId, userId])
```

**Constraints:**
```prisma
// Example:
// @@unique([email])
// @@index([createdAt, status])
```

---

## 🔄 Migration Strategy

**Migration Type:**
- [ ] Additive (Safe - adds new tables/columns)
- [ ] Destructive (Breaking - removes/renames columns)
- [ ] Data Transformation (Requires data migration)

**Migration Steps:**
1.
2.
3.

**Rollback Plan:**


**Data Migration Required:**
- [ ] Yes - Describe:
- [ ] No

---

## 📊 Impact Analysis

**Affected API Endpoints:**


**Affected Components:**


**Breaking Changes:**
- [ ] None
- [ ] Yes - List:

**Performance Impact:**
- Query performance:
- Storage impact:
- Index requirements:

---

## 🔒 Data Integrity

**Constraints to Add:**
- [ ] NOT NULL
- [ ] UNIQUE
- [ ] CHECK constraints
- [ ] Foreign Keys

**Default Values:**


**Cascading Behavior:**
- [ ] CASCADE on delete
- [ ] SET NULL on delete
- [ ] RESTRICT on delete
- [ ] NO ACTION

---

## 🧪 Testing Requirements

**Schema Validation:**
- [ ] Prisma migration generates successfully
- [ ] All existing tests still pass
- [ ] New relationships work correctly

**Data Validation:**
- [ ] Existing data compatible with changes
- [ ] Migration script tested on staging data
- [ ] Rollback tested

**Test Data:**
```typescript
// Sample test data for new schema
```

---

## 📦 Seed Data Changes

**Seed Script Updates Required:**
- [ ] Yes - Describe:
- [ ] No

**Test Data:**
- [ ] Add new test records
- [ ] Modify existing test data
- [ ] Remove obsolete test data

---

## 🚨 Risk Assessment

**Data Loss Risk:**
- [ ] None
- [ ] Low
- [ ] Medium
- [ ] High

**Mitigation:**


**Backup Strategy:**
- [ ] Database backup before migration
- [ ] Export critical data
- [ ] Snapshot environment

---

## 📋 Pre-Migration Checklist

- [ ] Schema changes reviewed
- [ ] Naming conventions verified (PascalCase/camelCase/snake_case)
- [ ] Migration script generated and reviewed
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Affected code identified
- [ ] Tests updated
- [ ] Team notified of breaking changes (if any)

---

## 📝 Session Notes

<!-- Add any additional context, constraints, or references -->

---

## ✅ Start Session

Ready to begin database schema changes. Please:
1. Review current schema and proposed changes
2. Verify naming conventions are followed
3. Analyze impact on existing code and APIs
4. Propose migration strategy with safety measures
5. Identify risks and mitigation approaches
6. Suggest testing and validation steps
7. Generate Prisma migration script

---
