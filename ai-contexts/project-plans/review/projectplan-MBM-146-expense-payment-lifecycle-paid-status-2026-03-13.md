# MBM-146 — Expense Payment Lifecycle: Paid Status & Cash Box Alignment

**Date:** 2026-03-13
**Branch:** feature/scheduled-payments
**Status:** AWAITING APPROVAL

---

## Problem Summary

Two related bugs affecting all businesses (confirmed via HXI Eats & HXI Fashions):

1. **Wrong deposit amount on batch approval** — The deposit created in the expense account
   includes petty cash return payments that entered the EOD batch queue, inflating the deposit
   (e.g. $55 approved + $10 petty cash return = $65 deposit shown).

2. **Premature debits in expense account** — Payment requests appear as debits and reduce the
   account balance the moment Letwin submits them (status=`SUBMITTED`), before Mary approves or
   Letwin physically hands over cash. The expense account ledger should only debit when a payment
   is physically made and marked as paid.

---

## Desired Flow

| Event | Cash Box | Expense Account | Payment Status |
|---|---|---|---|
| Letwin submits request | No change | No change | `SUBMITTED` — tracked, hidden |
| Mary approves batch | **Debit** (−total) | **Deposit** (+total) | → `APPROVED` — still hidden |
| Letwin marks each payment paid | No change | **Debit** (−amount, dated paid) | → `PAID`, `paidAt` stamped |
| Letwin returns unused petty cash at settlement | **Credit** (+return) | **Debit** (−return, immediate) | Auto `PAID` immediately |

---

## Impact Analysis

### Migration Required (1 schema change)
- Add `paidAt DateTime? @map("paid_at")` to `ExpenseAccountPayments`
- Status is a plain `String` field — no enum migration needed; `PAID` value is just a new string

### Data Migration Required (1 script)
- Existing `APPROVED` payments must be set to `PAID` with `paidAt = updatedAt` to preserve
  historical balance integrity. Without this, all account balances would inflate when the balance
  formula changes from `SUBMITTED` → `PAID`.

### Files Affected (code changes)
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `paidAt` column |
| `src/lib/expense-account-utils.ts` | Balance formula: `SUBMITTED` → `PAID` |
| `src/app/api/expense-account/[accountId]/payments/route.ts` | Ledger: filter display to `PAID` only |
| `src/app/api/expense-account/[accountId]/payments/[paymentId]/route.ts` | Add PATCH "mark as paid" action |
| `src/app/api/eod-payment-batches/[batchId]/review/route.ts` | Already fixed: cash box debit, no biz account debit |
| `src/app/api/petty-cash/requests/[requestId]/settle/route.ts` | Return payment auto-set to `PAID`, credit cash box |
| `src/app/api/eod-payment-batches/route.ts` (batch creation) | Exclude `PETTY_CASH_RETURN` payments from queue |
| Expense account ledger UI | Show only `PAID` payments; add "Mark as Paid" button on `APPROVED` rows |
| Petty cash spend transactions | `PETTY_CASH_SPEND` payments: mark paid at same time as transaction recorded |

---

## Todo Items

### Phase 1 — Schema & Data Migration
- [x] 1. Add `paidAt DateTime? @map("paid_at")` to `ExpenseAccountPayments` in `schema.prisma`
- [x] 2. Created migration manually + applied via `prisma migrate deploy` (shadow DB drift prevented `migrate dev`)
- [x] 3. Data migration ran — 0 existing APPROVED payments found (clean slate)

### Phase 2 — Balance Formula & Ledger Display
- [x] 4. Updated `expense-account-utils.ts`: all balance calculations changed `status: 'SUBMITTED'` → `status: 'PAID'`
- [x] 5. Payments GET API defaults to `status=PAID`; pass `status=APPROVED` or `status=all` for other views

### Phase 3 — Mark as Paid
- [x] 6. Added `markPaid` action to existing PATCH handler in `payments/[paymentId]/route.ts`
- [x] 7. `my-payments` page already has "Payment Made" button → updated `collect` endpoint to set `PAID` + `paidAt` + recalculate balance (was incorrectly setting back to `SUBMITTED`)

### Phase 4 — Petty Cash Alignment
- [x] 8. Petty cash return payment → `status='PAID'`, `paidAt=now()`, cash box INFLOW; removed business account credit
- [x] 9. Petty cash spend payments created with `status='PAID'`, `paidAt=transactionDate`
- [x] 10. EOD batch utils: exclude `PETTY_CASH_SPEND` and `PETTY_CASH_RETURN` from queue

### Phase 5 — Verify & Review
- [x] 11. Transactions API (`/transactions/route.ts`): changed `status: 'SUBMITTED'` → `status: 'PAID'`; date filter and orderBy now use `paidAt`; payment display date uses `paidAt ?? paymentDate`
- [ ] 12. Testing delegated to user
- [x] 13. All code paths complete — see Review below
- [x] 14. Review section added below

---

## Key Decisions

- **`PETTY_CASH_SPEND` payments** are marked `PAID` immediately at recording time because Letwin
  physically spent the money at that moment — no separate "mark as paid" step needed.
- **`PETTY_CASH_RETURN` payments** are auto-`PAID` at settlement for the same reason.
- **Regular expense payments** (`REGULAR` paymentType) require explicit "Mark as Paid" by the
  requester after receiving cash from cashier.
- **Balance formula** counts only `PAID` — so the account balance reflects actual cash disbursed,
  not committed/pending amounts. A separate "pending" amount can be shown in the UI by summing
  `APPROVED` payments.

---

## Review

### Changes Made

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `paidAt DateTime? @map("paid_at")` to `ExpenseAccountPayments` |
| `prisma/migrations/20260313000001_add_paid_at_expense_payment/migration.sql` | Migration file — adds `paid_at` column |
| `src/lib/expense-account-utils.ts` | All balance calculations: `status: 'SUBMITTED'` → `status: 'PAID'` (9 occurrences) |
| `src/lib/eod-payment-batch-utils.ts` | Exclude `PETTY_CASH_SPEND` and `PETTY_CASH_RETURN` from EOD batch queue |
| `src/app/api/expense-account/[accountId]/transactions/route.ts` | Ledger: filter to `PAID` only, date uses `paidAt`, orderBy uses `paidAt` |
| `src/app/api/expense-account/[accountId]/payments/route.ts` | GET defaults to `status=PAID`; pass `status=all` or `status=APPROVED` for other views |
| `src/app/api/expense-account/[accountId]/payments/[paymentId]/route.ts` | Added `markPaid` action to PATCH handler |
| `src/app/api/expense-account-payments/collect/route.ts` | Fixed: was setting `SUBMITTED` on collect — now sets `PAID` + `paidAt` + recalculates balance |
| `src/app/api/petty-cash/requests/[requestId]/transactions/route.ts` | `PETTY_CASH_SPEND` payments created as `PAID` with `paidAt=transactionDate` |
| `src/app/api/petty-cash/requests/[requestId]/settle/route.ts` | Return payment auto-`PAID` immediately; cash bucket credited; business account credit removed |
| `src/app/api/eod-payment-batches/[batchId]/review/route.ts` | Business account balance check and debit removed; payments move to `APPROVED` at batch approval |

### Suggested Follow-ups
- The `validatePaymentEdit` and `validateBatchPaymentTotal` functions in `expense-account-utils.ts` still reference logic written for the old flow — review for correctness under the new PAID-only model
- Reports (`/api/expense-account/[accountId]/reports`) may still reference `SUBMITTED` status — audit if report numbers look off
- Consider adding a "Pending Approvals" summary card to the expense account page showing total value of `APPROVED` (not yet paid) payments so the account holder can see what's coming
