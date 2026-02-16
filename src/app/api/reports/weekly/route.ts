import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/weekly
 *
 * Get aggregated weekly report data
 *
 * Query Parameters:
 * - businessId: string (required)
 * - weekStart: string (ISO date - Monday of the week)
 * - weekEnd: string (ISO date - Sunday of the week)
 *
 * Response:
 * {
 *   success: true
 *   data: {
 *     summary: { totalSales, totalOrders, ... },
 *     paymentMethods: { CASH: {...}, CARD: {...} },
 *     employeeSales: [...],
 *     categoryBreakdown: [...],
 *     dailyBreakdown: [{ date, sales, orders }, ...],
 *     weekPeriod: { start, end }
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get query parameters
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const weekStart = searchParams.get('weekStart')
    const weekEnd = searchParams.get('weekEnd')

    if (!businessId || !weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'Missing required parameters: businessId, weekStart, weekEnd' },
        { status: 400 }
      )
    }

    // 3. Check business access
    const isAdmin = user.role?.toLowerCase() === 'admin'

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: user.id,
          isActive: true
        }
      })

      if (!membership) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this business' },
          { status: 403 }
        )
      }
    }

    // 4. Get all orders for the week
    const startDate = new Date(weekStart)
    const endDate = new Date(weekEnd)
    endDate.setHours(23, 59, 59, 999) // End of day

    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId: businessId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['COMPLETED', 'PAID']
        }
      },
      include: {
        order_items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        employee: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // 5. Calculate summary metrics
    let totalSales = 0
    let totalOrders = orders.length
    let totalTax = 0
    let receiptsIssued = 0

    const paymentMethodsMap = new Map<string, { count: number; total: number }>()
    const employeeSalesMap = new Map<string, { name: string; orders: number; sales: number }>()
    const categoryMap = new Map<string, { name: string; itemCount: number; totalSales: number }>()
    const dailyMap = new Map<string, { date: string; sales: number; orders: number; receipts: number }>()

    orders.forEach(order => {
      const orderTotal = parseFloat(order.total.toString())
      const orderTax = parseFloat(order.taxAmount?.toString() || '0')

      totalSales += orderTotal
      totalTax += orderTax

      if (order.receiptNumber) {
        receiptsIssued++
      }

      // Payment methods
      const paymentMethod = order.paymentMethod || 'CASH'
      const pmData = paymentMethodsMap.get(paymentMethod) || { count: 0, total: 0 }
      pmData.count++
      pmData.total += orderTotal
      paymentMethodsMap.set(paymentMethod, pmData)

      // Employee sales
      if (order.employee) {
        const empKey = order.employee.id
        const empData = employeeSalesMap.get(empKey) || {
          name: `${order.employee.firstName} ${order.employee.lastName}`,
          orders: 0,
          sales: 0
        }
        empData.orders++
        empData.sales += orderTotal
        employeeSalesMap.set(empKey, empData)
      }

      // Category breakdown
      order.order_items.forEach(item => {
        if (item.product?.category) {
          const catKey = item.product.category.id
          const catData = categoryMap.get(catKey) || {
            name: item.product.category.name,
            itemCount: 0,
            totalSales: 0
          }
          catData.itemCount += item.quantity
          catData.totalSales += parseFloat(item.price.toString()) * item.quantity
          categoryMap.set(catKey, catData)
        }
      })

      // Daily breakdown
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
      const dailyData = dailyMap.get(orderDate) || {
        date: orderDate,
        sales: 0,
        orders: 0,
        receipts: 0
      }
      dailyData.sales += orderTotal
      dailyData.orders++
      if (order.receiptNumber) {
        dailyData.receipts++
      }
      dailyMap.set(orderDate, dailyData)
    })

    // 6. Format response
    const paymentMethods: any = {}
    paymentMethodsMap.forEach((data, method) => {
      paymentMethods[method] = data
    })

    const employeeSales = Array.from(employeeSalesMap.values())
      .sort((a, b) => b.sales - a.sales)

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)

    const dailyBreakdown = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))

    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // 7. Return response
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSales: totalSales,
          totalOrders: totalOrders,
          averageOrderValue: averageOrderValue,
          receiptsIssued: receiptsIssued,
          totalTax: totalTax
        },
        paymentMethods: paymentMethods,
        employeeSales: employeeSales,
        categoryBreakdown: categoryBreakdown,
        dailyBreakdown: dailyBreakdown,
        weekPeriod: {
          start: weekStart,
          end: weekEnd,
          startDate: startDate,
          endDate: endDate
        }
      }
    })

  } catch (error: any) {
    console.error('Error fetching weekly report:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch weekly report',
        details: error.message
      },
      { status: 500 }
    )
  }
}
