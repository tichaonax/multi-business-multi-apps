import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/eod-ecocash-transactions?businessId=&date=YYYY-MM-DD
 *
 * Returns individual EcoCash orders for a given business day so the manager
 * can verify each transaction code against their phone and check them off.
 *
 * Response: { transactions: [{ orderId, transactionCode, grossAmount, feeAmount, netAmount, createdAt }] }
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const date = searchParams.get('date') // YYYY-MM-DD (fallback)
    const startParam = searchParams.get('start') // ISO timestamp (preferred)
    const endParam = searchParams.get('end')     // ISO timestamp (preferred)

    if (!businessId || (!date && (!startParam || !endParam))) {
      return NextResponse.json({ error: 'businessId and date (or start+end) are required' }, { status: 400 })
    }

    // Use timezone-correct start/end if provided, otherwise fall back to UTC date boundaries
    const dayStart = startParam ? new Date(startParam) : new Date(date + 'T00:00:00.000Z')
    const dayEnd   = endParam   ? new Date(endParam)   : new Date(date + 'T23:59:59.999Z')

    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId,
        paymentMethod: 'ECOCASH',
        paymentStatus: 'PAID',
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: {
        id: true,
        totalAmount: true,
        attributes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const transactions = orders.map((order) => {
      const attrs = (order.attributes as any) || {}
      const grossAmount = Number(order.totalAmount)
      const feeAmount = Number(attrs.ecocashFeeAmount ?? 0)
      return {
        orderId: order.id,
        transactionCode: (attrs.ecocashTransactionCode as string) || null,
        grossAmount,
        feeAmount,
        netAmount: grossAmount - feeAmount,
        createdAt: order.createdAt,
      }
    })

    return NextResponse.json({ transactions })
  } catch (err) {
    console.error('[GET /api/reports/eod-ecocash-transactions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
