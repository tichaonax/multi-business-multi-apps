/**
 * Daily Sales Summary API
 * GET: Get daily sales summary for restaurant business
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get today's business day (considering 5AM cutoff)
function getTodayBusinessDay(timezone: string = 'America/New_York'): { start: Date; end: Date; dateStr: string } {
  const now = new Date()

  // Get current hour in timezone
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  })
  const hourStr = hourFormatter.format(now)
  const currentHour = parseInt(hourStr, 10)

  // If before 5AM, use previous day
  let businessDayDate = now
  if (currentHour < 5) {
    businessDayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  // Get date string
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = dateFormatter.format(businessDayDate)

  // Business day starts at 5AM today (or 5AM yesterday if before 5AM)
  const [year, month, day] = dateStr.split('-').map(Number)
  const start = new Date(year, month - 1, day, 5, 0, 0)

  // Business day ends at 5AM tomorrow
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
    const timezone = searchParams.get('timezone') || 'America/New_York'
    const requestedDate = searchParams.get('date') // Optional: specific date for historical reports

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }

    // Get business day (either requested date or today)
    let start: Date, end: Date, dateStr: string

    if (requestedDate) {
      // Historical report: use the requested date
      const [year, month, day] = requestedDate.split('-').map(Number)
      start = new Date(year, month - 1, day, 5, 0, 0)
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      dateStr = requestedDate
    } else {
      // Current day report: use today's business day
      const today = getTodayBusinessDay(timezone)
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

    // Get all orders for today (support all business types)
    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId: businessId,
        businessType: business.type,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      include: {
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
      },
    })

    // Calculate totals
    const totalOrders = orders.length
    const totalSales = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    const totalTax = orders.reduce((sum, order) => sum + Number(order.taxAmount || 0), 0)

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
    const employeeSales: Record<string, { name: string; orders: number; sales: number }> = {}
    orders.forEach(order => {
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

    // Group by category
    const categoryBreakdown: Record<
      string,
      { name: string; itemCount: number; totalSales: number }
    > = {}

    orders.forEach(order => {
      order.business_order_items.forEach(item => {
        const product = item.product_variants?.business_products
        const category = product?.business_categories
        const categoryId = category?.id || 'uncategorized'
        const categoryName = category?.name || 'Uncategorized'

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

    // Get receipt count for today
    const receiptSequence = await prisma.receiptSequences.findUnique({
      where: {
        businessId_date: {
          businessId,
          date: dateStr,
        },
      },
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
          totalTax,
          averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
          receiptsIssued: receiptSequence?.lastSequence || 0,
        },
        paymentMethods,
        employeeSales: Object.values(employeeSales).sort(
          (a, b) => b.sales - a.sales
        ),
        categoryBreakdown: Object.values(categoryBreakdown).sort(
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
