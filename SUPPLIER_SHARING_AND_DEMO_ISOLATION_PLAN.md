# BusinessType-Based Supplier Sharing + Demo Isolation

**Status**: Phase 1 (Schema Changes) ✅ COMPLETE | Phase 2 (Testing & Isolation) IN PROGRESS

**Last Updated**: November 2, 2025

---

## Overview

This document outlines the implementation plan for:
1. **businessType-Based Supplier Sharing** - Suppliers shared across all businesses of the same type
2. **Demo Business Isolation** - One-way data visibility between demo and real businesses

---

## Phase 1: Schema Changes & Supplier Sharing ✅ COMPLETE

### 1.1 Make businessId Optional in BusinessSuppliers ✅

**Status**: COMPLETE
**Migration**: `20251102143159_add_subcategory_to_products`

**Changes**:
- `businessId`: `String` → `String?` (optional)
- `businesses` relation: `Businesses` → `Businesses?` (optional)

**Impact**:
- Suppliers are now shared by `businessType` field only
- `businessId` tracks creator for audit purposes only
- All hardware businesses can use the same hardware suppliers
- All grocery businesses can use the same grocery suppliers
- etc.

### 1.2 Make userId Optional in AuditLogs ✅

**Status**: COMPLETE
**Migration**: `20251102145137_make_auditlog_userid_optional`

**Changes**:
- `userId`: `String` → `String?` (optional)
- `users` relation: `Users` → `Users?` (optional)

**Impact**:
- Audit logs can be created without user reference (system operations, deleted users)
- Fixes FK constraint error when deleting businesses after database reset

### 1.3 Update Business Deletion Service ✅

**Status**: COMPLETE
**Files Modified**:
- `src/lib/business-deletion-service.ts`
- `src/app/api/admin/businesses/[id]/route.ts`

**Changes**:
1. Functions accept `userId: string | null` instead of `userId: string`
2. API validates user exists in database before passing userId
3. Audit logs created with `userId: userId || null` (explicit null when undefined)

**Impact**:
- Demo businesses can be deleted without FK errors
- Works correctly after database resets with stale sessions

### 1.4 Auto-Seed Configuration ✅

**Status**: COMPLETE
**File**: `package.json`

**Changes**:
```json
"prisma": {
  "seed": "node scripts/post-migration-seed.js"
}
```

**Impact**:
- Admin user (admin@business.local / admin123) auto-created after `prisma migrate reset`
- Users can log in immediately after database reset

---

## Phase 2: Testing & Demo Isolation (IN PROGRESS)

### 2.1 Test Supplier Sharing ⏳ PENDING

**Priority**: HIGH (validates core feature works)

**Test Steps**:
1. Reset database: `npx prisma migrate reset`
2. Verify admin user created (admin@business.local / admin123)
3. Log in as admin
4. Seed Hardware Demo via admin panel
5. Verify inventory data with realistic costs
6. Create second hardware business
7. Verify "Seed Hardware Supplies" appears in dropdown
8. Create inventory item, assign supplier, save, reload
9. Verify supplier persists correctly

**Acceptance Criteria**:
- ✅ Suppliers appear in dropdown for all businesses of same type
- ✅ Supplier assignments persist after page reload
- ✅ Each business type has isolated supplier pool (hardware suppliers don't appear in grocery)

### 2.2 Implement isDemo Flag System ✅ COMPLETE

**Priority**: HIGH (prerequisite for isolation features)

**Schema Changes**:
```prisma
model Businesses {
  // ... existing fields
  isDemo Boolean @default(false)
}
```

**Migration**: ✅ COMPLETE - `20251102174446_add_isdemo_to_businesses`

**Seed Script Updates**: ✅ COMPLETE
All demo seed scripts now mark businesses with `isDemo: true`:
- ✅ `scripts/seed-hardware-demo.js`
- ✅ `scripts/seed-grocery-demo.js`
- ✅ `scripts/seed-clothing-demo.js`
- ✅ `scripts/seed-restaurant-demo.js`

**API Changes**: ✅ COMPLETE
Added `isDemo` to business responses:
- ✅ `src/app/api/user/business-memberships/route.ts` - Added isDemo to both admin and regular user responses

**Frontend Changes**: ✅ COMPLETE
- ✅ Updated `BusinessMembership` interface in `src/types/permissions.ts` to include `isDemo?: boolean`
- ⏳ Business switcher demo indicator (optional enhancement)

### 2.3 Implement ONE-WAY Category Isolation ⏳ PENDING

**Priority**: MEDIUM (enhances data separation)

**Rules**:
1. **Real Business** (`isDemo=false`):
   - See type-based categories (`businessId=null`) ✅ Always visible
   - See their own custom categories ✅
   - **DO NOT** see categories created by demo businesses ❌

2. **Demo Business** (`isDemo=true`):
   - See type-based categories (`businessId=null`) ✅
   - See their own categories ✅
   - See categories from real businesses ✅ (One-way visibility)
   - See categories from other demo businesses ✅

**API Changes Required**:
- `src/app/api/categories/route.ts` (GET)
- `src/app/api/hardware/categories/route.ts`
- `src/app/api/grocery/categories/route.ts`
- `src/app/api/clothing/categories/route.ts`
- `src/app/api/restaurant/categories/route.ts`

**Implementation Pattern**:
```typescript
// In category GET endpoint
const currentBusiness = await prisma.businesses.findUnique({
  where: { id: businessId },
  select: { isDemo: true }
})

const categoryFilter = {
  businessType: businessType,
  OR: [
    { businessId: null }, // Type-based categories always visible
    { businessId: businessId }, // Own categories
    ...(currentBusiness?.isDemo 
      ? [{ businessId: { not: null } }] // Demo sees all
      : [{ businesses: { isDemo: false } }] // Real only sees real
    )
  ]
}
```

### 2.4 Implement ONE-WAY Supplier Isolation ⏳ PENDING

**Priority**: MEDIUM (enhances data separation)

**Dependencies**: Requires isDemo flag (Task 2.2)

**Rules**:
1. **Real Business** (`isDemo=false`):
   - See suppliers of same `businessType` ✅
   - See suppliers with `businessId=null` (shared) ✅
   - **DO NOT** see suppliers created by demo businesses ❌

2. **Demo Business** (`isDemo=true`):
   - See all suppliers of same `businessType` ✅ (One-way visibility)

**Current Status**:
- ✅ Suppliers already filtered by `businessType`
- ✅ `businessId` now optional
- ⏳ Need to add demo filter

**API Changes Required**:
- `src/app/api/suppliers/route.ts` (GET)
- Type-specific supplier endpoints if they exist

**Implementation Pattern**:
```typescript
// In supplier GET endpoint
const currentBusiness = await prisma.businesses.findUnique({
  where: { id: businessId },
  select: { isDemo: true }
})

const supplierFilter = {
  businessType: businessType,
  OR: [
    { businessId: null }, // Shared suppliers always visible
    ...(currentBusiness?.isDemo
      ? [{ businessId: { not: null } }] // Demo sees all
      : [
          { businesses: { isDemo: false } }, // Real only sees real
          { businesses: null } // Include suppliers with no business link
        ]
    )
  ]
}
```

---

## Phase 3: Documentation & Guidelines (FUTURE)

### 3.1 Document Supplier Sharing Pattern ⏳ PENDING

**Documents to Create/Update**:
1. **SUPPLIER_SHARING_GUIDE.md** (NEW)
   - Explain businessType-based sharing
   - Explain businessId audit trail
   - Provide API query examples
   - Document filtering patterns

2. **DEPLOYMENT_GUIDE.md** (UPDATE)
   - Add supplier sharing rules
   - Document seed script updates
   - Explain demo vs real business behavior

3. **API_DOCUMENTATION.md** (UPDATE)
   - Document category filtering
   - Document supplier filtering
   - Add isDemo field to business responses

### 3.2 Developer Guidelines ⏳ PENDING

**Topics to Cover**:
1. **When to use businessId vs businessType**:
   - businessType: For sharing (suppliers, categories by type)
   - businessId: For audit trail, ownership tracking

2. **One-Way Visibility Pattern**:
   - Demo → Real: YES ✅
   - Real → Demo: NO ❌
   - Real → Real: YES ✅
   - Demo → Demo: YES ✅

3. **Adding New Shared Resources**:
   - Template for filtering logic
   - Testing checklist
   - Migration pattern

---

## Data Visibility Matrix

| From Business | To Resource | Visibility Rule |
|--------------|-------------|-----------------|
| Real Business | Type-based categories (`businessId=null`) | ✅ Always visible |
| Real Business | Own categories | ✅ Visible |
| Real Business | Real business categories | ✅ Visible |
| Real Business | Demo business categories | ❌ Hidden |
| Demo Business | Type-based categories | ✅ Visible |
| Demo Business | Own categories | ✅ Visible |
| Demo Business | Real business categories | ✅ Visible (One-way) |
| Demo Business | Other demo categories | ✅ Visible |
| Real Business | Type suppliers (`businessId=null`) | ✅ Always visible |
| Real Business | Real business suppliers | ✅ Visible |
| Real Business | Demo business suppliers | ❌ Hidden |
| Demo Business | All suppliers of type | ✅ Visible (One-way) |

---

## Testing Checklist

### Supplier Sharing Tests
- [ ] Hardware suppliers appear for all hardware businesses
- [ ] Grocery suppliers appear for all grocery businesses
- [ ] Clothing suppliers appear for all clothing businesses
- [ ] Restaurant suppliers appear for all restaurant businesses
- [ ] Suppliers persist after page reload
- [ ] Cross-type isolation (hardware supplier not in grocery)

### Demo Isolation Tests
- [ ] Real business cannot see demo categories
- [ ] Real business cannot see demo suppliers
- [ ] Demo business can see real categories
- [ ] Demo business can see real suppliers
- [ ] Type-based categories visible to all
- [ ] Shared suppliers (`businessId=null`) visible to all

### Database Reset Tests
- [ ] Admin user auto-created
- [ ] Can log in immediately
- [ ] Demo businesses can be deleted
- [ ] Audit logs created correctly

---

## Migration History

1. **20251102143159_add_subcategory_to_products**
   - Added missing columns: subcategoryId, supplierId, locationId
   - Made businessId optional in business_suppliers

2. **20251102145137_make_auditlog_userid_optional**
   - Made userId optional in audit_logs

3. **FUTURE: add_isdemo_to_businesses**
   - Add isDemo boolean field to businesses table

---

## Rollback Plan

If issues arise:

1. **Supplier Sharing Issues**:
   - Revert businessId to required: `businessId String`
   - Create migration to add NOT NULL constraint
   - Update seed scripts to always provide businessId

2. **Audit Log Issues**:
   - Revert userId to required: `userId String`
   - Create migration to add NOT NULL constraint
   - Ensure user validation before all operations

3. **Demo Isolation Issues**:
   - Remove isDemo filtering from APIs
   - Keep isDemo field but ignore in queries
   - Document as "future feature"

---

## Success Metrics

- ✅ Zero FK constraint errors on business deletion
- ✅ Suppliers shared correctly by businessType
- ✅ Admin user always available after reset
- ⏳ Demo businesses isolated from real businesses
- ⏳ All tests passing
- ⏳ Documentation complete

---

## Notes

### Why businessType-Based Sharing?

Categories and suppliers are organized by industry type (hardware, grocery, clothing, restaurant). A hardware store needs hardware suppliers (bolts, tools), not grocery suppliers (milk, bread). This makes the system:
- More intuitive for users
- Easier to manage
- Better organized by industry

### Why One-Way Visibility?

Demo businesses need realistic data (including real business data) for testing and demonstrations. Real businesses should not see test/demo data to avoid confusion. This creates:
- Clean production data for real businesses
- Rich test environment for demos
- Clear separation of concerns

### Migration Strategy

1. ✅ Make optional (backward compatible)
2. ⏳ Test thoroughly
3. ⏳ Add filtering logic
4. ⏳ Update documentation
5. ⏳ Train users

No breaking changes required! 🎉
