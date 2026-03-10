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

    // Generate dates from yesterday back LOOKBACK_DAYS days
    const pending: { date: string; dayOfWeek: string }[] = []
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    for (let i = 1; i <= LOOKBACK_DAYS; i++) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      if (!closedDates.has(dateStr)) {
        pending.push({ date: dateStr, dayOfWeek: DAY_NAMES[d.getUTCDay()] })
      }
    }

    return NextResponse.json({ data: pending })
  } catch (err) {
    console.error('[GET /api/eod/pending-days]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
