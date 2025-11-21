# Feature Development Session Template

> **Template Type:** Feature Development
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For creating new features, screens, or endpoints with structured planning.

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

### Feature-Specific Contexts (Load as needed after core contexts)

- `ai-contexts/frontend/component-context.md` - For UI component development
- `ai-contexts/frontend/ui-context.md` - For UI consistency and styling
- `ai-contexts/backend/backend-api-context.md` - For API endpoint development
- `ai-contexts/backend/database-context.md` - For database schema changes
- `ai-contexts/testing/unit-testing-context.md` - For test coverage

### Optional Contexts

- Domain-specific contexts based on the module being developed

**How to load:** Use the Read tool to load each relevant context document before beginning work.

---

## 🚀 Session Objective

<!-- Fill in your specific feature requirements before starting -->

**Ticket:** MBM-108

**Feature Name:** Loan Lending from Outside

**Feature Description:**
Implement the ability to create loans from individuals (external lenders) to businesses and vice versa. This includes creating and managing individual lenders who may or may not be employees or system users, and supporting banks as lenders.

**Current Location:** http://localhost:8080/business/manage/loans

**Target Module/Component:**
- Loan Management System
- New: Lenders Management Module
- Database: InterBusinessLoans, Persons models
- Frontend: /business/manage/loans, /business/manage/lenders (new)

**API Endpoints (if applicable):**
- Existing: `/api/business/loans` (GET/POST)
- Existing: `/api/business/loans/[loanId]/transactions` (POST)
- New: `/api/business/lenders` (GET/POST)
- New: `/api/business/lenders/[id]` (PUT/DELETE)
- New: `/api/business/available-lenders` (GET)

**UI/UX Requirements:**
use existing custom alerts notification hooks in place of browser alerts etc

**Permissions & Security:**
Only admins, managers, and business owners can perform loan transactions (create loans, create lenders, make payments) in businesses where they have those permissions.

**Permission Implementation:**
- Check BusinessMemberships table for user's role
- Required roles: 'admin', 'manager', 'owner'
- System admins can perform all operations across all businesses
- Return 403 Forbidden for unauthorized users
- Validate on every API call (create lender, create loan, make payment)

**Acceptance Criteria:**

### Functional Requirements
1. Can create individual lenders with name, contact info, national ID
2. Can create bank lenders
3. Can create loan from individual/bank to business
4. Can create loan from business to individual/bank
5. Loan repayment tracking works for external lender loans
6. Existing business-to-business loans continue to work
7. Uses custom alert hooks (no browser alerts)
8. Business balance validation works correctly

### Security Requirements (CRITICAL)
1. Only admins can create lenders/loans
2. Only managers can create lenders/loans
3. Only business owners can create lenders/loans
4. Regular employees CANNOT create lenders/loans
5. Users cannot create loans for businesses they don't have admin/manager/owner role in
6. System admins can perform all operations across all businesses
7. Permission denied returns 403 with clear error message
8. Cross-business validation prevents unauthorized access

### UI Requirements
1. Lenders management page with CRUD operations
2. Search/filter lenders by type (individual/bank)
3. Cannot delete lender with active loans
4. Loan creation modal supports lender type selection
5. Dropdown for selecting individual/bank lenders
6. Dropdown for selecting borrower (business or person)
7. Dark mode compatible

---

## 📐 Technical Specifications

**Technologies:**
- Next.js 14 (App Router)
- Prisma ORM
- PostgreSQL database
- TypeScript
- React hooks (useAlert, useConfirm)

**Dependencies:**
- Existing: prisma, next-auth, @/lib/permission-utils
- Existing: @/lib/business-balance-utils
- Existing: @/components/ui/confirm-modal (useAlert hook)

**Data Models:**

### Database Schema Changes
```prisma
model InterBusinessLoans {
  // ... existing fields ...
  lenderPersonId     String?  // NEW: For individual/bank lenders

  // NEW relation
  lender_person      Persons?  @relation("lender_persons", fields: [lenderPersonId], references: [id])
  borrower_person    Persons?  @relation("borrower_persons", fields: [borrowerPersonId], references: [id])
}

model Persons {
  // ... existing fields ...
  // NEW relations
  loans_as_lender    InterBusinessLoans[] @relation("lender_persons")
  loans_as_borrower  InterBusinessLoans[] @relation("borrower_persons")
}
```

### Lender Types
1. **Individual** - Regular person who may or may not be an employee
2. **Bank** - Financial institution providing loans
3. **Business** - Existing business-to-business loans (already implemented)

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

**Integration Points:**
- BusinessMemberships table for role validation
- Business balance tracking system
- Existing loan transaction processing
- Custom alert/confirm modal system

---

## 🧪 Testing Requirements

**Unit Tests:**
- Lender CRUD operations
- Loan creation with different lender types
- Balance validation logic for external vs internal lenders
- Permission check helper functions

**Integration Tests:**
- Person-to-business loan flow (create → repay)
- Business-to-person loan flow (create → repay)
- Mixed loan scenarios (business-to-business still works)
- Permission validation across different user roles

**E2E/Manual Tests:**
1. Create individual lender → Create loan from individual → Make payment
2. Create bank lender → Create loan from bank → Track repayments
3. Create business-to-person loan → Verify balance tracking
4. Test admin can create lenders/loans
5. Test manager can create lenders/loans
6. Test owner can create lenders/loans
7. Test employee is denied (403 error)
8. Test cross-business security (can't access other businesses)
9. Attempt to create duplicate lender (should fail)
10. Verify loan appears in loan list with correct lender name
11. Test search/filter functionality
12. Verify dark mode styling
13. Confirm custom alerts work throughout

---

## 📝 Session Notes

### Current Implementation Gaps (From Analysis)

**Database Schema (3 gaps):**
1. Missing `lenderPersonId` field in InterBusinessLoans model
2. No way to represent banks/institutions as lenders
3. `borrowerPersonId` exists but no UI uses it

**Frontend (4 gaps):**
1. No UI to create/manage individual lenders (Persons)
2. No way to select persons as lenders in loan creation
3. No way to select persons as borrowers in loan creation
4. No persons management page

**API (3 gaps):**
1. Loan creation API doesn't support person-to-business loans
2. Loan creation API doesn't support business-to-person loans
3. No API to fetch available lenders (persons/banks)

**Business Logic (2 gaps):**
1. No validation for external lender balances (banks track their own)
2. No distinction between individual lenders and bank lenders

### Files to Create
- `src/app/business/manage/lenders/page.tsx` - Lenders management page
- `src/app/api/business/lenders/route.ts` - CRUD API for lenders
- `src/app/api/business/available-lenders/route.ts` - Get available lenders for dropdown

### Files to Modify
- `prisma/schema.prisma` - Add lenderPersonId, update relations
- `src/app/business/manage/loans/page.tsx` - Update loan creation UI
- `src/app/api/business/loans/route.ts` - Support person-to-business loans
- `src/app/api/business/loans/[loanId]/transactions/route.ts` - Handle person loan transactions

### Key Design Decisions
1. Reuse existing `Persons` model (don't create new table)
2. Make `lenderPersonId` nullable (backward compatible)
3. Skip balance validation for external lenders (they track their own funds)
4. Use soft delete for lenders (protect data integrity - can't delete if active loans)
5. Follow existing patterns (custom alerts, dark mode)
6. Role-based permissions using BusinessMemberships table

### Business Rules
1. External lender loans don't require balance validation
2. Business-to-person loans require balance validation
3. Lenders cannot be deleted if they have active loans
4. Only admin/manager/owner roles can create lenders and loans
5. System admins bypass role checks

---

## ✅ Implementation Plan Summary

**Total Tasks:** 53 tasks across 7 phases
**Approach:** Security-first implementation with role-based permissions

### Phase 1: Database Schema Update (5 tasks)
- Add `lenderPersonId` field to InterBusinessLoans model
- Update Persons model relationships
- Generate and run Prisma migration

### Phase 2: Lenders Management API (8 tasks)
- Create CRUD endpoints for lenders
- Implement permission checks (admin/manager/owner only)
- Validation for unique nationalId and email

### Phase 3: Lenders Management UI (7 tasks)
- New page at `/business/manage/lenders`
- Create/edit/list lenders (individuals & banks)
- Search and filter functionality

### Phase 4: Update Loan Creation (10 tasks)
- Support selecting person/bank as lender
- Support selecting person as borrower
- Skip balance validation for external lenders
- Permission checks on all operations

### Phase 5: Loan Transactions (6 tasks)
- Handle repayments for external lender loans
- Update transaction processing logic
- Permission validation

### Phase 6: Testing (12 tasks)
- Test all loan type combinations
- Comprehensive permission testing
- Verify existing functionality intact

### Phase 7: Polish (5 tasks)
- Analytics, filtering, documentation

### Risk Mitigation
- Make lenderPersonId nullable (backward compatible)
- Extensive testing of all scenarios
- Soft delete for lenders (data integrity)
- Clear 403 error messages for unauthorized access

---

## 🔄 REFACTOR REQUIREMENTS (2025-11-21)

### Critical Issue: Loan Balance Not Credited to Borrower

**Problem Identified:**
When a business receives a loan (is the borrower), the loan principal is NOT being added to the business balance. This causes:
- Business shows existing revenue balance (e.g., $268.82)
- But when trying to repay loan, shows "insufficient funds"
- Loan proceeds should be added as credit to borrower's balance

**Required Fix:**
1. When business is BORROWER: Add loan principal to business balance
2. Record as "loan_received" transaction type
3. Business can pay from combined balance (revenue + loan proceeds)
4. Retroactively fix existing loans where business was borrower

### Bank vs Individual Lender Differentiation

**Problem:** Banks and individuals currently share same fields (National ID doesn't apply to banks)

**Individual Lender Fields:**
- Full Name (required)
- National ID (required) - use `NationalIdInput` component
- Phone (required) - use `PhoneNumberInput` component
- Email (optional)
- Address (optional)

**Bank Lender Fields:**
| Field | Required | Example |
|-------|----------|---------|
| Bank Name | Yes | ZB BANK LTD |
| Registration Number | Yes | (Business Reg) |
| SWIFT Code (11-char) | No | ZBCOZWHXXXX |
| SWIFT Code (8-char) | No | ZBCOZWHX |
| Branch Code | No | XXX |
| Primary Phone | Yes | +263 8677 002 005 |
| Additional Phones | No | +263 8677 002 001 |
| Address | Yes | ZB House, 21 Natal Road |
| City | Yes | HARARE |
| Country | Yes | Zimbabwe |
| Email | No | contact@zb.co.zw |

### Loan Breakdown Display in Business

**Requirement:** Show loan breakdown in business balance display

**Display Rules:**
- Only show if business has loans (hide if no loans)
- Support multiple loans per business
- Show per-loan breakdown with:
  - Loan number
  - Lender name
  - Principal amount
  - Interest (manually recorded when payments made)
  - Remaining balance
  - Status

**Summary Display:**
- Total loans received (principal)
- Total interest accrued
- Total outstanding

### UI Components to Use

**Existing Components:**
- `src/components/ui/phone-number-input.tsx` - PhoneNumberInput
- `src/components/ui/national-id-input.tsx` - NationalIdInput

**Usage:**
- Individual lenders: Use NationalIdInput for ID, PhoneNumberInput for phone
- Bank lenders: Use PhoneNumberInput for primary and additional phones

### Database Schema Updates (Extend Persons Model)

```prisma
model Persons {
  // Existing fields...

  // NEW: Bank-specific fields (nullable, only for banks)
  swiftCode          String?   // Full 11-char SWIFT code
  swiftCodeShort     String?   // 8-char SWIFT code
  bankRegistrationNo String?   // Bank registration number
  branchCode         String?   // Branch code
  city               String?   // City
  country            String?   // Country
  alternatePhones    String[]  // Additional phone numbers (array)
}
```

### New API Endpoints

**GET /api/business/[businessId]/loan-breakdown**
Returns loan breakdown for a specific business:
```json
{
  "hasLoans": true,
  "summary": {
    "totalLoansReceived": 5000,
    "totalInterestAccrued": 250,
    "totalOutstanding": 4500,
    "activeLoansCount": 2
  },
  "loans": [
    {
      "id": "loan-uuid",
      "loanNumber": "BL000001",
      "lenderName": "ZB Bank Ltd",
      "lenderType": "bank",
      "principalAmount": 3000,
      "interestRate": 10,
      "remainingBalance": 2800,
      "status": "active"
    }
  ]
}
```

### Interest Handling

**Approach:** Manually recorded when payments are made (simpler)
- Interest calculated at loan creation time
- No automatic accrual over time
- Interest charges recorded during payment transactions

### Payment Source

**Business can pay from:**
1. Revenue balance (sales, income)
2. Loan proceeds received
3. Combined total balance

---

## ✅ Refactor Implementation Plan

### Phase R1: Fix Critical Balance Issue (Priority 1) ✅ COMPLETE
- [x] Update loan creation API to add balance when business is borrower
- [x] Create "loan_received" transaction type
- [x] Retroactively fix existing loans (scripts/fix-order-revenue-balances.js)
- [x] Test payment from combined balance works

### Phase R2: Database Schema for Banks (Priority 2) ✅ COMPLETE
- [x] Add bank-specific fields to Persons model (swiftCode, bankRegistrationNo, branchCode, city, country, alternatePhones)
- [x] Generate and run migration (prisma db push)
- [x] Update Prisma client

### Phase R3: Update Lenders API (Priority 2) ✅ COMPLETE
- [x] Handle bank fields in POST/PUT
- [x] Different validation per lender type
- [x] Banks require registration number
- [x] Individuals require nationalId

### Phase R4: Update Lender UI Forms (Priority 2) ✅ COMPLETE
- [x] Create separate Individual/Bank form sections
- [x] Integrate PhoneNumberInput component
- [x] Integrate NationalIdInput component
- [x] Conditional rendering based on type
- [x] Quick lender creation modal in loans page

### Phase R5: Business Balance Loan Breakdown (Priority 3) ✅ COMPLETE
- [x] Create loan-breakdown API endpoint (`/api/business/[businessId]/loan-breakdown`)
- [x] Create LoanBreakdownCard component
- [x] Conditional display (only if loans exist)
- [x] Support multiple loans
- [x] Click loan to navigate to payment history
- [x] Display on dashboard

### Phase R6: Testing & Validation (Priority 3) ✅ COMPLETE
- [x] Test all scenarios end-to-end
- [x] Verify dark mode compatibility
- [x] Test with existing data
- [x] Clothing Demo business balance: $1,068.82 ($800 loan + $268.82 orders)

**Total Refactor Tasks:** 24
**All Phases:** COMPLETE

---

**Status:** ✅ FEATURE COMPLETE - All phases implemented and tested
**Completed:** 2025-11-21
**Commits:** dccd3c9, 45bcdce

### Implementation Summary

**Files Created:**
- `src/components/business/loan-breakdown-card.tsx`
- `src/app/api/business/[businessId]/loan-breakdown/route.ts`
- `src/app/api/business/available-lenders/route.ts`
- `scripts/fix-order-revenue-balances.js`

**Files Modified:**
- `src/app/business/manage/lenders/page.tsx` - PhoneNumberInput, NationalIdInput
- `src/app/business/manage/loans/page.tsx` - Quick lender modal
- `src/app/dashboard/page.tsx` - Balance display, loan breakdown
- `src/app/api/universal/orders/route.ts` - Order revenue crediting
- `src/lib/business-balance-utils.ts` - Fixed model names

**Key Features:**
1. Loan proceeds credit borrower business balance
2. Order revenue credits business balance on completion
3. Bank vs Individual lender differentiation with proper fields
4. PhoneNumberInput with country code selector
5. NationalIdInput with format templates
6. Loan breakdown card on dashboard
7. Quick lender creation from loan form
8. Click loan to view payment history

---
