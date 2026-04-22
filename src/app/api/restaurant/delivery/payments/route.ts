import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET — delivery payment reconciliation report
// ?businessId=&date=YYYY-MM-DD (defaults to today)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const dateParam = searchParams.get('date')
    const date = dateParam ? new Date(dateParam) : new Date()
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999)

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        bo."orderNumber",
        dom."orderId",
        dom.status,
        dom."paymentMode",
        dom."paymentCollected",
        dom."paymentCollectedAt",
        dom."returnReason",
        dom."creditUsed",
        bc.name AS "customerName",
        bc.phone AS "customerPhone",
        bo."createdAt",
        COALESCE(
          (SELECT SUM(boi."totalPrice") FROM business_order_items boi WHERE boi."orderId" = bo.id),
          0
        ) AS "orderTotal"
      FROM delivery_order_meta dom
      JOIN business_orders bo ON bo.id = dom."orderId"
      LEFT JOIN business_customers bc ON bc.id = bo."customerId"
      WHERE bo."businessId" = ${businessId}
        AND bo."createdAt" >= ${startOfDay}
        AND bo."createdAt" <= ${endOfDay}
      ORDER BY bo."createdAt" DESC
    `

    const summary = {
      totalOrders: rows.length,
      delivered: rows.filter(r => r.status === 'DELIVERED').length,
      returned: rows.filter(r => r.status === 'RETURNED').length,
      pending: rows.filter(r => !['DELIVERED', 'RETURNED', 'CANCELLED'].includes(r.status)).length,
      totalDue: rows.filter(r => r.status === 'DELIVERED').reduce((s: number, r: any) => s + Math.max(0, Number(r.orderTotal) - Number(r.creditUsed || 0)), 0),
      totalCollected: rows.filter(r => r.status === 'DELIVERED' && r.paymentCollected != null).reduce((s: number, r: any) => s + Number(r.paymentCollected), 0),
      totalShortfall: 0,
      uncaptured: rows.filter(r => r.status === 'DELIVERED' && r.paymentCollected == null).length,
    }
    summary.totalShortfall = summary.totalDue - summary.totalCollected

    return NextResponse.json({ success: true, date: startOfDay.toISOString().split('T')[0], summary, rows })
  } catch (error) {
    console.error('Error in delivery payments report:', error)
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}
