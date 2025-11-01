# Debugging Session Template

> **Template Type:** Bug Analysis & Resolution  
> **Version:** 1.0  
> **Last Updated:** October 31, 2025

---

## 🎯 Purpose

For analyzing bugs, identifying causes, and proposing safe fixes.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents **IN THE EXACT ORDER LISTED BELOW**.

### Core Contexts (Load in this EXACT order - ONE AT A TIME)

**CRITICAL:** Read these files sequentially. Do not proceed to the next document until you have fully read and understood the previous one.

1. **FIRST:** `ai-contexts/master-context.md` - General principles and conventions
   - ⚠️ Contains critical instruction to read code-workflow.md
   - ⚠️ Defines operating principles
   - ⚠️ Contains mandatory workflow enforcement
   - ⚠️ Defines example adherence requirements

2. **SECOND:** `ai-contexts/code-workflow.md` - Standard workflow and task tracking
   - Contains MANDATORY workflow requirements
   - Requires creating project plan BEFORE any code changes
   - Defines approval checkpoint process

### Additional Core Context

- `ai-contexts/general-problem-solving-context.md` - Debugging methodology

### Module-Specific Contexts (Load based on bug location)

- `ai-contexts/frontend/component-context.md` - For UI/component bugs
- `ai-contexts/frontend/ui-context.md` - For styling/layout issues
- `ai-contexts/backend/backend-api-context.md` - For API/endpoint bugs
- `ai-contexts/backend/database-context.md` - For database-related issues
- `ai-contexts/testing/unit-testing-context.md` - For test failures

### Optional Contexts

- Domain-specific contexts for the affected module

**How to load:** Use the Read tool to load each relevant context document before beginning debugging.

---

## 🐛 Bug Report

<!-- Document the bug details before starting -->

**Ticket:** mbm-104

**Bug Title:** Fix issue with new business categories

**Description:**
There is a critical design flaw. When a new business is created and then you try to add inventory to it, there is no category and sub category data. The issue stems from categories being tied to specific businessId when they should be SHARED across all businesses of the same businessType.

**Current (Wrong) Behavior:**
- Categories stored with businessId = 'specific-business-123'
- Each business has isolated category data
- New businesses start with zero categories
- If Business A adds category, only Business A sees it

**Required (Correct) Behavior:**
- Categories stored/queried by businessType (clothing, hardware, etc.)
- ALL businesses of same type share the same category pool
- If ANY clothing business adds category, ALL clothing businesses see it immediately
- New clothing businesses automatically see all existing clothing categories
- Dynamic updates - categories are live-shared across businesses

**Key Principle:**
Categories are TYPE-level resources, not business-instance resources. Think of it like "all clothing stores share the same category taxonomy, but each store has its own unique products."

**Implementation Approach:**
1. Update category APIs to query by businessType instead of businessId
2. Migrate existing category data to be shared at type level
3. NO category copying or inheritance needed - categories are naturally shared
4. Products remain tied to specific businessId (each business has its own inventory)

**Steps to Reproduce:**

1. Add new business
2. Then try to add new inventory item
3. The category drop downs are empty

**Expected Behavior:**
<!-- What should happen -->
The category data should be available and shared amoung same business types.
After fix we should not loose data, existing inventory must not be impacted.

Adding new inventory should now use the new business type category data

**Actual Behavior:**
<!-- What actually happens -->
1. The category drop downs are empty


**Environment:**

- OS:
- Browser/Runtime:
- Version:

**Error Messages/Logs:**

```


```

---

## 🔍 Investigation Notes

<!-- Add debugging observations, hypotheses, or findings -->

**Potential Causes:**
The reason for the issue is that category data is tied to businessId instead of business Type

**Root Cause Analysis (From Project Plan)**:
- Schema Analysis:
  - ✅ `BusinessCategories` model has `businessType` field (perfect for shared categories)
  - ✅ `InventoryDomains` already exists with domain templates
  - ✅ Domain templates already seeded via migration `20251028062000_seed_inventory_domains`
  - ❌ Problem: Categories have REQUIRED `businessId` field (should be nullable or removed)
  - ❌ Problem: APIs query by `businessId` instead of `businessType`
  - ❌ Problem: Unique constraint is `[businessId, name]` should be `[businessType, name]`

- Category API Query Pattern (WRONG):
  - File: `src/app/api/inventory/[businessId]/categories/route.ts`
  - Current: `WHERE businessId = 'specific-business'` ❌
  - Should be: `WHERE businessType = 'clothing'` ✅
  - Issue: Each business sees only its own isolated categories

- Category Creation API (WRONG):
  - Creates category with specific `businessId` ❌
  - Should create with `businessType` only ✅
  - Result: Categories not shared across businesses of same type

**Related Code/Files:**
- `prisma/schema.prisma` (lines 97-125) - BusinessCategories model (needs businessId nullable)
- `src/app/api/inventory/[businessId]/categories/route.ts` - GET/POST need businessType queries
- `src/app/api/inventory/categories/route.ts` - System-wide category APIs
- `src/components/universal/inventory/universal-inventory-form.tsx` - Category dropdown query
- `prisma/migrations/20251028062000_seed_inventory_domains/migration.sql` - Domain templates exist

**Solution Architecture (REVISED)**:
1. Make `businessId` nullable in BusinessCategories schema (or remove entirely)
2. Update category GET API to query by `businessType` instead of `businessId`
3. Update category POST API to create categories at `businessType` level
4. Migrate existing categories: consolidate per-business categories to type level
5. NO inheritance utility needed - categories are naturally shared by querying businessType
6. Update all consuming code to pass businessType for category queries

**Recent Changes:**
- mbm-102 established the domain template system
- Domain templates seeded for: clothing, hardware, grocery, restaurant
- Schema supports businessType-based sharing already

---

## 🧪 Testing Plan

<!-- Define how to verify the fix -->

**Test Cases:**

### Manual Testing
1. **New Business Creation**:
   - Create new clothing business
   - Navigate to inventory → Verify categories dropdown populated
   - Verify subcategories appear when category selected
   - Add inventory item → Save successfully

2. **Backfill Existing Businesses**:
   - Identify business with no categories
   - Run backfill script
   - Verify categories appear in UI
   - Verify existing inventory items still work

3. **Custom Categories**:
   - Create custom category in business
   - Verify `isUserCreated = true` in database
   - Verify custom category appears alongside system categories
   - Delete custom category → Verify system categories unaffected

4. **Edge Cases**:
   - Business type with no domain template → Should handle gracefully
   - Business already has categories → Should not duplicate
   - Invalid businessType → Should log warning and continue

### Database Verification Queries
```sql
-- Verify domain templates exist
SELECT id, name, "businessType", "isSystemTemplate" 
FROM inventory_domains 
WHERE "isSystemTemplate" = true;

-- Verify inherited categories
SELECT bc.id, bc.name, bc."businessId", bc."businessType", bc."domainId", bc."isUserCreated"
FROM business_categories bc
WHERE bc."isUserCreated" = false AND bc."domainId" IS NOT NULL;

-- Check for businesses with no categories
SELECT b.id, b.name, b.type, COUNT(bc.id) as category_count
FROM businesses b
LEFT JOIN business_categories bc ON b.id = bc."businessId"
GROUP BY b.id, b.name, b.type
HAVING COUNT(bc.id) = 0;
```

**Regression Tests:**
- Existing businesses with categories continue working (no changes)
- Existing inventory items remain linked to categories (no data loss)
- Category API endpoints continue functioning (GET/POST)
- User-created categories preserved and distinguished

---

## 📝 Session Notes

<!-- Add any additional context or constraints -->

**Key Implementation Details**:
- **Phase 2**: Create `src/lib/category-inheritance.ts` utility
- **Phase 3**: Modify `src/app/api/admin/businesses/route.ts` POST endpoint
- **Phase 4**: Create `scripts/backfill-business-categories.ts` migration script
- **Phase 5**: Create optional Prisma migration to link existing categories to domains
- **Phase 6**: Comprehensive testing (manual + database validation)
- **Phase 7**: Documentation and deployment

**Success Criteria**:
- New businesses automatically have 10-15 categories after creation
- Categories are appropriate for business type (clothing → clothing categories)
- No data loss for existing inventory items
- Performance impact < 500ms on business creation
- Graceful handling of missing templates (log warning, don't fail)

**Risk Mitigation**:
- No destructive database changes (INSERT only, no DELETE)
- Add duplicate check before copying categories
- Wrap inheritance in try-catch (don't fail business creation)
- Rollback plan documented in project plan

**Timeline**: 10-13 hours total (7 phases)

**Related Documentation**:
- Project Plan: `ai-contexts/project-plans/active/projectplan-mbm-104-fix-business-categories-2025-10-31.md`
- Bug Analysis: `ai-contexts/bugs/CATEGORY_SHARING_BUG_ANALYSIS.md`
- Related Work: mbm-102 (Category system foundation)

---

## ✅ Start Session

Ready to begin debugging. Please:

1. Analyze the bug report
2. Formulate hypotheses about the root cause
3. Suggest investigation steps
4. Propose potential solutions with trade-offs

---
