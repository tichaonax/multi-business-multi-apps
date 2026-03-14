import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const LOOKBACK_DAYS = 60

/**
 * GET /api/eod/pending-days?businessId=xxx
 * Returns calendar dates (up to 60 days back, excluding today) that have no
 * locked END_OF_DAY SavedReports for the given business.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = request.nextUrl.searchParams.get('businessId')
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const permissions = getEffectivePermissions(user, businessId)
    const canAccess =
      user.role === 'admin' ||
      permissions.canMakeExpenseDeposits ||
      permissions.canManageBusinessSettings

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all locked EOD reports for this business to build the "already closed" set
    const lockedReports = await prisma.savedReports.findMany({
      where: {
        businessId,
        reportType: 'END_OF_DAY',
        isLocked: true,
      },
      select: { reportDate: true },
    })

    // Build a Set of closed date strings "YYYY-MM-DD"
    const closedDates = new Set(
      lockedReports.map((r: { reportDate: Date }) => r.reportDate.toISOString().slice(0, 10))
    )

    // Generate candidate dates from yesterday back LOOKBACK_DAYS days
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const candidateDates: { date: string; dayOfWeek: string; start: Date; end: Date }[] = []
    for (let i = 1; i <= LOOKBACK_DAYS; i++) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      if (!closedDates.has(dateStr)) {
        const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
        const dayEnd   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0))
        candidateDates.push({ date: dateStr, dayOfWeek: DAY_NAMES[d.getUTCDay()], start: dayStart, end: dayEnd })
      }
    }

    // Check if business has any active deduction configs (rent or auto-deposits).
    // If none exist, days with no orders have nothing to process and should be excluded.
    const [rentConfig, autoDepositCount] = await Promise.all([
      prisma.businessRentConfig.findUnique({ where: { businessId }, select: { isActive: true } }),
      prisma.expenseAccountAutoDeposit.count({ where: { businessId, isActive: true } }),
    ])
    const hasActiveConfigs = (rentConfig?.isActive === true) || autoDepositCount > 0

    let pending: { date: string; dayOfWeek: string }[]

    if (hasActiveConfigs) {
      // Business has deduction configs — all unclosed days need processing
      pending = candidateDates.map(({ date, dayOfWeek }) => ({ date, dayOfWeek }))
    } else {
      // No deduction configs — only include days that had actual orders (one bulk query)
      if (candidateDates.length === 0) {
        pending = []
      } else {
        const windowStart = candidateDates[candidateDates.length - 1].start
        const windowEnd   = candidateDates[0].end
        const ordersInWindow = await prisma.orders.findMany({
          where: {
            businessId,
            createdAt: { gte: windowStart, lt: windowEnd },
          },
          select: { createdAt: true },
        })
        // Build a Set of dates that have at least one order
        const datesWithOrders = new Set<string>()
        for (const o of ordersInWindow) {
          datesWithOrders.add(o.createdAt.toISOString().slice(0, 10))
        }
        pending = candidateDates
          .filter(({ start }) => datesWithOrders.has(start.toISOString().slice(0, 10)))
          .map(({ date, dayOfWeek }) => ({ date, dayOfWeek }))
      }
    }

    return NextResponse.json({ data: pending })
  } catch (err) {
    console.error('[GET /api/eod/pending-days]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
