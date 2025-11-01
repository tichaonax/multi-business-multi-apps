# Business Deletion - Impact Analysis & Implementation Plan

**Date**: November 1, 2025  
**Feature**: Add business deletion capability to `/business/manage` page  
**Current State**: DELETE endpoint exists but only deactivates; no UI implementation

---

## 1. EXECUTIVE SUMMARY

### Current Implementation
- **DELETE API** exists at `/api/admin/businesses/[id]` but only **deactivates** (sets `isActive: false`)
- **Safety Check**: Prevents deletion if active memberships or employees exist
- **No UI**: Currently no delete button or confirmation modal in the management page
- **Permission**: Requires `isSystemAdmin` role

### Proposed Implementation
Add a **hard delete** capability with:
- UI button on `/business/manage` page
- Multi-step confirmation modal with warnings
- Automatic cleanup of all related data via Prisma cascades + manual cleanup
- Audit logging of deletion
- Demo business identification ([Demo] suffix) for safe deletion

---

## 2. DATABASE IMPACT ANALYSIS

### Tables with CASCADE DELETE (Auto-cleanup)
These will be automatically deleted when a business is deleted:

1. **business_accounts** - ✅ Cascades (line 72)
2. **business_memberships** - ✅ Cascades (line 165)  
3. **customer_laybys** - ✅ Cascades (line 356)
4. **inter_business_loans** (as borrower) - ✅ Cascades (line 1330)
5. **inter_business_loans** (as lender) - ✅ Cascades (line 1371)
6. **payroll_periods** - ✅ Cascades (line 1595)

### Tables WITHOUT CASCADE (Manual Cleanup Required)
These reference `businessId` but don't have `onDelete: Cascade`:

1. **business_brands** - ⚠️ No cascade
2. **business_categories** - ⚠️ No cascade
3. **business_customers** - ⚠️ No cascade
4. **business_orders** - ⚠️ No cascade
5. **business_products** - ⚠️ No cascade
   - Also affects: `product_variants`, `product_attributes`, `product_images`
   - Also affects: `business_stock_movements`
6. **business_suppliers** - ⚠️ No cascade
7. **business_locations** - ⚠️ No cascade
8. **business_transactions** - ⚠️ No cascade
9. **employees** - ⚠️ No cascade
   - Also affects: `employee_contracts`, `employee_business_assignments`
10. **projects** - ⚠️ No cascade
    - Also affects: `project_contractors`, project expenses, etc.
11. **vehicles** - ⚠️ No cascade
    - Also affects: `vehicle_trips`, `vehicle_expenses`, `vehicle_reimbursements`
12. **menu_combos** - ⚠️ No cascade
13. **menu_promotions** - ⚠️ No cascade
14. **payroll_exports** - ⚠️ No cascade

### Critical Foreign Key Constraints
```
business_categories → business_products (categoryId)
business_products → product_variants (productId)
product_variants → business_stock_movements (productVariantId)
business_orders → business_order_items (orderId)
projects → project_contractors (projectId)
employees → employee_contracts (employeeId)
```

---

## 3. DELETION STRATEGY

### Option A: Soft Delete (Current Implementation)
**What it does**: Sets `isActive: false`, preserves all data
- ✅ Safest option - no data loss
- ✅ Can be reversed
- ✅ Maintains referential integrity
- ❌ Clutters database with inactive records
- ❌ Not truly "deleting" the business

### Option B: Hard Delete with Manual Cleanup (Recommended)
**What it does**: Physically removes business and all related data
- ✅ Truly removes the business
- ✅ Cleans up database
- ✅ Good for demo data cleanup
- ⚠️ Requires careful ordering to avoid FK violations
- ⚠️ Irreversible - need strong confirmation

### Recommended Approach: **Hybrid**
- **Demo businesses** (`[Demo]` in name): Allow hard delete
- **Real businesses**: Require soft delete (deactivation) OR hard delete with extra confirmation

---

## 4. IMPLEMENTATION PLAN

### Phase 1: Update DELETE API Endpoint
**File**: `src/app/api/admin/businesses/[id]/route.ts`

**Changes needed**:
```typescript
1. Add query parameter: ?hardDelete=true
2. If hardDelete=true:
   a. Check if business name contains '[Demo]' for safer deletion
   b. Delete all related records in correct order:
      - business_order_items (via orders)
      - business_orders
      - business_stock_movements
      - product_variants
      - product_attributes, product_images
      - business_products
      - business_categories
      - business_suppliers
      - business_locations
      - business_transactions
      - project_contractors (via projects)
      - projects
      - employee_contracts
      - employee_business_assignments
      - employees
      - vehicle_trips, vehicle_expenses, vehicle_reimbursements
      - vehicles
      - menu_combos, menu_promotions
      - payroll_exports
      - Finally: DELETE business (cascades handle remaining)
   c. Create audit log
3. If hardDelete=false (default):
   - Use existing soft delete logic
```

### Phase 2: Create Deletion Service/Utility
**New File**: `src/lib/business-deletion-service.ts`

**Purpose**: Centralized deletion logic to handle complex cascade
```typescript
export async function deleteBusinessHard(businessId: string, userId: string) {
  // Use Prisma transaction to ensure atomicity
  // Delete in correct dependency order
  // Return detailed result with counts
}
```

### Phase 3: Add UI Components
**File**: `src/app/business/manage/page.tsx`

**Changes**:
1. Add "Delete Business" button (visible to system admins only)
2. Check if business has `[Demo]` suffix
3. If demo: Show "Safe to Delete" indicator
4. On click: Open confirmation modal

**New Component**: `src/components/business/business-deletion-modal.tsx`
```typescript
- Multi-step confirmation
- Show warning about related data:
  * X members will be removed
  * X products will be deleted
  * X orders will be deleted
  * etc.
- Require typing business name to confirm
- Option for hard vs soft delete
- Loading state during deletion
- Success/error feedback
```

### Phase 4: Update Permissions
**File**: `src/types/permissions.ts`

**Current**: `canDeleteBusiness` permission exists
**Action**: Verify it's properly checked in API and UI

---

## 5. SAFETY MEASURES

### Pre-Delete Checks
```typescript
1. ✅ User must be system admin
2. ✅ Check for active memberships (already implemented)
3. ✅ Check for active employees (already implemented)
4. 🆕 Count related records and warn user:
   - Products, Orders, Categories, etc.
5. 🆕 Require explicit confirmation:
   - Type business name to confirm
   - For non-demo: require typing "DELETE PERMANENTLY"
6. 🆕 Demo business detection:
   - If name contains '[Demo]': Allow easier deletion
   - If not demo: Extra warnings and confirmations
```

### Audit Trail
```typescript
1. ✅ Log business deletion (already implemented)
2. 🆕 Log detailed information:
   - Related records deleted (counts by type)
   - User who performed deletion
   - Timestamp
   - Business details (name, type, description)
3. 🆕 Store deleted business summary in audit log details
```

### Transaction Safety
```typescript
1. 🆕 Wrap entire deletion in Prisma transaction
2. 🆕 If any step fails, rollback everything
3. 🆕 Detailed error reporting
```

---

## 6. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Accidental deletion of real business** | 🔴 CRITICAL | Multi-step confirmation, require typing business name, extra warnings for non-demo |
| **Foreign key constraint violations** | 🟠 HIGH | Delete in correct order (children first), use transaction |
| **Data loss without backup** | 🔴 CRITICAL | Suggest creating backup before deletion, audit logging |
| **User deletes wrong business** | 🔴 CRITICAL | Show business details prominently, require exact name match |
| **Incomplete deletion leaves orphaned records** | 🟡 MEDIUM | Use transaction, verify all related tables covered |
| **Performance impact on large businesses** | 🟡 MEDIUM | Add loading indicator, consider background job for large deletions |

---

## 7. USER EXPERIENCE FLOW

### For Demo Businesses (Contains `[Demo]`)
```
1. User clicks "Delete Business" button
2. Modal shows:
   ✓ "This is a demo business - safe to delete"
   ✓ Summary of related data to be deleted
   ✓ Single confirmation prompt
3. User confirms
4. Deletion proceeds with loading indicator
5. Success message → Redirect to business list or dashboard
```

### For Real Businesses
```
1. User clicks "Delete Business" button
2. Modal shows:
   ⚠️ "WARNING: This will permanently delete all business data"
   ⚠️ Detailed list of related records
   ⚠️ "This action cannot be undone"
3. User must type exact business name
4. User must type "DELETE PERMANENTLY"
5. Deletion proceeds with loading indicator
6. Success message → Redirect
```

---

## 8. TESTING REQUIREMENTS

### Unit Tests
- [ ] Business deletion service deletes all related records
- [ ] Transaction rollback on error
- [ ] Proper order of deletion (no FK violations)
- [ ] Audit log creation

### Integration Tests
- [ ] DELETE endpoint with hardDelete=true
- [ ] DELETE endpoint with hardDelete=false (soft delete)
- [ ] Permission checks (system admin only)
- [ ] Safety checks (active members/employees)

### Manual Testing
- [ ] Delete demo business successfully
- [ ] Verify all related records deleted
- [ ] Attempt to delete with active members (should fail)
- [ ] Attempt to delete as non-admin (should fail)
- [ ] Cancel deletion at each confirmation step
- [ ] Verify audit logs created
- [ ] Test on each business type (clothing, restaurant, etc.)

---

## 9. ROLLOUT PLAN

### Development Steps
1. Create business deletion service (`business-deletion-service.ts`)
2. Update DELETE API endpoint with hardDelete option
3. Create business deletion modal component
4. Add delete button to `/business/manage` page
5. Add unit tests
6. Manual testing with demo businesses
7. Code review
8. Deploy to staging
9. Final testing
10. Production deployment

### Monitoring
- Monitor audit logs for business deletions
- Watch for error rates in deletion endpoint
- Track time to complete deletions

---

## 10. ALTERNATIVE APPROACHES CONSIDERED

### Approach 1: Background Job
**Pros**: No UI blocking, handles large businesses better  
**Cons**: More complex, need job queue, user can't see immediate result  
**Decision**: Keep synchronous for now, revisit if performance issues

### Approach 2: Export Before Delete
**Pros**: Automatic backup before deletion  
**Cons**: Adds complexity, storage concerns  
**Decision**: Suggest manual export, don't force it

### Approach 3: Cascade All Relations in Schema
**Pros**: Simpler deletion logic  
**Cons**: Risky - one wrong delete cascades everything  
**Decision**: Keep manual control, too dangerous to cascade everything

---

## 11. FILES TO MODIFY/CREATE

### New Files
- [ ] `src/lib/business-deletion-service.ts` - Core deletion logic
- [ ] `src/components/business/business-deletion-modal.tsx` - UI modal
- [ ] `BUSINESS_DELETION_IMPACT_ANALYSIS.md` - This document

### Modified Files
- [ ] `src/app/api/admin/businesses/[id]/route.ts` - Add hardDelete logic
- [ ] `src/app/business/manage/page.tsx` - Add delete button and modal
- [ ] `src/types/permissions.ts` - Verify canDeleteBusiness permission

---

## 12. QUESTIONS FOR STAKEHOLDER

1. **Deletion Type**: Should we allow hard delete for ALL businesses or only demo businesses?
2. **Backup Requirement**: Should we force an export/backup before deletion?
3. **Confirmation Level**: Is requiring typing business name sufficient, or need more?
4. **Soft Delete Option**: Should UI offer both soft and hard delete options?
5. **Background Jobs**: For large businesses, should deletion be async/background job?

---

## 13. ESTIMATED EFFORT

| Task | Estimated Time |
|------|----------------|
| Business deletion service | 2-3 hours |
| API endpoint update | 1-2 hours |
| UI deletion modal | 2-3 hours |
| Integration into manage page | 1 hour |
| Testing (unit + manual) | 2-3 hours |
| Documentation | 1 hour |
| Code review + fixes | 1-2 hours |
| **Total** | **10-15 hours** |

---

## 14. SUCCESS CRITERIA

✅ System admin can delete demo businesses with clear warnings  
✅ All related data is cleaned up (no orphaned records)  
✅ Non-demo businesses have extra protection (stricter confirmation)  
✅ Audit logs capture all deletions with details  
✅ No FK constraint violations during deletion  
✅ Transaction rollback works on errors  
✅ UI provides clear feedback during deletion process  
✅ Cannot delete business with active members/employees  

---

## 15. RECOMMENDATION

**Proceed with Hybrid Approach (Option B with safeguards)**:
- Implement hard delete capability
- Extra protections for non-demo businesses
- Clear warnings and multi-step confirmation
- Demo business identification makes testing safer
- Proper ordering prevents FK violations
- Audit logging maintains accountability

This approach balances the need to clean up demo data (which was the original request) with the safety requirements for production business data.
