# Payroll Historical Period & Multi-Tab Export Plan

## Problem Analysis

### Issue 1: August Period Creation Error
**Problem:** Creating a period for August 2025 returns "Payroll period for this month already exists" even though it doesn't exist.

**Root Cause:** The payload shows `month: 10` but the error message refers to August. The unique constraint check at line 168-176 in `/api/payroll/periods/route.ts` uses the provided month (10 = October), but the user wants to create August (month = 8). This is likely a UI issue passing wrong month value.

**Payload Analysis:**
```json
{
  "businessId": "hardware-demo-business",
  "year": 2025,
  "month": 10,  // This is October, not August!
  "periodStart": "2025-08-01",  // These dates are August
  "periodEnd": "2025-08-30"
}
```

### Issue 2: Historical Contract Lookup
**Problem:** Need to create payroll based on contracts that were valid at the time, not current contracts.

**Current State:** The `generatePayrollContractEntries()` function in `contract-selection.ts` already handles historical contract lookup correctly by finding contracts that overlap with the period dates. However, it doesn't account for future contract modifications made after the period.

### Issue 3: Multi-Tab Excel Export
**Problem:** Need cumulative year-to-date exports where each new month's export contains all previous months as separate tabs.

**Requirements:**
- Export for January: 1 tab (January)
- Export for February: 2 tabs (January regenerated + February new)
- Export for March: 3 tabs (Jan regenerated + Feb regenerated + March new)
- ... up to 12 tabs for December export
- Include a checkbox "Include Past Periods" to control this behavior
- Limit to current calendar year only

---

## Comprehensive Solution Plan

### Phase 1: Fix Immediate UI/Month Mismatch Issue
**Priority:** CRITICAL
**Estimated Time:** 30 minutes

1. **Investigate UI Date Picker Issue**
   - Check the payroll period creation form
   - Verify month extraction from date inputs
   - Fix month calculation to match periodStart/periodEnd dates

2. **Add Validation**
   - Add server-side validation to ensure `month` matches the month in `periodStart`
   - Return clear error if mismatch detected

**Files to Modify:**
- `src/components/payroll/payroll-period-creation-form.tsx` (or similar)
- `src/app/api/payroll/periods/route.ts` (validation)

---

### Phase 2: Historical Contract Snapshot System
**Priority:** HIGH
**Estimated Time:** 4 hours

**Problem:** Current system allows contract modifications after payroll is created, which can cause regeneration issues.

**Solution:** Create immutable snapshots of contract data when period is created.

#### 2.1 Database Schema Changes

```prisma
// Add to schema.prisma
model PayrollEntry {
  // ... existing fields

  // Historical contract snapshot (frozen at period creation time)
  contractSnapshot Json?  // Stores complete contract data including benefits

  // ... rest of fields
}
```

#### 2.2 Contract Snapshot Logic

**Create new file:** `src/lib/payroll/contract-snapshot.ts`

```typescript
/**
 * Creates an immutable snapshot of a contract at a specific point in time
 * This ensures payroll calculations remain consistent even if contracts are modified later
 */
export interface ContractSnapshot {
  contractId: string
  contractNumber: string
  capturedAt: Date
  effectiveDate: Date
  baseSalary: number
  compensationType: string
  jobTitle: string
  benefits: Array<{
    benefitTypeId: string
    benefitName: string
    amount: number
    isPercentage: boolean
  }>
  pdfGenerationData: any
}

export async function captureContractSnapshot(
  contractId: string,
  effectiveDate: Date
): Promise<ContractSnapshot> {
  // Fetch contract with all related data
  // Freeze benefit amounts as of this date
  // Return immutable snapshot
}

export async function restoreContractFromSnapshot(
  snapshot: ContractSnapshot
): Promise<ContractInfo> {
  // Reconstitute contract data from snapshot for regeneration
}
```

#### 2.3 Modify Period Creation

**Update:** `src/app/api/payroll/periods/route.ts` (POST method, line 324-350)

- When creating payroll entries, capture contract snapshot
- Store in `contractSnapshot` field
- Use this snapshot for all future regenerations

---

### Phase 3: Multi-Tab Excel Export System
**Priority:** HIGH
**Estimated Time:** 6 hours

#### 3.1 Database Schema for Export Tracking

```prisma
// Add to schema.prisma
model PayrollExport {
  // ... existing fields

  includesPastPeriods Boolean @default(false)
  periodIds String[] // Array of period IDs included in this export
  tabCount Int @default(1)

  // ... rest of fields
}
```

#### 3.2 Create Multi-Tab Export Generator

**Create new file:** `src/lib/payroll/multi-tab-excel-generator.ts`

```typescript
import ExcelJS from 'exceljs'

export interface TabPeriodData {
  period: PayrollPeriod
  entries: EnrichedPayrollEntry[]
  isRegenerated: boolean // true for past periods, false for current
}

export async function generateMultiTabPayrollExcel(
  tabs: TabPeriodData[],
  businessName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // Create one worksheet per period
  for (const tab of tabs) {
    const monthName = getMonthName(tab.period.month)
    const sheetName = `${monthName} ${tab.period.year}`

    const worksheet = workbook.addWorksheet(sheetName)

    if (tab.isRegenerated) {
      // Use regeneration workflow (contractSnapshot data)
      await populateSheetFromSnapshot(worksheet, tab)
    } else {
      // Use current workflow (live contract data)
      await populateSheetFromCurrent(worksheet, tab)
    }
  }

  return await workbook.xlsx.writeBuffer()
}
```

#### 3.3 Update Export API

**Modify:** `src/app/api/payroll/exports/route.ts` (POST method)

```typescript
// Add new parameter
const {
  payrollPeriodId,
  businessId,
  includePastPeriods = false,  // NEW
  // ... rest
} = data

if (includePastPeriods) {
  // Find all periods in same calendar year, before this one
  const yearPeriods = await prisma.payrollPeriod.findMany({
    where: {
      businessId,
      year: period.year,
      month: { lte: period.month }
    },
    orderBy: { month: 'asc' }
  })

  // Generate tabs for each period
  const tabs: TabPeriodData[] = []

  for (const p of yearPeriods) {
    const isCurrentPeriod = p.id === payrollPeriodId
    tabs.push({
      period: p,
      entries: await loadPeriodEntries(p.id),
      isRegenerated: !isCurrentPeriod
    })
  }

  // Generate multi-tab Excel
  const excelBuffer = await generateMultiTabPayrollExcel(tabs, businessName)

  // Update export record with metadata
  // ... save with periodIds array and tabCount
}
```

#### 3.4 Regeneration Workflow for Past Periods

**Create new file:** `src/lib/payroll/period-regeneration.ts`

```typescript
/**
 * Regenerates payroll entries for a past period using contract snapshots
 * This ensures consistent data even if contracts were modified after the period
 */
export async function regeneratePeriodEntries(
  periodId: string
): Promise<EnrichedPayrollEntry[]> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      payrollEntries: {
        include: {
          employee: true,
          payrollEntryBenefits: true
        }
      }
    }
  })

  if (!period) throw new Error('Period not found')

  const enrichedEntries = []

  for (const entry of period.payrollEntries) {
    // Restore contract from snapshot
    const contract = entry.contractSnapshot
      ? restoreContractFromSnapshot(entry.contractSnapshot)
      : await loadLatestContract(entry.employeeId)

    // Recalculate totals using frozen contract data
    const totals = await computeTotalsForEntry(entry.id)

    enrichedEntries.push({
      ...entry,
      contract,
      mergedBenefits: totals.combined || [],
      totalBenefitsAmount: totals.benefitsTotal,
      // ... rest of enrichment
    })
  }

  return enrichedEntries
}
```

---

### Phase 4: UI Updates
**Priority:** MEDIUM
**Estimated Time:** 2 hours

#### 4.1 Add "Include Past Periods" Checkbox

**Modify:** `src/app/payroll/[periodId]/page.tsx` (export button section, around line 939)

```tsx
{canExport && period.status === 'approved' && (
  <>
    {/* Add checkbox for multi-tab export */}
    <label className="flex items-center gap-2 px-4 py-2 text-sm">
      <input
        type="checkbox"
        checked={includePastPeriods}
        onChange={(e) => setIncludePastPeriods(e.target.checked)}
        className="rounded border-gray-300"
      />
      <span className="text-secondary">
        Include past periods ({currentYearPeriodCount} total)
      </span>
    </label>

    <button
      onClick={() => handleExport(includePastPeriods)}
      disabled={exporting}
      className="..."
    >
      {exporting ? 'Exporting...' :
        includePastPeriods ?
          `Export YTD (${currentYearPeriodCount} tabs)` :
          'Export Current Month'
      }
    </button>
  </>
)}
```

#### 4.2 Update Export Function

```typescript
const handleExport = async (includePast: boolean = false) => {
  if (!period) return

  // Calculate how many periods would be included
  if (includePast) {
    const yearPeriods = await fetch(
      `/api/payroll/periods?businessId=${period.business.id}&year=${period.year}&status=approved`
    )
    const periods = await yearPeriods.json()
    const pastCount = periods.filter(p => p.month <= period.month).length

    const ok = await confirm({
      title: 'Export Year-to-Date Payroll',
      description: `This will generate an Excel file with ${pastCount} tabs (one per month). Continue?`,
      confirmText: 'Export YTD'
    })

    if (!ok) return
  }

  // ... rest of export logic with includePastPeriods parameter
}
```

---

### Phase 5: Testing & Edge Cases
**Priority:** HIGH
**Estimated Time:** 3 hours

#### Test Scenarios

1. **Past Period Regeneration**
   - Create January period
   - Export January
   - Modify an employee's contract
   - Create February period with "Include Past Periods"
   - Verify January tab uses original contract data (snapshot)

2. **Multiple Contracts Per Employee**
   - Employee has 2 contracts in same month (mid-month promotion)
   - Verify both entries appear correctly in export
   - Verify regeneration preserves both entries

3. **Year Boundary**
   - Create December 2024 period
   - Create January 2025 period with "Include Past Periods"
   - Verify only Jan 2025 is included (not Dec 2024)

4. **Performance**
   - Export period with 500+ employees
   - Include past periods (12 tabs)
   - Verify generation completes in reasonable time (<30 seconds)

5. **Contract Modifications**
   - Create period, add entries
   - Modify benefit amounts on contract
   - Regenerate period
   - Verify original amounts are used (from snapshot)

---

## Implementation Timeline

### Sprint 1 (Day 1-2): Critical Fixes
- Fix month mismatch UI issue ✓
- Add validation for month/date consistency ✓
- Test August period creation ✓

### Sprint 2 (Day 3-4): Contract Snapshots
- Add `contractSnapshot` field to schema ✓
- Implement snapshot capture logic ✓
- Modify period creation to store snapshots ✓
- Test snapshot restoration ✓

### Sprint 3 (Day 5-7): Multi-Tab Export
- Create multi-tab Excel generator ✓
- Implement regeneration workflow ✓
- Update export API with `includePastPeriods` ✓
- Add period tracking to exports ✓

### Sprint 4 (Day 8-9): UI & Integration
- Add "Include Past Periods" checkbox ✓
- Update export confirmation dialogs ✓
- Add tab count indicators ✓
- Wire up frontend to backend ✓

### Sprint 5 (Day 10): Testing
- Run all test scenarios ✓
- Fix edge cases ✓
- Performance testing ✓
- User acceptance testing ✓

---

## Migration Plan

### Database Migration

```prisma
// prisma/migrations/[timestamp]_add_payroll_historical_features/migration.sql

-- Add contractSnapshot to payroll entries
ALTER TABLE "payroll_entries"
ADD COLUMN "contract_snapshot" JSONB;

-- Add multi-tab export fields
ALTER TABLE "payroll_exports"
ADD COLUMN "includes_past_periods" BOOLEAN DEFAULT false,
ADD COLUMN "period_ids" TEXT[],
ADD COLUMN "tab_count" INTEGER DEFAULT 1;

-- Index for faster period lookups
CREATE INDEX "idx_payroll_periods_year_month"
ON "payroll_periods"("business_id", "year", "month");
```

### Data Backfill

For existing payroll entries without snapshots:

```typescript
// scripts/backfill-contract-snapshots.ts
async function backfillSnapshots() {
  const entries = await prisma.payrollEntry.findMany({
    where: { contractSnapshot: null },
    include: { contract: true }
  })

  for (const entry of entries) {
    if (!entry.contract) continue

    const snapshot = await captureContractSnapshot(
      entry.contractId,
      entry.createdAt
    )

    await prisma.payrollEntry.update({
      where: { id: entry.id },
      data: { contractSnapshot: snapshot }
    })
  }
}
```

---

## API Changes Summary

### New Endpoints

None required - all changes are parameter additions to existing endpoints.

### Modified Endpoints

#### POST /api/payroll/exports
**New Parameters:**
- `includePastPeriods` (boolean, optional, default: false)

**Response Changes:**
- `periodIds` (string[]): List of period IDs included in export
- `tabCount` (number): Number of tabs in Excel file
- `includesPastPeriods` (boolean): Whether past periods were included

---

## Success Criteria

### Must Have
- ✓ Users can create payroll periods for past months without errors
- ✓ Contract data is frozen at period creation time
- ✓ Multi-tab exports include all YTD periods
- ✓ Regenerated periods use historical contract data
- ✓ UI clearly shows multi-tab export option

### Should Have
- Performance: 12-tab export completes in <30 seconds
- UI shows tab count before export
- Export history tracks which periods were included

### Nice to Have
- Preview of tab structure before export
- Option to exclude specific months from multi-tab export
- Export templates for different business types

---

## Risk Mitigation

### Risk 1: Large File Sizes
**Impact:** HIGH
**Probability:** MEDIUM

**Mitigation:**
- Implement streaming Excel generation for large datasets
- Add file size warnings in UI
- Consider pagination for very large periods

### Risk 2: Snapshot Data Corruption
**Impact:** HIGH
**Probability:** LOW

**Mitigation:**
- Validate snapshot JSON structure on save
- Implement fallback to live contract data if snapshot invalid
- Add snapshot verification script

### Risk 3: Performance Degradation
**Impact:** MEDIUM
**Probability:** MEDIUM

**Mitigation:**
- Use database indexes for period lookups
- Implement caching for repeated regenerations
- Add progress indicators for long exports

---

## Future Enhancements

1. **Cross-Year Exports**
   - Allow including December of previous year
   - Useful for full fiscal year reports

2. **Custom Tab Selection**
   - Let users choose which months to include
   - Skip months with no data

3. **Comparison Tabs**
   - Add YoY comparison tab
   - Month-over-month trends

4. **PDF Export**
   - Generate PDF versions of multi-tab exports
   - Useful for printing/archiving

---

## Questions for Clarification

1. **Q:** Should the "Include Past Periods" option be enabled for all statuses or only 'approved' periods?
   **A:** Only approved periods should be included in multi-tab exports

2. **Q:** What happens if a past period was deleted? Should we show error or skip it?
   **A:** Skip deleted periods and note them in export metadata

3. **Q:** Should regenerated tabs show a watermark or indicator that they're historical?
   **A:** Yes - add "Regenerated" notation in header row

4. **Q:** Maximum number of tabs to support? (some Excel viewers limit to 255)
   **A:** 12 tabs max (one year) is sufficient

---

## Conclusion

This plan provides a comprehensive solution to all three identified issues:

1. ✓ Fixes the month mismatch causing false "already exists" errors
2. ✓ Implements contract snapshots for historical accuracy
3. ✓ Enables multi-tab YTD exports with regeneration workflow

The solution is backward-compatible, performant, and extensible for future enhancements.

**Total Estimated Effort:** 10 working days (80 hours)
**Priority Order:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
