import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { getUnifiedProducts } from '@/lib/inventory/product-catalog-view'
import { getSalesAggregates } from '@/lib/inventory/product-activity'
import { grossMarginPct, unitProfitLoss } from '@/lib/inventory/pricing-math'

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

    // MBM-296: previously this report only ever queried ProductVariants,
    // silently omitting every grocery/clothing/hardware business whose
    // inventory lives in BarcodeInventoryItems instead (see MBM-296 plan
    // §2.1 — the two-catalog problem). Both are now included via the shared
    // unified-catalog helper, the same one every other MBM-296 report uses.
    const [products, sales] = await Promise.all([
      getUnifiedProducts({ businessId }),
      getSalesAggregates(businessId, start, end),
    ])

    const rows = products.map((p) => {
      const salesAgg = p.catalogSource === 'PRODUCT_VARIANT' ? sales.byVariantId.get(p.id) : sales.byBarcodeItemId.get(p.productId)
      const totalUnitsSold = salesAgg?.qtySold ?? 0
      const revenue = salesAgg?.revenue ?? 0
      const transactionCount = salesAgg?.transactionCount ?? 0
      const avgDailySales = totalUnitsSold / dayRange
      const daysOfStockLeft = avgDailySales > 0 ? p.quantityOnHand / avgDailySales : null
      const daysSinceLastSale = salesAgg?.lastSaleDate ? Math.floor((Date.now() - salesAgg.lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)) : null

      const hasCost = p.costPrice !== null && p.costPrice > 0
      const hasSelling = p.sellingPrice !== null && p.sellingPrice > 0
      // MBM-296: COGS/gross-profit here use TODAY's cost price, not the cost
      // at the time of each historical sale — no snapshot exists on any
      // order-item table (see MBM-296 plan §2.3). This is an approximation
      // whenever cost has changed since a sale in this window.
      const costOfGoodsSold = hasCost ? totalUnitsSold * p.costPrice! : null
      const grossProfit = costOfGoodsSold !== null ? revenue - costOfGoodsSold : null
      const grossMargin = hasSelling && hasCost ? grossMarginPct(p.sellingPrice!, p.costPrice!) : null
      // Simple turnover proxy: units sold ÷ current stock on hand (a true
      // average-inventory turnover ratio would need a stock snapshot at the
      // start of the period, which isn't tracked — this is a lighter-weight
      // stand-in the report labels as such).
      const turnoverRatio = p.quantityOnHand > 0 ? Math.round((totalUnitsSold / p.quantityOnHand) * 100) / 100 : null

      return {
        // `variantId` is kept as the primary id field name for backward
        // compatibility with the existing grocery/reports/stock-velocity
        // page (fast/slow-mover quick view) — it's really "this catalog
        // row's id" for both catalogs, not literally always a variant.
        id: p.id,
        variantId: p.id,
        catalogSource: p.catalogSource,
        productId: p.productId,
        productName: p.name,
        variantName: p.variantName ?? 'Default',
        sku: p.sku ?? '',
        category: p.categoryName ?? 'Uncategorised',
        totalUnitsSold,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        costOfGoodsSold: costOfGoodsSold !== null ? Math.round(costOfGoodsSold * 100) / 100 : null,
        grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
        grossMarginPct: grossMargin,
        transactionCount,
        currentStock: p.quantityOnHand,
        daysOfStockLeft: daysOfStockLeft !== null ? Math.round(daysOfStockLeft * 10) / 10 : null,
        turnoverRatio,
        lastSaleDate: salesAgg?.lastSaleDate?.toISOString() ?? null,
        daysSinceLastSale,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        posAvailabilityStatus: p.posAvailabilityStatus,
        pricingDataReliable: hasCost && hasSelling,
      }
    })

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
        totalRevenue: Math.round(rows.reduce((s, r) => s + r.revenue, 0) * 100) / 100,
        totalGrossProfit: Math.round(rows.reduce((s, r) => s + (r.grossProfit ?? 0), 0) * 100) / 100,
      },
      data: rows,
    })
  } catch (error) {
    console.error('Stock velocity report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
