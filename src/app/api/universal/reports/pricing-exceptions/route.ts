import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { getUnifiedProducts, type ProductRecord } from '@/lib/inventory/product-catalog-view'
import {
  detectSuspicious,
  grossMarginPct,
  unitProfitLoss,
  highestSeverity,
  DEFAULT_PRICING_EXCEPTION_CONFIG,
  type PricingExceptionConfig,
  type CategoryBenchmark,
} from '@/lib/inventory/pricing-math'
import { getSalesAggregates, getMovementAggregates } from '@/lib/inventory/product-activity'
import { getLatestPreviousPrices } from '@/lib/inventory/price-history'
import { getReviewStates } from '@/lib/inventory/exception-reviews'

/**
 * GET /api/universal/reports/pricing-exceptions
 *
 * MBM-296 §4 — Product Pricing, Cost & Value Exceptions Report. Supersedes
 * the narrower MBM-221 missing-cost-price report (that report's route stays
 * live, unmodified, in case anything still links to it directly).
 *
 * Scoped strictly to the single `businessId` passed in — no cross-business
 * or umbrella-wide aggregation, per MBM-296 plan §13 review answer #6.
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

    const search = searchParams.get('search') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const supplierId = searchParams.get('supplierId') || undefined
    const locationId = searchParams.get('locationId') || undefined
    const exceptionTypeFilter = searchParams.get('exceptionType')?.split(',').filter(Boolean) ?? []
    const posStatusFilter = searchParams.get('posAvailabilityStatus') || undefined
    const profitabilityFilter = searchParams.get('profitabilityStatus') || undefined // 'LOSS' | 'ZERO_MARGIN' | 'LOW_MARGIN' | 'HEALTHY'
    const minMarginPct = searchParams.get('minMarginPct') ? parseFloat(searchParams.get('minMarginPct')!) : undefined
    const maxMarginPct = searchParams.get('maxMarginPct') ? parseFloat(searchParams.get('maxMarginPct')!) : undefined
    const minLossAmount = searchParams.get('minLossAmount') ? parseFloat(searchParams.get('minLossAmount')!) : undefined
    const maxLossAmount = searchParams.get('maxLossAmount') ? parseFloat(searchParams.get('maxLossAmount')!) : undefined
    const stockedDateFrom = searchParams.get('stockedDateFrom')
    const stockedDateTo = searchParams.get('stockedDateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

    // Sales window for "qty sold in period" / "last sold" — default 30 days
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate') + 'T23:59:59') : new Date()
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate') + 'T00:00:00')
      : (() => { const d = new Date(endDate); d.setDate(d.getDate() - 30); return d })()

    const [settingsRow, products, sales, movements] = await Promise.all([
      prisma.pricingExceptionSettings.findUnique({ where: { businessId } }),
      getUnifiedProducts({ businessId, categoryId, supplierId, locationId, search }),
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

    // ─── Category benchmark: avg/median selling price + avg margin, only
    // over records with a valid cost AND selling price, strictly within
    // this business (no cross-business/umbrella aggregation). ────────────
    const benchmarkByCategory = new Map<string, { prices: number[]; margins: number[] }>()
    for (const p of products) {
      if (!p.categoryId || !p.sellingPrice || p.sellingPrice <= 0 || !p.costPrice || p.costPrice <= 0) continue
      const bucket = benchmarkByCategory.get(p.categoryId) ?? { prices: [], margins: [] }
      bucket.prices.push(p.sellingPrice)
      const margin = grossMarginPct(p.sellingPrice, p.costPrice)
      if (margin !== null) bucket.margins.push(margin)
      benchmarkByCategory.set(p.categoryId, bucket)
    }
    function median(nums: number[]): number | null {
      if (nums.length === 0) return null
      const sorted = [...nums].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    }
    const benchmarks = new Map<string, CategoryBenchmark>()
    for (const [catId, bucket] of benchmarkByCategory) {
      benchmarks.set(catId, {
        categoryId: catId,
        peerCount: bucket.prices.length,
        avgSellingPrice: bucket.prices.length ? bucket.prices.reduce((a, b) => a + b, 0) / bucket.prices.length : null,
        medianSellingPrice: median(bucket.prices),
        avgMarginPct: bucket.margins.length ? bucket.margins.reduce((a, b) => a + b, 0) / bucket.margins.length : null,
      })
    }

    // ─── Previous prices + review states, batched for all products ──────
    const refs = products.map(p => ({ catalogSource: p.catalogSource, productRefId: p.catalogSource === 'PRODUCT_VARIANT' ? p.id : p.productId }))
    const [previousPricesMap, reviewStates] = await Promise.all([
      getLatestPreviousPrices(businessId, refs),
      getReviewStates(businessId, refs),
    ])

    // ─── Build one row per product that has at least one detected exception ──
    function buildRow(p: ProductRecord & { productRefIdForHistory: string }) {
      const salesAgg = p.catalogSource === 'PRODUCT_VARIANT' ? sales.byVariantId.get(p.id) : sales.byBarcodeItemId.get(p.productId)
      const moveAgg = p.catalogSource === 'PRODUCT_VARIANT' ? movements.byVariantId.get(p.id) : movements.byBarcodeItemId.get(p.productId)
      const qtySoldInPeriod = salesAgg?.qtySold ?? 0
      const previous = previousPricesMap.get(`${p.catalogSource}:${p.productRefIdForHistory}`) ?? null

      const benchmark = p.categoryId ? benchmarks.get(p.categoryId) ?? null : null
      const flags = detectSuspicious(
        { sellingPrice: p.sellingPrice, costPrice: p.costPrice, quantityOnHand: p.quantityOnHand, quantitySoldInPeriod: qtySoldInPeriod, posAvailabilityStatus: p.posAvailabilityStatus },
        config,
        benchmark,
        previous
      )

      const unitPL = p.sellingPrice !== null && p.costPrice !== null ? unitProfitLoss(p.sellingPrice, p.costPrice) : null
      const marginPct = p.sellingPrice !== null && p.costPrice !== null ? grossMarginPct(p.sellingPrice, p.costPrice) : null
      const totalPotentialPL = unitPL !== null ? unitPL * Math.max(p.quantityOnHand, qtySoldInPeriod) : null

      return {
        id: p.id,
        catalogSource: p.catalogSource,
        productId: p.productId,
        name: p.variantName ? `${p.name} — ${p.variantName}` : p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.categoryName,
        brand: p.brandName,
        unitOfMeasure: p.unitOfMeasure,
        supplier: p.supplierName,
        location: p.locationName,
        quantityOnHand: p.quantityOnHand,
        quantitySoldInPeriod: qtySoldInPeriod,
        lastStockedDate: moveAgg?.lastStockedDate?.toISOString() ?? p.createdAt.toISOString(),
        lastSoldDate: salesAgg?.lastSaleDate?.toISOString() ?? null,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        previousCostPrice: previous?.previousCostPrice ?? null,
        previousSellingPrice: previous?.previousSellingPrice ?? null,
        unitProfitLoss: unitPL,
        totalPotentialProfitLoss: totalPotentialPL,
        grossMarginPct: marginPct,
        posAvailabilityStatus: p.posAvailabilityStatus,
        flags,
        severity: highestSeverity(flags),
        reviewStates: flags.map(f => ({ exceptionType: f.type, ...(reviewStates.get(`${p.catalogSource}:${p.productRefIdForHistory}:${f.type}`) ?? { status: 'OPEN', reason: null, notes: null, actedByUserId: null, actedAt: null, expiresAt: null }) })),
      }
    }

    let rows = products
      .map(p => ({ ...p, productRefIdForHistory: p.catalogSource === 'PRODUCT_VARIANT' ? p.id : p.productId }))
      .map(buildRow)
      .filter(r => r.flags.length > 0)

    // ─── Post-computation filters ─────────────────────────────────────────
    if (exceptionTypeFilter.length > 0) {
      rows = rows.filter(r => r.flags.some(f => exceptionTypeFilter.includes(f.type)))
    }
    if (posStatusFilter) {
      rows = rows.filter(r => r.posAvailabilityStatus === posStatusFilter)
    }
    if (profitabilityFilter) {
      rows = rows.filter(r => {
        if (r.grossMarginPct === null) return profitabilityFilter === 'UNKNOWN'
        if (profitabilityFilter === 'LOSS') return r.unitProfitLoss !== null && r.unitProfitLoss < 0
        if (profitabilityFilter === 'ZERO_MARGIN') return r.unitProfitLoss === 0
        if (profitabilityFilter === 'LOW_MARGIN') return r.grossMarginPct >= 0 && r.grossMarginPct < config.minimumMarginPct
        if (profitabilityFilter === 'HEALTHY') return r.grossMarginPct >= config.minimumMarginPct
        return true
      })
    }
    if (minMarginPct !== undefined) rows = rows.filter(r => r.grossMarginPct !== null && r.grossMarginPct >= minMarginPct)
    if (maxMarginPct !== undefined) rows = rows.filter(r => r.grossMarginPct !== null && r.grossMarginPct <= maxMarginPct)
    if (minLossAmount !== undefined) rows = rows.filter(r => r.totalPotentialProfitLoss !== null && Math.abs(Math.min(0, r.totalPotentialProfitLoss)) >= minLossAmount)
    if (maxLossAmount !== undefined) rows = rows.filter(r => r.totalPotentialProfitLoss !== null && Math.abs(Math.min(0, r.totalPotentialProfitLoss)) <= maxLossAmount)
    if (stockedDateFrom) rows = rows.filter(r => r.lastStockedDate >= stockedDateFrom)
    if (stockedDateTo) rows = rows.filter(r => r.lastStockedDate <= stockedDateTo + 'T23:59:59')

    // Sort: critical first, then by potential loss magnitude
    rows.sort((a, b) => {
      const sevOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const
      const aSev = a.severity ? sevOrder[a.severity] : 3
      const bSev = b.severity ? sevOrder[b.severity] : 3
      if (aSev !== bSev) return aSev - bSev
      return (a.totalPotentialProfitLoss ?? 0) - (b.totalPotentialProfitLoss ?? 0)
    })

    const summary = {
      totalExceptions: rows.length,
      criticalCount: rows.filter(r => r.severity === 'CRITICAL').length,
      warningCount: rows.filter(r => r.severity === 'WARNING').length,
      infoCount: rows.filter(r => r.severity === 'INFO').length,
      totalPotentialLoss: rows.reduce((sum, r) => sum + Math.abs(Math.min(0, r.totalPotentialProfitLoss ?? 0)), 0),
    }

    const total = rows.length
    const paged = rows.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      success: true,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      config,
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: paged,
    })
  } catch (error) {
    console.error('[pricing-exceptions GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
