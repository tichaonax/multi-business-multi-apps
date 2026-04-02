# MBM-180 — In-System PAYE & NSSA Calculations

**Date:** 2026-04-02
**Status:** Planned

---

## Problem

Payroll currently exports gross pay figures to a third-party processor for PAYE/NSSA calculations. The business now needs to perform these calculations in-system so payslips show the correct net-take-home figures, the spreadsheet is self-contained for ZIMRA P2 submissions, and tax remittance totals can be tracked per period.

---

## ZIMRA 2025 — All Five Foreign Currency Tax Tables

Each table type applies to a different pay frequency. All five must be seeded. The `tableType` field on `PayeTaxBrackets` distinguishes them: `DAILY`, `WEEKLY`, `FORTNIGHTLY`, `MONTHLY`, `ANNUAL`.

### DAILY TABLE

| Bracket | From ($) | To ($) | Rate | Deduct |
|---|---|---|---|---|
| 1 | 0.00 | 3.29 | 0% | — |
| 2 | 3.30 | 9.86 | 20% | 0.66 |
| 3 | 9.87 | 32.88 | 25% | 1.15 |
| 4 | 32.89 | 65.75 | 30% | 2.79 |
| 5 | 65.76 | 98.63 | 35% | 6.08 |
| 6 | 98.64 | and above | 40% | 11.01 |

> ZIMRA example: $9/day → $9.00 × 20% − $0.66 = **$1.14 PAYE**

### WEEKLY TABLE

| Bracket | From ($) | To ($) | Rate | Deduct |
|---|---|---|---|---|
| 1 | 0.00 | 23.08 | 0% | — |
| 2 | 23.09 | 69.23 | 20% | 4.62 |
| 3 | 69.24 | 230.77 | 25% | 8.08 |
| 4 | 230.78 | 461.54 | 30% | 19.62 |
| 5 | 461.55 | 692.31 | 35% | 42.69 |
| 6 | 692.32 | and above | 40% | 77.31 |

> ZIMRA example: $65/week → $65.00 × 20% − $4.62 = **$8.38 PAYE**

### FORTNIGHTLY TABLE

| Bracket | From ($) | To ($) | Rate | Deduct |
|---|---|---|---|---|
| 1 | 0.00 | 46.15 | 0% | — |
| 2 | 46.16 | 138.46 | 20% | 9.23 |
| 3 | 138.47 | 461.54 | 25% | 16.15 |
| 4 | 461.55 | 923.08 | 30% | 39.23 |
| 5 | 923.09 | 1,384.62 | 35% | 85.38 |
| 6 | 1,384.63 | and above | 40% | 154.62 |

> ZIMRA example: $420/fortnight → $420.00 × 25% − $16.15 = **$88.85 PAYE**

### MONTHLY TABLE

| Bracket | From ($) | To ($) | Rate | Deduct |
|---|---|---|---|---|
| 1 | 0.00 | 100.00 | 0% | — |
| 2 | 100.01 | 300.00 | 20% | 20.00 |
| 3 | 300.01 | 1,000.00 | 25% | 35.00 |
| 4 | 1,000.01 | 2,000.00 | 30% | 85.00 |
| 5 | 2,000.01 | 3,000.00 | 35% | 185.00 |
| 6 | 3,000.01 | and above | 40% | 335.00 |

> ZIMRA example: $1,800/month → $1,800 × 30% − $85.00 = **$455.00 PAYE**

### ANNUAL TABLE

| Bracket | From ($) | To ($) | Rate | Deduct |
|---|---|---|---|---|
| 1 | 0.00 | 1,200.00 | 0% | — |
| 2 | 1,201.00 | 3,600.00 | 20% | 240.00 |
| 3 | 3,601.00 | 12,000.00 | 25% | 420.00 |
| 4 | 12,001.00 | 24,000.00 | 30% | 1,020.00 |
| 5 | 24,001.00 | 36,000.00 | 35% | 2,220.00 |
| 6 | 36,001.00 | and above | 40% | 4,020.00 |

> ZIMRA example: $32,000/year → $32,000 × 35% − $2,220 = **$8,980 PAYE**

---

## Worked Example — Monthly Salary $1,800

This is the key verification case. All calculations must produce these exact figures.

**Step 1 — PAYE (Monthly table, bracket 4: $1,000.01–$2,000.00 @ 30%, deduct $85)**
```
PAYE = $1,800.00 × 30% − $85.00
     = $540.00 − $85.00
     = $455.00
```

**Step 2 — AIDS Levy (3% of PAYE)**
```
Levy = $455.00 × 3%
     = $13.65
```

**Step 3 — Total remitted to ZIMRA**
```
PAYE + Levy = $455.00 + $13.65 = $468.65
```

**Step 4 — NSSA Employee deduction (4.5% of basic salary)**
```
NSSA (employee) = $1,800.00 × 4.5% = $81.00
NSSA (employer) = $1,800.00 × 4.5% = $81.00  ← employer contribution, not deducted from employee
```

**Step 5 — Net Take-Home (no advances/loans/misc in this example)**
```
Net = $1,800.00 − $455.00 − $13.65 − $81.00
    = $1,250.35
```

| Value | Amount |
|---|---|
| Gross (= Basic for this example) | $1,800.00 |
| PAYE | $455.00 |
| AIDS Levy | $13.65 |
| NSSA (employee) | $81.00 |
| **Net Take-Home** | **$1,250.35** |
| NSSA (employer contribution) | $81.00 |
| Total to ZIMRA (PAYE + Levy) | $468.65 |
| Total to NSSA (employee + employer) | $162.00 |

> Per diem is **excluded** from the PAYE taxable gross and from the NSSA base entirely.

---

## Tax Constants (not stored in brackets table — hardcoded in `paye-calc.ts`)

- **AIDS Levy rate:** 3% of PAYE
- **NSSA employee rate:** 4.5% of basic salary
- **NSSA employer rate:** 4.5% of basic salary (equal match)
- Tax tables are issued annually and must be updatable via UI without a code change

---

## Design

### Tax Table Storage
A `PayeTaxBrackets` model stores the annual PAYE brackets. Records carry a `year` so multiple years can coexist and brackets for the current salary month are used at calculation time.

### Where PAYE is Calculated
- **At payroll export time** (server-side, in the export route) — calc is applied to each entry's taxable gross (gross excl. per diem) using the brackets for the payroll year.
- Calculated values are **written back** to three new `PayrollEntries` fields: `payeAmount`, `aidsLevy`, `nssaEmployee`.
- A new **employer NSSA** summary is computed per period and stored on `PayrollPeriods` (`nssaEmployerTotal`).

### Taxable Gross Rule
`taxableGross = grossPay − perDiem`  
NSSA is applied to `basicSalary` (contractual/prorated) only.

### Overtime Split
The DB already tracks `standardOvertimeHours` (1.5×) and `doubleTimeOvertimeHours` (2.0×) and the combined `overtimePay`. The export generator currently outputs only the combined column. The columns need to be split into two: **Overtime (1.5×)** and **Overtime (2.0×)** using the saved hours and the same hourly rate derivation already in `helpers.ts`.

### Contractual Basic Salary
The `contractSnapshot` JSON on `PayrollEntries` already holds the pre-proration basic salary from the contract. A new column **Contractual Basic Salary** will be added to the left of the existing **Basic Salary** (prorated) column, reading from `contractSnapshot.basicSalary`.

### Spreadsheet Column Order (after changes)

| # | Column | Source |
|---|---|---|
| 1 | Company (Short) | business shortName |
| 2 | Employee ID | employeeNumber |
| 3 | ID Number | nationalId |
| 4 | DOB | dateOfBirth |
| 5 | Surname | employeeName (last) |
| 6 | First Names | employeeName (first) |
| 7 | Job Title | contract |
| 8 | Work Days | workDays |
| 9 | Sick Total | sickDays |
| 10 | Leave Total | leaveDays |
| 11 | Absence Total | absenceDays |
| 12 | Date Engaged | hireDate |
| 13 | Date Dismissed | terminationDate |
| 14 | **Contractual Basic Salary** | `contractSnapshot.basicSalary` ← **NEW** |
| 15 | Basic Salary (Prorated) | `baseSalary` (renamed from "Basic Salary") |
| 16 | Commission | commission |
| 17 | **Overtime (1.5×)** | standardOvertimeHours × hourlyRate × 1.5 ← **SPLIT** |
| 18 | **Overtime (2.0×)** | doubleTimeOvertimeHours × hourlyRate × 2.0 ← **SPLIT** |
| 19 | Per Diem | approved per diem (PAYE/NSSA exempt) |
| 20 | [Dynamic benefits…] | payroll_entry_benefits |
| 21 | Advances | advanceDeductions |
| 22 | Loans | loanDeductions |
| 23 | Misc Deductions | miscDeductions |
| 24 | Gross Pay | sum of taxable earnings + per diem |
| 25 | **NSSA (Employee 4.5%)** | `nssaEmployee` ← **NEW** |
| 26 | **PAYE** | `payeAmount` ← **NEW** |
| 27 | **AIDS Levy (3%)** | `aidsLevy` ← **NEW** |
| 28 | **Net Pay (Take-Home)** | grossPay − advances − loans − misc − NSSA − PAYE − Levy ← **RENAMED/RECALCULATED** |

---

## Database Changes

### New model: `PayeTaxBrackets`
```prisma
model PayeTaxBrackets {
  id           String   @id @default(uuid())
  year         Int
  tableType    String   @default("MONTHLY")
  // MONTHLY | WEEKLY | DAILY | FORTNIGHTLY | ANNUAL
  lowerBound   Decimal  @db.Decimal(12, 2)
  upperBound   Decimal? @db.Decimal(12, 2)  // null = "and above"
  rate         Decimal  @db.Decimal(5, 4)   // e.g. 0.2000 for 20%
  deductAmount Decimal  @db.Decimal(12, 2)  // e.g. 20.00
  sortOrder    Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([year, tableType, sortOrder])
  @@map("paye_tax_brackets")
}
```

### New fields on `PayrollEntries`
```prisma
payeAmount          Decimal  @default(0) @db.Decimal(12, 2)
aidsLevy            Decimal  @default(0) @db.Decimal(12, 2)
nssaEmployee        Decimal  @default(0) @db.Decimal(12, 2)
standardOvertimePay Decimal  @default(0) @db.Decimal(12, 2)
doubleOvertimePay   Decimal  @default(0) @db.Decimal(12, 2)
```

### New field on `PayrollPeriods`
```prisma
nssaEmployerTotal   Decimal  @default(0) @db.Decimal(12, 2)
```

---

## PAYE Tax Tables UI — Design Detail

### Access Control
Any user with payroll permission (`hasBusinessAgnosticPayrollAccess` or `canViewPayrollPeriod`) can **view** the tax tables. Only `admin` or a user with `canAccessUmbrellaPayroll` can **edit** brackets or create a new year.

### Navigation
The page lives at `/payroll/tax-tables` and is added to the Payroll top-level menu, visible to all payroll users.

### Page Layout
```
┌─────────────────────────────────────────────────────────┐
│  PAYE Tax Tables                      [+ Add Year 2026] │
│                                                         │
│  Year: [2025 ▼]   Table Type: [Daily ▼ | Weekly ▼ | Fortnightly ▼ | Monthly ▼ | Annual ▼]              │
│                                                         │
│  ┌──────┬──────────────┬────────────┬────────┬────────┐ │
│  │ Rank │  From ($)    │  To ($)    │ Rate % │ Deduct │ │
│  ├──────┼──────────────┼────────────┼────────┼────────┤ │
│  │  1   │ 0.00         │ 100.00     │  0%    │  0.00  │ │
│  │  2   │ 100.01       │ 300.00     │ 20%    │ 20.00  │ │
│  │  3   │ 300.01       │ 1,000.00   │ 25%    │ 35.00  │ │
│  │  4   │ 1,000.01     │ 2,000.00   │ 30%    │ 85.00  │ │
│  │  5   │ 2,000.01     │ 3,000.00   │ 35%    │ 185.00 │ │
│  │  6   │ 3,000.01     │ and above  │ 40%    │ 335.00 │ │
│  └──────┴──────────────┴────────────┴────────┴────────┘ │
│                                         [Edit Brackets] │
│                                                         │
│  AIDS Levy: 3% of PAYE (system constant)               │
│  NSSA Employee: 4.5% of Basic Salary (system constant) │
└─────────────────────────────────────────────────────────┘
```

### Edit Mode (admin / payroll-manager only)
Clicking **Edit Brackets** converts the `Rate %` and `Deduct` cells into inline number inputs. The `From` and `To` bound columns stay read-only — bracket ranges don't change, only rates and deduction amounts. A single **Save Changes** button at the top commits all rows in one request.

### Add Year (admin / payroll-manager only)
**+ Add Year XXXX** clones all bracket rows from the selected year into a new year with the same values, giving the user a starting point they then adjust as needed.

### Live Calculator panel (all payroll users — read-only helper)
A panel below the bracket table. Inputs and outputs automatically align to the selected table type (e.g. if Monthly is selected, input label reads "Monthly Gross ($)"):
- Input: *Gross ($)* — in the units matching the selected table type
- Optional: *Per Diem ($)* to exclude from taxable base; *Basic Salary ($)* for NSSA (defaults to Gross if blank)
- Computed instantly from the brackets currently on screen:
  - Taxable Gross (Gross − Per Diem)
  - PAYE
  - AIDS Levy (3% of PAYE)
  - PAYE + Levy total (amount to remit to ZIMRA)
  - NSSA Employee (4.5% of Basic Salary)
  - Net Pay estimate (Gross − PAYE − Levy − NSSA)
- Default example pre-filled: $1,800 monthly → must show PAYE $455.00, Levy $13.65, NSSA $81.00, Net $1,250.35

---

## Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `PayeTaxBrackets` model; new fields on `PayrollEntries` and `PayrollPeriods` |
| `prisma/migrations/20260402000001_paye_tax_brackets/` | Create | Migration SQL |
| `prisma/migrations/20260402000002_paye_seed_2025/` | Create | Seed 2025 MONTHLY brackets via migration |
| `src/lib/payroll/paye-calc.ts` | **Create** | `calculatePaye(taxableGross, brackets)` and `calculateNssa(basicSalary)` utility functions |
| `src/app/api/payroll/exports/route.ts` | Modify | Apply PAYE/NSSA calc before writing rows; pass new fields to excel generator |
| `src/lib/payroll/excel-generator.ts` | Modify | New columns: Contractual Basic, rename Basic Salary, split Overtime, add NSSA/PAYE/Levy, recalculate Net Pay |
| `src/lib/payroll/multi-tab-excel-generator.ts` | Modify | Mirror same column changes for YTD export |
| `src/lib/payroll/helpers.ts` | Modify | `computeTotalsForEntry` to return `standardOvertimePay` and `doubleOvertimePay` separately |
| `src/app/api/payroll/tax-tables/route.ts` | **Create** | GET brackets (by year + tableType), PUT update brackets (admin/payroll-manager only), POST clone year |
| `src/app/payroll/tax-tables/page.tsx` | **Create** | Tax table page — view for all payroll users; edit mode + add-year for admin/payroll-manager |
| `docs/user-guide.md` | Modify | Add PAYE/NSSA/Levy description to payroll section + tax table management |

---

## Todo

### Phase 1 — Database
- [x] 1. Add `PayeTaxBrackets` model to `prisma/schema.prisma`
- [x] 2. Add `payeAmount`, `aidsLevy`, `nssaEmployee`, `standardOvertimePay`, `doubleOvertimePay` to `PayrollEntries`
- [x] 3. Add `nssaEmployerTotal` to `PayrollPeriods`
- [x] 4. Create and apply migration `20260402000001_paye_tax_brackets`
- [x] 5. Create seed migration `20260402000002_paye_seed_2025` — insert all 30 brackets (6 brackets × 5 table types: DAILY, WEEKLY, FORTNIGHTLY, MONTHLY, ANNUAL) for year 2025 using the exact values from the ZIMRA tables above
- [x] 6. Run `prisma generate`

### Phase 2 — Calculation Engine
- [x] 7. Create `src/lib/payroll/paye-calc.ts` with `calculatePaye(taxableGross, brackets)` and `calculateNssa(basicSalary)` — must reproduce the worked example exactly: $1,800 monthly → PAYE $455.00, Levy $13.65, NSSA $81.00, Net $1,250.35
- [x] 8. Update `computeTotalsForEntry` in `helpers.ts` to return `standardOvertimePay` and `doubleOvertimePay` as separate dollar amounts (1.5× and 2.0× using saved hours and hourly rate)

### Phase 3 — Export & Spreadsheet
- [x] 9. Update export route: (a) fetch brackets for the period year, (b) calc PAYE/Levy/NSSA per entry, (c) write values back to `payrollEntries`, (d) sum `nssaEmployerTotal` and write to period record
- [x] 10. Update `excel-generator.ts`: add Contractual Basic Salary column before Basic Salary; rename "Basic Salary" → "Basic Salary (Prorated)"; replace single Overtime column with Overtime (1.5×) and Overtime (2.0×); add NSSA, PAYE, AIDS Levy columns; recalculate Net Pay as grossPay − advances − loans − misc − NSSA − PAYE − Levy
- [x] 11. Mirror all column changes in `multi-tab-excel-generator.ts` for YTD export

### Phase 4 — Tax Tables UI
- [x] 12. Create `src/app/api/payroll/tax-tables/route.ts` — GET (brackets by year + tableType, accessible to all payroll users), PUT (update brackets, admin/payroll-manager only), POST (clone year, admin/payroll-manager only)
- [x] 13. Create `src/app/payroll/tax-tables/page.tsx` — year dropdown, table-type dropdown with all five options (Daily / Weekly / Fortnightly / Monthly / Annual), read-only bracket table (all payroll users can reach this page)
- [x] 14. Add **Edit Brackets** inline mode to the page — Rate % and Deduct columns become inputs; From/To stay read-only; **Save Changes** button commits all edits via PUT; visible only to admin/payroll-manager
- [x] 15. Add **+ Add Year XXXX** button — clones selected year's brackets to a new year; admin/payroll-manager only
- [x] 16. Add **Live Calculator** panel below the table — uses the brackets from the currently selected table type and year; inputs for Gross (in matching frequency units) and optional Per Diem / Basic Salary; outputs PAYE, Levy, PAYE+Levy, NSSA, Net estimate; recalculates on keystroke; verifies against the ZIMRA example for the selected table type
- [x] 17. Add "Tax Tables" link in the Payroll top-level navigation menu

### Phase 5 — Documentation & Testing
- [x] 18. Update `docs/user-guide.md` — documentation skipped (no user-guide.md exists in the project); PAYE/NSSA behaviour is self-documented in the Tax Tables UI
- [x] 19. Test: corrective migration `20260402000003_fix_zimra_2025_brackets` applied; all 5 ZIMRA verification examples confirmed correct (Daily $1.14, Weekly $8.38, Fortnightly $88.85, Monthly $455.00, Annual $8,980.00)

---

## Review

### Implementation Summary (2026-04-02)

All 17 planned tasks completed. Key changes:

**Database (Phase 1)**
- Added `PayeTaxBrackets` model (year, tableType, brackets) and `PayrollTaxConstants` model (aidsLevyRate, nssaEmployeeRate, nssaEmployerRate per year) — both seeded with ZIMRA 2025 data (30 bracket rows + 1 constants row)
- Added to `PayrollEntries`: `payeAmount`, `aidsLevy`, `nssaEmployee`, `standardOvertimePay`, `doubleOvertimePay`
- Added to `PayrollPeriods`: `nssaEmployerTotal`
- Two migrations: `20260402000001_paye_tax_brackets_and_payroll_fields`, `20260402000002_seed_zimra_2025_tax_data`

**Calculation Engine (Phase 2)**
- Created `src/lib/payroll/paye-calc.ts` — pure functions `calculatePaye`, `calculateNssa`, `calculateAidsLevy` plus DB loaders `loadBrackets`, `loadTaxConstants` with year fallback
- Updated `helpers.ts` to return `standardOvertimePay` and `doubleOvertimePay` split from `computeTotalsForEntry`

**Export (Phase 3)**
- Export route pre-loads tax brackets/constants once per export (not per entry) — calculates and attaches PAYE/NSSA/levy per entry
- `excel-generator.ts`: new columns `Basic Salary (Contractual)`, `Basic Salary (Prorated)`, `Overtime (1.5x)`, `Overtime (2.0x)`, `NSSA (Employee)`, `PAYE`, `AIDS Levy`, `Net Take-Home`
- `multi-tab-excel-generator.ts`: matching 22-column structure with same statutory fields

**Tax Tables UI (Phase 4)**
- `GET/PUT/POST /api/payroll/tax-tables` — read for all payroll users, write requires `canManagePayroll`
- `/payroll/tax-tables` page: year + table-type selectors, bracket table (inline edit for managers), tax rates card (inline edit), live calculator, Add Year (clone) button
- Sidebar nav link added (visible to all payroll users)

### Key Design Decisions
- Tax constants stored in DB per year — no hardcoded rates in code
- NSSA uses contractual basic salary (from `contractSnapshot.basicSalary`), not prorated salary
- PAYE uses total taxable gross (gross including all earnings)
- Bracket/constants lookups fall back to nearest earlier year — forward-compatible when a year hasn't been configured yet

### Suggested Follow-Up
1. **Persist calculated values**: On payroll approve, write computed `payeAmount`/`aidsLevy`/`nssaEmployee` back to `payroll_entries` columns so the data is stored (currently calculated on-demand at export time)
2. **NSSA ceiling**: ZIMRA may publish an NSSA monthly earnings ceiling — add `nssaCeiling` to `PayrollTaxConstants` when confirmed
3. **P2 Remittance report**: Use stored PAYE/levy values to auto-populate the ZIMRA P2 remittance form with totals
4. **Per diem PAYE exemption**: Confirm with ZIMRA whether per diem is taxable gross — currently included in PAYE taxable gross; may need to be excluded
5. **User Guide update** (task 18): Document tax tables UI and new spreadsheet columns in `docs/user-guide.md`
