import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { getUnifiedProducts } from '@/lib/inventory/product-catalog-view'
import { getSalesAggregates, getMovementAggregates } from '@/lib/inventory/product-activity'
import { detectSuspicious, unitProfitLoss, grossMarginPct, DEFAULT_PRICING_EXCEPTION_CONFIG, type PricingExceptionConfig } from '@/lib/inventory/pricing-math'

type Criterion =
  | 'NO_SALES'
  | 'LOW_SALES'
  | 'NEGATIVE_MARGIN'
  | 'ZERO_MARGIN'
  | 'BELOW_COST'
  | 'EXCESS_STOCK'
  | 'LONG_SINCE_LAST_SALE'
  | 'OLD_STOCK'
  | 'MISSING_PRICE_DATA'
  | 'SUSPICIOUS_PRICE'

/**
 * GET /api/universal/reports/poor-performers
 *
 * MBM-296 §9 — thin composition layer over the same data reports 1/2/4
 * already compute (product-catalog-view, product-activity, pricing-math) —
 * no independent aggregation logic of its own, by design, so a product
 * flagged here always agrees with what those reports already say about it.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })

    const canView = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', businessId)
    if (!canView) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate') + 'T23:59:59') : new Date()
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate') + 'T00:00:00')
      : (() => { const d = new Date(endDate); d.setDate(d.getDate() - 90); return d })()

    const lowSalesThreshold = parseInt(searchParams.get('lowSalesThreshold') ?? '5', 10)
    const excessStockDaysThreshold = parseInt(searchParams.get('excessStockDaysThreshold') ?? '180', 10)
    const longSinceLastSaleDays = parseInt(searchParams.get('longSinceLastSaleDays') ?? '90', 10)
    const oldStockDays = parseInt(searchParams.get('oldStockDays') ?? '180', 10)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

    const [settingsRow, products, sales, movements] = await Promise.all([
      prisma.pricingExceptionSettings.findUnique({ where: { businessId } }),
      getUnifiedProducts({ businessId }),
      getSalesAggregates(businessId, startDate, endDate),
      getMovementAggregates(businessId, startDate, endDate),
    ])

    const config: PricingExceptionConfig = settingsRow
      ? {
          minimumMarginPct: parseFloat(settingsRow.minimumMarginPct.toString()),
          priceChangeAlertPct: parseFloat(settingsRow.priceChangeAlertPct.toString()),
          decimalErrorMultiples: settingsRow.decimalErrorMultiples.map(d => parseFloat(d.toString())),
          benchmarkTolerancePct: parseFloat(settingsRow.benchmarkTolerancePct.toString()),
          highImpactThreshold: parseFloat(settingsRow.highImpactThreshold.toString()),
        }
      : DEFAULT_PRICING_EXCEPTION_CONFIG

    const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const now = Date.now()

    const rows = products.map(p => {
      const salesAgg = p.catalogSource === 'PRODUCT_VARIANT' ? sales.byVariantId.get(p.id) : sales.byBarcodeItemId.get(p.productId)
      const moveAgg = p.catalogSource === 'PRODUCT_VARIANT' ? movements.byVariantId.get(p.id) : movements.byBarcodeItemId.get(p.productId)
      const qtySoldInPeriod = salesAgg?.qtySold ?? 0
      const revenueInPeriod = salesAgg?.revenue ?? 0
      const avgDailySales = qtySoldInPeriod / periodDays
      const daysSinceLastSale = salesAgg?.lastSaleDate ? Math.floor((now - salesAgg.lastSaleDate.getTime()) / 86400000) : null
      const firstStocked = moveAgg?.firstStockedDate ?? p.createdAt
      const stockAgeDays = Math.floor((now - firstStocked.getTime()) / 86400000)

      const hasCost = p.costPrice !== null && p.costPrice > 0
      const hasSelling = p.sellingPrice !== null && p.sellingPrice > 0
      const unitPL = hasCost && hasSelling ? unitProfitLoss(p.sellingPrice!, p.costPrice!) : null
      const marginPct = hasCost && hasSelling ? grossMarginPct(p.sellingPrice!, p.costPrice!) : null
      const actualLossInPeriod = unitPL !== null && unitPL < 0 ? Math.abs(unitPL) * qtySoldInPeriod : 0
      const potentialLossOnHand = unitPL !== null && unitPL < 0 ? Math.abs(unitPL) * p.quantityOnHand : 0

      const suspiciousFlags = detectSuspicious(
        { sellingPrice: p.sellingPrice, costPrice: p.costPrice, quantityOnHand: p.quantityOnHand, quantitySoldInPeriod: qtySoldInPeriod, posAvailabilityStatus: p.posAvailabilityStatus },
        config
      )

      const criteria: Criterion[] = []
      if (qtySoldInPeriod === 0 && periodDays >= 14) criteria.push('NO_SALES')
      else if (qtySoldInPeriod > 0 && qtySoldInPeriod < lowSalesThreshold) criteria.push('LOW_SALES')
      if (unitPL !== null && unitPL < 0) criteria.push('BELOW_COST')
      else if (unitPL === 0) criteria.push('ZERO_MARGIN')
      else if (marginPct !== null && marginPct < 0) criteria.push('NEGATIVE_MARGIN')
      if (avgDailySales > 0 && p.quantityOnHand / avgDailySales > excessStockDaysThreshold) criteria.push('EXCESS_STOCK')
      if (daysSinceLastSale !== null && daysSinceLastSale > longSinceLastSaleDays) criteria.push('LONG_SINCE_LAST_SALE')
      if (stockAgeDays > oldStockDays && p.quantityOnHand > 0) criteria.push('OLD_STOCK')
      if (!hasCost || !hasSelling) criteria.push('MISSING_PRICE_DATA')
      if (suspiciousFlags.some(f => f.type === 'LIKELY_DECIMAL_ERROR' || f.type === 'BENCHMARK_MISMATCH')) criteria.push('SUSPICIOUS_PRICE')

      let suggestedAction = 'Review product setup'
      if (criteria.includes('MISSING_PRICE_DATA')) suggestedAction = !hasSelling ? 'Set selling price' : 'Set cost price'
      else if (criteria.includes('SUSPICIOUS_PRICE')) suggestedAction = 'Correct suspicious value'
      else if (criteria.includes('BELOW_COST')) suggestedAction = p.quantityOnHand > 0 ? 'Approve below-cost promotion' : 'Review price change'
      else if (criteria.includes('ZERO_MARGIN') || criteria.includes('NEGATIVE_MARGIN')) suggestedAction = 'Increase selling price'
      else if (criteria.includes('OLD_STOCK') && (criteria.includes('NO_SALES') || criteria.includes('LOW_SALES'))) suggestedAction = stockAgeDays > oldStockDays * 2 ? 'Discontinue product' : 'Consider clearance'
      else if (criteria.includes('EXCESS_STOCK')) suggestedAction = 'Reduce future purchases'
      else if (criteria.includes('LONG_SINCE_LAST_SALE') || criteria.includes('NO_SALES')) suggestedAction = 'Run promotion'

      return {
        id: p.id,
        catalogSource: p.catalogSource,
        productId: p.productId,
        name: p.variantName ? `${p.name} — ${p.variantName}` : p.name,
        sku: p.sku,
        category: p.categoryName,
        quantityOnHand: p.quantityOnHand,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        totalCostValue: hasCost ? p.quantityOnHand * p.costPrice! : 0,
        unvaluedQty: hasCost ? 0 : p.quantityOnHand,
        totalSellingValue: hasSelling ? p.quantityOnHand * p.sellingPrice! : 0,
        potentialLossOnHand,
        actualLossInPeriod,
        lastStockedDate: firstStocked.toISOString(),
        lastSoldDate: salesAgg?.lastSaleDate?.toISOString() ?? null,
        qtySoldInPeriod,
        revenueInPeriod,
        grossProfitLoss: unitPL !== null ? unitPL * qtySoldInPeriod : null,
        grossMarginPct: marginPct,
        stockAgeDays,
        criteria,
        severity: criteria.includes('BELOW_COST') || criteria.includes('MISSING_PRICE_DATA') ? 'CRITICAL' : criteria.length >= 2 ? 'WARNING' : 'INFO',
        suggestedAction,
      }
    }).filter(r => r.criteria.length > 0)

    rows.sort((a, b) => (b.potentialLossOnHand + b.actualLossInPeriod) - (a.potentialLossOnHand + a.actualLossInPeriod))

    const total = rows.length
    const paged = rows.slice((page - 1) * limit, page * limit)
    const summary = {
      totalFlagged: total,
      totalUnvaluedQty: rows.reduce((s, r) => s + r.unvaluedQty, 0),
      totalPotentialLoss: rows.reduce((s, r) => s + r.potentialLossOnHand, 0),
      totalActualLossInPeriod: rows.reduce((s, r) => s + r.actualLossInPeriod, 0),
      totalTiedUpCostValue: rows.reduce((s, r) => s + r.totalCostValue, 0),
    }

    return NextResponse.json({
      success: true,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: paged,
    })
  } catch (error) {
    console.error('[poor-performers GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
