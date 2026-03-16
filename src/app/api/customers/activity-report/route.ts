import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { OrderStatus } from '@prisma/client'

function getPeriodStart(period: string): Date | null {
  const now = new Date()
  if (period === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (period === '90d') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  if (period === '12m') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  return null // 'all'
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || null
    const period = searchParams.get('period') || '30d'
    const sort = searchParams.get('sort') || 'spend'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const paymentMethodFilter = searchParams.get('paymentMethod') || null

    // Verify user has access
    const isAdmin = (user as any).role === 'admin'
    if (businessId && !isAdmin) {
      const membership = (user as any).businessMemberships?.find(
        (m: any) => m.businessId === businessId && m.isActive
      )
      if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    } else if (!businessId && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const periodStart = getPeriodStart(period)

    // Fetch all completed orders with customer link in the period
    const orders = await prisma.businessOrders.findMany({
      where: {
        ...(businessId ? { businessId } : {}),
        customerId: { not: null },
        status: { in: [OrderStatus.COMPLETED] },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
        ...(paymentMethodFilter ? { paymentMethod: paymentMethodFilter } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        totalAmount: true,
        paymentMethod: true,
        createdAt: true,
        business_order_items: {
          select: { quantity: true, totalPrice: true, attributes: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    if (orders.length === 0) {
      return NextResponse.json({ summary: emptySummary(), customers: [] })
    }

    // Aggregate per customer
    const customerMap = new Map<string, {
      customerId: string
      totalSpend: number
      orderCount: number
      lastVisit: Date
      allDates: Date[]
      recentOrders: { orderNumber: string; date: Date; amount: number; paymentMethod: string | null; itemCount: number }[]
    }>()

    for (const order of orders) {
      const cid = order.customerId!
      const amount = Number(order.totalAmount)
      const existing = customerMap.get(cid)
      if (!existing) {
        customerMap.set(cid, {
          customerId: cid,
          totalSpend: amount,
          orderCount: 1,
          lastVisit: order.createdAt,
          allDates: [order.createdAt],
          recentOrders: [{
            orderNumber: order.orderNumber,
            date: order.createdAt,
            amount,
            paymentMethod: order.paymentMethod ?? null,
            itemCount: order.business_order_items.reduce((s, i) => s + i.quantity, 0),
          }],
        })
      } else {
        existing.totalSpend += amount
        existing.orderCount += 1
        if (order.createdAt > existing.lastVisit) existing.lastVisit = order.createdAt
        existing.allDates.push(order.createdAt)
        if (existing.recentOrders.length < 5) {
          existing.recentOrders.push({
            orderNumber: order.orderNumber,
            date: order.createdAt,
            amount,
            paymentMethod: order.paymentMethod ?? null,
            itemCount: order.business_order_items.reduce((s, i) => s + i.quantity, 0),
          })
        }
      }
    }

    // Fetch customer details for all ids
    const customerIds = Array.from(customerMap.keys())
    const customerRecords = await prisma.businessCustomers.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, customerNumber: true, name: true, phone: true, customerType: true },
    })
    const customerById = new Map(customerRecords.map(c => [c.id, c]))

    const now = new Date()

    // Build result rows
    let rows = Array.from(customerMap.values()).map(agg => {
      const cust = customerById.get(agg.customerId)
      const daysSinceLast = Math.floor((now.getTime() - agg.lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      const status = daysSinceLast < 30 ? 'active' : daysSinceLast < 90 ? 'at_risk' : 'lapsed'

      // Avg days between visits
      let avgDaysBetween: number | null = null
      if (agg.allDates.length > 1) {
        const sorted = [...agg.allDates].sort((a, b) => a.getTime() - b.getTime())
        let totalGap = 0
        for (let i = 1; i < sorted.length; i++) {
          totalGap += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        }
        avgDaysBetween = Math.round(totalGap / (sorted.length - 1))
      }

      return {
        id: agg.customerId,
        customerNumber: cust?.customerNumber ?? '',
        name: cust?.name ?? 'Unknown',
        phone: cust?.phone ?? null,
        orderCount: agg.orderCount,
        totalSpend: Math.round(agg.totalSpend * 100) / 100,
        avgOrderValue: Math.round((agg.totalSpend / agg.orderCount) * 100) / 100,
        lastVisit: agg.lastVisit.toISOString(),
        daysSinceLastVisit: daysSinceLast,
        avgDaysBetweenVisits: avgDaysBetween,
        status,
        recentOrders: agg.recentOrders.map(o => ({
          ...o,
          date: o.date.toISOString(),
          amount: Math.round(o.amount * 100) / 100,
        })),
      }
    })

    // Sort
    if (sort === 'spend') rows.sort((a, b) => b.totalSpend - a.totalSpend)
    else if (sort === 'orders') rows.sort((a, b) => b.orderCount - a.orderCount)
    else if (sort === 'recent') rows.sort((a, b) => a.daysSinceLastVisit - b.daysSinceLastVisit)
    else if (sort === 'avgOrder') rows.sort((a, b) => b.avgOrderValue - a.avgOrderValue)

    rows = rows.slice(0, limit)

    // Summary
    const totalRevenue = rows.reduce((s, r) => s + r.totalSpend, 0)
    const topSpender = rows[0] ?? null
    const mostFrequent = [...rows].sort((a, b) => b.orderCount - a.orderCount)[0] ?? null
    const allAvgDays = rows.map(r => r.avgDaysBetweenVisits).filter((v): v is number => v !== null)
    const avgDaysBetweenVisits = allAvgDays.length
      ? Math.round(allAvgDays.reduce((s, v) => s + v, 0) / allAvgDays.length)
      : null

    const summary = {
      totalCustomers: rows.length,
      trackedRevenue: Math.round(totalRevenue * 100) / 100,
      avgSpend: rows.length ? Math.round((totalRevenue / rows.length) * 100) / 100 : 0,
      topSpender: topSpender ? { name: topSpender.name, amount: topSpender.totalSpend } : null,
      mostFrequent: mostFrequent ? { name: mostFrequent.name, count: mostFrequent.orderCount } : null,
      avgDaysBetweenVisits,
    }

    return NextResponse.json({ summary, customers: rows })
  } catch (error) {
    console.error('[Customer Activity Report] Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

function emptySummary() {
  return {
    totalCustomers: 0,
    trackedRevenue: 0,
    avgSpend: 0,
    topSpender: null,
    mostFrequent: null,
    avgDaysBetweenVisits: null,
  }
}
