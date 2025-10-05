# Payroll Benefits System - Analysis & Implementation Plan

## Current State Analysis

### Existing Schema Structure

**PayrollEntry Model:**
- Has fixed benefit columns: `livingAllowance`, `vehicleAllowance`, `travelAllowance`
- Has `benefitsTotal` and `benefitsBreakdown` (JSON) for aggregated benefits
- Gross pay calculation: `baseSalary + commission + overtimePay + benefitsTotal`

**BenefitType Model:**
- System-wide benefit definitions (both standard and user-defined)
- Each has: `name`, `type`, `defaultAmount`, `isPercentage`

**ContractBenefit Model:**
- Links employee contracts to specific benefits
- Has actual `amount` per employee

### Current Limitations

1. **Fixed Columns**: Only 3 hardcoded allowances (living, vehicle, travel)
2. **No Benefit Overrides**: Cannot remove/adjust contract benefits during payroll
3. **No Override Tracking**: No way to record why a benefit was removed (e.g., employee on leave)
4. **Static Export**: Excel export doesn't dynamically generate benefit columns
5. **No Per-Entry Benefit Management**: Benefits are just copied from contract, not editable per period

---

## Required Spreadsheet Structure

### Always Present Columns (Fixed):
1. ID Number (National ID)
2. DOB (Date of Birth)
3. Employee Surname
4. Employee First Names
5. Days (Work Days)
6. Date Engaged (Hire Date)
7. Date Dismissed (Termination Date - if applicable)
8. Basic Salary
9. Commission
10. Overtime
11. Misc Reimbursement
12. Advances Loans
13. Misc Deductions

### Dynamic Benefit Columns:
- **Rule**: Show column if ANY employee in the period has that benefit
- **Examples**: Medical Aid, Housing Allowance, Transport, Meal Allowance, etc.
- **User-Defined Benefits**: Also included dynamically
- **Empty Cells**: Employees without a specific benefit show blank (not $0.00)

### Totals Column:
- **Gross Pay**: Sum of Basic + Commission + Overtime + All Benefits
- **Note**: No tax/deduction calculations (handled by 3rd party)

---

## Proposed Solution Architecture

### 1. Database Schema Changes

#### New Model: `PayrollEntryBenefit`
```prisma
model PayrollEntryBenefit {
  id                String        @id
  payrollEntryId    String
  benefitTypeId     String
  benefitName       String        // Denormalized for reporting
  amount            Decimal       @db.Decimal(12, 2)
  isActive          Boolean       @default(true)  // Can be deactivated
  deactivatedReason String?       // Why benefit was removed
  source            String        @default("contract") // "contract" | "manual"

  payrollEntry      PayrollEntry  @relation(fields: [payrollEntryId], references: [id], onDelete: Cascade)
  benefitType       BenefitType   @relation(fields: [benefitTypeId], references: [id])

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @default(now())

  @@map("payroll_entry_benefits")
  @@index([payrollEntryId])
  @@index([benefitTypeId])
}
```

#### Update PayrollEntry Model:
```prisma
model PayrollEntry {
  // ... existing fields ...

  // Remove hardcoded allowances (living, vehicle, travel)
  // Keep benefitsTotal for aggregation
  benefitsTotal           Decimal  @default(0) @db.Decimal(12, 2)

  // Add relation
  payrollEntryBenefits    PayrollEntryBenefit[]

  // ... rest of fields ...
}
```

### 2. Data Flow

#### On Employee Addition to Payroll:
1. Fetch employee's active contract
2. Load all contract benefits
3. Create `PayrollEntryBenefit` records for each benefit
4. Calculate `benefitsTotal` = sum of all active benefits
5. Calculate `grossPay` = baseSalary + commission + overtimePay + benefitsTotal

#### During Payroll Entry Editing:
1. Display all benefits from contract
2. Allow manager to:
   - Deactivate specific benefit (toggle)
   - Provide reason for deactivation
   - Manually add one-time benefits
3. Recalculate totals on any change

#### On Export:
1. Collect ALL unique benefit types used in the period
2. Create dynamic columns for each benefit
3. Populate cells with benefit amounts (or blank)
4. Export with dynamic structure

---

## Detailed Implementation Tasks

### Phase 1: Database Schema Migration
**Priority: HIGH**

#### Task 1.1: Create Migration
- [ ] Create `PayrollEntryBenefit` table
- [ ] Add `payrollEntryBenefits` relation to PayrollEntry
- [ ] Test migration in development

#### Task 1.2: Migrate Existing Data
- [ ] Write script to migrate hardcoded allowances to PayrollEntryBenefit records
- [ ] Migrate `livingAllowance` → PayrollEntryBenefit (benefit type = "Living Allowance")
- [ ] Migrate `vehicleAllowance` → PayrollEntryBenefit (benefit type = "Vehicle Allowance")
- [ ] Migrate `travelAllowance` → PayrollEntryBenefit (benefit type = "Travel Allowance")
- [ ] Verify data integrity after migration

#### Task 1.3: Update Prisma Schema
- [ ] Remove deprecated columns from PayrollEntry (livingAllowance, vehicleAllowance, travelAllowance)
- [ ] Regenerate Prisma client
- [ ] Update TypeScript types

---

### Phase 2: API Endpoint Updates
**Priority: HIGH**

#### Task 2.1: Update Bulk Employee Add (`/api/payroll/entries/bulk`)
```typescript
// New flow:
1. Fetch employee contract
2. Fetch contract.contractBenefits (include benefitTypes)
3. Create PayrollEntry
4. Create PayrollEntryBenefit for each contract benefit
5. Calculate benefitsTotal and grossPay
```

#### Task 2.2: Update Single Employee Add (`/api/payroll/entries`)
- Same flow as bulk add

#### Task 2.3: Create Benefit Management Endpoints

**GET `/api/payroll/entries/[entryId]/benefits`**
```typescript
// Returns all benefits for a payroll entry
{
  benefits: [
    {
      id: "PEB-xxx",
      benefitTypeId: "BT-xxx",
      benefitName: "Medical Aid",
      amount: 150.00,
      isActive: true,
      deactivatedReason: null,
      source: "contract"
    },
    // ...
  ]
}
```

**PUT `/api/payroll/entries/[entryId]/benefits/[benefitId]`**
```typescript
// Toggle benefit active state or update amount
{
  isActive: false,
  deactivatedReason: "Employee on unpaid leave"
}
```

**POST `/api/payroll/entries/[entryId]/benefits`**
```typescript
// Add manual one-time benefit
{
  benefitTypeId: "BT-xxx",
  amount: 200.00,
  source: "manual"
}
```

#### Task 2.4: Update Gross Pay Calculation
```typescript
// Recalculate whenever benefits change:
const activeBenefits = await prisma.payrollEntryBenefit.findMany({
  where: {
    payrollEntryId: entryId,
    isActive: true
  }
})

const benefitsTotal = activeBenefits.reduce((sum, b) => sum + Number(b.amount), 0)
const grossPay = baseSalary + commission + overtimePay + benefitsTotal
const netPay = grossPay - totalDeductions
```

---

### Phase 3: UI Component Updates
**Priority: HIGH**

#### Task 3.1: Update PayrollEntryDetailModal

**Add Benefits Section:**
```tsx
{/* Contract Benefits */}
<div>
  <h3>Benefits from Contract</h3>
  <table>
    <thead>
      <tr>
        <th>Benefit</th>
        <th>Amount</th>
        <th>Active</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {entry.payrollEntryBenefits.map(benefit => (
        <tr>
          <td>{benefit.benefitName}</td>
          <td>{formatCurrency(benefit.amount)}</td>
          <td>
            <Toggle
              checked={benefit.isActive}
              onChange={() => handleToggleBenefit(benefit.id)}
            />
          </td>
          <td>
            {!benefit.isActive && (
              <button onClick={() => showReasonModal(benefit)}>
                Edit Reason
              </button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Add Manual Benefit */}
  <button onClick={() => setShowAddBenefitModal(true)}>
    + Add One-Time Benefit
  </button>
</div>
```

**Add Benefit Deactivation Modal:**
```tsx
<BenefitDeactivationModal
  isOpen={showReasonModal}
  benefit={selectedBenefit}
  onSave={(reason) => {
    // Update benefit with deactivation reason
    handleSaveBenefitReason(selectedBenefit.id, reason)
  }}
  onClose={() => setShowReasonModal(false)}
/>
```

#### Task 3.2: Create AddBenefitModal Component
- Dropdown of available benefit types
- Amount input
- Save as manual benefit

#### Task 3.3: Update Payroll Entry Table
- Remove hardcoded allowance columns
- Show only: Employee, Work Days, Base Salary, Commission, **Benefits Total**, Gross, Deductions, Net

---

### Phase 4: Excel Export with Dynamic Columns
**Priority: HIGH**

#### Task 4.1: Analyze Period Benefits
```typescript
// In export API:
async function getUniqueBenefitsForPeriod(payrollPeriodId: string) {
  const benefits = await prisma.payrollEntryBenefit.findMany({
    where: {
      payrollEntry: {
        payrollPeriodId
      },
      isActive: true
    },
    distinct: ['benefitTypeId'],
    include: {
      benefitType: true
    },
    orderBy: {
      benefitName: 'asc'
    }
  })

  return benefits.map(b => ({
    id: b.benefitTypeId,
    name: b.benefitName
  }))
}
```

#### Task 4.2: Generate Dynamic Excel Columns
```typescript
// Fixed columns
const fixedColumns = [
  'ID Number',
  'DOB',
  'Employee Surname',
  'Employee First Names',
  'Days',
  'Date Engaged',
  'Date Dismissed',
  'Basic Salary',
  'Commission',
  'Overtime'
]

// Get unique benefits for period
const periodBenefits = await getUniqueBenefitsForPeriod(periodId)

// Dynamic benefit columns
const benefitColumns = periodBenefits.map(b => b.name)

// Rest of fixed columns
const endColumns = [
  'Misc Reimbursement',
  'Advances Loans',
  'Misc Deductions'
]

const allColumns = [...fixedColumns, ...benefitColumns, ...endColumns]
```

#### Task 4.3: Populate Benefit Cell Data
```typescript
for (const entry of payrollEntries) {
  const row = {
    'ID Number': entry.nationalId,
    'DOB': formatDate(entry.dateOfBirth),
    // ... fixed columns ...
  }

  // Add benefit values
  for (const benefit of periodBenefits) {
    const entryBenefit = entry.payrollEntryBenefits.find(
      eb => eb.benefitTypeId === benefit.id && eb.isActive
    )
    row[benefit.name] = entryBenefit ? entryBenefit.amount : '' // Blank, not 0
  }

  // ... rest of columns ...
}
```

---

### Phase 5: Preview Modal Updates
**Priority: MEDIUM**

#### Task 5.1: Update PayrollExportPreviewModal
- Same dynamic column logic as Excel export
- Show benefit columns that have at least one non-zero value
- Display empty cells (not $0.00) for employees without benefit

---

### Phase 6: Name Parsing for Surname/First Names
**Priority: MEDIUM**

#### Task 6.1: Add Name Fields to Employee
```prisma
model Employee {
  // ... existing ...
  firstName   String?  // Parsed from fullName
  lastName    String?  // Parsed from fullName
  middleName  String?  // Optional
  // ... rest ...
}
```

#### Task 6.2: Parse Existing Names
```typescript
// Migration script
function parseFullName(fullName: string) {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  return {
    lastName: parts[parts.length - 1],
    firstName: parts.slice(0, -1).join(' ')
  }
}
```

#### Task 6.3: Update Employee Forms
- Add separate First Name and Last Name fields
- Auto-generate fullName for backward compatibility

---

## Migration Strategy

### Step 1: Schema Migration (Non-Breaking)
1. Add `PayrollEntryBenefit` table
2. Keep old columns temporarily
3. Deploy schema changes

### Step 2: Data Migration Script
```typescript
// scripts/migrate-payroll-benefits.ts
async function migrateBenefits() {
  const entries = await prisma.payrollEntry.findMany({
    include: { employee: { include: { employeeContracts: true } } }
  })

  for (const entry of entries) {
    // Create living allowance benefit
    if (entry.livingAllowance > 0) {
      await createBenefit(entry, 'Living Allowance', entry.livingAllowance)
    }

    // Create vehicle allowance benefit
    if (entry.vehicleAllowance > 0) {
      await createBenefit(entry, 'Vehicle Allowance', entry.vehicleAllowance)
    }

    // Create travel allowance benefit
    if (entry.travelAllowance > 0) {
      await createBenefit(entry, 'Travel Allowance', entry.travelAllowance)
    }
  }
}
```

### Step 3: Update APIs (Backward Compatible)
1. Update APIs to use new PayrollEntryBenefit table
2. Keep old column writes for safety
3. Test thoroughly

### Step 4: Update UI Components
1. Update modals to show benefit list
2. Test benefit management
3. Verify calculations

### Step 5: Update Excel Export
1. Implement dynamic columns
2. Test with various benefit combinations
3. Verify blank cells vs $0.00

### Step 6: Remove Old Columns
1. Remove deprecated columns from schema
2. Clean up old code references
3. Final migration

---

## Testing Checklist

### Unit Tests
- [ ] Benefit toggle (activate/deactivate)
- [ ] Gross pay recalculation
- [ ] Benefit addition/removal
- [ ] Excel column generation

### Integration Tests
- [ ] Add employee with benefits to payroll
- [ ] Deactivate benefit and verify totals
- [ ] Export with mixed benefits
- [ ] Preview shows correct columns

### Edge Cases
- [ ] Employee with no benefits
- [ ] All employees with different benefits
- [ ] Benefit deactivation mid-period
- [ ] Manual benefit addition
- [ ] User-defined custom benefits

---

## Risk Assessment

### HIGH RISK
- **Data Migration**: Existing payroll data must migrate cleanly
- **Calculation Accuracy**: Gross pay must be precise

### MEDIUM RISK
- **Excel Export Compatibility**: 3rd party system must accept dynamic columns
- **UI Complexity**: Benefit management UI must be intuitive

### LOW RISK
- **Performance**: Benefit queries should be fast with proper indexes

---

## Timeline Estimate

- **Phase 1** (Schema Migration): 1-2 days
- **Phase 2** (API Updates): 2-3 days
- **Phase 3** (UI Components): 3-4 days
- **Phase 4** (Excel Export): 2-3 days
- **Phase 5** (Preview Modal): 1 day
- **Phase 6** (Name Parsing): 1-2 days
- **Testing & Bug Fixes**: 2-3 days

**Total: 12-18 days**

---

## Success Criteria

1. ✅ Managers can deactivate contract benefits with reasons
2. ✅ Managers can add one-time manual benefits
3. ✅ Excel export has dynamic benefit columns
4. ✅ Only benefits with values appear as columns
5. ✅ Gross pay accurately includes all active benefits
6. ✅ No breaking changes to existing payroll periods
7. ✅ Preview modal matches final export structure
8. ✅ Employee names split into surname and first names
