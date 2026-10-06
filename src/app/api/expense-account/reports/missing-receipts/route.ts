import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import type { ReceiptReconciliationStatus } from '@/lib/expense-account/receipt-reconciliation-status'
import { getPayeeAttributedAmounts } from '@/lib/expense-account/receipt-payee-attribution'

/**
 * GET /api/expense-account/reports/missing-receipts
 *
 * Payment-rooted (not receipt-rooted) — unlike the existing
 * /api/expense-account/reports/receipts, this starts from
 * ExpenseAccountPayments so a payment with ZERO receipts still shows up.
 * Flags only NOT_STARTED and PARTIALLY_RECEIPTED payments — not
 * PENDING_REVIEW (receipts already fully submitted, just awaiting
 * approval) and not OVER_LIMIT (too many receipts, not missing ones).
 *
 * Query params (all optional): businessId, dateFrom, dateTo (paidAt/paymentDate range)
 */

// Local variant of reconciliationStatus() — that helper assumes a formal
// review workflow and would strand an exact-match payment with no review
// row at PARTIALLY_RECEIPTED (no APPROVED review to satisfy it). Here, no
// review row simply means there's nothing to approve.
function computeStatus(expected: number, receiptTotal: number, reviewStatus: 'PENDING' | 'SUBMITTED' | 'APPROVED' | null): ReceiptReconciliationStatus {
  if (receiptTotal === 0) return 'NOT_STARTED'
  if (receiptTotal > expected) return 'OVER_LIMIT'
  if (receiptTotal === expected) return 'FULLY_RECEIPTED'
  if (reviewStatus === 'SUBMITTED') return 'PENDING_REVIEW'
  return 'PARTIALLY_RECEIPTED'
}

const FLAGGED_STATUSES: ReceiptReconciliationStatus[] = ['NOT_STARTED', 'PARTIALLY_RECEIPTED']

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canViewExpenseReports && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const businessId = sp.get('businessId')
    const dateFrom = sp.get('dateFrom')
    const dateTo = sp.get('dateTo')
    const statusParam = sp.get('status') as ReceiptReconciliationStatus | 'ALL' | null

    const dateFilter: any = (dateFrom || dateTo) ? {
      OR: [
        { paidAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } },
        {
          paidAt: null,
          paymentDate: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) },
        },
      ],
    } : {}

    const payments = await prisma.expenseAccountPayments.findMany({
      where: {
        status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] },
        // REGULAR already excludes TRANSFER_OUT/LOAN_REPAYMENT/
        // LOAN_DISBURSEMENT/TRANSFER_RETURN — internal money movements,
        // not expenses needing a receipt.
        paymentType: 'REGULAR',
        ...dateFilter,
        ...(businessId ? { expenseAccount: { businessId } } : {}),
      },
      select: {
        id: true,
        paymentDate: true,
        paidAt: true,
        amount: true,
        notes: true,
        category: { select: { name: true, emoji: true } },
        subcategory: { select: { name: true } },
        expenseAccount: { select: { accountName: true, business: { select: { name: true } } } },
        creator: { select: { name: true } },
        receipt_review: { select: { status: true, expectedAmount: true } },
        expense_payment_receipts: { select: { amount: true } },
      },
      orderBy: [{ paidAt: 'desc' }, { paymentDate: 'desc' }],
    })

    // Per-payment payee breakdown from actual receipts (falls back to the
    // payment's own single payee when it has no itemized receipts yet) —
    // the outstanding/missing portion has no payee of its own (nobody's
    // named on a receipt that doesn't exist), so it's never attributed to
    // just one recipient for a split request; "payees" below instead shows
    // who HAS been receipted so far, if anyone.
    const attributed = await getPayeeAttributedAmounts(payments.map(p => p.id))

    const rows = payments
      .map(p => {
        const amount = Number(p.amount)
        const receiptTotal = p.expense_payment_receipts.reduce((sum, r) => sum + Number(r.amount), 0)
        const expected = p.receipt_review ? Number(p.receipt_review.expectedAmount) : amount
        const status = computeStatus(expected, receiptTotal, p.receipt_review?.status ?? null)

        const attributedPayees = (attributed.get(p.id) ?? []).map(a => ({ type: a.payeeType, id: a.payeeId, name: a.payeeName, amount: a.amount }))
        // Single-payee case keeps the old simple `payeeRef` shape for
        // existing consumers; split payments carry no single payeeRef.
        const payeeRef = attributedPayees.length === 1 ? attributedPayees[0] : null

        const date = (p.paidAt ?? p.paymentDate).toISOString()
        const daysSincePaid = Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000))

        return {
          paymentId: p.id,
          date,
          business: p.expenseAccount.business?.name ?? null,
          account: p.expenseAccount.accountName,
          payee: payeeRef?.name ?? (attributedPayees.length > 1 ? `Multiple payees (${attributedPayees.length})` : null),
          payeeRef,
          payees: attributedPayees,
          category: p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : null,
          subcategory: p.subcategory?.name ?? null,
          amount,
          expected,
          receiptTotal,
          outstanding: expected - receiptTotal,
          status,
          requestedBy: p.creator.name,
          notes: p.notes,
          daysSincePaid,
        }
      })
      .filter(r => FLAGGED_STATUSES.includes(r.status))
      .filter(r => !statusParam || statusParam === 'ALL' || r.status === statusParam)

    const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0)
    const totalPaymentAmount = rows.reduce((sum, r) => sum + r.amount, 0)

    return NextResponse.json({
      success: true,
      data: {
        rows,
        summary: { count: rows.length, totalOutstanding, totalPaymentAmount },
      },
    })
  } catch (error) {
    console.error('Error generating missing-receipts report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
