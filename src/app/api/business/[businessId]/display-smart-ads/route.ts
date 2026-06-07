import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, subDays } from 'date-fns'

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
    enableSmartDisplay: settings?.enableSmartDisplay ?? true,
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
        (boi.attributes->>'productId')                      AS "productId",
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
        (boi.attributes->>'productId'),
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

  function isDailySpecial(itemType: string, itemId: string): boolean {
    return configMap.get(`${itemType}:${itemId}`)?.isDailySpecial === true
  }

  let dailySpecial: any = null
  let items: any[] = []

  if (businessType === 'restaurant') {
    const products = await prisma.businessProducts.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        basePrice: true,
        business_categories: { select: { name: true, emoji: true } },
      }
    })

    const combos: any[] = await (prisma as any).asYouLikeItCombos.findMany({
      where: { businessId, isActive: true },
      include: { sizes: { orderBy: { sortOrder: 'asc' } } }
    })

    const candidates: any[] = []
    for (const p of products) {
      if (isHidden('menu_item', p.id)) continue
      const ss = salesScore(productSales.get(p.id))
      candidates.push({
        id: p.id,
        itemType: 'menu_item',
        name: p.name,
        price: Number(p.basePrice ?? 0),
        emoji: (p as any).business_categories?.emoji ?? null,
        category: (p as any).business_categories?.name ?? null,
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
      const ss = salesScore(ayliSales.get(c.id))
      const sizes = (c.sizes ?? []).map((s: any) => ({
        sizeName: s.sizeName,
        basePrice: Number(s.basePrice),
      }))
      candidates.push({
        id: c.id,
        itemType: 'ayli_combo',
        name: c.name,
        price: sizes[0]?.basePrice ?? 0,
        sizes,
        emoji: '🥗',
        category: 'ayli-combos',
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
    const products = await prisma.businessProducts.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        basePrice: true,
        business_categories: { select: { name: true, emoji: true } },
      }
    })
    const candidates: any[] = []
    for (const p of products) {
      if (isHidden('product', p.id)) continue
      const ss = salesScore(productSales.get(p.id))
      candidates.push({
        id: p.id, itemType: 'product', name: p.name, price: Number(p.basePrice ?? 0),
        emoji: (p as any).business_categories?.emoji ?? null,
        category: (p as any).business_categories?.name ?? null,
        salesScore: ss, displayScore: buildDisplayScore('product', p.id, ss),
        isFeatured: isFeatured('product', p.id),
        priorityBoost: configMap.get(`product:${p.id}`)?.priorityBoost ?? 0,
        salesBreakdown: productSales.get(p.id) ?? { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }
    candidates.sort((a, b) => { if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1; return b.displayScore - a.displayScore })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)

  } else if (businessType === 'clothing') {
    const categories = await prisma.businessCategories.findMany({
      where: { businessId },
      select: { id: true, name: true, emoji: true }
    })
    const baleRows: any[] = await prisma.$queryRaw`
      SELECT category, COUNT(*) AS "baleCount"
      FROM clothing_bales WHERE "businessId" = ${businessId} AND "isSold" = false
      GROUP BY category
    `
    const baleCountByCategory = new Map<string, number>()
    for (const row of baleRows) baleCountByCategory.set(row.category, Number(row.baleCount))

    const candidates: any[] = []
    for (const cat of categories) {
      if (isHidden('category', cat.id)) continue
      const ds = buildDisplayScore('category', cat.id, 0)
      candidates.push({
        id: cat.id, itemType: 'category', name: cat.name, emoji: cat.emoji ?? '👕',
        activeBales: baleCountByCategory.get(cat.name) ?? 0,
        salesScore: 0, displayScore: ds, isFeatured: isFeatured('category', cat.id),
        priorityBoost: configMap.get(`category:${cat.id}`)?.priorityBoost ?? 0,
        salesBreakdown: { today: 0, yesterday: 0, dayBefore: 0 },
      })
    }
    candidates.sort((a, b) => { if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1; return b.displayScore - a.displayScore })
    items = allItems ? candidates : candidates.slice(0, globalSettings.maxItemsInRotation)
  }

  return NextResponse.json({ settings: globalSettings, dailySpecial, items })
}
