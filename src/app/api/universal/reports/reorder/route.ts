import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    // How many days of stock left triggers a reorder suggestion (default 7)
    const reorderThresholdDays = parseInt(searchParams.get('reorderThresholdDays') ?? '7', 10)
    // How many days of stock to aim for when suggesting order quantity (default 30)
    const targetStockDays = parseInt(searchParams.get('targetStockDays') ?? '30', 10)

    if (!businessId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'businessId, startDate and endDate are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    const dayRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

    // Fetch completed sale order items in date range
    const orderItems = await prisma.businessOrderItems.findMany({
      where: {
        business_orders: {
          businessId,
          status: 'COMPLETED',
          orderType: 'SALE',
          OR: [
            { transactionDate: { gte: start, lte: end } },
            { transactionDate: null, createdAt: { gte: start, lte: end } },
          ],
        },
      },
      select: {
        productVariantId: true,
        quantity: true,
      },
    })

    // Aggregate units sold per variant
    const salesMap = new Map<string, number>()
    for (const item of orderItems) {
      if (!item.productVariantId) continue
      salesMap.set(item.productVariantId, (salesMap.get(item.productVariantId) ?? 0) + item.quantity)
    }

    // Fetch all active variants for this business
    const variants = await prisma.productVariants.findMany({
      where: {
        business_products: {
          businessId,
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        reorderLevel: true,
        price: true,
        business_products: {
          select: {
            id: true,
            name: true,
            costPrice: true,
            business_categories: { select: { name: true } },
          },
        },
      },
    })

    // Build reorder rows — include items that need reordering
    const rows = []
    for (const variant of variants) {
      const totalUnitsSold = salesMap.get(variant.id) ?? 0
      const currentStock = variant.stockQuantity ?? 0
      const reorderLevel = variant.reorderLevel ?? 0

      const avgDailySales = totalUnitsSold / dayRange
      const daysOfStockLeft = avgDailySales > 0 ? currentStock / avgDailySales : null

      // Determine if this item needs reordering via velocity OR explicit reorder level
      const belowReorderLevel = reorderLevel > 0 && currentStock <= reorderLevel
      const belowVelocityThreshold = daysOfStockLeft !== null && daysOfStockLeft <= reorderThresholdDays

      if (!belowVelocityThreshold && !belowReorderLevel) continue

      // Suggested qty: velocity-based if we have sales, reorder-level-based fallback
      let suggestedReorderQty: number
      let daysOfStockLeftForDisplay: number
      if (avgDailySales > 0) {
        suggestedReorderQty = Math.max(0, Math.ceil(avgDailySales * targetStockDays) - currentStock)
        daysOfStockLeftForDisplay = daysOfStockLeft ?? 0
      } else {
        // No sales data — suggest enough to reach reorderLevel * 2 as a rough target
        suggestedReorderQty = Math.max(0, reorderLevel * 2 - currentStock)
        daysOfStockLeftForDisplay = 0
      }

      const costPrice = variant.business_products.costPrice ? parseFloat(variant.business_products.costPrice.toString()) : null
      const estimatedCost = costPrice !== null ? Math.round(suggestedReorderQty * costPrice * 100) / 100 : null

      const urgency: 'critical' | 'low' =
        currentStock === 0 || daysOfStockLeftForDisplay < 3 ? 'critical' : 'low'

      rows.push({
        variantId: variant.id,
        productId: variant.business_products.id,
        productName: variant.business_products.name,
        variantName: variant.name ?? 'Default',
        sku: variant.sku ?? '',
        category: variant.business_products.business_categories?.name ?? 'Uncategorised',
        currentStock,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        daysOfStockLeft: Math.round(daysOfStockLeftForDisplay * 10) / 10,
        urgency,
        suggestedReorderQty,
        costPrice,
        sellingPrice: variant.price ? parseFloat(variant.price.toString()) : null,
        estimatedCost,
      })
    }

    // Sort: critical first, then by daysOfStockLeft ascending
    rows.sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency === 'critical' ? -1 : 1
      return a.daysOfStockLeft - b.daysOfStockLeft
    })

    const criticalCount = rows.filter((r) => r.urgency === 'critical').length
    const estimatedTotalCost = rows.reduce((s, r) => s + (r.estimatedCost ?? 0), 0)

    return NextResponse.json({
      success: true,
      dateRange: { startDate, endDate, days: dayRange },
      config: { reorderThresholdDays, targetStockDays },
      summary: {
        itemsNeedingReorder: rows.length,
        criticalItems: criticalCount,
        lowItems: rows.length - criticalCount,
        estimatedReorderCost: Math.round(estimatedTotalCost * 100) / 100,
      },
      data: rows,
    })
  } catch (error) {
    console.error('Reorder report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
