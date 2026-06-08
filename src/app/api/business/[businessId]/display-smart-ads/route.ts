import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

// GET /api/business/[businessId]/display-smart-ads?businessType=restaurant|grocery|clothing
export async function GET(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params
  const businessType = req.nextUrl.searchParams.get('businessType') ?? 'restaurant'
  const allItems = req.nextUrl.searchParams.get('all') === 'true'

  // Load global display settings (or use defaults)
  const settings = await (prisma as any).displayGlobalSettings.findUnique({
    where: { businessId }
  })
  const globalSettings = {
    rotationIntervalSecs: settings?.rotationIntervalSecs ?? 6,
    enableSmartDisplay: settings?.enableSmartDisplay ?? false,
    enableSplitLayout: settings?.enableSplitLayout ?? true,
    maxItemsInRotation: settings?.maxItemsInRotation ?? 12,
  }

  if (!globalSettings.enableSmartDisplay) {
    return NextResponse.json({ settings: globalSettings, dailySpecial: null, items: [] })
  }

  // Load per-item config overrides
  const configs: any[] = await (prisma as any).displayProductConfig.findMany({
    where: { businessId }
  })
  const configMap = new Map<string, any>()
  for (const c of configs) {
    configMap.set(`${c.itemType}:${c.itemId}`, c)
  }

  // Compute date boundaries (calendar days in server local time)
  const todayStart = startOfDay(new Date())
  const yesterdayStart = subDays(todayStart, 1)
  const dayBeforeStart = subDays(todayStart, 2)

  // Query 3-day sales aggregated by productId (from attributes JSON) and isAYLICombo
  // Wrapped in try-catch so a SQL error never prevents product cards from showing
  let salesRows: any[] = []
  try {
    salesRows = await prisma.$queryRaw`
      SELECT
        COALESCE(
          NULLIF(boi.attributes->>'productId', ''),
          CASE WHEN boi.attributes->>'inventoryItemId' IS NOT NULL
            THEN 'inv_' || (boi.attributes->>'inventoryItemId')
            ELSE NULL
          END,
          boi."productVariantId"
        )                                                    AS "productId",
        (boi.attributes->'ayliBreakdown'->>'comboId')       AS "comboId",
        (boi.attributes->>'isAYLICombo')::boolean           AS "isAYLI",
        SUM(CASE WHEN bo."createdAt" >= ${todayStart}     THEN boi.quantity ELSE 0 END) AS "todayQty",
        SUM(CASE WHEN bo."createdAt" >= ${yesterdayStart} AND bo."createdAt" < ${todayStart}     THEN boi.quantity ELSE 0 END) AS "yesterdayQty",
        SUM(CASE WHEN bo."createdAt" >= ${dayBeforeStart} AND bo."createdAt" < ${yesterdayStart} THEN boi.quantity ELSE 0 END) AS "dayBeforeQty"
      FROM business_order_items boi
      JOIN business_orders bo ON bo.id = boi."orderId"
      WHERE bo."businessId" = ${businessId}
        AND bo."createdAt" >= ${dayBeforeStart}
        AND bo.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY
        COALESCE(
          NULLIF(boi.attributes->>'productId', ''),
          CASE WHEN boi.attributes->>'inventoryItemId' IS NOT NULL
            THEN 'inv_' || (boi.attributes->>'inventoryItemId')
            ELSE NULL
          END,
          boi."productVariantId"
        ),
        (boi.attributes->'ayliBreakdown'->>'comboId'),
        (boi.attributes->>'isAYLICombo')::boolean
    `
  } catch (err) {
    console.error('[display-smart-ads] sales query failed, proceeding without sales data:', err)
  }

  // Index sales by productId or comboId
  const productSales = new Map<string, { today: number; yesterday: number; dayBefore: number }>()
  const ayliSales = new Map<string, { today: number; yesterday: number; dayBefore: number }>()
  for (const row of salesRows) {
    const today = Number(row.todayQty ?? 0)
    const yesterday = Number(row.yesterdayQty ?? 0)
    const dayBefore = Number(row.dayBeforeQty ?? 0)
    if (row.isAYLI && row.comboId) {
      ayliSales.set(row.comboId, { today, yesterday, dayBefore })
    } else if (row.productId) {
      productSales.set(row.productId, { today, yesterday, dayBefore })
    }
  }

  function salesScore(s: { today: number; yesterday: number; dayBefore: number } | undefined) {
    if (!s) return 0
    return s.today * 3 + s.yesterday * 2 + s.dayBefore * 1
  }

  function buildDisplayScore(itemType: string, itemId: string, base: number): number {
    const cfg = configMap.get(`${itemType}:${itemId}`)
    return base + (cfg?.priorityBoost ?? 0) * 10
  }

  function isHidden(itemType: string, itemId: string): boolean {
    return configMap.get(`${itemType}:${itemId}`)?.isHidden === true
  }

  function isFeatured(itemType: string, itemId: string): boolean {
    return configMap.get(`${itemType}:${itemId}`)?.isFeatured === true
  }

  function getNote(itemType: string, itemId: string): string | null {
    return configMap.get(`${itemType}:${itemId}`)?.advertisingNote ?? null
  }

  function getAdImage(itemType: string, itemId: string): string | null {
    return configMap.get(`${itemType}:${itemId}`)?.advertisingImageId ?? null
  }

  function isDailySpecial(itemType: string, itemId: string): boolean {
    return configMap.get(`${itemType}:${itemId}`)?.isDailySpecial === true
  }

  let dailySpecial: any = null
  let items: any[] = []

  if (businessType === 'restaurant') {
    const [products, combos] = await Promise.all([
      prisma.businessProducts.findMany({
        where: { businessId, isActive: true },
        select: {
          id: true,
          name: true,
          basePrice: true,
          menuNumber: true,
          spiceLevel: true,
          preparationTime: true,
          business_categories: { select: { name: true, emoji: true } },
          product_images: {
            select: { imageUrl: true, sortOrder: true, isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
        }
      }),
      // Same query as /api/restaurant/ayc-combos — proven to load pool_item correctly
      prisma.asYouLikeItCombos.findMany({
        where: { businessId, isActive: true },
        include: {
          sizes: { orderBy: { sortOrder: 'asc' } },
          items: {
            where: { isActive: true, pool_item: { isActive: true } },
            orderBy: { sortOrder: 'asc' },
            include: { pool_item: true }
          }
        }
      }),
    ])

    // Fallback rule: if 0 numbered items exist across both tables, show all (old behaviour)
    const numberedCount =
      products.filter((p: any) => p.menuNumber).length +
      combos.filter(c => c.menuNumber).length
    const filterByNumber = numberedCount > 0

    const candidates: any[] = []
    for (const p of products) {
      if (isHidden('menu_item', p.id)) continue
      if (filterByNumber && !p.menuNumber) continue
      const ss = salesScore(productSales.get(p.id))
      const productImages = ((p as any).product_images ?? []).map((img: any) => img.imageUrl).filter(Boolean)
      candidates.push({
        id: p.id,
        itemType: 'menu_item',
        name: p.name,
        price: Number(p.basePrice ?? 0),
        menuNumber: p.menuNumber ?? null,
        spiceLevel: p.spiceLevel ?? 0,
        preparationTime: p.preparationTime ?? 0,
        emoji: (p as any).business_categories?.emoji ?? null,
        category: (p as any).business_categories?.name ?? null,
        imageId: null,
        imageUrl: productImages[0] ?? null,
        productImages,
        advertisingNote: getNote('menu_item', p.id),
        adImageId: getAdImage('menu_item', p.id),
        salesScore: ss,
        displayScore: buildDisplayScore('menu_item', p.id, ss),
        isFeatured: isFeatured('menu_item', p.id),
        isDailySpecial: isDailySpecial('menu_item', p.id),
        priorityBoost: configMap.get(`menu_item:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(p.id) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    for (const c of combos) {
      if (isHidden('ayli_combo', c.id)) continue
      if (filterByNumber && !c.menuNumber) continue
      if ((c.items ?? []).length === 0) continue  // skip combos with no pool items configured
      const ss = salesScore(ayliSales.get(c.id))
      const sizes = (c.sizes ?? []).map((s: any) => ({
        sizeName: s.sizeName,
        basePrice: Number(s.basePrice),
      }))
      const poolItems = (c.items ?? []).map((ci: any) => ({
        name: ci.pool_item.name,
        emoji: ci.pool_item.emoji ?? '🍽️',
        pricePerKgSmall: Number(ci.pool_item.pricePerKgSmall),
        pricePerKgMedium: Number(ci.pool_item.pricePerKgMedium),
        pricePerKgLarge: Number(ci.pool_item.pricePerKgLarge),
      }))
      candidates.push({
        id: c.id,
        itemType: 'ayli_combo',
        name: c.name,
        price: sizes[0]?.basePrice ?? 0,
        sizes,
        poolItems,
        menuNumber: c.menuNumber ?? null,
        emoji: '🥗',
        category: 'ayli-combos',
        advertisingNote: getNote('ayli_combo', c.id),
        adImageId: getAdImage('ayli_combo', c.id),
        salesScore: ss,
        displayScore: buildDisplayScore('ayli_combo', c.id, ss),
        isFeatured: isFeatured('ayli_combo', c.id),
        isDailySpecial: isDailySpecial('ayli_combo', c.id),
        priorityBoost: configMap.get(`ayli_combo:${c.id}`)?.priorityBoost ?? 0,
        salesBreakdown: ayliSales.get(c.id) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    const specialIdx = candidates.findIndex(c => c.isDailySpecial)
    if (specialIdx !== -1) {
      dailySpecial = candidates.splice(specialIdx, 1)[0]
    }

    candidates.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
      return b.displayScore - a.displayScore
    })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)

  } else if (businessType === 'grocery') {
    // Mirror the POS desk-products list: BarcodeInventoryItems (main stock) + SERVICE BusinessProducts
    const [invItems, serviceProducts] = await Promise.all([
      prisma.barcodeInventoryItems.findMany({
        where: { businessId, isActive: true, stockQuantity: { gt: 0 } },
        select: {
          id: true, name: true, sellingPrice: true, imageId: true,
          business_category: { select: { name: true, emoji: true } },
        }
      }),
      prisma.businessProducts.findMany({
        where: { businessId, isActive: true, isAvailable: true, productType: 'SERVICE', basePrice: { gt: 0 } },
        include: {
          business_categories: { select: { name: true, emoji: true } },
          product_variants: { where: { isActive: true }, take: 1 },
        }
      })
    ])

    const candidates: any[] = []

    // Inventory items — sales key is inv_${id} (matches the SQL COALESCE above)
    for (const p of invItems) {
      if (isHidden('product', p.id)) continue
      const price = Number(p.sellingPrice ?? 0)
      if (price <= 0) continue
      const invKey = `inv_${p.id}`
      const ss = salesScore(productSales.get(invKey))
      candidates.push({
        id: p.id, itemType: 'product', name: p.name, price,
        emoji: (p as any).business_category?.emoji ?? null,
        category: (p as any).business_category?.name ?? null,
        imageId: (p as any).imageId ?? null,
        advertisingNote: getNote('product', p.id),
        adImageId: getAdImage('product', p.id),
        salesScore: ss, displayScore: buildDisplayScore('product', p.id, ss),
        isFeatured: isFeatured('product', p.id),
        priorityBoost: configMap.get(`product:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(invKey) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    // Service products — sold via productVariantId, sales key is the variant ID
    for (const svc of serviceProducts) {
      if (isHidden('product', svc.id)) continue
      const variantId = svc.product_variants[0]?.id ?? svc.id
      const ss = salesScore(productSales.get(variantId))
      candidates.push({
        id: svc.id, itemType: 'product', name: svc.name, price: Number(svc.basePrice),
        emoji: (svc as any).business_categories?.emoji ?? null,
        category: (svc as any).business_categories?.name ?? null,
        advertisingNote: getNote('product', svc.id),
        adImageId: getAdImage('product', svc.id),
        salesScore: ss, displayScore: buildDisplayScore('product', svc.id, ss),
        isFeatured: isFeatured('product', svc.id),
        priorityBoost: configMap.get(`product:${svc.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(variantId) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    candidates.sort((a, b) => { if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1; return b.displayScore - a.displayScore })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)

  } else if (businessType === 'clothing') {
    const newArrivalCutoff = subDays(todayStart, 14)

    const [baleCategories, baleRows, newArrivalRows, invItems, bizProducts]: [any[], any[], any[], any[], any[]] = await Promise.all([
      // Bale categories live in clothing_bale_categories, not business_categories
      prisma.clothingBaleCategories.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      }),
      prisma.$queryRaw`
        SELECT "categoryId", COUNT(*) AS "baleCount"
        FROM clothing_bales
        WHERE "businessId" = ${businessId} AND "isActive" = true AND "remainingCount" > 0
        GROUP BY "categoryId"
      `,
      // Bales added in the last 14 days — used to rank new arrivals first
      prisma.$queryRaw`
        SELECT "categoryId", COUNT(*) AS "newCount"
        FROM clothing_bales
        WHERE "businessId" = ${businessId} AND "isActive" = true AND "remainingCount" > 0 AND "createdAt" >= ${newArrivalCutoff}
        GROUP BY "categoryId"
      `,
      prisma.barcodeInventoryItems.findMany({
        where: { businessId, isActive: true, stockQuantity: { gt: 0 } },
        select: {
          id: true, name: true, sellingPrice: true, createdAt: true, imageId: true,
          business_category: { select: { name: true, emoji: true } },
        }
      }),
      // BusinessProducts (quick-add items) — sold via productVariantId
      prisma.businessProducts.findMany({
        where: { businessId, isActive: true, isAvailable: true },
        select: {
          id: true, name: true, basePrice: true, createdAt: true,
          business_categories: { select: { name: true, emoji: true } },
          product_variants: {
            where: { isActive: true },
            select: { id: true, price: true },
            orderBy: { createdAt: 'asc' },
            take: 10,
          },
          product_images: {
            select: { imageId: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
          },
        }
      })
    ])

    const baleCountByCategory = new Map<string, number>()
    for (const row of baleRows) baleCountByCategory.set(row.categoryId, Number(row.baleCount))

    const newArrivalsByCategory = new Map<string, number>()
    for (const row of newArrivalRows) newArrivalsByCategory.set(row.categoryId, Number(row.newCount))

    const candidates: any[] = []

    // Bale categories — keyed by categoryId
    for (const cat of baleCategories) {
      if (isHidden('category', cat.id)) continue
      const newCount = newArrivalsByCategory.get(cat.id) ?? 0
      const ds = buildDisplayScore('category', cat.id, newCount)
      candidates.push({
        id: cat.id, itemType: 'category', name: cat.name, emoji: '👕',
        price: 0,
        activeBales: baleCountByCategory.get(cat.id) ?? 0,
        advertisingNote: getNote('category', cat.id),
        adImageId: getAdImage('category', cat.id),
        salesScore: newCount, displayScore: ds, isFeatured: isFeatured('category', cat.id),
        priorityBoost: configMap.get(`category:${cat.id}`)?.priorityBoost ?? 0,
        salesBreakdown: { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    // Regular inventory items — new arrivals (last 14 days) score higher
    for (const p of invItems) {
      if (isHidden('product', p.id)) continue
      const price = Number(p.sellingPrice ?? 0)
      if (price <= 0) continue
      const isNew = new Date(p.createdAt) >= newArrivalCutoff
      const invKey = `inv_${p.id}`
      const ss = salesScore(productSales.get(invKey)) + (isNew ? 10 : 0)
      candidates.push({
        id: p.id, itemType: 'product', name: p.name, price,
        emoji: (p as any).business_category?.emoji ?? '👕',
        category: (p as any).business_category?.name ?? null,
        imageId: (p as any).imageId ?? null,
        advertisingNote: getNote('product', p.id),
        adImageId: getAdImage('product', p.id),
        salesScore: ss, displayScore: buildDisplayScore('product', p.id, ss),
        isFeatured: isFeatured('product', p.id),
        priorityBoost: configMap.get(`product:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(invKey) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    // BusinessProducts (quick-add items) — sales tracked per variant, aggregate across all variants
    for (const p of bizProducts) {
      if (isHidden('product', p.id)) continue
      const price = Number(p.basePrice ?? p.product_variants[0]?.price ?? 0)
      if (price <= 0) continue
      const isNew = new Date(p.createdAt) >= newArrivalCutoff
      // Aggregate sales across all variants
      const variantSales = (p.product_variants as any[]).reduce(
        (acc: { today: number; yesterday: number; dayBefore: number }, v: any) => {
          const s = productSales.get(v.id)
          if (!s) return acc
          return { today: acc.today + s.today, yesterday: acc.yesterday + s.yesterday, dayBefore: acc.dayBefore + s.dayBefore }
        },
        { today: 0, yesterday: 0, dayBefore: 0 }
      )
      const ss = salesScore(variantSales) + (isNew ? 10 : 0)
      candidates.push({
        id: p.id, itemType: 'product', name: p.name, price,
        emoji: (p as any).business_categories?.emoji ?? '👕',
        category: (p as any).business_categories?.name ?? null,
        imageId: (p as any).product_images?.[0]?.imageId ?? null,
        advertisingNote: getNote('product', p.id),
        adImageId: getAdImage('product', p.id),
        salesScore: ss, displayScore: buildDisplayScore('product', p.id, ss),
        isFeatured: isFeatured('product', p.id),
        priorityBoost: configMap.get(`product:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: variantSales,
      })
    }

    candidates.sort((a, b) => { if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1; return b.displayScore - a.displayScore })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)
  }

  return NextResponse.json({ settings: globalSettings, dailySpecial, items })
}
