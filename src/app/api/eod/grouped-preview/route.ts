import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/eod/grouped-preview
 * Given a list of dates, returns sales totals per date.
 * Used by the grouped EOD catch-up wizard (Step 2 — preview).
 *
 * Body: { businessId: string, dates: string[] }  // dates: "YYYY-MM-DD"
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, dates } = body

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'dates must be a non-empty array of YYYY-MM-DD strings' }, { status: 400 })
    }

    const permissions = getEffectivePermissions(user, businessId)
    const canAccess =
      user.role === 'admin' ||
      permissions.canMakeExpenseDeposits ||
      permissions.canManageBusinessSettings

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true },
    })
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Query sales for each date in parallel
    const data = await Promise.all(
      (dates as string[]).map(async (dateStr: string) => {
        const dayStart = new Date(dateStr + 'T00:00:00Z')
        const dayEnd = new Date(dateStr + 'T23:59:59.999Z')

        const salesResult = await prisma.businessOrders.aggregate({
          where: {
            businessId,
            status: 'COMPLETED',
            OR: [
              { transactionDate: { gte: dayStart, lte: dayEnd } },
              { transactionDate: null, createdAt: { gte: dayStart, lte: dayEnd } },
            ],
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        })

        return {
          date: dateStr,
          totalSales: Number(salesResult._sum.totalAmount ?? 0),
          orderCount: salesResult._count.id,
        }
      })
    )

    // Return sorted oldest → newest so the wizard renders chronologically
    data.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[POST /api/eod/grouped-preview]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
