import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import type { ReceiptReconciliationStatus } from '@/lib/expense-account/receipt-reconciliation-status'

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
        payeeUser: { select: { id: true, name: true } },
        payeeEmployee: { select: { id: true, fullName: true } },
        payeePerson: { select: { id: true, fullName: true } },
        payeeBusiness: { select: { id: true, name: true } },
        payeeSupplier: { select: { id: true, name: true } },
        expenseAccount: { select: { accountName: true, business: { select: { name: true } } } },
        creator: { select: { name: true } },
        receipt_review: { select: { status: true, expectedAmount: true } },
        expense_payment_receipts: { select: { amount: true } },
      },
      orderBy: [{ paidAt: 'desc' }, { paymentDate: 'desc' }],
    })

    const rows = payments
      .map(p => {
        const amount = Number(p.amount)
        const receiptTotal = p.expense_payment_receipts.reduce((sum, r) => sum + Number(r.amount), 0)
        const expected = p.receipt_review ? Number(p.receipt_review.expectedAmount) : amount
        const status = computeStatus(expected, receiptTotal, p.receipt_review?.status ?? null)

        const payeeRef =
          p.payeeUser ? { type: 'USER', id: p.payeeUser.id, name: p.payeeUser.name } :
          p.payeeEmployee ? { type: 'EMPLOYEE', id: p.payeeEmployee.id, name: p.payeeEmployee.fullName } :
          p.payeePerson ? { type: 'PERSON', id: p.payeePerson.id, name: p.payeePerson.fullName } :
          p.payeeBusiness ? { type: 'BUSINESS', id: p.payeeBusiness.id, name: p.payeeBusiness.name } :
          p.payeeSupplier ? { type: 'SUPPLIER', id: p.payeeSupplier.id, name: p.payeeSupplier.name } :
          null

        const date = (p.paidAt ?? p.paymentDate).toISOString()
        const daysSincePaid = Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000))

        return {
          paymentId: p.id,
          date,
          business: p.expenseAccount.business?.name ?? null,
          account: p.expenseAccount.accountName,
          payee: payeeRef?.name ?? null,
          payeeRef,
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
