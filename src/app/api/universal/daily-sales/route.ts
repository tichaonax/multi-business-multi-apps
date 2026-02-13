/**
 * Universal Daily Sales Summary API
 * GET: Get daily sales summary for any business type
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission, isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

/**
 * Get the UTC offset in ms for an IANA timezone at a given moment.
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

  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const [year, month, day] = dateStr.split('-').map(Number)

  const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
  const offsetMs = getTimezoneOffsetMs(timezone, new Date(midnightUTC))
  const start = new Date(midnightUTC - offsetMs)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return { start, end, dateStr }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const businessType = searchParams.get('businessType')
    const timezone = searchParams.get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone
    const requestedDate = searchParams.get('date') // Optional: specific date for historical reports
    const startDate = searchParams.get('startDate') // Optional: start date for date range
    const endDate = searchParams.get('endDate') // Optional: end date for date range
    const employeeId = searchParams.get('employeeId') // Optional: filter by sales person

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to access financial data for this business
    if (!isSystemAdmin(user) && !await hasUserPermission(user, 'canAccessFinancialData', businessId)) {
      return NextResponse.json({ error: 'Insufficient permissions to access financial data' }, { status: 403 })
    }

    // Get business day (date range, requested date, or today)
    let start: Date, end: Date, dateStr: string

    if (startDate && endDate) {
      // Date range query: use provided start and end dates in the given timezone
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
      const startMidnightUTC = Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0)
      const endMidnightUTC = Date.UTC(endYear, endMonth - 1, endDay + 1, 0, 0, 0) // start of day AFTER endDate
      const startOffsetMs = getTimezoneOffsetMs(timezone, new Date(startMidnightUTC))
      const endOffsetMs = getTimezoneOffsetMs(timezone, new Date(endMidnightUTC))
      start = new Date(startMidnightUTC - startOffsetMs)
      end = new Date(endMidnightUTC - endOffsetMs)
      dateStr = `${startDate} to ${endDate}`
    } else if (requestedDate) {
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

    // Build where clause - include manual backdated entries via transactionDate
    const baseWhere: any = { businessId }
    if (businessType) baseWhere.businessType = businessType
    if (employeeId) baseWhere.employeeId = employeeId

    const orderInclude = {
      business_order_items: {
        include: {
          product_variants: {
            include: {
              business_products: {
                select: {
                  categoryId: true,
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
      employees: {
        select: {
          id: true,
          fullName: true,
          employeeNumber: true,
        },
      },
    }

    // Query orders for the period
    // Try transactionDate OR filter first (for backdated manual entries)
    // Falls back to createdAt-only if transactionDate field not yet available in Prisma client
    let orders: any[]
    try {
      orders = await prisma.businessOrders.findMany({
        where: {
          ...baseWhere,
          OR: [
            { transactionDate: { gte: start, lt: end } },
            { transactionDate: null, createdAt: { gte: start, lt: end } },
          ],
        },
        include: orderInclude,
      })
    } catch {
      orders = await prisma.businessOrders.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: start, lt: end },
        },
        include: orderInclude,
      })
    }

    // Calculate totals
    const totalOrders = orders.length
    const totalSales = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    const totalTax = orders.reduce((sum, order) => sum + Number(order.taxAmount || 0), 0)
    const totalDiscount = orders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0)
    const subtotal = orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0)

    // Group by payment method
    const paymentMethods: Record<string, { count: number; total: number }> = {}
    orders.forEach(order => {
      const method = (order.paymentMethod || 'UNKNOWN').toUpperCase()
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 }
      }
      paymentMethods[method].count++
      paymentMethods[method].total += Number(order.totalAmount || 0)
    })

    // Group by employee/salesperson
    const employeeSales: Record<string, { name: string; employeeNumber: string; orders: number; sales: number }> = {}
    orders.forEach(order => {
      const employeeId = order.employeeId || 'unknown'
      const employeeName = order.employees?.fullName || (order.attributes as any)?.employeeName || 'Walk-in/Unknown'
      const employeeNumber = order.employees?.employeeNumber || ''

      if (!employeeSales[employeeId]) {
        employeeSales[employeeId] = {
          name: employeeName,
          employeeNumber: employeeNumber,
          orders: 0,
          sales: 0
        }
      }
      employeeSales[employeeId].orders++
      employeeSales[employeeId].sales += Number(order.totalAmount || 0)
    })

    // Group by category
    const categoryBreakdown: Record<
      string,
      { name: string; itemCount: number; totalSales: number }
    > = {}

    orders.forEach(order => {
      // Check if order has category data in attributes (from seed data)
      const orderAttributes = order.attributes as any
      if (orderAttributes?.categories && Array.isArray(orderAttributes.categories)) {
        orderAttributes.categories.forEach((cat: any) => {
          const categoryName = cat.name || 'Uncategorized'
          const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-')

          if (!categoryBreakdown[categoryId]) {
            categoryBreakdown[categoryId] = {
              name: categoryName,
              itemCount: 0,
              totalSales: 0,
            }
          }

          categoryBreakdown[categoryId].itemCount += cat.quantity || 0
          categoryBreakdown[categoryId].totalSales += Number(cat.total || 0)
        })
      } else {
        // Fallback to product-based category lookup
        order.business_order_items.forEach(item => {
          const product = item.product_variants?.business_products
          const category = product?.business_categories
          const categoryId = category?.id || item.notes?.toLowerCase().replace(/\s+/g, '-') || 'uncategorized'
          const categoryName = category?.name || item.notes || 'Uncategorized'

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
      }
    })

    // Group by order status
    const orderStatusBreakdown: Record<string, { count: number; total: number }> = {}
    orders.forEach(order => {
      const status = order.status || 'UNKNOWN'
      if (!orderStatusBreakdown[status]) {
        orderStatusBreakdown[status] = { count: 0, total: 0 }
      }
      orderStatusBreakdown[status].count++
      orderStatusBreakdown[status].total += Number(order.totalAmount || 0)
    })

    // Calculate hourly breakdown
    const hourlyBreakdown: Record<number, { hour: number; orders: number; sales: number }> = {}
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours()
      if (!hourlyBreakdown[hour]) {
        hourlyBreakdown[hour] = { hour, orders: 0, sales: 0 }
      }
      hourlyBreakdown[hour].orders++
      hourlyBreakdown[hour].sales += Number(order.totalAmount || 0)
    })

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
          subtotal,
          totalTax,
          totalDiscount,
          averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
          receiptsIssued: totalOrders,
        },
        paymentMethods,
        employeeSales: Object.values(employeeSales).sort(
          (a, b) => b.sales - a.sales
        ),
        categoryBreakdown: Object.values(categoryBreakdown).sort(
          (a, b) => b.totalSales - a.totalSales
        ),
        orderStatusBreakdown,
        hourlyBreakdown: Object.values(hourlyBreakdown).sort(
          (a, b) => a.hour - b.hour
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
