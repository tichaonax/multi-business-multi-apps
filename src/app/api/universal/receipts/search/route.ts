import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const query = searchParams.get('query') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Check if user has access to this business (system admins have access to all)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: businessId,
        },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
      }
    }

    // Build where clause for search
    const whereClause: any = {
      businessId: businessId,
    }

    // Add query filter if provided — searches receipt #, customer name,
    // salesperson name, order notes, and purchased item names.
    //
    // Customer/salesperson names are NOT reliably on the linked relations:
    // orders made by an admin/owner with no Employees record fall back to
    // attributes.employeeName/soldByName (see /api/universal/orders — it
    // always persists one of these when employeeId can't be resolved), and
    // meal-program orders with no real customer store attributes.participantName
    // instead. Searching only the relations misses most real-world rows, so
    // both the relation AND its JSON-attribute fallback are matched here.
    // Item "description" search walks business_order_items -> the product's
    // name (via its variant), with the same attributes.productName fallback
    // used when an item isn't linked to a real product/variant.
    if (query) {
      const asNumber = parseFloat(query)
      // MBM-338: names kept in JSON attributes (item names, WiFi package names
      // and codes, salesperson fallbacks) were matched case-sensitively by
      // Prisma's string_contains, so e.g. "pass" missed "8 Hour Pass" and
      // "wifi" matched nothing (WiFi items are named "📶 8 Hour Pass"). Match
      // them case-insensitively in SQL; "wifi"/"wi-fi" finds every WiFi sale.
      const like = `%${query.replace(/[\\%_]/g, m => '\\' + m)}%`
      const wantsWifi = /wi-?fi/i.test(query)
      const jsonMatches = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT o.id FROM business_orders o
        LEFT JOIN business_order_items i ON i."orderId" = o.id
        WHERE o."businessId" = ${businessId}
          AND (
            o.attributes->>'employeeName' ILIKE ${like}
            OR o.attributes->>'soldByName' ILIKE ${like}
            OR o.attributes->>'participantName' ILIKE ${like}
            OR i.attributes->>'productName' ILIKE ${like}
            OR i.attributes->>'packageName' ILIKE ${like}
            OR (i.attributes->'tokenCodes')::text ILIKE ${like}
            OR (${wantsWifi} AND (i.attributes->>'r710Token' = 'true' OR i.attributes->>'wifiToken' = 'true'))
          )
        LIMIT 5000`
      whereClause.OR = [
        ...(jsonMatches.length > 0 ? [{ id: { in: jsonMatches.map(r => r.id) } }] : []),
        { orderNumber: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
        { business_customers: { name: { contains: query, mode: 'insensitive' } } },
        { employees: { fullName: { contains: query, mode: 'insensitive' } } },
        { attributes: { path: ['employeeName'], string_contains: query } },
        { attributes: { path: ['soldByName'], string_contains: query } },
        { attributes: { path: ['participantName'], string_contains: query } },
        {
          business_order_items: {
            some: {
              OR: [
                { product_variants: { name: { contains: query, mode: 'insensitive' } } },
                { product_variants: { business_products: { name: { contains: query, mode: 'insensitive' } } } },
                { attributes: { path: ['productName'], string_contains: query } },
              ],
            },
          },
        },
        ...(isNaN(asNumber) ? [] : [{ totalAmount: { equals: asNumber } }]),
      ]
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    // Fetch orders
    const orders = await prisma.businessOrders.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        employeeId: true,
        totalAmount: true,
        discountAmount: true,
        businessType: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        createdBy: true,
        attributes: true,
        business_customers: {
          select: {
            name: true,
            phone: true,
          },
        },
        employees: {
          select: {
            fullName: true,
          },
        },
        business_order_items: {
          select: {
            quantity: true,
            totalPrice: true,
            attributes: true,
            product_variants: {
              select: {
                name: true,
                business_products: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    // MBM-338: WiFi codes per order line. New sales save them on the line
    // (tokenCodes); older POS sales didn't, so match them from the WiFi sales
    // made by the same person, for the same pass, within 2 minutes of the order.
    const oldWifiLines = orders.flatMap(o => o.business_order_items
      .filter(i => (i.attributes as any)?.r710Token === true && !(i.attributes as any)?.notIssued
        && !Array.isArray((i.attributes as any)?.tokenCodes) && !Array.isArray((i.attributes as any)?.tokenIds))
      .map(i => ({ order: o, item: i })))
    const matchedCodes = new Map<any, string[]>() // order item object → codes
    if (oldWifiLines.length > 0) {
      const times = oldWifiLines.map(l => l.order.createdAt.getTime())
      const sales = await prisma.r710TokenSales.findMany({
        where: {
          businessId,
          soldAt: { gte: new Date(Math.min(...times) - 60_000), lte: new Date(Math.max(...times) + 120_000) },
        },
        select: { soldAt: true, soldBy: true, tokenId: true, r710_tokens: { select: { password: true, tokenConfigId: true } } },
        orderBy: { soldAt: 'asc' },
      })
      const used = new Set<string>()
      for (const { order, item } of oldWifiLines) {
        const t = order.createdAt.getTime()
        const cfg = (item.attributes as any)?.tokenConfigId
        const codes: string[] = []
        for (const s of sales) {
          if (codes.length >= item.quantity) break
          if (used.has(s.tokenId) || s.soldBy !== order.createdBy || s.r710_tokens?.tokenConfigId !== cfg) continue
          const st = s.soldAt.getTime()
          if (st < t - 60_000 || st > t + 120_000) continue
          used.add(s.tokenId)
          codes.push(s.r710_tokens.password)
        }
        if (codes.length > 0) matchedCodes.set(item, codes)
      }
    }
    // Lines that saved tokenIds but not the codes (restaurant, before MBM-338)
    const idOnlyLines = orders.flatMap(o => o.business_order_items)
      .filter(i => !Array.isArray((i.attributes as any)?.tokenCodes) && Array.isArray((i.attributes as any)?.tokenIds))
    if (idOnlyLines.length > 0) {
      const ids = idOnlyLines.flatMap(i => (i.attributes as any).tokenIds as string[])
      const toks = await prisma.r710Tokens.findMany({ where: { id: { in: ids } }, select: { id: true, password: true } })
      const pw = new Map(toks.map(t => [t.id, t.password]))
      for (const i of idOnlyLines) {
        const codes = ((i.attributes as any).tokenIds as string[]).map(id => pw.get(id)).filter(Boolean) as string[]
        if (codes.length > 0) matchedCodes.set(i, codes)
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.businessOrders.count({
      where: whereClause,
    })

    // Check which orders have a DENIED cancellation attempt or are CANCELLED (with refund amount)
    const orderIds = orders.map(o => o.id)
    const [deniedLogs, cancellations] = orderIds.length > 0
      ? await Promise.all([
          prisma.managerOverrideLog.findMany({
            where: { targetId: { in: orderIds }, action: 'ORDER_CANCELLATION', outcome: 'DENIED' },
            select: { targetId: true },
          }),
          prisma.orderCancellation.findMany({
            where: { orderId: { in: orderIds } },
            select: { orderId: true, refundAmount: true },
          }),
        ])
      : [[], []]
    const deniedOrderIds = new Set(deniedLogs.map((l: any) => l.targetId))
    const refundMap = new Map((cancellations as any[]).map(c => [c.orderId, Number(c.refundAmount)]))

    // Reassignment history — each log covers a whole bulk action, so metadata.orderIds
    // may include orders outside this page; metadata.from[].orderIds pins down which
    // employee a *specific* order moved from within that action.
    const reassignLogs = orderIds.length > 0
      ? await prisma.managerOverrideLog.findMany({
          where: {
            action: 'SALE_REASSIGNMENT',
            OR: orderIds.map(id => ({ metadata: { path: ['orderIds'], array_contains: id } })),
          },
          select: { staffReason: true, createdAt: true, metadata: true, manager: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : []
    const historyByOrderId = new Map<string, Array<{
      fromEmployeeName: string; toEmployeeName: string; reason: string; reassignedAt: Date; reassignedByName: string | null
    }>>()
    for (const log of reassignLogs) {
      const meta = log.metadata as any
      for (const oid of (meta?.orderIds || []) as string[]) {
        if (!orderIds.includes(oid)) continue
        const fromEntry = (meta.from || []).find((f: any) => (f.orderIds || []).includes(oid))
        const arr = historyByOrderId.get(oid) ?? []
        arr.push({
          fromEmployeeName: fromEntry?.name ?? 'Unknown',
          toEmployeeName: meta.toEmployeeName ?? 'Unknown',
          reason: log.staffReason,
          reassignedAt: log.createdAt,
          reassignedByName: log.manager?.name ?? null,
        })
        historyByOrderId.set(oid, arr)
      }
    }

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.business_customers?.name || (order.attributes as any)?.participantName || 'Walk-in Customer',
        customerPhone: order.business_customers?.phone || null,
        salespersonName: order.employees?.fullName
          || (order.attributes as any)?.employeeName
          || (order.attributes as any)?.soldByName
          || null,
        totalAmount: order.totalAmount,
        discountAmount: Number(order.discountAmount || 0),
        rewardCouponCode: (order.attributes as any)?.rewardCouponCode || null,
        mealProgram: (order.attributes as any)?.mealProgram === true,
        hasCombo: order.business_order_items.some(item => !!(item.attributes as any)?.isCombo),
        // Most-expensive-first so the mobile card can show the top few
        // items inline without a round trip — see ReceiptHistoryPage.
        items: order.business_order_items
          .map(item => {
            const a = (item.attributes as any) || {}
            const saved = Array.isArray(a.tokenCodes) ? (a.tokenCodes as string[]) : null
            return {
              name: item.product_variants?.business_products?.name
                || item.product_variants?.name
                || a.productName
                || 'Item',
              quantity: item.quantity,
              totalPrice: Number(item.totalPrice),
              // MBM-338: WiFi details for the Items column / hover popup
              isWifi: a.r710Token === true || a.wifiToken === true,
              wifiCodes: saved ?? matchedCodes.get(item) ?? [],
              wifiCodesMatched: !saved && !Array.isArray(a.tokenIds) && matchedCodes.has(item),
              notIssued: a.notIssued === true,
              notChargedAmount: a.notIssued ? Number(a.notChargedAmount || 0) : 0,
            }
          })
          .sort((a, b) => b.totalPrice - a.totalPrice),
        directWifiSale: (order.attributes as any)?.directWifiSale === true,
        businessType: order.businessType,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
        cancellationOutcome: order.status === 'CANCELLED' ? 'CANCELLED' : deniedOrderIds.has(order.id) ? 'DENIED' : null,
        refundAmount: refundMap.get(order.id) ?? null,
        reassignmentHistory: historyByOrderId.get(order.id) ?? [],
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Receipt search error:', error)
    return NextResponse.json(
      { error: 'Failed to search receipts' },
      { status: 500 }
    )
  }
}
