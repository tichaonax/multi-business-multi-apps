/**
 * R710 WiFi Token Analytics API
 * Queries R710TokenSales (the actual sale records) for revenue trends and package performance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const dateRange  = searchParams.get('dateRange') // 'week' | 'month' | 'all'

    if (!businessId) return NextResponse.json({ error: 'Business ID required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
      })
      if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const now = new Date()
    const startDate: Date = (() => {
      switch (dateRange) {
        case 'week':  return new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
        case 'month': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        default:      return new Date(0)
      }
    })()

    // Fetch all sales in range with token config info
    const soldRecords = await prisma.r710TokenSales.findMany({
      where: { businessId, soldAt: { gte: startDate } },
      include: {
        r710_tokens: {
          include: {
            r710_token_configs: { select: { name: true } },
          },
        },
      },
      orderBy: { soldAt: 'asc' },
    })

    // ── Package performance ──────────────────────────────────────────────────
    const packageMap = new Map<string, { totalSales: number; totalRevenue: number; activatedCount: number }>()

    for (const sale of soldRecords) {
      const pkgName = sale.r710_tokens.r710_token_configs?.name ?? 'Unknown'
      if (!packageMap.has(pkgName)) packageMap.set(pkgName, { totalSales: 0, totalRevenue: 0, activatedCount: 0 })
      const pkg = packageMap.get(pkgName)!
      pkg.totalSales++
      pkg.totalRevenue += Number(sale.saleAmount)
      if (sale.r710_tokens.firstUsedAt) pkg.activatedCount++
    }

    const packagePerformance = Array.from(packageMap.entries())
      .map(([packageName, data]) => ({
        packageName,
        totalSales:     data.totalSales,
        totalRevenue:   data.totalRevenue,
        activationRate: data.totalSales > 0 ? (data.activatedCount / data.totalSales) * 100 : 0,
        averagePrice:   data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    // ── Daily revenue ────────────────────────────────────────────────────────
    const dailyMap = new Map<string, { sales: number; revenue: number }>()

    for (const sale of soldRecords) {
      const dateKey = new Date(sale.soldAt).toISOString().split('T')[0]
      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { sales: 0, revenue: 0 })
      const day = dailyMap.get(dateKey)!
      day.sales++
      day.revenue += Number(sale.saleAmount)
    }

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, sales: data.sales, revenue: data.revenue }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalSales   = soldRecords.length
    const totalRevenue = soldRecords.reduce((s, r) => s + Number(r.saleAmount), 0)
    const averageOrderValue   = totalSales > 0 ? totalRevenue / totalSales : 0
    const activatedCount      = soldRecords.filter(r => r.r710_tokens.firstUsedAt !== null).length
    const overallActivationRate = totalSales > 0 ? (activatedCount / totalSales) * 100 : 0

    // ── Top metrics ──────────────────────────────────────────────────────────
    const bestSellingPackage    = packagePerformance[0]?.packageName ?? null
    const highestRevenuePackage = packagePerformance[0]?.packageName ?? null
    const bestActivationPkg     = packagePerformance.length > 0
      ? packagePerformance.reduce((m, p) => p.activationRate > m.activationRate ? p : m, packagePerformance[0]).packageName
      : null
    const peakSalesDay = dailyRevenue.length > 0
      ? new Date(
          dailyRevenue.reduce((m, d) => d.sales > m.sales ? d : m, dailyRevenue[0]).date
        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null

    return NextResponse.json({
      packagePerformance,
      dailyRevenue,
      topMetrics: {
        bestSellingPackage,
        highestRevenuePackage,
        bestActivationRate: bestActivationPkg,
        peakSalesDay,
      },
      summary: { totalSales, totalRevenue, averageOrderValue, overallActivationRate },
    })
  } catch (error) {
    console.error('[R710 Analytics API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
  }
}
