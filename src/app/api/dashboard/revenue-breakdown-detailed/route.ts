import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { getBusinessBalance } from '@/lib/business-balance-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userBusinessIds = user.businessMemberships?.map(m => m.businessId) || []

    // Get all businesses the user has access to with financial data permission
    let accessibleBusinesses: any[] = []

    if (isSystemAdmin(user)) {
      accessibleBusinesses = await prisma.businesses.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true }
      })
    } else if (userBusinessIds.length > 0) {
      const businessesWithPermission = await Promise.all(
        userBusinessIds.map(async (businessId) => {
          const hasFinancialAccess = hasPermission(user, 'canAccessFinancialData', businessId)
          if (hasFinancialAccess) {
            return prisma.businesses.findUnique({
              where: { id: businessId, isActive: true },
              select: { id: true, name: true, type: true }
            })
          }
          return null
        })
      )
      accessibleBusinesses = businessesWithPermission.filter(Boolean)
    }

    const allBusinessIds = accessibleBusinesses.map(b => b.id)

    // --- Batch fetch cash bucket balances split by paymentChannel ---
    const cashBucketRows = await prisma.cashBucketEntry.groupBy({
      by: ['businessId', 'direction', 'paymentChannel'] as any,
      where: { businessId: { in: allBusinessIds } },
      _sum: { amount: true },
    })
    const cashBoxMap = new Map<string, number>()
    const ecocashBoxMap = new Map<string, number>()
    for (const row of cashBucketRows as any[]) {
      const amt = Number(row._sum.amount ?? 0)
      if (row.paymentChannel === 'ECOCASH') {
        const cur = ecocashBoxMap.get(row.businessId) ?? 0
        ecocashBoxMap.set(row.businessId, row.direction === 'INFLOW' ? cur + amt : cur - amt)
      } else {
        const cur = cashBoxMap.get(row.businessId) ?? 0
        cashBoxMap.set(row.businessId, row.direction === 'INFLOW' ? cur + amt : cur - amt)
      }
    }

    // --- Batch fetch rent configs + expense account balances ---
    const rentConfigs = await prisma.businessRentConfig.findMany({
      where: { businessId: { in: allBusinessIds }, isActive: true },
      select: {
        businessId: true,
        monthlyRentAmount: true,
        expenseAccount: { select: { balance: true } },
      },
    })
    const rentMap = new Map<string, { monthlyRent: number; contributed: number }>()
    for (const rc of rentConfigs) {
      rentMap.set(rc.businessId, {
        monthlyRent: Number(rc.monthlyRentAmount),
        contributed: Number(rc.expenseAccount.balance),
      })
    }

    // --- Batch fetch sales breakdown by paymentMethod ---
    const salesByPaymentRows = await prisma.businessOrders.groupBy({
      by: ['businessId', 'paymentMethod'] as any,
      where: { businessId: { in: allBusinessIds } },
      _sum: { totalAmount: true },
    })
    const cashSalesMap = new Map<string, number>()
    const ecocashSalesMap = new Map<string, number>()
    for (const row of salesByPaymentRows as any[]) {
      const amt = Number(row._sum.totalAmount ?? 0)
      if ((row.paymentMethod ?? '').toUpperCase() === 'ECOCASH') {
        ecocashSalesMap.set(row.businessId, (ecocashSalesMap.get(row.businessId) ?? 0) + amt)
      } else {
        cashSalesMap.set(row.businessId, (cashSalesMap.get(row.businessId) ?? 0) + amt)
      }
    }

    // --- Per-business revenue + balance ---
    const revenueByBusiness = await Promise.all(
      accessibleBusinesses.map(async (business) => {
        const [completedRevenue, pendingRevenue, balanceInfo] = await Promise.all([
          prisma.businessOrders.aggregate({
            where: { businessId: business.id, status: 'COMPLETED' },
            _sum: { totalAmount: true },
            _count: true,
          }),
          prisma.businessOrders.aggregate({
            where: { businessId: business.id, status: 'PENDING' },
            _sum: { totalAmount: true },
            _count: true,
          }),
          getBusinessBalance(business.id),
        ])

        const completedAmount = Number(completedRevenue._sum.totalAmount || 0)
        const pendingAmount = Number(pendingRevenue._sum.totalAmount || 0)
        const rent = rentMap.get(business.id) ?? null
        const cashBalance = cashBoxMap.get(business.id) ?? 0
        const ecocashBalance = ecocashBoxMap.get(business.id) ?? 0
        const cashRevenue = cashSalesMap.get(business.id) ?? 0
        const ecocashRevenue = ecocashSalesMap.get(business.id) ?? 0

        return {
          businessId: business.id,
          businessName: business.name,
          businessType: business.type,
          revenue: completedAmount + pendingAmount,
          orderCount: completedRevenue._count + pendingRevenue._count,
          completedRevenue: completedAmount,
          pendingRevenue: pendingAmount,
          completedOrders: completedRevenue._count,
          pendingOrders: pendingRevenue._count,
          accountBalance: balanceInfo.balance,
          hasAccount: balanceInfo.hasAccount,
          cashBoxBalance: cashBalance + ecocashBalance,
          cashBalance,
          ecocashBalance,
          cashRevenue,
          ecocashRevenue,
          monthlyRent: rent?.monthlyRent ?? 0,
          rentContributed: rent?.contributed ?? 0,
          hasRentConfig: rent !== null,
        }
      })
    )

    // --- Group by business type ---
    const revenueByType = revenueByBusiness.reduce((acc, item) => {
      if (!acc[item.businessType]) {
        acc[item.businessType] = {
          totalRevenue: 0,
          totalOrders: 0,
          completedRevenue: 0,
          pendingRevenue: 0,
          completedOrders: 0,
          pendingOrders: 0,
          totalAccountBalance: 0,
          totalCashBoxBalance: 0,
          totalCashBalance: 0,
          totalEcocashBalance: 0,
          totalCashRevenue: 0,
          totalEcocashRevenue: 0,
          totalMonthlyRent: 0,
          totalRentContributed: 0,
          hasRentConfig: false,
          businesses: [],
        }
      }
      const t = acc[item.businessType]
      t.totalRevenue += item.revenue
      t.totalOrders += item.orderCount
      t.completedRevenue += item.completedRevenue
      t.pendingRevenue += item.pendingRevenue
      t.completedOrders += item.completedOrders
      t.pendingOrders += item.pendingOrders
      t.totalAccountBalance += item.accountBalance
      t.totalCashBoxBalance += item.cashBoxBalance
      t.totalCashBalance += item.cashBalance
      t.totalEcocashBalance += item.ecocashBalance
      t.totalCashRevenue += item.cashRevenue
      t.totalEcocashRevenue += item.ecocashRevenue
      t.totalMonthlyRent += item.monthlyRent
      t.totalRentContributed += item.rentContributed
      if (item.hasRentConfig) t.hasRentConfig = true
      t.businesses.push({
        id: item.businessId,
        name: item.businessName,
        type: item.businessType,
        revenue: item.revenue,
        orderCount: item.orderCount,
        completedRevenue: item.completedRevenue,
        pendingRevenue: item.pendingRevenue,
        completedOrders: item.completedOrders,
        pendingOrders: item.pendingOrders,
        accountBalance: item.accountBalance,
        hasAccount: item.hasAccount,
        cashBoxBalance: item.cashBoxBalance,
        cashBalance: item.cashBalance,
        ecocashBalance: item.ecocashBalance,
        cashRevenue: item.cashRevenue,
        ecocashRevenue: item.ecocashRevenue,
        monthlyRent: item.monthlyRent,
        rentContributed: item.rentContributed,
        hasRentConfig: item.hasRentConfig,
      })
      return acc
    }, {} as Record<string, any>)

    // Calculate overall totals + percentages
    const overallTotal = Object.values(revenueByType).reduce((s: number, t: any) => s + t.totalRevenue, 0)
    Object.keys(revenueByType).forEach(type => {
      revenueByType[type].percentage = overallTotal > 0 ? (revenueByType[type].totalRevenue / overallTotal) * 100 : 0
      revenueByType[type].businesses.sort((a: any, b: any) => b.revenue - a.revenue)
    })

    // Exclude umbrella type from the byType display — it is already included in the ALL totals
    const byTypeForDisplay: Record<string, any> = {}
    for (const [type, data] of Object.entries(revenueByType)) {
      if (type !== 'umbrella') byTypeForDisplay[type] = data
    }

    const typeValues = Object.values(revenueByType) as any[]
    return NextResponse.json({
      summary: {
        totalRevenue: overallTotal,
        totalOrders: typeValues.reduce((s, t) => s + t.totalOrders, 0),
        completedRevenue: typeValues.reduce((s, t) => s + t.completedRevenue, 0),
        pendingRevenue: typeValues.reduce((s, t) => s + t.pendingRevenue, 0),
        completedOrders: typeValues.reduce((s, t) => s + t.completedOrders, 0),
        pendingOrders: typeValues.reduce((s, t) => s + t.pendingOrders, 0),
        totalAccountBalance: typeValues.reduce((s, t) => s + t.totalAccountBalance, 0),
        totalCashBoxBalance: typeValues.reduce((s, t) => s + t.totalCashBoxBalance, 0),
        totalCashBalance: typeValues.reduce((s, t) => s + t.totalCashBalance, 0),
        totalEcocashBalance: typeValues.reduce((s, t) => s + t.totalEcocashBalance, 0),
        totalCashRevenue: typeValues.reduce((s, t) => s + t.totalCashRevenue, 0),
        totalEcocashRevenue: typeValues.reduce((s, t) => s + t.totalEcocashRevenue, 0),
        businessTypes: Object.keys(byTypeForDisplay).length,
        businesses: accessibleBusinesses.length,
      },
      byType: byTypeForDisplay,
      lastUpdated: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Detailed revenue breakdown fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch detailed revenue breakdown' }, { status: 500 })
  }
}
