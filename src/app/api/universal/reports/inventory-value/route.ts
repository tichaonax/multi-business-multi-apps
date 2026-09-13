import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { getUnifiedProducts } from '@/lib/inventory/product-catalog-view'
import { getMovementAggregates } from '@/lib/inventory/product-activity'
import { unitProfitLoss } from '@/lib/inventory/pricing-math'

/**
 * GET /api/universal/reports/inventory-value
 *
 * MBM-296 §6 — item- and total-level inventory valuation, split into
 * recently-stocked / existing / combined using the unified stock-movement
 * ledger (MBM-193). Scoped strictly to the single `businessId` passed in.
 *
 * "Recently stocked" quantity/value is only as accurate as movement history
 * — items stocked before MBM-193's instrumentation, or via a path that
 * doesn't write a movement row, fall entirely into "existing" even if they
 * were actually received inside the selected window. This is a known gap,
 * not a bug: there is no other source of truth for "when was this received."
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

    const categoryId = searchParams.get('categoryId') || undefined
    const supplierId = searchParams.get('supplierId') || undefined
    const locationId = searchParams.get('locationId') || undefined
    const search = searchParams.get('search') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate') + 'T23:59:59') : new Date()
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate') + 'T00:00:00')
      : (() => { const d = new Date(endDate); d.setDate(d.getDate() - 30); return d })()

    const [products, movements, business] = await Promise.all([
      getUnifiedProducts({ businessId, categoryId, supplierId, locationId, search }),
      getMovementAggregates(businessId, startDate, endDate),
      prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } }),
    ])

    const rows = products.map(p => {
      const moveAgg = p.catalogSource === 'PRODUCT_VARIANT' ? movements.byVariantId.get(p.id) : movements.byBarcodeItemId.get(p.productId)
      const hasCost = p.costPrice !== null && p.costPrice > 0
      const hasSelling = p.sellingPrice !== null && p.sellingPrice > 0

      const totalCostValue = hasCost ? p.quantityOnHand * p.costPrice! : 0
      const unvaluedQty = hasCost ? 0 : p.quantityOnHand
      const totalSellingValue = hasSelling ? p.quantityOnHand * p.sellingPrice! : 0
      const isUnsellable = p.posAvailabilityStatus !== 'AVAILABLE'

      const isLoss = hasCost && hasSelling && p.sellingPrice! < p.costPrice!
      const potentialLossOnHand = isLoss ? Math.abs(unitProfitLoss(p.sellingPrice!, p.costPrice!)) * p.quantityOnHand : 0

      const recentlyStockedQty = Math.min(p.quantityOnHand, moveAgg?.qtyReceivedInRange ?? 0)
      const recentlyStockedValue = moveAgg && moveAgg.qtyReceivedInRange > 0
        ? (moveAgg.costValueReceivedInRange > 0 ? moveAgg.costValueReceivedInRange : (hasCost ? recentlyStockedQty * p.costPrice! : 0))
        : 0
      const recentlyStockedUsedFallbackCost = moveAgg ? moveAgg.qtyReceivedInRange > 0 && moveAgg.costValueReceivedInRange === 0 && hasCost : false

      const existingQty = Math.max(0, p.quantityOnHand - recentlyStockedQty)
      const existingValue = hasCost ? existingQty * p.costPrice! : 0

      const reconciles = Math.abs((recentlyStockedValue + existingValue) - totalCostValue) < 0.01

      return {
        id: p.id,
        catalogSource: p.catalogSource,
        productId: p.productId,
        name: p.variantName ? `${p.name} — ${p.variantName}` : p.name,
        imageUrl: p.imageUrl,
        editItemId: p.editItemId,
        sku: p.sku,
        category: p.categoryName,
        supplier: p.supplierName,
        location: p.locationName,
        quantityOnHand: p.quantityOnHand,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        totalCostValue,
        unvaluedQty,
        totalSellingValue,
        isUnsellable,
        posAvailabilityStatus: p.posAvailabilityStatus,
        potentialLossOnHand,
        recentlyStocked: { quantity: recentlyStockedQty, value: recentlyStockedValue, usedFallbackCost: recentlyStockedUsedFallbackCost },
        existing: { quantity: existingQty, value: existingValue },
        combined: { quantity: p.quantityOnHand, value: totalCostValue, reconciles },
      }
    })

    const total = rows.length
    const paged = rows.slice((page - 1) * limit, page * limit)

    const totals = rows.reduce(
      (acc, r) => {
        acc.totalCostValue += r.totalCostValue
        acc.totalUnvaluedQty += r.unvaluedQty
        acc.totalSellingValue += r.totalSellingValue
        acc.totalPotentialLoss += r.potentialLossOnHand
        acc.totalRecentlyStockedValue += r.recentlyStocked.value
        acc.totalExistingValue += r.existing.value
        return acc
      },
      { totalCostValue: 0, totalUnvaluedQty: 0, totalSellingValue: 0, totalPotentialLoss: 0, totalRecentlyStockedValue: 0, totalExistingValue: 0 }
    )

    return NextResponse.json({
      success: true,
      businessType: business?.type ?? null,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: { itemCount: total, ...totals },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: paged,
    })
  } catch (error) {
    console.error('[inventory-value GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
