import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/eod/salesperson/all?businessId=&date=YYYY-MM-DD
 *
 * Manager view: returns all salesperson EOD records for a given business day.
 * Requires canCloseBooks permission.
 * Defaults date to today if not provided.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const dateParam = searchParams.get('date')

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const perms = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !perms.canCloseBooks) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    // Support both single date (legacy) and from/to range
    const fromDate = fromParam ? new Date(fromParam + 'T00:00:00') : (dateParam ? new Date(dateParam + 'T00:00:00') : new Date())
    fromDate.setHours(0, 0, 0, 0)
    const toDate = toParam ? new Date(toParam + 'T00:00:00') : new Date(fromDate)
    toDate.setHours(23, 59, 59, 999)

    const records = await prisma.salespersonEodReport.findMany({
      where: { businessId, reportDate: { gte: fromDate, lte: toDate } },
      include: {
        salesperson: { select: { id: true, name: true, email: true } },
        submittedBy: { select: { id: true, name: true } },
      },
      orderBy: { salesperson: { name: 'asc' } },
    })

    const totals = records.reduce(
      (acc, r) => {
        if (r.status !== 'PENDING') {
          acc.cashTotal += Number(r.cashAmount)
          acc.ecocashTotal += Number(r.ecocashAmount)
        }
        return acc
      },
      { cashTotal: 0, ecocashTotal: 0 }
    )

    const counts = {
      total: records.length,
      pending: records.filter(r => r.status === 'PENDING').length,
      submitted: records.filter(r => r.status === 'SUBMITTED').length,
      overridden: records.filter(r => r.status === 'OVERRIDDEN').length,
    }

    return NextResponse.json({ success: true, data: records, totals, counts })
  } catch (error: any) {
    console.error('[eod/salesperson/all GET]', error)
    return NextResponse.json({ error: 'Failed to fetch EOD records' }, { status: 500 })
  }
}
