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

    if (!businessId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'businessId, startDate and endDate are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    const dayRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

    // Fetch all completed sale order items for the business in the date range
    const orderItems = await prisma.businessOrderItems.findMany({
      where: {
        business_orders: {
          businessId,
          status: 'COMPLETED',
          orderType: 'SALE',
          transactionDate: { gte: start, lte: end },
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

    // Fetch all active inventory-tracked product variants for this business
    const variants = await prisma.businessProductVariants.findMany({
      where: {
        business_products: {
          businessId,
          isActive: true,
          isInventoryTracked: true,
        },
      },
      select: {
        id: true,
        variantName: true,
        sku: true,
        stockQuantity: true,
        price: true,
        costPrice: true,
        business_products: {
          select: {
            id: true,
            name: true,
            business_categories: { select: { name: true } },
          },
        },
      },
    })

    // Build result rows
    const rows = variants.map((variant) => {
      const totalUnitsSold = salesMap.get(variant.id) ?? 0
      const avgDailySales = totalUnitsSold / dayRange
      const currentStock = variant.stockQuantity ?? 0
      const daysOfStockLeft = avgDailySales > 0 ? currentStock / avgDailySales : null

      return {
        variantId: variant.id,
        productId: variant.business_products.id,
        productName: variant.business_products.name,
        variantName: variant.variantName ?? 'Default',
        sku: variant.sku ?? '',
        category: variant.business_products.business_categories?.name ?? 'Uncategorised',
        totalUnitsSold,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        currentStock,
        daysOfStockLeft: daysOfStockLeft !== null ? Math.round(daysOfStockLeft * 10) / 10 : null,
        costPrice: variant.costPrice ? parseFloat(variant.costPrice.toString()) : null,
        sellingPrice: variant.price ? parseFloat(variant.price.toString()) : null,
      }
    })

    // Sort by avgDailySales descending (fast movers first)
    rows.sort((a, b) => b.avgDailySales - a.avgDailySales)

    const totalUnitsSold = rows.reduce((s, r) => s + r.totalUnitsSold, 0)

    return NextResponse.json({
      success: true,
      dateRange: { startDate, endDate, days: dayRange },
      summary: {
        totalProducts: rows.length,
        totalUnitsSold,
        productsWithSales: rows.filter((r) => r.totalUnitsSold > 0).length,
        productsWithNoSales: rows.filter((r) => r.totalUnitsSold === 0).length,
      },
      data: rows,
    })
  } catch (error) {
    console.error('Stock velocity report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
