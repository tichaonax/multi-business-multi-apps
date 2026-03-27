/**
 * GET /api/universal/pos-daily-summary
 *
 * Returns today's sales summary and expense payments for a given business.
 * Requires canAccessFinancialData permission (or system admin).
 *
 * Query params:
 *   businessId  (required)
 *   timezone    (optional, IANA, e.g. "Africa/Harare")
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'

function getDayBounds(timezone: string, daysAgo = 0): { start: Date; end: Date } {
  const now = new Date()
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year, month, day] = dateStr.split('-').map(Number)

  // Compute offset between UTC and the given timezone at midnight
  const midnightUtcMs = Date.UTC(year, month - 1, day) - daysAgo * 24 * 60 * 60 * 1000
  const utcStr = new Date(midnightUtcMs).toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = new Date(midnightUtcMs).toLocaleString('en-US', { timeZone: timezone })
  const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime()

  const start = new Date(midnightUtcMs - offsetMs)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const timezone = searchParams.get('timezone') || 'UTC'

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const canView = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', businessId)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { start, end } = getDayBounds(timezone, 0)
    const { start: yStart, end: yEnd } = getDayBounds(timezone, 1)
    const { start: d2Start, end: d2End } = getDayBounds(timezone, 2)

    // Today's completed orders for this business
    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId,
        status: 'COMPLETED',
        createdAt: { gte: start, lt: end },
      },
      select: { totalAmount: true, paymentMethod: true },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const byPaymentMethod: Record<string, number> = {}
    for (const o of orders) {
      const pm = o.paymentMethod || 'UNKNOWN'
      byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + Number(o.totalAmount)
    }

    // Today's expense payments linked to this business's expense accounts
    const expenseAccounts = await prisma.expenseAccounts.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    })
    const accountIds = expenseAccounts.map((a) => a.id)

    let expenseItems: Array<{
      id: string
      amount: number
      payeeName: string
      payeeType: string
      categoryName: string | null
      subcategoryName: string | null
      notes: string | null
    }> = []

    if (accountIds.length > 0) {
      const payments = await prisma.expenseAccountPayments.findMany({
        where: {
          expenseAccountId: { in: accountIds },
          paymentDate: { gte: start, lt: end },
          status: { not: 'CANCELLED' },
        },
        select: {
          id: true,
          amount: true,
          notes: true,
          payeeType: true,
          payeeEmployee: { select: { firstName: true, lastName: true } },
          payeePerson: { select: { fullName: true } },
          payeeUser: { select: { name: true } },
          payeeBusiness: { select: { name: true } },
          payeeSupplier: { select: { name: true } },
          category: { select: { name: true } },
          subcategory: { select: { name: true } },
        },
        orderBy: { paymentDate: 'desc' },
      })

      expenseItems = payments.map((p) => {
        let payeeName = 'Unknown'
        if (p.payeeEmployee)
          payeeName = `${p.payeeEmployee.firstName} ${p.payeeEmployee.lastName}`
        else if (p.payeePerson) payeeName = p.payeePerson.fullName
        else if (p.payeeUser) payeeName = p.payeeUser.name || 'User'
        else if (p.payeeBusiness) payeeName = p.payeeBusiness.name
        else if (p.payeeSupplier) payeeName = p.payeeSupplier.name

        return {
          id: p.id,
          amount: Number(p.amount),
          payeeName,
          payeeType: p.payeeType,
          categoryName: p.category?.name ?? null,
          subcategoryName: p.subcategory?.name ?? null,
          notes: p.notes ?? null,
        }
      })
    }

    const totalExpenses = expenseItems.reduce((sum, e) => sum + e.amount, 0)

    // Expense totals for yesterday and 2 days ago (for comparison)
    let yesterdayExpenses = 0
    let twoDaysAgoExpenses = 0
    if (accountIds.length > 0) {
      const [yPayments, d2Payments] = await Promise.all([
        prisma.expenseAccountPayments.findMany({
          where: { expenseAccountId: { in: accountIds }, paymentDate: { gte: yStart, lt: yEnd }, status: { not: 'CANCELLED' } },
          select: { amount: true },
        }),
        prisma.expenseAccountPayments.findMany({
          where: { expenseAccountId: { in: accountIds }, paymentDate: { gte: d2Start, lt: d2End }, status: { not: 'CANCELLED' } },
          select: { amount: true },
        }),
      ])
      yesterdayExpenses = yPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      twoDaysAgoExpenses = d2Payments.reduce((sum, p) => sum + Number(p.amount), 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        periodStart: start.toISOString(),
        sales: {
          totalRevenue,
          totalOrders: orders.length,
          byPaymentMethod,
        },
        expenses: {
          total: totalExpenses,
          count: expenseItems.length,
          items: expenseItems,
          yesterdayTotal: yesterdayExpenses,
          twoDaysAgoTotal: twoDaysAgoExpenses,
        },
      },
    })
  } catch (error) {
    console.error('[pos-daily-summary GET]', error)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
