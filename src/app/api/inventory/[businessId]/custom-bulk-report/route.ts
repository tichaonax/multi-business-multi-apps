import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type RouteContext = { params: Promise<{ businessId: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')
    const itemId = searchParams.get('itemId')

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const fromDate = new Date(fromStr + 'T00:00:00.000Z')
    const toDate = new Date(toStr + 'T23:59:59.999Z')

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    if (user.role?.toLowerCase() !== 'admin') {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
      })
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch custom bulk products for the business (optionally filtered to one item)
    const products = await prisma.customBulkProducts.findMany({
      where: { businessId, ...(itemId ? { id: itemId } : {}) },
      select: {
        id: true,
        name: true,
        batchNumber: true,
        sku: true,
        itemCount: true,
        remainingCount: true,
        unitPrice: true,
        isActive: true,
        createdAt: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        period: { from: fromStr, to: toStr },
        items: [],
        summary: { totalProducts: 0, totalUnitsSold: 0, totalRevenue: 0 },
      })
    }

    const productIds = products.map(p => p.id)

    // Query sales from BusinessOrderItems grouped by product + day
    type SaleRow = { bulk_id: string; sale_date: string; qty_sold: bigint; revenue: number }
    const salesRows = await prisma.$queryRaw<SaleRow[]>`
      SELECT
        (boi.attributes->>'customBulkId') AS bulk_id,
        TO_CHAR(bo.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS sale_date,
        SUM(boi.quantity)::bigint AS qty_sold,
        SUM(boi.total_price)::float AS revenue
      FROM business_order_items boi
      JOIN business_orders bo ON boi.business_order_id = bo.id
      WHERE bo.business_id = ${businessId}
        AND bo.created_at >= ${fromDate}
        AND bo.created_at <= ${toDate}
        AND bo.status NOT IN ('CANCELLED', 'REFUNDED')
        AND (boi.attributes->>'customBulkId') = ANY(${productIds})
      GROUP BY bulk_id, sale_date
      ORDER BY bulk_id, sale_date
    `

    // Build a map: productId → { days: { date → { qtySold, revenue } } }
    const salesMap: Record<string, Record<string, { qtySold: number; revenue: number }>> = {}
    for (const row of salesRows) {
      if (!salesMap[row.bulk_id]) salesMap[row.bulk_id] = {}
      salesMap[row.bulk_id][row.sale_date] = {
        qtySold: Number(row.qty_sold),
        revenue: Number(row.revenue),
      }
    }

    const items = products.map(p => {
      const dayMap = salesMap[p.id] ?? {}
      const days = Object.entries(dayMap)
        .map(([date, d]) => ({ date, qtySold: d.qtySold, revenue: d.revenue }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const totalSold = days.reduce((s, d) => s + d.qtySold, 0)
      const totalRevenue = days.reduce((s, d) => s + d.revenue, 0)

      return {
        id: p.id,
        name: p.name,
        batchNumber: p.batchNumber,
        sku: p.sku,
        category: p.category?.name ?? null,
        itemCount: p.itemCount,
        remainingCount: p.remainingCount,
        unitPrice: Number(p.unitPrice),
        isActive: p.isActive,
        totalSold,
        totalRevenue,
        days,
      }
    })

    const summary = {
      totalProducts: items.length,
      totalUnitsSold: items.reduce((s, i) => s + i.totalSold, 0),
      totalRevenue: items.reduce((s, i) => s + i.totalRevenue, 0),
    }

    return NextResponse.json({ success: true, period: { from: fromStr, to: toStr }, items, summary })
  } catch (error) {
    console.error('Custom bulk report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
