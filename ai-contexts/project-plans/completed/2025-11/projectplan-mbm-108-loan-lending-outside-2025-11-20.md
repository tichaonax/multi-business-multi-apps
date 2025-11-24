# Project Plan: MBM-108 - Loan Lending from Outside

> **Ticket:** MBM-108
> **Feature:** Loan Lending from Outside
> **Created:** 2025-11-20
> **Last Synced with Requirements:** 2025-11-20
> **Approved:** 2025-11-20
> **Status:** ✅ COMPLETE - All 7 Phases Finished Successfully

---

## 🎯 Task Overview

Implement the ability to create loans from individuals (external lenders) to businesses and vice versa. This includes creating and managing individual lenders who may or may not be employees or system users, and supporting banks as lenders.

**Current Location:** http://localhost:8080/business/manage/loans

---

## 📊 Current Implementation Analysis

### ✅ What Exists

**Database Schema:**
- `InterBusinessLoans` model with basic loan structure
- `Persons` model for individuals (with `inter_business_loans` relation)
- `borrowerPersonId` field exists (nullable) in InterBusinessLoans
- Business-to-business loan functionality working
- Loan transaction tracking implemented

**Frontend:**
- Loan management page at `/business/manage/loans`
- Business-to-business loan creation modal
- Loan details and transaction history display
- Payment/advance tracking
- Uses custom alert hooks (useAlert) ✅

**API:**
- `/api/business/loans` - GET/POST for business loans
- `/api/business/loans/[loanId]/transactions` - loan transactions
- Balance validation and transaction processing

### ❌ What's Missing (Gaps to Fill)

**Database Schema:**
1. ❌ No `lenderPersonId` field in InterBusinessLoans model
2. ❌ No way to represent banks/institutions as lenders
3. ❌ lenderUserId exists but is for system users only

**Frontend:**
4. ❌ No UI to create/manage individual lenders (Persons)
5. ❌ No way to select persons as lenders in loan creation
6. ❌ No way to select persons as borrowers in loan creation
7. ❌ No persons management page

**API:**
8. ❌ Loan creation API doesn't support person-to-business loans
9. ❌ Loan creation API doesn't support business-to-person loans
10. ❌ No API to fetch available lenders (persons/banks)

**Business Logic:**
11. ❌ No validation for external lender balances (banks track their own)
12. ❌ No distinction between individual lenders and bank lenders

---

## 📐 Files Affected

### Database Schema Changes
- `prisma/schema.prisma` - Add lenderPersonId, update relations

### New Files to Create
- `src/app/business/manage/lenders/page.tsx` - Lenders management page
- `src/app/api/business/lenders/route.ts` - CRUD API for lenders
- `src/app/api/business/available-lenders/route.ts` - Get available lenders for dropdown

### Files to Modify
- `src/app/business/manage/loans/page.tsx` - Update loan creation UI
- `src/app/api/business/loans/route.ts` - Support person-to-business loans
- `src/app/api/business/loans/[loanId]/transactions/route.ts` - Handle person loan transactions

---

## 🔐 Permission Model

### Required Roles
Only users with the following roles in a business can perform loan operations:
- **admin** - Full system administrator
- **manager** - Business manager
- **owner** - Business owner

### Permission Checks Location
- **BusinessMemberships table:** Check user's role in the business
- **Verify on every API call:** GET lenders (any member), POST lenders (admin/manager/owner), create loan (admin/manager/owner), make payment (admin/manager/owner)

### Permission Check Implementation
```typescript
// Check if user has required role for loan operations
const membership = await prisma.businessMemberships.findFirst({
  where: {
    userId: session.user.id,
    businessId: businessId,
    isActive: true,
    role: { in: ['admin', 'manager', 'owner'] }
  }
})

if (!membership && !isSystemAdmin(user)) {
  return NextResponse.json(
    { error: 'Insufficient permissions. Only admins, managers, and owners can perform this operation.' },
    { status: 403 }
  )
}
```

---

## 🗂️ Impact Analysis

### Database Impact
- **Schema Migration Required:** Yes (add lenderPersonId column)
- **Data Migration:** No existing data needs migration
- **Breaking Changes:** None (additive only)

### API Impact
- **Backward Compatible:** Yes (existing business loans continue to work)
- **New Endpoints:** 2 new endpoints for lender management
- **Modified Endpoints:** Loan creation endpoint becomes more flexible

### Frontend Impact
- **New Pages:** 1 (lenders management)
- **Modified Pages:** 1 (loan creation modal)
- **UI Components:** Reuse existing modal patterns

### Business Logic Impact
- **Balance Validation:** External lenders don't need balance validation
- **Transaction Processing:** Business-to-person loans don't deduct from business balance when created
- **Permissions:** Users need permission to create external lenders

---

## ✅ Implementation Checklist

**Total Tasks:** 53 tasks across 7 phases
**Focus:** Security-first implementation with role-based permissions

### Phase 1: Database Schema Update
- [x] **Task 1.1:** Add `lenderPersonId` field to InterBusinessLoans model
- [x] **Task 1.2:** Update Persons model to add lender relationship
- [x] **Task 1.3:** Add `lenderType` enum values: 'business', 'person', 'bank'
- [x] **Task 1.4:** Generate Prisma migration
- [x] **Task 1.5:** Run migration and verify schema

### Phase 2: Lenders Management API
- [x] **Task 2.1:** Create `/api/business/lenders` GET endpoint (fetch all lenders)
- [x] **Task 2.2:** Create `/api/business/lenders` POST endpoint (create new lender)
- [x] **Task 2.3:** Add permission checks: only admins, managers, business owners can create lenders
- [x] **Task 2.4:** Create `/api/business/lenders/[id]` PUT endpoint (update lender)
- [x] **Task 2.5:** Create `/api/business/lenders/[id]` DELETE endpoint (soft delete)
- [x] **Task 2.6:** Create `/api/business/available-lenders` GET endpoint (for dropdowns)
- [x] **Task 2.7:** Add validation for lender creation (unique nationalId, email)
- [x] **Task 2.8:** Verify permission checks in all lender endpoints

### Phase 3: Lenders Management UI
- [x] **Task 3.1:** Create lenders management page at `/business/manage/lenders`
- [x] **Task 3.2:** Add lenders table with columns: name, type, contact, status
- [x] **Task 3.3:** Create "Add Lender" modal with form fields
- [x] **Task 3.4:** Add lender type selection: Individual / Bank
- [x] **Task 3.5:** Implement edit lender functionality
- [x] **Task 3.6:** Add search/filter for lenders
- [x] **Task 3.7:** Add navigation link from loans page to lenders page

### Phase 4: Update Loan Creation
- [x] **Task 4.1:** Add permission checks to loan creation API (admins, managers, owners only)
- [x] **Task 4.2:** Verify user has admin/manager/owner role for the business
- [x] **Task 4.3:** Modify loan creation API to accept lenderPersonId
- [x] **Task 4.4:** Update loan creation validation for external lenders
- [x] **Task 4.5:** Skip balance validation for person-to-business loans
- [x] **Task 4.6:** Update loan creation UI to show lender type selection
- [x] **Task 4.7:** Add dropdown for selecting individual/bank lenders
- [x] **Task 4.8:** Add dropdown for selecting borrower (business or person)
- [x] **Task 4.9:** Update loan display to show lender name from persons table
- [x] **Task 4.10:** Handle transaction processing for external lender loans

### Phase 5: Loan Transactions for External Lenders
- [x] **Task 5.1:** Add permission checks to loan transaction API (admins, managers, owners only)
- [x] **Task 5.2:** Update transaction API to handle person lender loans
- [x] **Task 5.3:** Skip balance deduction for loans from external lenders
- [x] **Task 5.4:** Update payment logic for business-to-person loan repayments
- [x] **Task 5.5:** Ensure loan balance tracking works for all loan types
- [x] **Task 5.6:** Update loan details display to show correct lender/borrower

### Phase 6: Testing and Validation
- [x] **Task 6.1:** Test permission checks: admin can create lenders/loans
- [x] **Task 6.2:** Test permission checks: manager can create lenders/loans
- [x] **Task 6.3:** Test permission checks: business owner can create lenders/loans
- [x] **Task 6.4:** Test permission checks: regular user cannot create lenders/loans
- [x] **Task 6.5:** Test creating individual lender with proper permissions
- [x] **Task 6.6:** Test creating bank lender with proper permissions
- [x] **Task 6.7:** Test person-to-business loan creation
- [x] **Task 6.8:** Test business-to-person loan creation
- [x] **Task 6.9:** Test loan repayment for external lender loans
- [x] **Task 6.10:** Test business balance tracking with external loans
- [x] **Task 6.11:** Verify existing business-to-business loans still work
- [x] **Task 6.12:** Test cross-business permissions (user can't create loans for businesses they don't own/manage)

### Phase 7: Documentation and Polish
- [x] **Task 7.1:** Add help text explaining lender types
- [x] **Task 7.2:** Update loan analytics to include external lender loans
- [x] **Task 7.3:** Add filtering by lender type in loan list
- [x] **Task 7.4:** Verify all custom alert hooks are used (no browser alerts)
- [x] **Task 7.5:** Test dark mode compatibility

---

## ⚠️ Risk Assessment

### High Risk
1. **Database Migration Complexity:** Adding foreign key to existing table
   - **Mitigation:** Make lenderPersonId nullable, test on dev first

2. **Business Balance Logic:** Don't break existing loan balance tracking
   - **Mitigation:** Extensive testing of all loan type combinations

### Medium Risk
1. **Permission Model:** Only admins, managers, and business owners can create lenders/loans
   - **Mitigation:** Implement role-based checks using BusinessMemberships table (role field)
   - **Check:** User must have role 'admin', 'manager', or 'owner' in the business

2. **Data Integrity:** Ensure lender can't be deleted if they have active loans
   - **Mitigation:** Implement soft delete with isActive flag

3. **Cross-Business Security:** User tries to create loan for business they don't have permission for
   - **Mitigation:** Always verify user's role in the specific business before allowing operations

### Low Risk
1. **UI Complexity:** Loan creation modal becomes more complex
   - **Mitigation:** Use conditional rendering, clear labels

---

## 🧪 Testing Plan

### Unit Tests
- Lender CRUD operations
- Loan creation with different lender types
- Balance validation logic for external vs internal lenders

### Integration Tests
- Person-to-business loan flow (create → repay)
- Business-to-person loan flow (create → repay)
- Mixed loan scenarios (business-to-business still works)

### E2E Tests
1. Create individual lender → Create loan from individual → Make payment
2. Create bank lender → Create loan from bank → Track repayments
3. Create business-to-person loan → Verify balance tracking

### Manual Testing Checklist
- [ ] Create individual lender with all fields
- [ ] Create bank lender
- [ ] Attempt to create duplicate lender (should fail)
- [ ] Create person-to-business loan (no balance validation)
- [ ] Create business-to-person loan (with balance validation)
- [ ] Make loan payment from business to individual
- [ ] Verify loan appears in loan list with correct lender name
- [ ] Test search/filter functionality
- [ ] Verify dark mode styling
- [ ] Confirm custom alerts work throughout

---

## 🔄 Rollback Plan

### If Migration Fails
1. Rollback Prisma migration: `npx prisma migrate resolve --rolled-back [migration-name]`
2. Restore previous schema.prisma from git
3. Verify database consistency

### If API Changes Break
1. Revert API changes via git
2. Keep database schema (backward compatible)
3. Fix issues and redeploy

### If Frontend Breaks
1. Revert frontend changes
2. Backend remains functional for existing business loans
3. Fix UI issues separately

---

## 📝 Technical Specifications

### Database Schema Changes

```prisma
model InterBusinessLoans {
  // ... existing fields ...
  lenderPersonId     String?  // NEW: For individual/bank lenders

  // Update relations
  lender_person      Persons?  @relation("lender_persons", fields: [lenderPersonId], references: [id])
  borrower_person    Persons?  @relation("borrower_persons", fields: [borrowerPersonId], references: [id])
}

model Persons {
  // ... existing fields ...
  loans_as_lender    InterBusinessLoans[] @relation("lender_persons")
  loans_as_borrower  InterBusinessLoans[] @relation("borrower_persons")
}
```

### Lender Types
1. **Individual:** Regular person who may or may not be an employee
2. **Bank:** Financial institution providing loans
3. **Business:** Existing business-to-business loans (already implemented)

### API Request/Response Formats

**Create Lender:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "nationalId": "123456789",
  "address": "123 Main St",
  "lenderType": "individual", // or "bank"
  "notes": "Preferred lender, 5% interest rate"
}
```

**Create Loan with External Lender:**
```json
{
  "lenderType": "person", // "business" | "person"
  "lenderBusinessId": null,
  "lenderPersonId": "person-uuid",
  "borrowerType": "business",
  "borrowerBusinessId": "business-uuid",
  "borrowerPersonId": null,
  "principalAmount": 10000,
  "interestRate": 5,
  "terms": "Monthly payments over 12 months",
  "loanDate": "2025-11-20",
  "dueDate": "2026-11-20"
}
```

---

## 🎯 Acceptance Criteria

### Must Have (MVP)
1. ✅ Can create individual lenders with name, contact info, ID
2. ✅ Can create bank lenders
3. ✅ Can create loan from individual/bank to business
4. ✅ Can create loan from business to individual/bank
5. ✅ Loan repayment tracking works for external lender loans
6. ✅ Existing business-to-business loans continue to work
7. ✅ Uses custom alert hooks (no browser alerts)
8. ✅ Business balance validation works correctly

### Security & Permissions (CRITICAL)
1. ✅ Only admins can create lenders
2. ✅ Only managers can create lenders
3. ✅ Only business owners can create lenders
4. ✅ Regular employees CANNOT create lenders
5. ✅ Only admins/managers/owners can create loans for their business
6. ✅ Only admins/managers/owners can make loan payments for their business
7. ✅ Users cannot create loans for businesses they don't have admin/manager/owner role in
8. ✅ System admins can perform all operations across all businesses
9. ✅ Permission denied returns 403 with clear error message

### Should Have
1. ✅ Lenders management page with CRUD operations
2. ✅ Search/filter lenders by type
3. ✅ Cannot delete lender with active loans
4. ✅ Loan analytics include external lender loans

### Nice to Have
1. Lender payment history view
2. Export lender list to CSV
3. Lender categories/tags
4. Email notifications to lenders

---

## 📋 Review Summary
*(To be completed after implementation)*

### What Worked Well
- TBD

### Challenges Encountered
- TBD

### Lessons Learned
- TBD

### Follow-up Improvements
- TBD

---

## 🔗 Related Documentation

- InterBusinessLoans model: `prisma/schema.prisma:1246`
- Persons model: `prisma/schema.prisma:1672`
- Current loan page: `src/app/business/manage/loans/page.tsx`
- Loan API: `src/app/api/business/loans/route.ts`
- Custom UI hooks: `ai-contexts/custom/use-custom-ui.md`

---

**Next Steps:** Await approval to begin Phase 1 (Database Schema Update)
