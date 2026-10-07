import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { comboItemReceiptedAmount, comboItemTargetAmount, isComboItemAccountedFor } from '@/lib/expense-account/combo-item-reconciliation'

/**
 * GET /api/expense-account/reports/combo-missing-receipts
 * MBM-303: combo requests with funds released (APPROVED or later) where at
 * least one planned item has neither a matching receipt total nor a
 * "no receipt" explanation — companion to the generic (payment-level, not
 * combo-aware) /api/expense-account/reports/missing-receipts.
 *
 * Query params (all optional): businessId, dateFrom, dateTo (approvedAt range)
 */
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

    const dateFilter: any = (dateFrom || dateTo) ? {
      approvedAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    } : {}

    const requests = await prisma.comboPaymentRequests.findMany({
      where: {
        status: { in: ['APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID', 'PAID'] },
        ...dateFilter,
        ...(businessId ? { expenseAccount: { businessId } } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        approvedAt: true,
        createdAt: true,
        creator: { select: { name: true } },
        accountId: true,
        expenseAccount: { select: { accountName: true, business: { select: { name: true } } } },
        sections: {
          select: {
            items: {
              select: {
                id: true, description: true, approvedAmount: true, estimatedAmount: true, noReceiptReason: true,
                receipts: { select: { amount: true } },
              },
            },
          },
        },
      },
      orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
    })

    const rows = requests
      .map(r => {
        const allItems = r.sections.flatMap(s => s.items)
        const items = allItems.map(item => {
          const itemForCalc = {
            id: item.id,
            description: item.description,
            approvedAmount: item.approvedAmount !== null ? Number(item.approvedAmount) : null,
            estimatedAmount: item.estimatedAmount !== null ? Number(item.estimatedAmount) : null,
            noReceiptReason: item.noReceiptReason,
            receipts: item.receipts.map(x => ({ amount: Number(x.amount) })),
          }
          return {
            id: item.id,
            description: item.description,
            targetAmount: comboItemTargetAmount(itemForCalc),
            receiptedAmount: comboItemReceiptedAmount(itemForCalc),
            noReceiptReason: item.noReceiptReason,
            accountedFor: isComboItemAccountedFor(itemForCalc),
          }
        })
        const unaccountedItems = items.filter(i => !i.accountedFor)

        return {
          requestId: r.id,
          title: r.title,
          status: r.status,
          date: (r.approvedAt ?? r.createdAt).toISOString(),
          business: r.expenseAccount.business?.name ?? null,
          accountId: r.accountId,
          account: r.expenseAccount.accountName,
          requestedBy: r.creator.name,
          total: Number(r.approvedAmount ?? r.requestedAmount),
          unaccountedCount: unaccountedItems.length,
          unaccountedTotal: unaccountedItems.reduce((sum, i) => sum + (i.targetAmount - i.receiptedAmount), 0),
          unaccountedItems,
        }
      })
      .filter(r => r.unaccountedCount > 0)

    const summary = {
      count: rows.length,
      totalUnaccounted: rows.reduce((sum, r) => sum + r.unaccountedTotal, 0),
    }

    return NextResponse.json({ success: true, data: { rows, summary } })
  } catch (error) {
    console.error('Error generating combo-missing-receipts report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
