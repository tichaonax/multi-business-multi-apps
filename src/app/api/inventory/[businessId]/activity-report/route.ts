import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type RouteContext = { params: Promise<{ businessId: string }> }

const ADD_TYPES = new Set(['PURCHASE_RECEIVED', 'RETURN_IN', 'TRANSFER_IN', 'PRODUCTION_IN'])
const LOSS_TYPES = new Set(['DAMAGE', 'THEFT', 'EXPIRED', 'PRODUCTION_OUT', 'TRANSFER_OUT'])

type DayBucket = {
  qtyAdded: number
  qtySoldFromMovements: number
  qtySoldFromOrders: number
  totalSales: number
  qtyAdjustedNet: number
  qtyLost: number
}

function getBucket(map: Record<string, DayBucket>, dateStr: string): DayBucket {
  if (!map[dateStr]) {
    map[dateStr] = {
      qtyAdded: 0, qtySoldFromMovements: 0, qtySoldFromOrders: 0,
      totalSales: 0, qtyAdjustedNet: 0, qtyLost: 0,
    }
  }
  return map[dateStr]
}

/**
 * GET /api/inventory/[businessId]/activity-report
 *
 * Query params:
 *   from       YYYY-MM-DD  required
 *   to         YYYY-MM-DD  required
 *   itemId     string      optional — filter to single item
 *   category   string      optional — filter by categoryId
 *   page       number      default 1
 *   limit      number      default 50, max 100
 *   all        'true'      skip pagination (for print mode)
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')
    const itemId = searchParams.get('itemId')
    const category = searchParams.get('category')
    const printAll = searchParams.get('all') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = printAll ? 9999 : Math.min(100, parseInt(searchParams.get('limit') || '50'))

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const fromDate = new Date(fromStr + 'T00:00:00.000Z')
    const toDate = new Date(toStr + 'T23:59:59.999Z')

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Auth
    if (user.role?.toLowerCase() !== 'admin') {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
      })
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Fetch paginated barcode items
    const itemWhere: any = { businessId, isActive: true }
    if (itemId) itemWhere.id = itemId
    if (category) itemWhere.categoryId = category

    const [totalCount, barcodeItems] = await Promise.all([
      prisma.barcodeInventoryItems.count({ where: itemWhere }),
      prisma.barcodeInventoryItems.findMany({
        where: itemWhere,
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          business_category: { select: { name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ])

    if (barcodeItems.length === 0) {
      return NextResponse.json({
        success: true,
        period: { from: fromStr, to: toStr },
        items: [],
        summary: { totalItems: 0, itemsWithVariance: 0, totalVarianceUnits: 0 },
        pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
      })
    }

    const itemIds = barcodeItems.map(i => i.id)
    const itemIdSet = new Set(itemIds)

    // 2. Fetch stock movements for these items in the date range
    const movements = await prisma.businessStockMovements.findMany({
      where: {
        businessId,
        barcodeInventoryItemId: { in: itemIds },
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: {
        barcodeInventoryItemId: true,
        movementType: true,
        quantity: true,
        createdAt: true,
      },
    })

    // 3. Fetch order items for revenue + historical qty_sold supplement
    const orderItems = await prisma.businessOrderItems.findMany({
      where: {
        business_orders: {
          businessId,
          createdAt: { gte: fromDate, lte: toDate },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      select: {
        quantity: true,
        totalPrice: true,
        attributes: true,
        business_orders: { select: { createdAt: true } },
      },
    })

    // 4. Build per-item per-day buckets
    const itemDayMap: Record<string, Record<string, DayBucket>> = {}
    for (const id of itemIds) itemDayMap[id] = {}

    for (const m of movements) {
      const id = m.barcodeInventoryItemId!
      const dateStr = m.createdAt.toISOString().split('T')[0]
      const b = getBucket(itemDayMap[id], dateStr)
      if (ADD_TYPES.has(m.movementType)) {
        b.qtyAdded += m.quantity
      } else if (m.movementType === 'SALE') {
        b.qtySoldFromMovements += m.quantity
      } else if (m.movementType === 'ADJUSTMENT') {
        b.qtyAdjustedNet += m.quantity // positive = added, negative = removed
      } else if (LOSS_TYPES.has(m.movementType)) {
        b.qtyLost += m.quantity
      }
    }

    for (const oi of orderItems) {
      const attrs = oi.attributes as Record<string, any> | null
      const invId = attrs?.inventoryItemId as string | undefined
      if (!invId || !itemIdSet.has(invId)) continue
      const dateStr = oi.business_orders.createdAt.toISOString().split('T')[0]
      const b = getBucket(itemDayMap[invId], dateStr)
      b.totalSales += Number(oi.totalPrice)
      b.qtySoldFromOrders += oi.quantity // always accumulate for supplement
    }

    // 5. Generate date range array
    const allDates: string[] = []
    const cursor = new Date(fromDate)
    while (cursor <= toDate) {
      allDates.push(cursor.toISOString().split('T')[0])
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    // 6. Build result items
    let itemsWithVariance = 0
    let totalVarianceUnits = 0

    const resultItems = barcodeItems.map(item => {
      const dayMap = itemDayMap[item.id]

      // Walk backwards from current stockQuantity to derive closing stock per day.
      // closingStock[lastDay] = current DB stock
      // closingStock[day-1] = closingStock[day] - netMovement[day]
      const closingByDate: Record<string, number> = {}
      let running = item.stockQuantity
      for (const dateStr of [...allDates].reverse()) {
        closingByDate[dateStr] = running
        const b = dayMap[dateStr]
        if (b) {
          // Use Math.max: movements may be a partial subset of order items on the same day
          const qtySold = Math.max(b.qtySoldFromMovements, b.qtySoldFromOrders)
          running = running - b.qtyAdded + qtySold - b.qtyAdjustedNet + b.qtyLost
        }
      }

      const days = allDates.map((dateStr, idx) => {
        const b = dayMap[dateStr]
        const qtySold = b ? Math.max(b.qtySoldFromMovements, b.qtySoldFromOrders) : 0
        const closingStock = closingByDate[dateStr] ?? item.stockQuantity
        const netMovement = (b?.qtyAdded ?? 0) - qtySold + (b?.qtyAdjustedNet ?? 0) - (b?.qtyLost ?? 0)
        const openingStock = closingStock - netMovement
        const isLastDay = idx === allDates.length - 1
        const variance = isLastDay ? item.stockQuantity - closingStock : null

        return {
          date: dateStr,
          openingStock,
          qtyAdded: b?.qtyAdded ?? 0,
          qtySold,
          totalSales: b ? Math.round(b.totalSales * 100) / 100 : 0,
          qtyAdjusted: b?.qtyAdjustedNet ?? 0,
          qtyLost: b?.qtyLost ?? 0,
          closingStock,
          currentActualStock: isLastDay ? item.stockQuantity : null,
          variance,
        }
      })

      // When viewing a single item show all days; otherwise only days with activity
      const activeDays = itemId
        ? days
        : days.filter(d => {
            const b = dayMap[d.date]
            return b && (b.qtyAdded > 0 || b.qtySoldFromMovements > 0 || b.qtySoldFromOrders > 0 || b.totalSales > 0 || Math.abs(b.qtyAdjustedNet) > 0 || b.qtyLost > 0)
          })

      const lastDay = days[days.length - 1]
      if (lastDay?.variance !== null && lastDay?.variance !== undefined && lastDay.variance !== 0) {
        itemsWithVariance++
        totalVarianceUnits += lastDay.variance
      }

      return {
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        category: item.business_category?.name ?? null,
        currentStock: item.stockQuantity,
        system: 'BARCODE' as const,
        days: activeDays,
      }
    }).filter(item => (itemId ? true : item.days.length > 0))

    return NextResponse.json({
      success: true,
      period: { from: fromStr, to: toStr },
      items: resultItems,
      summary: {
        totalItems: resultItems.length,
        itemsWithVariance,
        totalVarianceUnits,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    console.error('[activity-report GET]', error)
    return NextResponse.json({ error: 'Failed to generate activity report' }, { status: 500 })
  }
}
