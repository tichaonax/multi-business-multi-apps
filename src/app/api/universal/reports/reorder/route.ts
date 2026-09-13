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
    // Historical window used for suggested reorder quantities (default 90 days)
    const historicalDays = 90
    // MBM-296 §8: extra cushion added on top of supplier lead time (or the
    // default below, when no lead time is on file) when computing a
    // recommended MINIMUM stock level — distinct from the reorder-quantity
    // suggestion above, which targets `targetStockDays` of cover instead.
    const safetyBufferDays = parseInt(searchParams.get('safetyBufferDays') ?? '7', 10)
    // No supplier lead time is on file for this product (SupplierProducts
    // only exists for the BusinessProducts catalog — see MBM-296 plan §2.2/§8
    // — so this default carries almost all of the barcode-item catalog).
    const defaultLeadTimeDays = 7
    // MBM-296 §8: when true, return every product with a computed
    // recommendation (including ones already above their minimum) rather
    // than only the ones this endpoint's original reorder-suggestion purpose
    // cared about. The admin Minimum-Stock Recommendation view passes this;
    // existing reorder-suggestion pages omit it and keep today's behaviour.
    const includeAll = searchParams.get('includeAll') === 'true'

    if (!businessId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'businessId, startDate and endDate are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    const dayRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

    // Historical window — always 90 days back from the end date
    const historicalStart = new Date(end)
    historicalStart.setDate(historicalStart.getDate() - historicalDays)

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })

    // ─── SYSTEM 1: product_variants ────────────────────────────────────────────
    // Run sales queries + variant fetch in parallel
    const [selectedRangeItems, historicalItems, variants] = await Promise.all([
      prisma.businessOrderItems.findMany({
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
        select: { productVariantId: true, quantity: true },
      }),
      prisma.businessOrderItems.findMany({
        where: {
          business_orders: {
            businessId,
            status: 'COMPLETED',
            orderType: 'SALE',
            OR: [
              { transactionDate: { gte: historicalStart, lte: end } },
              { transactionDate: null, createdAt: { gte: historicalStart, lte: end } },
            ],
          },
        },
        select: { productVariantId: true, quantity: true },
      }),
      prisma.productVariants.findMany({
        where: { business_products: { businessId, isActive: true } },
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
              supplierId: true,
              business_categories: { select: { name: true } },
              product_images: {
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
                select: { imageId: true },
              },
            },
          },
        },
      }),
    ])

    // MBM-296 §8: supplier lead time, where available — SupplierProducts only
    // links to the BusinessProducts catalog, so this enrichment applies to
    // System 1 (product_variants) rows only; System 2 (barcode items) always
    // falls back to defaultLeadTimeDays.
    const productIdsWithSupplier = variants.map(v => v.business_products.id)
    const leadTimeRows = productIdsWithSupplier.length > 0
      ? await prisma.supplierProducts.findMany({
          where: { productId: { in: productIdsWithSupplier } },
          select: { productId: true, supplierId: true, leadTimeDays: true },
        })
      : []
    const leadTimeByProductId = new Map<string, number>()
    for (const row of leadTimeRows) {
      // Prefer the row matching the product's own configured supplier; the
      // first-seen row otherwise (a product can have more than one supplier
      // on file, but this report only needs one usable estimate).
      if (!leadTimeByProductId.has(row.productId)) leadTimeByProductId.set(row.productId, row.leadTimeDays)
    }

    // Aggregate variant sales
    const salesMap = new Map<string, number>()
    const historicalMap = new Map<string, number>()
    for (const item of selectedRangeItems) {
      if (!item.productVariantId) continue
      salesMap.set(item.productVariantId, (salesMap.get(item.productVariantId) ?? 0) + item.quantity)
    }
    for (const item of historicalItems) {
      if (!item.productVariantId) continue
      historicalMap.set(item.productVariantId, (historicalMap.get(item.productVariantId) ?? 0) + item.quantity)
    }

    // ─── SYSTEM 2: barcode_inventory_items ─────────────────────────────────────
    // These items link to sales via attributes->>'inventoryItemId', so we use raw SQL.
    const [barcodeItems, barcodeSelectedSales, barcodeHistoricalSales] = await Promise.all([
      prisma.barcodeInventoryItems.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          stockQuantity: true,
          reorderLevel: true,
          lastOrderQty: true,
          maxOrderQty: true,
          lastOrderedAt: true,
          costPrice: true,
          sellingPrice: true,
          business_category: { select: { name: true } },
          imageId: true,
        },
      }),
      // Sales in selected range for barcode items
      prisma.$queryRaw<{ item_id: string; qty_sold: bigint }[]>`
        SELECT
          boi.attributes->>'inventoryItemId' AS item_id,
          SUM(boi.quantity)::bigint AS qty_sold
        FROM business_order_items boi
        JOIN business_orders bo ON boi."orderId" = bo.id
        WHERE bo."businessId" = ${businessId}
          AND bo.status = 'COMPLETED'
          AND bo."orderType" = 'SALE'
          AND (
            (bo."transactionDate" >= ${start} AND bo."transactionDate" <= ${end})
            OR (bo."transactionDate" IS NULL AND bo."createdAt" >= ${start} AND bo."createdAt" <= ${end})
          )
          AND boi.attributes->>'inventoryItemId' IS NOT NULL
        GROUP BY boi.attributes->>'inventoryItemId'
      `,
      // Historical 90-day sales for barcode items
      prisma.$queryRaw<{ item_id: string; qty_sold: bigint }[]>`
        SELECT
          boi.attributes->>'inventoryItemId' AS item_id,
          SUM(boi.quantity)::bigint AS qty_sold
        FROM business_order_items boi
        JOIN business_orders bo ON boi."orderId" = bo.id
        WHERE bo."businessId" = ${businessId}
          AND bo.status = 'COMPLETED'
          AND bo."orderType" = 'SALE'
          AND (
            (bo."transactionDate" >= ${historicalStart} AND bo."transactionDate" <= ${end})
            OR (bo."transactionDate" IS NULL AND bo."createdAt" >= ${historicalStart} AND bo."createdAt" <= ${end})
          )
          AND boi.attributes->>'inventoryItemId' IS NOT NULL
        GROUP BY boi.attributes->>'inventoryItemId'
      `,
    ])

    const barcodeSalesMap = new Map<string, number>()
    const barcodeHistoricalMap = new Map<string, number>()
    for (const row of barcodeSelectedSales) {
      barcodeSalesMap.set(row.item_id, Number(row.qty_sold))
    }
    for (const row of barcodeHistoricalSales) {
      barcodeHistoricalMap.set(row.item_id, Number(row.qty_sold))
    }

    // ─── Build rows (shared logic) ──────────────────────────────────────────────
    const rows: any[] = []

    function buildRow(
      id: string,
      productId: string,
      productName: string,
      variantName: string,
      sku: string,
      category: string,
      currentStock: number,
      reorderLevelRaw: number,
      costPriceRaw: number | null,
      sellingPriceRaw: number | null,
      selectedUnitsSold: number,
      historicalUnitsSold: number,
      lastOrderQty: number = 0,
      maxOrderQty: number = 0,
      lastOrderedAt: Date | null = null,
      leadTimeDaysOnFile: number | null = null,
      imageUrl: string | null = null,
      editItemId: string = id,
    ) {
      const avgDailySales = selectedUnitsSold / dayRange
      const daysOfStockLeft = avgDailySales > 0 ? currentStock / avgDailySales : null
      const historicalAvgDailySales = historicalUnitsSold / historicalDays

      // Default threshold matches inventory view low-stock highlight (10)
      const effectiveReorderLevel = reorderLevelRaw || 10
      const belowReorderLevel = currentStock <= effectiveReorderLevel
      const belowVelocityThreshold = daysOfStockLeft !== null && daysOfStockLeft <= reorderThresholdDays

      if (!includeAll && !belowVelocityThreshold && !belowReorderLevel) return

      // MBM-296 §8 — recommended MINIMUM stock level (distinct from the
      // reorder QUANTITY suggestion below): best-available daily sales rate
      // × (lead time + safety buffer). Falls back to 2× the reorder level
      // when there's no sales history to estimate a rate from at all.
      const bestAvgDailySales = historicalAvgDailySales > 0 ? historicalAvgDailySales : avgDailySales
      const effectiveLeadTimeDays = leadTimeDaysOnFile ?? defaultLeadTimeDays
      const recommendedMinimumStock = bestAvgDailySales > 0
        ? Math.ceil(bestAvgDailySales * (effectiveLeadTimeDays + safetyBufferDays))
        : effectiveReorderLevel * 2
      const stockStatus: 'BELOW_MINIMUM' | 'AT_MINIMUM' | 'ABOVE_MINIMUM' =
        currentStock < recommendedMinimumStock ? 'BELOW_MINIMUM'
        : currentStock === recommendedMinimumStock ? 'AT_MINIMUM'
        : 'ABOVE_MINIMUM'
      const basisUsed = `${historicalAvgDailySales > 0 ? '90-day avg sales' : avgDailySales > 0 ? 'recent-period avg sales' : 'no sales history — 2× reorder level'}, ${leadTimeDaysOnFile != null ? `${leadTimeDaysOnFile}d supplier lead time` : `${defaultLeadTimeDays}d default lead time (none on file)`} + ${safetyBufferDays}d safety buffer`
      const dataQualityWarning =
        bestAvgDailySales === 0 ? 'No sales history in the last 90 days — recommendation is a rough fallback, not a real estimate.'
        : historicalUnitsSold < 5 ? 'Fewer than 5 units sold in the last 90 days — recommendation may be unreliable.'
        : null

      let suggestedReorderQty: number
      let suggestionBasis: 'historical' | 'recent' | 'reorder_level'

      if (historicalAvgDailySales > 0) {
        suggestedReorderQty = Math.max(0, Math.ceil(historicalAvgDailySales * targetStockDays) - currentStock)
        suggestionBasis = 'historical'
      } else if (avgDailySales > 0) {
        suggestedReorderQty = Math.max(0, Math.ceil(avgDailySales * targetStockDays) - currentStock)
        suggestionBasis = 'recent'
      } else {
        suggestedReorderQty = Math.max(0, effectiveReorderLevel * 2 - currentStock)
        suggestionBasis = 'reorder_level'
      }

      const daysOfStockLeftForDisplay = daysOfStockLeft ?? 0
      const costPrice = costPriceRaw
      const estimatedCost = costPrice !== null
        ? Math.round(suggestedReorderQty * costPrice * 100) / 100
        : null
      const urgency: 'critical' | 'low' =
        currentStock === 0 || daysOfStockLeftForDisplay < 3 ? 'critical' : 'low'

      rows.push({
        variantId: id,
        productId,
        productName,
        variantName,
        imageUrl,
        editItemId,
        sku: sku ?? '',
        category: category ?? 'Uncategorised',
        currentStock,
        reorderLevel: effectiveReorderLevel,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        unitsSoldInRange: selectedUnitsSold,
        daysOfStockLeft: Math.round(daysOfStockLeftForDisplay * 10) / 10,
        historicalAvgDailySales: Math.round(historicalAvgDailySales * 100) / 100,
        historicalUnitsSold,
        historicalDays,
        suggestedReorderQty,
        suggestionBasis,
        lastOrderQty,
        maxOrderQty,
        lastOrderedAt: lastOrderedAt?.toISOString() ?? null,
        costPrice,
        sellingPrice: sellingPriceRaw,
        estimatedCost,
        urgency,
        recommendedMinimumStock,
        stockStatus,
        basisUsed,
        dataQualityWarning,
        leadTimeDaysOnFile,
      })
    }

    // System 1 — product variants
    for (const variant of variants) {
      buildRow(
        variant.id,
        variant.business_products.id,
        variant.business_products.name,
        variant.name ?? 'Default',
        variant.sku ?? '',
        variant.business_products.business_categories?.name ?? 'Uncategorised',
        variant.stockQuantity ?? 0,
        variant.reorderLevel ?? 0,
        variant.business_products.costPrice
          ? parseFloat(variant.business_products.costPrice.toString())
          : null,
        variant.price ? parseFloat(variant.price.toString()) : null,
        salesMap.get(variant.id) ?? 0,
        historicalMap.get(variant.id) ?? 0,
        0,
        0,
        null,
        leadTimeByProductId.get(variant.business_products.id) ?? null,
        variant.business_products.product_images[0]?.imageId ? `/api/images/${variant.business_products.product_images[0].imageId}` : null,
        variant.business_products.id,
      )
    }

    // System 2 — barcode inventory items
    for (const item of barcodeItems) {
      buildRow(
        item.id,
        item.id,  // no separate productId — use same id
        item.name,
        'Default',
        item.sku ?? '',
        item.business_category?.name ?? item.category ?? 'Uncategorised',
        item.stockQuantity ?? 0,
        item.reorderLevel ?? 0,
        item.costPrice ? parseFloat(item.costPrice.toString()) : null,
        item.sellingPrice ? parseFloat(item.sellingPrice.toString()) : null,
        barcodeSalesMap.get(item.id) ?? 0,
        barcodeHistoricalMap.get(item.id) ?? 0,
        item.lastOrderQty ?? 0,
        item.maxOrderQty ?? 0,
        item.lastOrderedAt ?? null,
        null,
        item.imageId ? `/api/images/${item.imageId}` : null,
        `inv_${item.id}`,
      )
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
      businessType: business?.type ?? null,
      dateRange: { startDate, endDate, days: dayRange },
      config: { reorderThresholdDays, targetStockDays, historicalDays },
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
