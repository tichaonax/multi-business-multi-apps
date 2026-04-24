import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// GET — delivery sales, credit, blacklist, and run summary reports
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    const perms = getEffectivePermissions(user, businessId ?? undefined)
    if (!perms.canViewDeliveryReports) {
      return NextResponse.json({ error: 'Forbidden: canViewDeliveryReports required' }, { status: 403 })
    }
    const reportType = searchParams.get('reportType') || 'sales' // sales | credit | blacklist | runs
    const from = searchParams.get('from') // ISO date string
    const to = searchParams.get('to')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const dateFilter = from && to
      ? { gte: new Date(from), lte: new Date(to) }
      : undefined

    if (reportType === 'sales') {
      // Orders placed for this business with delivery meta in date range
      const orders = await prisma.businessOrders.findMany({
        where: {
          businessId,
          status: { not: 'CANCELLED' },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        select: { id: true, totalAmount: true, createdAt: true },
      })
      const orderIds = orders.map((o) => o.id)

      const metas = await prisma.deliveryOrderMeta.findMany({
        where: { orderId: { in: orderIds } },
      })
      const metaMap = new Map(metas.map((m) => [m.orderId, m]))

      const deliveryOrders = orders
        .filter((o) => metaMap.has(o.id))
        .map((o) => ({ ...o, meta: metaMap.get(o.id) }))

      const totalOrders = deliveryOrders.length
      const totalRevenue = deliveryOrders.reduce((s, o) => s + Number(o.totalAmount), 0)
      const totalCreditUsed = deliveryOrders.reduce((s, o) => s + Number(o.meta?.creditUsed || 0), 0)
      const totalCashToCollect = totalRevenue - totalCreditUsed

      return NextResponse.json({
        success: true,
        report: { type: 'sales', totalOrders, totalRevenue, totalCreditUsed, totalCashToCollect, orders: deliveryOrders },
      })
    }

    if (reportType === 'credit') {
      const accounts = await prisma.deliveryCustomerAccounts.findMany({
        where: { businessId },
        include: {
          customer: { select: { name: true, phone: true, customerNumber: true } },
          transactions: {
            where: dateFilter ? { createdAt: dateFilter } : undefined,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { balance: 'desc' },
      })
      return NextResponse.json({ success: true, report: { type: 'credit', accounts } })
    }

    if (reportType === 'blacklist') {
      const banned = await prisma.deliveryCustomerAccounts.findMany({
        where: { businessId, isBlacklisted: true },
        include: {
          customer: { select: { name: true, phone: true, customerNumber: true } },
        },
        orderBy: { blacklistedAt: 'desc' },
      })
      return NextResponse.json({ success: true, report: { type: 'blacklist', customers: banned } })
    }

    if (reportType === 'runs') {
      const runs = await prisma.deliveryRuns.findMany({
        where: {
          businessId,
          ...(dateFilter ? { runDate: dateFilter } : {}),
        },
        include: {
          driver: { select: { fullName: true } },
          orders: { select: { orderId: true, status: true, paymentMode: true, creditUsed: true } },
        },
        orderBy: { runDate: 'desc' },
      })

      const runsWithStats = runs.map((run) => {
        const distance =
          run.odometerEnd && run.odometerStart
            ? Number(run.odometerEnd) - Number(run.odometerStart)
            : null
        return { ...run, distanceKm: distance }
      })

      return NextResponse.json({ success: true, report: { type: 'runs', runs: runsWithStats } })
    }

    return NextResponse.json({ error: `Unknown reportType: ${reportType}` }, { status: 400 })
  } catch (error) {
    console.error('Error fetching delivery report:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
