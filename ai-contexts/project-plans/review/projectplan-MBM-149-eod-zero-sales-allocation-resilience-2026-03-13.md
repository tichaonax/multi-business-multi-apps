# MBM-149 — EOD Zero-Sales Resilience & Cash Allocation Flexibility

**Date:** 2026-03-13
**Branch:** feature/scheduled-payments
**Status:** Planning

---

## Objective

Fix several failure scenarios in EOD and cash allocation workflows:

1. **EOD with no sales** — A day with no sales currently cannot close the cash allocation report because the lock API rejects empty reports. The day then appears forever in catch-up.
2. **Catch-up shows no-sales days** — `pending-days` lists dates with no orders and no deduction configs, creating noise in catch-up.
3. **Insufficient funds — skip deductions, complete EOD** — When business account lacks funds for rent/auto-deposits, the cash allocation lock should skip outflow entries and complete anyway.
4. **Cash allocation overdraft blocks lock** — If the cash box has less than the allocation total, the lock endpoint returns 422 and blocks the cashier.
5. **Close without deductions** — Cashier needs an option to close allocation with no deduction transactions; all cash remains in the cashbox.

---

## Root Cause Analysis

| Symptom | Root Cause |
|---|---|
| No-sales day can't lock cash allocation | `lock/route.ts` line 143: `if (report.lineItems.length === 0) return 400` |
| No-sales days pile up in catch-up | `pending-days` lists all days without locked EOD, regardless of whether any transactions exist |
| Overdraft blocks lock | `lock/route.ts` line 206: returns 422 when `allocationTotal > cashBoxBefore` |
| No "close without deductions" | No such option in UI or API |

---

## Tasks

### Fix 1: Allow locking an empty cash allocation report
**File:** `src/app/api/cash-allocation/[businessId]/[reportId]/lock/route.ts`

- [x] **1.1** Remove the `if (report.lineItems.length === 0)` 400 error — allow locking
- [x] **1.2** If `lineItems.length === 0`, skip the validation loop and set `allocationTotal = 0`
- [x] **1.3** Still record INFLOW bucket entry for cash counted (if > 0) — cash goes to cashbox

### Fix 2: Overdraft — skip outflow transactions instead of blocking
**File:** `src/app/api/cash-allocation/[businessId]/[reportId]/lock/route.ts`

- [x] **2.1** Change overdraft from a hard error (422) to a soft skip
- [x] **2.2** If `cashBoxBefore <= 0` or `allocationTotal > cashBoxBefore`: lock the report successfully but create **no outflow** cash bucket entries (transactions are skipped — the business keeps the cash)
- [x] **2.3** Return a `skippedDeductions: true` flag in the response so the UI can inform the cashier

### Fix 3: Add "Close without deductions" option
**API:** `src/app/api/cash-allocation/[businessId]/[reportId]/lock/route.ts`

- [x] **3.1** Accept optional `forceClose: boolean` in the request body
- [x] **3.2** If `forceClose = true`: skip all validation (no mismatch checks, no overdraft check), lock the report, record only the INFLOW bucket entry — no outflow entries at all

**Frontend — Daily report:** `src/components/reports/cash-allocation-daily-report.tsx`

- [x] **3.3** Add a "Close Without Deductions" button beside the existing Lock button
- [x] **3.4** Show confirmation prompt: "Close and send all cash to cashbox? This will skip all deduction transfers."
- [x] **3.5** On confirm: call lock with `{ forceClose: true }`

**Frontend — Grouped report:** `src/components/reports/cash-allocation-grouped-report.tsx`

- [x] **3.6** Same "Close Without Deductions" button + confirmation in grouped report

### Fix 4: Exclude no-ops from catch-up pending days
**File:** `src/app/api/eod/pending-days/route.ts`

- [x] **4.1** Check once whether the business has any active rent config OR active auto-deposit configs
- [x] **4.2** If the business has NO active configs: for each pending date, check if there are any orders. Exclude dates with 0 orders.
- [x] **4.3** If the business HAS active configs: keep current behavior (all missing days shown — rent/auto-deposits need to run)
- [x] **4.4** Do the order count check via a single bulk query (not N queries for N dates)

---

## Files Affected

| File | Change |
|---|---|
| `src/app/api/cash-allocation/[businessId]/[reportId]/lock/route.ts` | Fixes 1, 2, 3 |
| `src/components/reports/cash-allocation-daily-report.tsx` | Fix 3 UI |
| `src/components/reports/cash-allocation-grouped-report.tsx` | Fix 3 UI |
| `src/app/api/eod/pending-days/route.ts` | Fix 4 |

---

## Risk Assessment

- **Low risk**: All changes are additive or make guards less strict (we're removing hard blocks, not adding new restrictions)
- **No DB schema changes** — no migration needed
- **Fix 2/3 only affect bucket entry creation** — no expense account balance changes when skipped

---

## Review

_To be filled after implementation._
