import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/bale-cost-recovery?businessId=xxx
 *
 * For each bale that has a costPrice recorded, shows:
 *  - cost paid, revenue earned, profit/loss, % cost recovered
 *  - whether cost is fully recovered, partially recovered, or not yet started
 *  - a recommendation: Transfer (cost recovered), Continue (partial), Review (no sales)
 *
 * Only bales WITH a costPrice are included – bales without a cost are excluded.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    // Only bales that have costPrice set
    const bales = await prisma.clothingBales.findMany({
      where: { businessId, costPrice: { not: null } },
      include: {
        category: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (bales.length === 0) {
      return NextResponse.json({
        success: true,
        data: { summary: { totalBales: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0, overallRecoveryPct: 0, fullyRecovered: 0, partiallyRecovered: 0, notStarted: 0 }, bales: [] }
      })
    }

    // Sales data from orders
    const orders = await prisma.businessOrders.findMany({
      where: { businessId, status: { not: 'CANCELLED' } },
      include: { business_order_items: true },
    })

    const salesMap: Record<string, { totalSold: number; totalRevenue: number; bogoFreeGiven: number }> = {}
    for (const order of orders) {
      for (const item of order.business_order_items) {
        const attrs = item.attributes as any
        if (!attrs?.baleId) continue
        const bid = attrs.baleId
        if (!salesMap[bid]) salesMap[bid] = { totalSold: 0, totalRevenue: 0, bogoFreeGiven: 0 }
        if (attrs.isBOGOFree) {
          salesMap[bid].bogoFreeGiven += item.quantity
        } else {
          salesMap[bid].totalSold += item.quantity
          salesMap[bid].totalRevenue += Number(item.totalPrice)
        }
      }
    }

    // Transfer data
    const transferItems = await prisma.inventoryTransferItems.findMany({
      where: {
        baleId: { not: null },
        transfer: { sourceBusinessId: businessId, status: 'COMPLETED' },
      },
      select: { baleId: true, quantity: true },
    })
    const transferMap: Record<string, number> = {}
    for (const ti of transferItems) {
      if (ti.baleId) transferMap[ti.baleId] = (transferMap[ti.baleId] || 0) + ti.quantity
    }

    let totalCost = 0
    let totalRevenue = 0
    let fullyRecovered = 0
    let partiallyRecovered = 0
    let notStarted = 0

    const baleDetails = bales.map((bale: any) => {
      const sales = salesMap[bale.id] || { totalSold: 0, totalRevenue: 0, bogoFreeGiven: 0 }
      const transferred = transferMap[bale.id] || 0
      const cost = Number(bale.costPrice)
      const revenue = Math.round(sales.totalRevenue * 100) / 100
      const profit = Math.round((revenue - cost) * 100) / 100
      const recoveryPct = cost > 0 ? Math.round((revenue / cost) * 100) : 0

      totalCost += cost
      totalRevenue += revenue

      let status: 'recovered' | 'partial' | 'none'
      let recommendation: string
      if (recoveryPct >= 100) {
        status = 'recovered'
        recommendation = bale.remainingCount > 0 ? 'Consider Transfer — cost recovered, remaining stock can move' : 'End of Sale — fully recovered, no stock remaining'
        fullyRecovered++
      } else if (sales.totalSold > 0) {
        status = 'partial'
        const stillNeeded = Math.round((cost - revenue) * 100) / 100
        recommendation = `Continue selling — $${stillNeeded.toFixed(2)} more needed to recover cost`
        partiallyRecovered++
      } else {
        status = 'none'
        recommendation = 'No sales yet — review pricing or placement'
        notStarted++
      }

      const employeeName = bale.employee
        ? `${bale.employee.firstName} ${bale.employee.lastName}`
        : null

      return {
        id: bale.id,
        batchNumber: bale.batchNumber,
        category: bale.category?.name || 'Unknown',
        sku: bale.sku,
        itemCount: bale.itemCount,
        remainingCount: bale.remainingCount,
        unitPrice: Number(bale.unitPrice),
        costPrice: cost,
        isActive: bale.isActive,
        createdAt: bale.createdAt,
        stockedBy: employeeName,
        sold: sales.totalSold,
        bogoFreeGiven: sales.bogoFreeGiven,
        transferred,
        revenue,
        profit,
        recoveryPct,
        status,
        recommendation,
      }
    })

    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100
    const overallRecoveryPct = totalCost > 0 ? Math.round((totalRevenue / totalCost) * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBales: bales.length,
          totalCost: Math.round(totalCost * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit,
          overallRecoveryPct,
          fullyRecovered,
          partiallyRecovered,
          notStarted,
        },
        bales: baleDetails,
      },
    })
  } catch (error) {
    console.error('Bale cost-recovery report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
