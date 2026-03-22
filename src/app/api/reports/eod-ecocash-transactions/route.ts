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
    const date = searchParams.get('date') // YYYY-MM-DD

    if (!businessId || !date) {
      return NextResponse.json({ error: 'businessId and date are required' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
    }

    const dayStart = new Date(date + 'T00:00:00.000Z')
    const dayEnd = new Date(date + 'T23:59:59.999Z')

    const orders = await prisma.orders.findMany({
      where: {
        businessId,
        paymentMethod: 'ECOCASH',
        status: 'COMPLETED',
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: {
        id: true,
        total: true,
        attributes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const transactions = orders.map((order) => {
      const attrs = (order.attributes as any) || {}
      const grossAmount = Number(order.total)
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
