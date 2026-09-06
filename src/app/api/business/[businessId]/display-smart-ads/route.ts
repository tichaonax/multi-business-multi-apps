import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, subDays } from 'date-fns'
import { getActivePromotions, applyPromotion } from '@/lib/promotions/resolve-active-promotions'

export const dynamic = 'force-dynamic'

// MBM-289: fixed score bump for an item currently on promotion — pushes it toward
// the front of the rotation/grid on top of its normal sales-based score, without
// admin-facing tuning (see plan's Decisions — kept as a constant, not a setting).
const PROMO_DISPLAY_BOOST = 50

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
    specialShowPercentage: settings?.specialShowPercentage ?? 25,
    leftPanelCardCount: settings?.leftPanelCardCount ?? 2,
    rightPanelColumns: settings?.rightPanelColumns ?? 2,
    rightPanelRows: settings?.rightPanelRows ?? 4,
  }

  // Block item loading only for the customer-facing display (all=false).
  // Management pages pass all=true and must always see items regardless of the enabled toggle.
  if (!globalSettings.enableSmartDisplay && !allItems) {
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

  // NOTE: isDailySpecial is resolved from the real Today's Special system (dailySpecial,
  // computed below for restaurant) — NOT from DisplayProductConfig.isDailySpecial. That
  // per-item flag is a cosmetic leftover that was never actually wired into what shows as
  // today's special on the customer display; keep it out of this computation so the badge
  // shown in management screens always matches what customers actually see.

  let dailySpecial: any = null
  let items: any[] = []

  if (businessType === 'restaurant') {
    // Resolve today's special from DailySpecial tables
    const todayDate = new Date().toLocaleDateString('en-CA')
    const dayOfWeek = new Date().getDay()
    const override = await prisma.dailySpecialDayOverride.findUnique({
      where: { businessId_date: { businessId, date: todayDate } },
    })
    if (!override?.isDisabled) {
      const specialId = override?.overrideSpecialId ?? (
        await prisma.dailySpecialSchedule.findUnique({
          where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
        })
      )?.specialId ?? null
      if (specialId) {
        const sp = await prisma.dailySpecial.findFirst({
          where: { id: specialId, businessId, isActive: true },
          include: {
            product: {
              select: {
                id: true, name: true, menuNumber: true, basePrice: true,
                product_images: { select: { imageUrl: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
              },
            },
            add_ons: {
              include: {
                product: {
                  select: {
                    id: true, name: true, basePrice: true, isActive: true,
                    product_images: { select: { imageUrl: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        })
        if (sp) {
          const productImageUrl = (sp.product as any).product_images?.[0]?.imageUrl ?? null
          const displayImageUrl = sp.imageId ? `/api/images/${sp.imageId}` : productImageUrl
          dailySpecial = {
            specialId: sp.id,
            productId: sp.product.id,
            productName: sp.product.name,
            menuNumber: sp.product.menuNumber,
            basePrice: Number(sp.product.basePrice),
            specialPrice: Number(sp.specialPrice),
            includeWifi: sp.includeWifi,
            bulletPoints: sp.bulletPoints as string[],
            imageUrl: displayImageUrl,
            addOns: sp.add_ons
              .filter((a: any) => a.product.isActive)
              .map((a: any) => ({
                addOnId: a.id,
                productId: a.product.id,
                productName: a.product.name,
                quantity: a.quantity,
                unitPrice: Number(a.product.basePrice),
                sortOrder: a.sortOrder,
                imageUrl: a.product.product_images?.[0]?.imageUrl ?? null,
              })),
          }
        }
      }
    }

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
      if (!allItems && isHidden('menu_item', p.id)) continue
      if (filterByNumber && !p.menuNumber) continue
      const price = Number(p.basePrice ?? 0)
      // Never show an unpriced item ($0.00) on the actual customer display — only
      // skip it there; management screens (allItems=true) still list it so admins
      // can find and fix it.
      if (!allItems && price <= 0) continue
      const ss = salesScore(productSales.get(p.id))
      const productImages = ((p as any).product_images ?? []).map((img: any) => img.imageUrl).filter(Boolean)
      candidates.push({
        id: p.id,
        itemType: 'menu_item',
        name: p.name,
        price,
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
        isDailySpecial: dailySpecial?.productId === p.id,
        isHidden: isHidden('menu_item', p.id),
        priorityBoost: configMap.get(`menu_item:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(p.id) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    for (const c of combos) {
      if (!allItems && isHidden('ayli_combo', c.id)) continue
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
        pricePerKgSmall: Number(ci.pricePerKgSmall),
        pricePerKgMedium: Number(ci.pricePerKgMedium),
        pricePerKgLarge: Number(ci.pricePerKgLarge),
      }))
      // Never show a combo with unpriced sizes or pool items ($0.00/kg) on the
      // actual customer display — only skip it there; management screens
      // (allItems=true) still list it so admins can find and fix the pricing.
      const hasValidPricing =
        sizes.length > 0 && sizes.every((s: any) => s.basePrice > 0) &&
        poolItems.every((pi: any) => pi.pricePerKgSmall > 0 && pi.pricePerKgMedium > 0 && pi.pricePerKgLarge > 0)
      if (!allItems && !hasValidPricing) continue
      const comboAdImageId = getAdImage('ayli_combo', c.id)
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
        imageUrl: comboAdImageId ? `/api/images/${comboAdImageId}` : null,
        advertisingNote: getNote('ayli_combo', c.id),
        adImageId: comboAdImageId,
        salesScore: ss,
        displayScore: buildDisplayScore('ayli_combo', c.id, ss),
        isFeatured: isFeatured('ayli_combo', c.id),
        isDailySpecial: false, // AYLI combos aren't supported by the Today's Special system (it's keyed to a BusinessProducts id)
        isHidden: isHidden('ayli_combo', c.id),
        priorityBoost: configMap.get(`ayli_combo:${c.id}`)?.priorityBoost ?? 0,
        salesBreakdown: ayliSales.get(c.id) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    candidates.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
      return b.displayScore - a.displayScore
    })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)

  } else if (businessType === 'grocery') {
    // MBM-289: promotional sales — active promos boost display priority so promoted
    // items appear more often / more prominently, on top of whatever the badge shows.
    const activePromotions = await getActivePromotions(businessId)
    const promoBoost = (key: string) => activePromotions.has(key) ? PROMO_DISPLAY_BOOST : 0

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
      if (!allItems && isHidden('product', p.id)) continue
      const price = Number(p.sellingPrice ?? 0)
      if (price <= 0) continue
      const invKey = `inv_${p.id}`
      const ss = salesScore(productSales.get(invKey))
      const invImageId = (p as any).imageId ?? null
      const invAdImageId = getAdImage('product', p.id)
      const invPromo = applyPromotion(price, activePromotions.get(`product:${p.id}`))
      candidates.push({
        id: p.id, itemType: 'product', name: p.name, price: invPromo.price,
        originalPrice: invPromo.originalPrice, isPromoActive: invPromo.isPromoActive, promoEndsAt: invPromo.promoEndsAt,
        emoji: (p as any).business_category?.emoji ?? null,
        category: (p as any).business_category?.name ?? null,
        imageId: invImageId,
        imageUrl: invImageId ? `/api/images/${invImageId}` : (invAdImageId ? `/api/images/${invAdImageId}` : null),
        advertisingNote: getNote('product', p.id),
        adImageId: invAdImageId,
        salesScore: ss, displayScore: buildDisplayScore('product', p.id, ss) + promoBoost(`product:${p.id}`),
        isFeatured: isFeatured('product', p.id),
        isHidden: isHidden('product', p.id),
        priorityBoost: configMap.get(`product:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(invKey) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    // Service products — sold via productVariantId, sales key is the variant ID
    for (const svc of serviceProducts) {
      if (!allItems && isHidden('product', svc.id)) continue
      const variantId = svc.product_variants[0]?.id ?? svc.id
      const ss = salesScore(productSales.get(variantId))
      const svcAdImageId = getAdImage('product', svc.id)
      const svcPromo = applyPromotion(Number(svc.basePrice), activePromotions.get(`product:${svc.id}`))
      candidates.push({
        id: svc.id, itemType: 'product', name: svc.name, price: svcPromo.price,
        originalPrice: svcPromo.originalPrice, isPromoActive: svcPromo.isPromoActive, promoEndsAt: svcPromo.promoEndsAt,
        emoji: (svc as any).business_categories?.emoji ?? null,
        category: (svc as any).business_categories?.name ?? null,
        imageUrl: svcAdImageId ? `/api/images/${svcAdImageId}` : null,
        advertisingNote: getNote('product', svc.id),
        adImageId: svcAdImageId,
        salesScore: ss, displayScore: buildDisplayScore('product', svc.id, ss) + promoBoost(`product:${svc.id}`),
        isFeatured: isFeatured('product', svc.id),
        isHidden: isHidden('product', svc.id),
        priorityBoost: configMap.get(`product:${svc.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(variantId) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    candidates.sort((a, b) => { if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1; return b.displayScore - a.displayScore })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)

  } else if (businessType === 'clothing') {
    // MBM-289: promotional sales — active promos boost display priority (product-level
    // for individual items, category-level for bale categories).
    const activePromotions = await getActivePromotions(businessId)
    const promoBoost = (key: string) => activePromotions.has(key) ? PROMO_DISPLAY_BOOST : 0

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
          business_category: { select: { name: true, emoji: true, domainId: true } },
        }
      }),
      // BusinessProducts (quick-add items) — sold via productVariantId
      prisma.businessProducts.findMany({
        where: { businessId, isActive: true, isAvailable: true },
        select: {
          id: true, name: true, basePrice: true, createdAt: true,
          business_categories: { select: { name: true, emoji: true, domainId: true } },
          product_variants: {
            where: { isActive: true },
            select: { id: true, price: true },
            orderBy: { createdAt: 'asc' },
            take: 10,
          },
          // No `take` cap here (unlike the old version of this query) — a
          // product with several images attached (e.g. via the Image
          // Gallery's multi-select "Choose from Gallery"/pool attach) should
          // cycle through all of them on the customer display, same as
          // restaurant menu items already do.
          product_images: {
            select: { imageId: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
        }
      })
    ])

    const baleCountByCategory = new Map<string, number>()
    for (const row of baleRows) baleCountByCategory.set(row.categoryId, Number(row.baleCount))

    const newArrivalsByCategory = new Map<string, number>()
    for (const row of newArrivalRows) newArrivalsByCategory.set(row.categoryId, Number(row.newCount))

    // Domain icon fallback (MBM-294): most imported categories never got a real
    // emoji (they sit at BusinessCategories' schema default, "📦"), but their
    // domain often has a representative icon image from the same import. Batch
    // resolve once per request rather than a query per item.
    const involvedDomainIds = new Set<string>()
    for (const p of invItems) { const d = (p as any).business_category?.domainId; if (d) involvedDomainIds.add(d) }
    for (const p of bizProducts) { const d = (p as any).business_categories?.domainId; if (d) involvedDomainIds.add(d) }
    const domainIcons = involvedDomainIds.size > 0
      ? await prisma.inventoryDomains.findMany({
          where: { id: { in: Array.from(involvedDomainIds) }, iconImageId: { not: null } },
          select: { id: true, iconImageId: true },
        })
      : []
    const domainIconUrlById = new Map<string, string>(
      domainIcons.map(d => [d.id, `/api/images/${d.iconImageId}`])
    )

    const candidates: any[] = []

    // Bale categories — keyed by categoryId
    for (const cat of baleCategories) {
      if (!allItems && isHidden('category', cat.id)) continue
      const newCount = newArrivalsByCategory.get(cat.id) ?? 0
      const ds = buildDisplayScore('category', cat.id, newCount) + promoBoost(`category:${cat.id}`)
      const catAdImageId = getAdImage('category', cat.id)
      const catPromo = activePromotions.get(`category:${cat.id}`)
      candidates.push({
        id: cat.id, itemType: 'category', name: cat.name, emoji: '👕',
        price: 0,
        isPromoActive: !!catPromo,
        promoDiscountPercent: catPromo?.discountType === 'PERCENT_OFF' ? catPromo.discountValue : null,
        promoEndsAt: catPromo?.endAt?.toISOString() ?? null,
        activeBales: baleCountByCategory.get(cat.id) ?? 0,
        imageUrl: catAdImageId ? `/api/images/${catAdImageId}` : null,
        advertisingNote: getNote('category', cat.id),
        adImageId: catAdImageId,
        salesScore: newCount, displayScore: ds, isFeatured: isFeatured('category', cat.id),
        isHidden: isHidden('category', cat.id),
        priorityBoost: configMap.get(`category:${cat.id}`)?.priorityBoost ?? 0,
        salesBreakdown: { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    // Regular inventory items — new arrivals (last 14 days) score higher
    for (const p of invItems) {
      if (!allItems && isHidden('product', p.id)) continue
      const price = Number(p.sellingPrice ?? 0)
      if (price <= 0) continue
      const isNew = new Date(p.createdAt) >= newArrivalCutoff
      const invKey = `inv_${p.id}`
      const ss = salesScore(productSales.get(invKey)) + (isNew ? 10 : 0)
      const clothingInvImageId = (p as any).imageId ?? null
      const clothingInvAdImageId = getAdImage('product', p.id)
      const clothingInvPromo = applyPromotion(price, activePromotions.get(`product:${p.id}`))
      candidates.push({
        id: p.id, itemType: 'product', name: p.name, price: clothingInvPromo.price,
        originalPrice: clothingInvPromo.originalPrice, isPromoActive: clothingInvPromo.isPromoActive, promoEndsAt: clothingInvPromo.promoEndsAt,
        emoji: (p as any).business_category?.emoji ?? '👕',
        category: (p as any).business_category?.name ?? null,
        categoryIconUrl: domainIconUrlById.get((p as any).business_category?.domainId) ?? null,
        imageId: clothingInvImageId,
        imageUrl: clothingInvImageId ? `/api/images/${clothingInvImageId}` : (clothingInvAdImageId ? `/api/images/${clothingInvAdImageId}` : null),
        advertisingNote: getNote('product', p.id),
        adImageId: clothingInvAdImageId,
        salesScore: ss, displayScore: buildDisplayScore('product', p.id, ss) + promoBoost(`product:${p.id}`),
        isFeatured: isFeatured('product', p.id),
        isHidden: isHidden('product', p.id),
        priorityBoost: configMap.get(`product:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(invKey) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }

    // BusinessProducts (quick-add items) — sales tracked per variant, aggregate across all variants
    for (const p of bizProducts) {
      if (!allItems && isHidden('product', p.id)) continue
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
      const bizImages: string[] = ((p as any).product_images ?? [])
        .map((img: any) => img.imageId)
        .filter(Boolean)
        .map((id: string) => `/api/images/${id}`)
      const bizImageId = (p as any).product_images?.[0]?.imageId ?? null
      const bizAdImageId = getAdImage('product', p.id)
      const bizPromo = applyPromotion(price, activePromotions.get(`product:${p.id}`))
      candidates.push({
        id: p.id, itemType: 'product', name: p.name, price: bizPromo.price,
        originalPrice: bizPromo.originalPrice, isPromoActive: bizPromo.isPromoActive, promoEndsAt: bizPromo.promoEndsAt,
        emoji: (p as any).business_categories?.emoji ?? '👕',
        category: (p as any).business_categories?.name ?? null,
        categoryIconUrl: domainIconUrlById.get((p as any).business_categories?.domainId) ?? null,
        imageId: bizImageId,
        imageUrl: bizImageId ? `/api/images/${bizImageId}` : (bizAdImageId ? `/api/images/${bizAdImageId}` : null),
        productImages: bizImages,
        advertisingNote: getNote('product', p.id),
        adImageId: bizAdImageId,
        salesScore: ss, displayScore: buildDisplayScore('product', p.id, ss) + promoBoost(`product:${p.id}`),
        isFeatured: isFeatured('product', p.id),
        isHidden: isHidden('product', p.id),
        priorityBoost: configMap.get(`product:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: variantSales,
      })
    }

    candidates.sort((a, b) => { if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1; return b.displayScore - a.displayScore })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)
  }

  return NextResponse.json({ settings: globalSettings, dailySpecial, items })
}
