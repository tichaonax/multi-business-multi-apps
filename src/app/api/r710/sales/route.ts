/**
 * R710 WiFi Token Sales API
 * Queries R710TokenSales (the actual sale records) joined to token/config/wlan data.
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
    const dateRange  = searchParams.get('dateRange') // 'today' | 'week' | 'month' | 'all'

    if (!businessId) return NextResponse.json({ error: 'Business ID required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
      })
      if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Date filter on R710TokenSales.soldAt
    const now = new Date()
    const startDate: Date = (() => {
      switch (dateRange) {
        case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate())
        case 'week':  return new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
        case 'month': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        default:      return new Date(0)
      }
    })()

    // Fetch paginated sale records (most recent first)
    const saleRecords = await prisma.r710TokenSales.findMany({
      where: { businessId, soldAt: { gte: startDate } },
      include: {
        r710_tokens: {
          include: {
            r710_token_configs: { select: { name: true } },
            r710_wlans:         { select: { ssid: true } },
          },
        },
        users: { select: { name: true, email: true } },
      },
      orderBy: { soldAt: 'desc' },
      take: 500,
    })

    // All-time aggregate for stats
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last7Start  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
    const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [allAgg, todayAgg, last7Agg, last30Agg] = await Promise.all([
      prisma.r710TokenSales.aggregate({ where: { businessId }, _sum: { saleAmount: true }, _count: true }),
      prisma.r710TokenSales.aggregate({ where: { businessId, soldAt: { gte: todayStart  } }, _sum: { saleAmount: true }, _count: true }),
      prisma.r710TokenSales.aggregate({ where: { businessId, soldAt: { gte: last7Start  } }, _sum: { saleAmount: true }, _count: true }),
      prisma.r710TokenSales.aggregate({ where: { businessId, soldAt: { gte: last30Start } }, _sum: { saleAmount: true }, _count: true }),
    ])

    const totalSales   = allAgg._count
    const totalRevenue = Number(allAgg._sum.saleAmount || 0)
    const averagePrice = totalSales > 0 ? totalRevenue / totalSales : 0

    // Activation rate: how many sold tokens were actually used
    const activatedCount = await prisma.r710Tokens.count({
      where: { businessId, firstUsedAt: { not: null } },
    })
    const activationRate = totalSales > 0 ? (activatedCount / totalSales) * 100 : 0

    const stats = {
      totalSales,
      totalRevenue,
      averagePrice,
      activatedCount,
      activationRate,
      todaySales:     todayAgg._count,
      todayRevenue:   Number(todayAgg._sum.saleAmount  || 0),
      last7DaysSales: last7Agg._count,
      last7DaysRevenue: Number(last7Agg._sum.saleAmount  || 0),
      last30DaysSales: last30Agg._count,
      last30DaysRevenue: Number(last30Agg._sum.saleAmount || 0),
    }

    const sales = saleRecords.map(sale => ({
      id:          sale.id,
      username:    sale.r710_tokens.username,
      password:    sale.r710_tokens.password,
      status:      sale.r710_tokens.status,
      salePrice:   Number(sale.saleAmount),
      soldAt:      sale.soldAt,
      activatedAt: sale.r710_tokens.firstUsedAt,
      expiresAt:   sale.r710_tokens.expiresAtR710,
      tokenConfig: sale.r710_tokens.r710_token_configs
        ? { name: sale.r710_tokens.r710_token_configs.name }
        : null,
      wlan: sale.r710_tokens.r710_wlans
        ? { ssid: sale.r710_tokens.r710_wlans.ssid }
        : null,
      soldBy: sale.users?.name || sale.users?.email || null,
      paymentMethod: sale.paymentMethod,
    }))

    return NextResponse.json({ sales, stats, count: sales.length })
  } catch (error) {
    console.error('[R710 Sales API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
  }
}
