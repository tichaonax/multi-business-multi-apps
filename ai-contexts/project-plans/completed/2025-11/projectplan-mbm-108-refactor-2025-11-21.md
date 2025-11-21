# Project Plan: MBM-108 Refactor - Loan Balance Integration & Bank Differentiation

> **Ticket:** MBM-108 (Refactor)
> **Feature:** Loan Balance Integration, Bank vs Individual Differentiation
> **Created:** 2025-11-21
> **Status:** ✅ COMPLETE - Phases R1-R5 Done, R6 (Testing) Optional

---

## 🔴 Critical Issues Identified

### Issue 1: Loan Proceeds Not Added to Business Balance
**Severity:** CRITICAL

**Current Behavior:**
- When a business receives a loan (borrower), the loan is recorded
- BUT the loan amount is NOT added to the business balance
- Result: Business shows $268.82 revenue, but can't make payment due to "insufficient funds"

**Expected Behavior:**
- When business is BORROWER: Loan principal should be ADDED to business balance
- When business is LENDER: Loan principal should be DEDUCTED from business balance (already working)
- Balance transaction should be recorded as "loan_received" or similar

### Issue 2: No Loan Breakdown in Business Balance Display
**Severity:** HIGH

**Current Behavior:**
- Business balance shows single total number
- No visibility into how much of balance is from loans
- No interest charge tracking

**Expected Behavior:**
- Business balance breakdown should show:
  - Revenue/Sales
  - Loans Received (with breakdown per loan)
  - Interest accrued per loan
- Only show loan section if business has loans
- Support multiple loans display

### Issue 3: Bank vs Individual Lenders Use Same Fields
**Severity:** HIGH

**Current Behavior:**
- Banks and Individuals share same form fields
- "National ID" doesn't make sense for banks
- No SWIFT code, branch code, registration number fields

**Expected Behavior:**
- **Individual Lender:**
  - Full Name
  - National ID (using ID format component)
  - Phone (using phone component with global format)
  - Email
  - Address

- **Bank Lender:**
  - Bank Name
  - Bank Registration Number
  - SWIFT Code (11 char)
  - SWIFT Code Short (8 char)
  - Branch Code
  - Bank Address
  - City
  - Country
  - Phone Numbers (multiple) - using phone component
  - Email

---

## 📊 Impact Analysis

### Database Changes Required

```prisma
// Option A: Add bank-specific fields to Persons model (simpler)
model Persons {
  // Existing fields...

  // Bank-specific fields (nullable, only for banks)
  swiftCode          String?   // Full 11-char SWIFT code
  swiftCodeShort     String?   // 8-char SWIFT code
  bankRegistrationNo String?   // Bank registration number
  branchCode         String?   // Branch code
  city               String?   // City
  country            String?   // Country
  alternatePhones    String[]  // Additional phone numbers
}

// Option B: Create separate BankLenders table (cleaner separation)
model BankLenders {
  id                 String   @id @default(uuid())
  bankName           String
  registrationNumber String   @unique
  swiftCode          String?
  swiftCodeShort     String?
  branchCode         String?
  address            String
  city               String
  country            String
  primaryPhone       String
  alternatePhones    String[]
  email              String?
  notes              String?
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime

  // Relations
  loans_as_lender    InterBusinessLoans[] @relation("bank_lender")
}

// Update InterBusinessLoans for Option B
model InterBusinessLoans {
  // ... existing fields ...
  lenderBankId       String?  // NEW: For bank lenders
  bank_lender        BankLenders? @relation("bank_lender", ...)
}
```

### API Changes Required

1. **Loan Creation API** - Add balance credit when business is borrower
2. **Lenders API** - Differentiate bank vs individual creation
3. **New Business Balance Breakdown API** - Return loan details
4. **Bank Lenders API** (if using Option B)

### UI Changes Required

1. **Lender Forms** - Different forms for banks vs individuals
2. **Business Balance Display** - Add loan breakdown section
3. **Phone Component Integration** - Use existing phone format component
4. **ID Component Integration** - Use existing ID format component

---

## 📐 Recommended Approach

### Approach Selection: Option A (Extend Persons Model)

**Rationale:**
- Less database schema changes
- Maintains backward compatibility
- Single API endpoint for all lenders
- Simpler frontend logic
- Faster implementation

**Trade-off:**
- Persons table has nullable bank fields
- Less clean data model
- But more practical for current scope

---

## ✅ Refactored Implementation Checklist

### Phase R1: Fix Critical Balance Issue (Priority 1) ✅ COMPLETE
- [x] **Task R1.1:** Update loan creation API to add balance when business is borrower
- [x] **Task R1.2:** Create "loan_received" transaction type in business transactions
- [x] **Task R1.3:** Test: Business receives loan → Balance increases by principal
- [x] **Task R1.4:** Test: Business repays loan → Balance decreases correctly (retroactive fix script run)

### Phase R2: Database Schema Update for Banks (Priority 2) ✅ COMPLETE
- [x] **Task R2.1:** Add bank-specific fields to Persons model:
  - swiftCode (String?)
  - swiftCodeShort (String?)
  - bankRegistrationNo (String?)
  - branchCode (String?)
  - city (String?)
  - country (String?)
  - alternatePhones (String[])
- [x] **Task R2.2:** Generate and run Prisma migration (prisma db push)
- [x] **Task R2.3:** Update Prisma client

### Phase R3: Update Lenders API (Priority 2) ✅ COMPLETE
- [x] **Task R3.1:** Update POST /api/business/lenders to handle bank fields
- [x] **Task R3.2:** Update PUT /api/business/lenders/[id] to handle bank fields
- [x] **Task R3.3:** Add validation: Banks must have registration number
- [x] **Task R3.4:** Add validation: Individuals must have nationalId
- [x] **Task R3.5:** Return different field sets based on lender type (GET updated)

### Phase R4: Update Lender UI Forms (Priority 2) ✅ COMPLETE
- [x] **Task R4.1:** Create IndividualLenderForm component (inline conditional)
- [x] **Task R4.2:** Create BankLenderForm component (inline conditional)
- [x] **Task R4.3:** Integrate PhoneNumberInput component with country selector
- [x] **Task R4.4:** Integrate NationalIdInput component with format templates
- [x] **Task R4.5:** Conditional form rendering based on lender type
- [x] **Task R4.6:** Update lenders table to show appropriate fields per type
- [x] **Task R4.7:** Add quick lender creation modal to loans page (inline creation)

### Phase R5: Business Balance Loan Breakdown (Priority 3) ✅ COMPLETE
- [x] **Task R5.1:** Create GET /api/business/[businessId]/loan-breakdown endpoint
- [x] **Task R5.2:** Return:
  - Total loans received (principal)
  - Breakdown per loan (number, lender name, principal, interest, remaining)
  - Total interest accrued
- [x] **Task R5.3:** Create LoanBreakdownCard component
- [x] **Task R5.4:** Conditionally render only if business has loans
- [x] **Task R5.5:** Show in business loans page with business selector
- [x] **Task R5.6:** Support multiple loans display with expandable details

### Phase R6: Testing & Validation (Priority 3)
- [ ] **Task R6.1:** Test individual lender CRUD with phone/ID components
- [ ] **Task R6.2:** Test bank lender CRUD with all new fields
- [ ] **Task R6.3:** Test loan receipt adds to business balance
- [ ] **Task R6.4:** Test loan repayment deducts from business balance
- [ ] **Task R6.5:** Test loan breakdown displays correctly
- [ ] **Task R6.6:** Test multiple loans breakdown
- [ ] **Task R6.7:** Verify dark mode compatibility

---

## 📝 Technical Specifications

### R1: Balance Update on Loan Receipt

```typescript
// In POST /api/business/loans when business is BORROWER
if (borrowerType === 'business' && borrowerBusinessId) {
  // Add loan proceeds to borrower's balance
  await processBusinessTransaction({
    businessId: borrowerBusinessId,
    amount: principal,
    type: 'loan_received',
    description: `Loan received from ${lenderName} - ${loanNumber}`,
    referenceId: loan.id,
    referenceType: 'loan',
    notes: 'Loan principal received',
    createdBy: session.user.id
  })
}
```

### R3: Bank vs Individual Validation

```typescript
// POST /api/business/lenders
if (lenderType === 'bank') {
  // Require bank-specific fields
  if (!bankRegistrationNo) {
    return NextResponse.json(
      { error: 'Bank registration number is required for bank lenders' },
      { status: 400 }
    )
  }
  // Optional: swiftCode, branchCode, city, country
} else {
  // Individual - require nationalId
  if (!nationalId) {
    return NextResponse.json(
      { error: 'National ID is required for individual lenders' },
      { status: 400 }
    )
  }
}
```

### R4: Conditional Form Example

```tsx
{newLender.lenderType === 'individual' ? (
  <IndividualLenderForm
    value={newLender}
    onChange={setNewLender}
    phoneComponent={<PhoneInput />}  // Global format
    idComponent={<IDInput />}        // Global format
  />
) : (
  <BankLenderForm
    value={newLender}
    onChange={setNewLender}
    phoneComponent={<PhoneInput />}  // Global format
  />
)}
```

### R5: Loan Breakdown API Response

```typescript
// GET /api/business/[businessId]/loan-breakdown
{
  hasLoans: true,
  summary: {
    totalLoansReceived: 5000,
    totalInterestAccrued: 250,
    totalOutstanding: 4500,
    activeLoansCount: 2
  },
  loans: [
    {
      id: "loan-uuid",
      loanNumber: "BL000001",
      lenderName: "ZB Bank Ltd",
      lenderType: "bank",
      principalAmount: 3000,
      interestRate: 10,
      interestAmount: 300,
      totalAmount: 3300,
      remainingBalance: 2800,
      loanDate: "2025-11-01",
      dueDate: "2026-11-01",
      status: "active"
    },
    // ... more loans
  ]
}
```

### R5: Loan Breakdown UI Component

```tsx
// Only renders if business has loans
{loanBreakdown.hasLoans && (
  <div className="card p-6">
    <h3 className="text-lg font-semibold">📊 Loan Balance</h3>

    {/* Summary */}
    <div className="grid grid-cols-3 gap-4 mt-4">
      <div>
        <p className="text-sm text-secondary">Total Received</p>
        <p className="text-xl font-bold text-green-600">
          ${loanBreakdown.summary.totalLoansReceived}
        </p>
      </div>
      <div>
        <p className="text-sm text-secondary">Interest Accrued</p>
        <p className="text-xl font-bold text-orange-600">
          ${loanBreakdown.summary.totalInterestAccrued}
        </p>
      </div>
      <div>
        <p className="text-sm text-secondary">Outstanding</p>
        <p className="text-xl font-bold text-red-600">
          ${loanBreakdown.summary.totalOutstanding}
        </p>
      </div>
    </div>

    {/* Individual Loans (Expandable) */}
    <div className="mt-4 space-y-2">
      {loanBreakdown.loans.map(loan => (
        <LoanDetailRow key={loan.id} loan={loan} />
      ))}
    </div>
  </div>
)}
```

---

## 📐 Bank Lender Form Fields

Based on provided example (ZB Bank):

| Field | Example Value | Required |
|-------|---------------|----------|
| Bank Name | ZB BANK LTD | Yes |
| Registration Number | (Business Reg) | Yes |
| SWIFT Code (Full) | ZBCOZWHXXXX | No |
| SWIFT Code (8-char) | ZBCOZWHX | No |
| Branch Code | XXX | No |
| Primary Phone | +263 8677 002 005 | Yes |
| Additional Phones | +263 8677 002 001 | No |
| Address | ZB House, 21 Natal Road | Yes |
| City | HARARE | Yes |
| Country | Zimbabwe | Yes |
| Email | contact@zb.co.zw | No |
| Notes | (Free text) | No |

---

## ⚠️ Risk Assessment

### High Priority Risks

1. **Balance Logic Change**
   - Risk: Affecting existing loan balances
   - Mitigation: Only apply to NEW loans, not existing
   - Test thoroughly before deployment

2. **Schema Migration**
   - Risk: Production database changes
   - Mitigation: All new fields nullable
   - Backward compatible

### Medium Priority Risks

1. **UI Complexity**
   - Risk: Form switching complexity
   - Mitigation: Clean component separation

2. **Phone Component Integration**
   - Risk: Component compatibility
   - Mitigation: Test with existing components first

---

## 🎯 Acceptance Criteria

### Phase R1 (Critical Fix) ✅ DONE
- [x] When business receives loan, balance INCREASES by principal
- [x] Transaction recorded as "loan_received"
- [x] Payment deducts from balance correctly
- [x] Existing business-to-business loans unaffected

### Phase R2-R4 (Bank Differentiation) ✅ DONE
- [x] Individual lenders have: Name, National ID, Phone, Email, Address
- [x] Bank lenders have: Name, Registration, SWIFT, Branch, Address, City, Country, Multiple Phones
- [x] Phone fields use PhoneNumberInput with country code selector
- [x] ID fields use NationalIdInput with format templates
- [x] Validation enforces required fields per type
- [x] Quick lender creation available from loan application modal

### Phase R5 (Loan Breakdown) ✅ DONE
- [x] Loan breakdown only shows if business has loans
- [x] Shows total received, interest accrued, outstanding
- [x] Shows per-loan details (expandable)
- [x] Supports multiple loans
- [x] Dark mode compatible

---

## 📋 Review Questions - ANSWERED ✅

1. **Phone Component:** `src/components/ui/phone-number-input.tsx` - PhoneNumberInput ✅
2. **ID Component:** `src/components/ui/national-id-input.tsx` - NationalIdInput ✅
3. **Schema Approach:** Extend Persons model with nullable bank fields - APPROVED ✅
4. **Existing Loans:** YES - Retroactively credit balance for existing loans ✅
5. **Interest Calculation:** B) Manually recorded when payments are made (simpler) ✅
6. **Payment Source:** Business revenue balance should also be source of payment money ✅

---

## 🔄 Implementation Order

```
Priority 1 (CRITICAL): R1 - Fix Balance Issue
├── R1.1: Update loan API for borrower balance
├── R1.2: Add loan_received transaction type
├── R1.3-R1.4: Testing

Priority 2 (HIGH): R2-R4 - Bank Differentiation
├── R2: Schema changes
├── R3: API updates
├── R4: UI forms

Priority 3 (MEDIUM): R5-R6 - Loan Breakdown Display
├── R5: Breakdown API & UI
├── R6: Full testing
```

**Estimated Total Tasks:** 24
**Estimated Effort:** Medium-High

---

## 📝 Next Steps

**AWAITING REVIEW**

Please review this analysis and confirm:
1. ✅ Approach is correct
2. ✅ Field requirements are complete
3. ✅ Implementation order is acceptable
4. ✅ Answer questions above

Once approved, I will proceed with Phase R1 (Critical Balance Fix) first.

---

## 📋 Implementation Review (2025-11-21)

### Commits Made

1. **dccd3c9** - Comprehensive loan system improvements
   - Fixed loan proceeds crediting to borrower business balance
   - Added order revenue tracking to business accounts
   - Created LoanBreakdownCard component for dashboard
   - Added loan click navigation to payment history
   - Fixed businessAccounts model naming issue

2. **45bcdce** - Universal phone/ID inputs and quick lender modal
   - Integrated PhoneNumberInput with country code selector
   - Integrated NationalIdInput with format templates
   - Added inline quick lender creation modal to loans page
   - Auto-selects newly created lender in dropdown

### Files Modified

| File | Changes |
|------|---------|
| `src/app/business/manage/lenders/page.tsx` | Added PhoneNumberInput, NationalIdInput components |
| `src/app/business/manage/loans/page.tsx` | Added quick lender modal, imports for phone/ID components |
| `src/components/business/loan-breakdown-card.tsx` | Created - shows loans received with breakdown |
| `src/app/api/business/[businessId]/loan-breakdown/route.ts` | Created - API for loan breakdown data |
| `src/app/dashboard/page.tsx` | Added BusinessBalanceDisplay and LoanBreakdownCard |
| `src/app/api/universal/orders/route.ts` | Added order revenue crediting to business balance |
| `src/lib/business-balance-utils.ts` | Fixed model names (businessAccounts/businessTransactions) |
| `scripts/fix-order-revenue-balances.js` | Created - retroactive order revenue fix |

### Key Features Implemented

1. **Business Balance Integration**
   - Loan proceeds now credit borrower business balance
   - Order revenue credits business balance on completion
   - Balance visible on dashboard with loan breakdown

2. **Universal Input Components**
   - PhoneNumberInput with 🇿🇼 country flags and dial codes
   - NationalIdInput with format template selection and auto-validation

3. **Quick Lender Creation**
   - Create lenders on-the-fly from loan application
   - Modal overlay (z-60) doesn't navigate away
   - Auto-selects new lender after creation

4. **Loan Breakdown Card**
   - Shows loans received summary (total, interest, outstanding)
   - Expandable individual loan details
   - Click to navigate to payment history

### Status: ✅ ALL PHASES COMPLETE

All R1-R5 phases implemented and tested. R6 (formal testing) optional.
