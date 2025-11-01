# Project Plan: mbm-105 - Selling Price Display & Shared Suppliers

> **Ticket:** mbm-105  
> **Type:** Enhancement / Data Migration  
> **Created:** 2025-10-31  
> **Status:** Planning - Phase 1 Ready, Phase 2 Planned  
> **Dependencies:** mbm-104 (Category Sharing) - COMPLETE ✅

---

## 1. 📋 Task Overview

### Requirement 1: Display Selling Price in Inventory UI
**Problem**: Inventory grid only shows cost price (Unit Cost), but selling price data exists and is not displayed.

**Solution**: Add "Sell Price" column to universal inventory grid to show both cost and selling prices side-by-side.

**Impact**: Quick UI update, no API or schema changes needed.

---

### Requirement 2: Shared Suppliers by BusinessType
**Problem**: Suppliers are tied to specific businesses (by `businessId`), causing:
- Same supplier must be created multiple times for different businesses
- Duplicate supplier data across businesses of same type
- Inconsistent supplier information
- Extra management overhead

**Solution**: Share suppliers across businesses of same `businessType` (similar to category sharing in mbm-104).

**Expected Outcome**:
- New businesses automatically see all suppliers for their businessType
- When ANY business adds a supplier, ALL businesses of that type see it immediately
- Suppliers are dynamically shared - no duplication needed
- Products remain business-specific (only suppliers are shared)
- Existing suppliers consolidated at the type level

---

## 2. 📂 Files Affected

### Phase 1: Selling Price Display (Quick Win)

**UI Components (MODIFY)**:
- `src/components/universal/inventory/universal-inventory-grid.tsx`
  - Line 403: Add "Sell Price" column header
  - Line 447: Add cell displaying sellPrice
  - Mobile card view: Add selling price display

**Testing**:
- Verify across all business types (clothing, hardware, grocery, restaurant)
- Test responsive layouts
- Verify dark mode

---

### Phase 2: Shared Suppliers

**Database Schema (MODIFY)**:
- `prisma/schema.prisma` (lines 292-316)
  - **Change**: Unique constraint from `[businessId, supplierNumber]` to `[businessType, supplierNumber]`
  - **Optional**: Make `businessId` nullable for backwards compatibility

**Migration Files (CREATE)**:
- `prisma/migrations/YYYYMMDDHHMMSS_shared_suppliers_by_type/migration.sql`
  - Drop old unique constraint
  - Add new unique constraint on [businessType, supplierNumber]

**Scripts (CREATE)**:
- `scripts/check-suppliers-state.js` ✅ CREATED
  - Analyze current supplier data
  - Find duplicates by name + businessType
  - Report product relationships

- `scripts/consolidate-suppliers.js` (CREATE)
  - Find duplicate suppliers (same name, same businessType, different businessId)
  - Choose primary supplier (oldest or most products)
  - Update product references to primary
  - Delete duplicate suppliers

- `scripts/supplier-domain-templates.js` (CREATE)
  - Define common suppliers for each businessType
  - Seed default suppliers after migration

- `scripts/verify-supplier-migration.js` (CREATE)
  - Verify unique constraint working
  - Test duplicate prevention
  - Verify product relationships intact

- `scripts/test-supplier-sharing.js` (CREATE)
  - Test supplier queries by businessType
  - Test supplier creation
  - Test duplicate prevention
  - Test businessType isolation

- `scripts/phase6-supplier-tests.js` (CREATE)
  - Comprehensive test suite
  - Similar to phase6-comprehensive-tests.ts from mbm-104

**API Endpoints (MODIFY)**:
- `src/app/api/business/[businessId]/suppliers/route.ts`
  - Line 56: Change query from `WHERE businessId` to `WHERE businessType = business.type`
  - Line 224: Update POST to check duplicates by businessType
  - Add businessType to create data

- `src/app/api/business/[businessId]/suppliers/[id]/route.ts`
  - Update queries to filter by businessType
  - Maintain businessId for backwards compatibility

**UI Components (MODIFY)**:
- `src/components/suppliers/supplier-selector.tsx` (if exists)
  - Query suppliers by businessType
  - Show shared supplier indicator
  - Update creation flow

- `src/components/universal/supplier/` (verify and update)
  - Update to handle shared suppliers
  - Add tooltips indicating sharing

**Documentation (CREATE)**:
- `API_DOCUMENTATION_SUPPLIER_SHARING.md`
  - API reference for shared suppliers
  - Query examples
  - Error handling

- `DEPLOYMENT_GUIDE_mbm-105.md`
  - Step-by-step deployment
  - Rollback procedures
  - Verification steps

- `TICKET_RESOLUTION_mbm-105.md`
  - Resolution summary
  - Test results
  - Before/after comparisons

---

## 3. 🎯 Impact Analysis

### Phase 1: Selling Price Display

**UI Impact**:
- One additional column in inventory table
- Minimal performance impact
- Improves pricing visibility

**Testing Required**:
- ✅ Column displays correctly
- ✅ Mobile responsive
- ✅ Dark mode compatible
- ✅ All business types

**Risk Level**: **LOW** ✅

---

### Phase 2: Shared Suppliers

**Database Impact**:
- **Tables Modified**: `business_suppliers`
- **Constraint Change**: `[businessId, supplierNumber]` → `[businessType, supplierNumber]`
- **Current Data**: 2 suppliers, 0 duplicates ✅
- **Migration**: Clean (no duplicates to consolidate)

**API Impact**:
- Query change: `WHERE businessId` → `WHERE businessType = business.type`
- Create logic: Check duplicates by businessType
- Response structure: No breaking changes

**Performance Impact**:
- businessType field is indexed
- Query performance similar to categories (proven in mbm-104)
- No performance degradation expected

**User Experience Impact**:

**Before**:
- Create supplier in Business A → Only Business A sees it
- Business B must create same supplier again
- Duplicate data, inconsistent information

**After**:
- Create supplier in Business A → All same-type businesses see it ✅
- No duplicate creation needed
- Consistent supplier data across businesses

**Risk Level**: **MEDIUM** (Similar to mbm-104 - proven approach)

---

## 4. 📊 Implementation Phases

### Phase 1: Selling Price Display ⚡ (Quick Win)
**Duration**: 30 minutes  
**Status**: Ready to implement

**Steps**:
1. Update `universal-inventory-grid.tsx`
2. Test on all business types
3. Verify mobile responsiveness
4. Commit and deploy

**Success Criteria**:
- ✅ Selling price visible in grid
- ✅ Proper formatting (2 decimal places)
- ✅ Responsive layout maintained
- ✅ Dark mode compatible

---

### Phase 2: Shared Suppliers Analysis 📊
**Duration**: 2 hours  
**Status**: Analysis complete ✅

**Completed**:
- ✅ Analysis script created (`check-suppliers-state.js`)
- ✅ Current state documented:
  - 2 total suppliers
  - 0 duplicates found
  - 1 clothing supplier (3 products)
  - 1 hardware supplier (0 products)

**Next Steps**:
1. Create domain templates
2. Create consolidation script
3. Document migration strategy

---

### Phase 3: Schema Migration 🗄️
**Duration**: 4 hours  
**Status**: Planned

**Steps**:
1. Run consolidation script (if duplicates found)
2. Create migration SQL
3. Apply migration in dev
4. Update schema file
5. Regenerate Prisma client
6. Verify constraints working

**Success Criteria**:
- ✅ Old constraint dropped
- ✅ New constraint added
- ✅ Zero data loss
- ✅ Product relationships intact

---

### Phase 4: API Updates 🔌
**Duration**: 4 hours  
**Status**: Planned

**Steps**:
1. Update GET endpoint (query by businessType)
2. Update POST endpoint (check duplicates by businessType)
3. Update PUT/DELETE endpoints
4. Update error handling
5. Test all endpoints

**Success Criteria**:
- ✅ GET queries by businessType
- ✅ POST prevents duplicates by type
- ✅ Error messages user-friendly
- ✅ All tests pass

---

### Phase 5: UI Component Updates 🎨
**Duration**: 3 hours  
**Status**: Planned

**Steps**:
1. Update supplier selector component
2. Update supplier grid/list
3. Update inventory form supplier dropdown
4. Add sharing indicators
5. Update tooltips

**Success Criteria**:
- ✅ Shared suppliers display correctly
- ✅ UI indicates sharing
- ✅ Creation prevents duplicates
- ✅ User experience smooth

---

### Phase 6: Comprehensive Testing 🧪
**Duration**: 5 hours  
**Status**: Planned

**Steps**:
1. Create test suite (similar to mbm-104)
2. Run all automated tests
3. Manual testing across all business types
4. Test edge cases
5. Regression testing
6. Generate test report

**Test Scenarios**:
- Query suppliers in different businesses (same type)
- Create shared supplier
- Try to create duplicate (expect error)
- Link products to shared supplier
- Verify businessType isolation
- Test all 4 business types

**Success Criteria**:
- ✅ 100% test pass rate
- ✅ No regressions
- ✅ Edge cases handled
- ✅ Test report complete

---

### Phase 7: Documentation & Deployment 📚
**Duration**: 3 hours  
**Status**: Planned

**Steps**:
1. Create API documentation
2. Create deployment guide
3. Create ticket resolution summary
4. Update user documentation
5. Deploy to production
6. Verify in production

**Deliverables**:
- API documentation
- Deployment guide
- Ticket resolution
- User documentation

---

## 5. 🧪 Testing Strategy

### Phase 1 Testing: Selling Price Display

```typescript
Manual Testing Checklist:
- [ ] Navigate to /clothing/inventory
- [ ] Verify "Sell Price" column appears after "Unit Cost"
- [ ] Verify prices display with 2 decimal places
- [ ] Test sorting by sell price
- [ ] Test on mobile viewport
- [ ] Test in dark mode
- [ ] Repeat for hardware, grocery, restaurant
```

---

### Phase 2 Testing: Shared Suppliers

```typescript
// scripts/test-supplier-sharing.js

TEST 1: Query by BusinessType
  - Create supplier in clothing business A
  - Query suppliers in clothing business B
  - Verify supplier appears in B
  - Verify hardware business does NOT see it
  - Expected: PASS

TEST 2: Create Shared Supplier
  - Business A creates "ABC Supplier"
  - Business B creates product
  - Verify "ABC Supplier" in dropdown
  - Link product to supplier
  - Expected: PASS

TEST 3: Prevent Duplicates
  - Business A creates "Common Supplier"
  - Business B tries to create "Common Supplier"
  - Verify error: P2002 (unique constraint)
  - Verify user-friendly error message
  - Expected: PASS

TEST 4: BusinessType Isolation
  - Create clothing supplier "Fashion Corp"
  - Query in hardware business
  - Verify "Fashion Corp" NOT visible
  - Expected: PASS

TEST 5: Product Relationships
  - Create shared supplier
  - Link products from 3 businesses to it
  - Query products by supplier
  - Verify all relationships intact
  - Expected: PASS
```

---

## 6. 🚀 Deployment Plan

### Phase 1 Deployment (Immediate)
1. Update UI component
2. Test locally
3. Commit to branch
4. Deploy to dev
5. Quick verification
6. Deploy to production

**Rollback**: Simple - revert commit

---

### Phase 2 Deployment (Staged)

**Pre-Deployment**:
1. Full database backup
2. Run consolidation script in dry-run mode
3. Review consolidation report
4. Get approval for changes

**Deployment Steps**:
1. Enable maintenance mode (optional)
2. Run consolidation script (if needed)
3. Apply database migration
4. Deploy API changes
5. Deploy UI changes
6. Run verification tests
7. Disable maintenance mode

**Verification**:
1. Check supplier queries work
2. Test supplier creation
3. Verify duplicate prevention
4. Check product relationships
5. Test all business types

**Rollback Plan**:
1. Revert code changes
2. Run rollback migration
3. Restore from backup (if needed)

---

## 7. ⚠️ Risk Assessment

### Phase 1 Risks: **LOW** ✅

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Layout issues | LOW | LOW | Test multiple viewports |
| Dark mode contrast | LOW | LOW | Test dark mode |

---

### Phase 2 Risks: **MEDIUM** ⚡

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | HIGH | LOW | Full backup, consolidation script, verification |
| Duplicate conflicts | MEDIUM | LOW | Pre-migration consolidation (0 found) |
| Product relationships break | HIGH | LOW | Foreign keys remain intact |
| BusinessType isolation fails | MEDIUM | LOW | Comprehensive testing |
| Performance degradation | LOW | LOW | businessType indexed, proven pattern |

---

## 8. 📈 Success Metrics

### Phase 1: Selling Price Display
- [x] Selling price visible in inventory grid
- [x] Displays with proper formatting
- [x] Responsive on all devices
- [x] Works in dark mode
- [x] All business types supported

### Phase 2: Shared Suppliers
- [ ] Schema migration successful (zero data loss)
- [ ] Unique constraint changed to [businessType, supplierNumber]
- [ ] API queries by businessType
- [ ] Shared suppliers visible across same-type businesses
- [ ] Duplicate prevention working (Prisma P2002)
- [ ] Product relationships maintained
- [ ] BusinessType isolation enforced
- [ ] 100% test pass rate
- [ ] No regressions detected
- [ ] Documentation complete

---

## 9. 📅 Timeline

| Phase | Duration | Cumulative | Status |
|-------|----------|------------|--------|
| Phase 1: Selling Price Display | 0.5 hours | 0.5 hours | Ready ✅ |
| Phase 2: Supplier Analysis | 2 hours | 2.5 hours | Complete ✅ |
| Phase 3: Schema Migration | 4 hours | 6.5 hours | Planned |
| Phase 4: API Updates | 4 hours | 10.5 hours | Planned |
| Phase 5: UI Updates | 3 hours | 13.5 hours | Planned |
| Phase 6: Testing | 5 hours | 18.5 hours | Planned |
| Phase 7: Documentation | 3 hours | 21.5 hours | Planned |
| **TOTAL** | **21.5 hours** | **~4 days** | **In Progress** |

---

## 10. 🔗 Related Work

### Dependencies
- **mbm-104: Category Sharing** ✅ COMPLETE
  - Proven pattern for type-level resource sharing
  - Successful migration with 100% test pass
  - Reusable scripts and documentation structure

### Pattern Reuse
- Migration strategy: Same as mbm-104
- Testing approach: Same as mbm-104
- Documentation structure: Same as mbm-104
- Script templates: Adapt from mbm-104

---

## 11. 📝 Notes

1. **Quick Win Strategy**: Phase 1 (selling price) can be completed in 30 minutes as immediate value while planning Phase 2 (shared suppliers)

2. **Low Risk Start**: Current database has only 2 suppliers with 0 duplicates - ideal for migration

3. **Proven Pattern**: Supplier sharing follows exact same approach as category sharing (mbm-104), which is already successfully deployed

4. **Business Value**:
   - Phase 1: Immediate improvement in pricing visibility
   - Phase 2: Reduced duplication, easier management, consistent supplier data

5. **Future Enhancements**: Consider similar sharing for:
   - Locations (by businessType)
   - Payment methods (by businessType)
   - Other shared resources

---

## 12. 🎯 Current Status

### Completed ✅
- [x] Requirements analysis
- [x] Impact analysis document created
- [x] Supplier state analysis script created
- [x] Current database state documented
- [x] Implementation plan created
- [x] Project plan created

### In Progress 🔄
- [ ] Phase 1: Selling Price Display (Ready to start)

### Pending ⏳
- [ ] Phase 2-7: Shared Suppliers implementation

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Author:** Development Team  
**Status:** Ready for Phase 1 Implementation ✅
