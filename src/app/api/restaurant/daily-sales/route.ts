/**
 * Daily Sales Summary API
 * GET: Get daily sales summary for restaurant business
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * Get the UTC offset in ms for an IANA timezone at a given moment.
 * Works correctly with DST transitions.
 */
function getTimezoneOffsetMs(timezone: string, date: Date = new Date()): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone })
  return new Date(tzStr).getTime() - new Date(utcStr).getTime()
}

/**
 * Get today's midnight-to-midnight boundary in a given IANA timezone,
 * returned as UTC Date objects for use in DB queries.
 */
function getTodayInTimezone(timezone: string): { start: Date; end: Date; dateStr: string } {
  const now = new Date()

  // Get today's date in the target timezone (YYYY-MM-DD)
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const [year, month, day] = dateStr.split('-').map(Number)

  // Midnight UTC for that date, then shift by the timezone offset
  const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
  const offsetMs = getTimezoneOffsetMs(timezone, new Date(midnightUTC))
  const start = new Date(midnightUTC - offsetMs)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return { start, end, dateStr }
}

const ORDER_INCLUDE = {
  business_order_items: {
    include: {
      product_variants: {
        include: {
          business_products: {
            select: {
              categoryId: true,
              name: true,
              business_categories: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const timezone = searchParams.get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone
    const requestedDate = searchParams.get('date') // Optional: specific date for historical reports

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    // Get business day (either requested date or today)
    let start: Date, end: Date, dateStr: string

    if (requestedDate) {
      // Historical report: use the requested date in the given timezone
      const [year, month, day] = requestedDate.split('-').map(Number)
      const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
      const offsetMs = getTimezoneOffsetMs(timezone, new Date(midnightUTC))
      start = new Date(midnightUTC - offsetMs)
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      dateStr = requestedDate
    } else {
      // Current day report in the client's timezone
      const today = getTodayInTimezone(timezone)
      start = today.start
      end = today.end
      dateStr = today.dateStr
    }

    // Get business to determine type
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { type: true }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Query orders for today
    // Try transactionDate OR filter first (for backdated manual entries)
    // Falls back to createdAt-only if transactionDate field not yet available in Prisma client
    let orders: any[]
    try {
      orders = await prisma.businessOrders.findMany({
        where: {
          businessId,
          businessType: business.type,
          OR: [
            { transactionDate: { gte: start, lt: end } },
            { transactionDate: null, createdAt: { gte: start, lt: end } },
          ],
        },
        include: ORDER_INCLUDE,
      })
    } catch {
      orders = await prisma.businessOrders.findMany({
        where: {
          businessId,
          businessType: business.type,
          createdAt: { gte: start, lt: end },
        },
        include: ORDER_INCLUDE,
      })
    }

    // Calculate totals — include ALL orders (meal program is real revenue)
    const regularOrders = orders.filter((o: any) => o.paymentMethod?.toUpperCase() !== 'EXPENSE_ACCOUNT')
    const totalOrders = orders.length
    const totalSales = orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0)
    const totalTax = orders.reduce((sum: number, order: any) => sum + Number(order.taxAmount || 0), 0)

    // Group by payment method (regular orders only — EXPENSE_ACCOUNT shown in meal program section)
    const paymentMethods: Record<string, { count: number; total: number }> = {}
    regularOrders.forEach((order: any) => {
      const method = (order.paymentMethod || 'UNKNOWN').toUpperCase()
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 }
      }
      paymentMethods[method].count++
      paymentMethods[method].total += Number(order.totalAmount || 0)
    })

    // Group by employee/salesperson (regular orders only)
    const employeeSales: Record<string, { name: string; orders: number; sales: number }> = {}
    regularOrders.forEach((order: any) => {
      const employeeName = (order.attributes as any)?.employeeName || 'Unknown'
      if (!employeeSales[employeeName]) {
        employeeSales[employeeName] = {
          name: employeeName,
          orders: 0,
          sales: 0
        }
      }
      employeeSales[employeeName].orders++
      employeeSales[employeeName].sales += Number(order.totalAmount || 0)
    })

    // Group by category (regular orders only)
    const categoryBreakdown: Record<
      string,
      { name: string; itemCount: number; totalSales: number }
    > = {}

    // Collect categoryIds from item attributes for fallback lookup
    const fallbackCategoryIds = new Set<string>()
    regularOrders.forEach((order: any) => {
      order.business_order_items.forEach((item: any) => {
        const product = item.product_variants?.business_products
        if (!product?.business_categories) {
          const attrCatId = (item.attributes as any)?.categoryId
          if (attrCatId) fallbackCategoryIds.add(attrCatId)
        }
      })
    })

    // Batch-fetch fallback categories by categoryId attribute
    let fallbackCategories: Record<string, string> = {}
    if (fallbackCategoryIds.size > 0) {
      const cats = await prisma.businessCategories.findMany({
        where: { id: { in: Array.from(fallbackCategoryIds) } },
        select: { id: true, name: true }
      })
      cats.forEach(c => { fallbackCategories[c.id] = c.name })
    }

    // Collect productIds from item attributes for a second-pass category lookup
    // (meal program items and POS items that store productId in attributes)
    const attrProductIds = new Set<string>()
    regularOrders.forEach((order: any) => {
      order.business_order_items.forEach((item: any) => {
        const product = item.product_variants?.business_products
        if (!product?.business_categories) {
          const pid = (item.attributes as any)?.productId
          if (pid) attrProductIds.add(pid)
        }
      })
    })

    let attrProductCategories: Record<string, { categoryId: string; categoryName: string }> = {}
    if (attrProductIds.size > 0) {
      const prods = await prisma.businessProducts.findMany({
        where: { id: { in: Array.from(attrProductIds) } },
        select: { id: true, business_categories: { select: { id: true, name: true } } }
      })
      prods.forEach((p: any) => {
        if (p.business_categories) {
          attrProductCategories[p.id] = {
            categoryId: p.business_categories.id,
            categoryName: p.business_categories.name,
          }
          // Also store by categoryId for lookup
          fallbackCategories[p.business_categories.id] = p.business_categories.name
        }
      })
    }

    regularOrders.forEach((order: any) => {
      order.business_order_items.forEach((item: any) => {
        const product = item.product_variants?.business_products
        const category = product?.business_categories
        let categoryId = category?.id
        let categoryName = category?.name

        // Fallback 1: use categoryId from item attributes
        if (!categoryId) {
          const attrCatId = (item.attributes as any)?.categoryId
          if (attrCatId && fallbackCategories[attrCatId]) {
            categoryId = attrCatId
            categoryName = fallbackCategories[attrCatId]
          }
        }

        // Fallback 2: use productId from item attributes to resolve category
        if (!categoryId) {
          const pid = (item.attributes as any)?.productId
          if (pid && attrProductCategories[pid]) {
            categoryName = attrProductCategories[pid].categoryName
            categoryId = attrProductCategories[pid].categoryId
          }
        }

        // Fallback 3: use productName from item attributes
        if (!categoryId) {
          const pName = (item.attributes as any)?.productName
          if (pName) {
            categoryId = 'attr-' + pName.replace(/\s+/g, '-').toLowerCase()
            categoryName = pName
          }
        }

        categoryId = categoryId || 'uncategorized'
        categoryName = categoryName || 'Uncategorized'

        if (!categoryBreakdown[categoryId]) {
          categoryBreakdown[categoryId] = {
            name: categoryName,
            itemCount: 0,
            totalSales: 0,
          }
        }

        categoryBreakdown[categoryId].itemCount += item.quantity
        categoryBreakdown[categoryId].totalSales += Number(item.totalPrice || 0)
      })
    })

    // Group by individual item name for top items breakdown
    const topItemsBreakdown: Record<string, { name: string; quantity: number; totalSales: number }> = {}
    regularOrders.forEach((order: any) => {
      order.business_order_items.forEach((item: any) => {
        const itemName =
          (item.attributes as any)?.productName ||
          item.product_variants?.name ||
          item.product_variants?.business_products?.name ||
          'Unknown Item'
        if (!topItemsBreakdown[itemName]) {
          topItemsBreakdown[itemName] = { name: itemName, quantity: 0, totalSales: 0 }
        }
        topItemsBreakdown[itemName].quantity += item.quantity
        topItemsBreakdown[itemName].totalSales += Number(item.totalPrice || 0)
      })
    })

    // Get receipt count for today
    const receiptSequence = await prisma.receiptSequences.findUnique({
      where: {
        businessId_date: {
          businessId,
          date: dateStr,
        },
      },
    })

    // Expense account (meal program) breakdown for today
    // Source 1: mealProgramTransactions (new system — full detail)
    const mealTxns = await prisma.mealProgramTransactions.findMany({
      where: {
        businessId,
        transactionDate: { gte: start, lt: end },
      },
      select: {
        orderId: true,
        subsidyAmount: true,
        cashAmount: true,
        totalAmount: true,
      },
    })

    // Source 2: businessOrders with EXPENSE_ACCOUNT that have no mealProgramTransaction (legacy orders)
    const trackedOrderIds = new Set(mealTxns.map((t: any) => t.orderId))
    const legacyExpenseOrders = orders.filter(
      (o: any) =>
        o.paymentMethod?.toUpperCase() === 'EXPENSE_ACCOUNT' &&
        !trackedOrderIds.has(o.id)
    )

    const expenseAccountSales = {
      count: mealTxns.length + legacyExpenseOrders.length,
      subsidyTotal:
        mealTxns.reduce((s: number, t: any) => s + Number(t.subsidyAmount || 0), 0) +
        legacyExpenseOrders.reduce((s: number, o: any) => s + Number((o.attributes as any)?.expenseAmount || 0.5), 0),
      cashTotal:
        mealTxns.reduce((s: number, t: any) => s + Number(t.cashAmount || 0), 0) +
        legacyExpenseOrders.reduce((s: number, o: any) => s + Number((o.attributes as any)?.cashAmount || 0), 0),
      total:
        mealTxns.reduce((s: number, t: any) => s + Number(t.totalAmount || 0), 0) +
        legacyExpenseOrders.reduce((s: number, o: any) => s + Number(o.totalAmount || 0), 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        businessDay: {
          date: dateStr,
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalOrders,
          totalSales,
          totalTax,
          averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
          receiptsIssued: receiptSequence?.lastSequence || 0,
        },
        paymentMethods,
        expenseAccountSales,
        employeeSales: Object.values(employeeSales).sort(
          (a, b) => b.sales - a.sales
        ),
        categoryBreakdown: Object.values(categoryBreakdown).sort(
          (a, b) => b.totalSales - a.totalSales
        ),
        topItems: Object.values(topItemsBreakdown).sort(
          (a, b) => b.totalSales - a.totalSales
        ),
      },
    })
  } catch (error) {
    console.error('Error fetching daily sales:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch daily sales',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
