import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/bogo-sales?businessId=xxx&startDate=xxx&endDate=xxx
 * BOGO sales report: transactions with BOGO items, items given free, revenue impact
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    // Find orders that contain BOGO Free items (identified by "(BOGO Free)" in item name)
    const ordersWithBogo = await prisma.businessOrders.findMany({
      where: {
        businessId,
        status: { not: 'CANCELLED' },
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        business_order_items: {
          some: {
            OR: [
              { itemName: { contains: 'BOGO Free' } },
              { attributes: { path: ['isBOGOFree'], equals: true } }
            ]
          }
        }
      },
      include: {
        business_order_items: true
      },
      orderBy: { createdAt: 'desc' }
    })

    let totalBogoTransactions = 0
    let totalFreeItems = 0
    let totalFreeItemValue = 0
    let totalOrderRevenue = 0

    // Per-bale BOGO breakdown
    const baleBogoMap: Record<string, { baleId: string; name: string; freeItems: number; estimatedValue: number; transactions: number }> = {}

    const transactions = ordersWithBogo.map((order: any) => {
      const bogoItems = order.business_order_items.filter(
        (i: any) => i.itemName?.includes('BOGO Free') || i.attributes?.isBOGOFree
      )
      const paidItems = order.business_order_items.filter(
        (i: any) => !i.itemName?.includes('BOGO Free') && !i.attributes?.isBOGOFree
      )

      const freeItemCount = bogoItems.reduce((sum: number, i: any) => sum + i.quantity, 0)
      const avgPaidPrice = paidItems.length > 0
        ? paidItems.reduce((sum: number, i: any) => sum + Number(i.unitPrice), 0) / paidItems.length
        : 0
      const estimatedFreeValue = freeItemCount * avgPaidPrice

      totalBogoTransactions++
      totalFreeItems += freeItemCount
      totalFreeItemValue += estimatedFreeValue
      totalOrderRevenue += Number(order.totalAmount)

      // Track per-bale BOGO stats
      for (const item of bogoItems) {
        const baleId = item.attributes?.baleId
        if (baleId) {
          if (!baleBogoMap[baleId]) {
            baleBogoMap[baleId] = {
              baleId,
              name: item.attributes?.productName || item.itemName || 'Unknown Bale',
              freeItems: 0,
              estimatedValue: 0,
              transactions: 0
            }
          }
          baleBogoMap[baleId].freeItems += item.quantity
          baleBogoMap[baleId].estimatedValue += item.quantity * avgPaidPrice
          baleBogoMap[baleId].transactions++
        }
      }

      return {
        orderNumber: order.orderNumber,
        date: order.createdAt,
        orderTotal: Number(order.totalAmount),
        freeItemCount,
        estimatedFreeValue: Math.round(estimatedFreeValue * 100) / 100,
        items: order.business_order_items.map((i: any) => ({
          name: i.itemName || i.attributes?.productName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
          isFree: i.itemName?.includes('BOGO Free') || i.attributes?.isBOGOFree || false,
          baleId: i.attributes?.baleId || null
        }))
      }
    })

    // Build per-bale breakdown sorted by free items descending
    const byBale = Object.values(baleBogoMap)
      .map(b => ({ ...b, estimatedValue: Math.round(b.estimatedValue * 100) / 100 }))
      .sort((a, b) => b.freeItems - a.freeItems)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBogoTransactions,
          totalFreeItems,
          estimatedFreeItemValue: Math.round(totalFreeItemValue * 100) / 100,
          totalOrderRevenue: Math.round(totalOrderRevenue * 100) / 100
        },
        byBale,
        transactions
      }
    })
  } catch (error) {
    console.error('BOGO sales report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
