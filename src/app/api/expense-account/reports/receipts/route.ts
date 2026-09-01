import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { reconciliationStatus, type ReceiptReconciliationStatus } from '@/lib/expense-account/receipt-reconciliation-status'

/**
 * GET /api/expense-account/reports/receipts
 * MBM-286: receipt-level (not payment-level) report — one row per actual
 * receipt, each with its own independent supplier/payee and expense type,
 * the combo request it came from (if any), and that payment's overall
 * reconciliation status. Supports the filters + supplier/type spend
 * breakdown described in the ticket.
 *
 * Query params (all optional): supplierId, personId, businessId, categoryId,
 * subcategoryId, requesterId, dateFrom, dateTo (receiptDate range),
 * status (NOT_STARTED | PARTIALLY_RECEIPTED | PENDING_REVIEW | FULLY_RECEIPTED | OVER_LIMIT)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const supplierId = sp.get('supplierId')
    const personId = sp.get('personId')
    const businessId = sp.get('businessId')
    const categoryId = sp.get('categoryId')
    const subcategoryId = sp.get('subcategoryId')
    const requesterId = sp.get('requesterId')
    const dateFrom = sp.get('dateFrom')
    const dateTo = sp.get('dateTo')
    const statusFilter = sp.get('status') as ReceiptReconciliationStatus | null

    const receipts = await prisma.expensePaymentReceipts.findMany({
      where: {
        ...(supplierId ? { payeeSupplierId: supplierId } : {}),
        ...(personId ? { payeePersonId: personId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(subcategoryId ? { subcategoryId } : {}),
        ...(dateFrom || dateTo ? {
          receiptDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        } : {}),
        expensePayment: {
          ...(businessId ? { expenseAccount: { businessId } } : {}),
          ...(requesterId ? {
            OR: [{ createdBy: requesterId }, { combo_request: { createdBy: requesterId } }],
          } : {}),
        },
      },
      select: {
        id: true,
        receiptDate: true,
        amount: true,
        receiptNumber: true,
        payeeType: true,
        payeeName: true,
        createdBy: true,
        payeePerson: { select: { fullName: true } },
        payeeBusiness: { select: { name: true } },
        payeeSupplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, emoji: true } },
        subcategory: { select: { name: true } },
        creator: { select: { name: true } },
        expensePayment: {
          select: {
            id: true,
            paymentDate: true,
            amount: true,
            createdBy: true,
            creator: { select: { name: true } },
            expenseAccount: { select: { id: true, accountName: true, businesses: { select: { id: true, name: true } } } },
            receipt_review: { select: { status: true, expectedAmount: true } },
            combo_request: { select: { id: true, title: true, createdAt: true, requestedAmount: true, approvedAmount: true } },
          },
        },
      },
      orderBy: { receiptDate: 'desc' },
    })

    // Reconciliation status is per-payment, not per-receipt — compute it
    // once per distinct payment (needs that payment's full receipt total,
    // not just the ones matching this query's other filters).
    const paymentIds = [...new Set(receipts.map(r => r.expensePayment.id))]
    const totalsByPayment = new Map<string, number>()
    if (paymentIds.length > 0) {
      const allReceiptsForThesePayments = await prisma.expensePaymentReceipts.groupBy({
        by: ['expensePaymentId'],
        where: { expensePaymentId: { in: paymentIds } },
        _sum: { amount: true },
      })
      for (const row of allReceiptsForThesePayments) {
        totalsByPayment.set(row.expensePaymentId, Number(row._sum.amount ?? 0))
      }
    }

    const rows = receipts.map(r => {
      const review = r.expensePayment.receipt_review
      const status = review
        ? reconciliationStatus({
            expectedAmount: Number(review.expectedAmount),
            receiptTotal: totalsByPayment.get(r.expensePayment.id) ?? 0,
            reviewStatus: review.status,
          })
        : null

      const payeeName =
        r.payeeType === 'PERSON' ? r.payeePerson?.fullName ?? null :
        r.payeeType === 'BUSINESS' ? r.payeeBusiness?.name ?? null :
        r.payeeType === 'SUPPLIER' ? r.payeeSupplier?.name ?? null :
        r.payeeType === 'FREEFORM' ? r.payeeName : null

      return {
        receiptId: r.id,
        supplierOrPersonName: payeeName,
        supplierId: r.payeeSupplier?.id ?? null,
        comboRequestId: r.expensePayment.combo_request?.id ?? null,
        comboRequestTitle: r.expensePayment.combo_request?.title ?? null,
        requestDate: r.expensePayment.combo_request?.createdAt ?? null,
        paymentDate: r.expensePayment.paymentDate,
        requestedAmount: r.expensePayment.combo_request
          ? Number(r.expensePayment.combo_request.approvedAmount ?? r.expensePayment.combo_request.requestedAmount)
          : Number(r.expensePayment.amount),
        receiptDate: r.receiptDate,
        receiptAmount: Number(r.amount),
        receiptNumber: r.receiptNumber,
        expenseType: r.category ? `${r.category.emoji} ${r.category.name}` : null,
        expenseSubtype: r.subcategory?.name ?? null,
        business: r.expensePayment.expenseAccount.businesses?.name ?? null,
        requestingEmployee: r.expensePayment.creator.name,
        receiptEntryEmployee: r.creator.name,
        reconciliationStatus: status,
        outstandingBalance: review ? Number(review.expectedAmount) - (totalsByPayment.get(r.expensePayment.id) ?? 0) : null,
      }
    }).filter(row => !statusFilter || row.reconciliationStatus === statusFilter)

    const totalSpend = rows.reduce((sum, r) => sum + r.receiptAmount, 0)
    const byType = new Map<string, number>()
    for (const r of rows) {
      const key = r.expenseType ?? 'Uncategorized'
      byType.set(key, (byType.get(key) ?? 0) + r.receiptAmount)
    }

    return NextResponse.json({
      success: true,
      data: {
        rows,
        summary: {
          totalSpend,
          count: rows.length,
          byType: [...byType.entries()].map(([type, amount]) => ({ type, amount })).sort((a, b) => b.amount - a.amount),
        },
      },
    })
  } catch (error) {
    console.error('Error generating receipts report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
