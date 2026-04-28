import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/eod/salesperson/ecocash-for-date?businessId=&date=YYYY-MM-DD
 *
 * Returns EcoCash total for the business on a specific calendar day
 * (midnight → midnight local). Used by the catchup form in EOD history.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const dateParam = searchParams.get('date')

    if (!businessId || !dateParam) {
      return NextResponse.json({ error: 'businessId and date are required' }, { status: 400 })
    }

    const dayStart = new Date(dateParam + 'T00:00:00')
    const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const agg = await prisma.businessOrders.aggregate({
      _sum: { totalAmount: true },
      where: {
        businessId,
        paymentMethod: 'ECOCASH',
        paymentStatus: 'PAID',
        status: { not: 'CANCELLED' },
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    })

    return NextResponse.json({
      success: true,
      ecocashAmount: Number(agg._sum.totalAmount ?? 0),
    })
  } catch (error: any) {
    console.error('[eod/salesperson/ecocash-for-date]', error)
    return NextResponse.json({ error: 'Failed to fetch EcoCash total' }, { status: 500 })
  }
}
