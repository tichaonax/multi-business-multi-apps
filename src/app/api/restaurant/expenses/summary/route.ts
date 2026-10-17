import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { checkRestaurantAccess, OPEN_LINE_STATUSES } from '@/lib/restaurant-expenses'

/**
 * GET /api/restaurant/expenses/summary?businessId=
 * MBM-325: the signed-in user's own recorded purchases at a glance, for the
 * POS "Record Expense" button — items not yet fully paid and what is still
 * owed on them. hasAny = they have recorded anything (not voided) at all.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = request.nextUrl.searchParams.get('businessId')
    const denied = await checkRestaurantAccess(user, businessId)
    if (denied) return denied

    const mine = { businessId: businessId!, createdBy: user.id, voidedAt: null }
    const [open, anyRecorded] = await Promise.all([
      prisma.restaurantExpenseLines.findMany({
        where: { status: { in: OPEN_LINE_STATUSES }, transaction: mine },
        select: { amount: true, paidAmount: true },
      }),
      prisma.restaurantExpenseTransactions.findFirst({ where: mine, select: { id: true } }),
    ])
    const openOwed = open.reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.paidAmount)), 0)

    return NextResponse.json({
      success: true,
      data: { openItems: open.length, openOwed: Math.round(openOwed * 100) / 100, hasAny: !!anyRecorded },
    })
  } catch (error) {
    console.error('Error loading restaurant expense summary:', error)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
