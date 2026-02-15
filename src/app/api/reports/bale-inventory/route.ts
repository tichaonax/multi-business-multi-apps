import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/reports/bale-inventory?businessId=xxx
 * Bale inventory report: stock levels per bale, sales velocity, BOGO impact
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    // Fetch all bales for this business (active and inactive)
    const bales = await prisma.clothingBales.findMany({
      where: { businessId },
      include: {
        category: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate sales data from order items with baleId in attributes
    // We look at completed orders for this business
    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId,
        status: { not: 'CANCELLED' }
      },
      include: {
        business_order_items: true
      }
    })

    // Build sales map: baleId -> { totalSold, totalRevenue, bogoFreeGiven }
    const salesMap: Record<string, { totalSold: number; totalRevenue: number; bogoFreeGiven: number }> = {}

    for (const order of orders) {
      for (const item of order.business_order_items) {
        const attrs = item.attributes as any
        if (!attrs?.baleId) continue

        const baleId = attrs.baleId
        if (!salesMap[baleId]) {
          salesMap[baleId] = { totalSold: 0, totalRevenue: 0, bogoFreeGiven: 0 }
        }

        if (attrs.isBOGOFree) {
          salesMap[baleId].bogoFreeGiven += item.quantity
        } else {
          salesMap[baleId].totalSold += item.quantity
          salesMap[baleId].totalRevenue += Number(item.totalPrice)
        }
      }
    }

    // Build transfer data: baleId -> { totalTransferred }
    const transferItems = await prisma.inventoryTransferItems.findMany({
      where: {
        baleId: { not: null },
        transfer: {
          sourceBusinessId: businessId,
          status: 'COMPLETED'
        }
      },
      select: { baleId: true, quantity: true }
    })

    const transferMap: Record<string, number> = {}
    for (const ti of transferItems) {
      if (ti.baleId) {
        transferMap[ti.baleId] = (transferMap[ti.baleId] || 0) + ti.quantity
      }
    }

    // Summary stats
    let totalBales = bales.length
    let activeBales = 0
    let totalItems = 0
    let totalRemaining = 0
    let totalSold = 0
    let totalRevenue = 0
    let totalBogoFree = 0
    let totalTransferred = 0

    const baleDetails = bales.map((bale: any) => {
      const sales = salesMap[bale.id] || { totalSold: 0, totalRevenue: 0, bogoFreeGiven: 0 }
      const transferred = transferMap[bale.id] || 0

      if (bale.isActive) activeBales++
      totalItems += bale.itemCount
      totalRemaining += bale.remainingCount
      totalSold += sales.totalSold
      totalRevenue += sales.totalRevenue
      totalBogoFree += sales.bogoFreeGiven
      totalTransferred += transferred

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
        bogoActive: bale.bogoActive,
        bogoRatio: bale.bogoRatio,
        isActive: bale.isActive,
        createdAt: bale.createdAt,
        stockedBy: employeeName,
        sold: sales.totalSold,
        revenue: Math.round(sales.totalRevenue * 100) / 100,
        bogoFreeGiven: sales.bogoFreeGiven,
        transferred,
        utilizationPct: bale.itemCount > 0
          ? Math.round(((bale.itemCount - bale.remainingCount) / bale.itemCount) * 100)
          : 0
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBales,
          activeBales,
          totalItems,
          totalRemaining,
          totalSold,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalBogoFree,
          totalTransferred
        },
        bales: baleDetails
      }
    })
  } catch (error) {
    console.error('Bale inventory report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
