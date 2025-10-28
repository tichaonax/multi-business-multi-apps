/**
 * Analytics Integration for Layby Management
 *
 * This file provides analytics and reporting functions for layby performance,
 * revenue tracking, and business intelligence.
 */

import { prisma } from '@/lib/prisma'
import { LaybyStatus } from '@prisma/client'

export interface LaybyAnalytics {
  overview: {
    totalLaybys: number
    activeLaybys: number
    completedLaybys: number
    cancelledLaybys: number
    defaultedLaybys: number
    onHoldLaybys: number
  }
  financial: {
    totalRevenue: number
    outstandingBalance: number
    averageLaybyValue: number
    totalDeposits: number
    totalFees: number
    completionRate: number
  }
  performance: {
    averageCompletionTime: number // in days
    defaultRate: number // percentage
    cancellationRate: number // percentage
    onTimePaymentRate: number // percentage
  }
  trends: {
    laybysThisMonth: number
    laybysLastMonth: number
    revenueThisMonth: number
    revenueLastMonth: number
    growthRate: number // percentage
  }
}

export interface CustomerLaybyAnalytics {
  customerId: string
  customerName: string
  totalLaybys: number
  completedLaybys: number
  activeLaybys: number
  totalSpent: number
  averageLaybyValue: number
  defaultCount: number
  reliabilityScore: number // 0-100
}

/**
 * Get comprehensive layby analytics for a business
 */
export async function getLaybyAnalytics(
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<LaybyAnalytics> {
  const where: any = { businessId }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  // Overview counts
  const [
    totalLaybys,
    activeLaybys,
    completedLaybys,
    cancelledLaybys,
    defaultedLaybys,
    onHoldLaybys
  ] = await Promise.all([
    prisma.customerLayby.count({ where }),
    prisma.customerLayby.count({ where: { ...where, status: 'ACTIVE' } }),
    prisma.customerLayby.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.customerLayby.count({ where: { ...where, status: 'CANCELLED' } }),
    prisma.customerLayby.count({ where: { ...where, status: 'DEFAULTED' } }),
    prisma.customerLayby.count({ where: { ...where, status: 'ON_HOLD' } })
  ])

  // Financial aggregates
  const [revenueData, outstandingData, avgValueData, depositData, feesData] = await Promise.all([
    prisma.customerLayby.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _sum: { totalPaid: true }
    }),
    prisma.customerLayby.aggregate({
      where: { ...where, status: { in: ['ACTIVE', 'ON_HOLD'] } },
      _sum: { balanceRemaining: true }
    }),
    prisma.customerLayby.aggregate({
      where,
      _avg: { totalAmount: true }
    }),
    prisma.customerLayby.aggregate({
      where,
      _sum: { depositAmount: true }
    }),
    prisma.customerLayby.aggregate({
      where,
      _sum: { totalFees: true }
    })
  ])

  const totalRevenue = revenueData._sum.totalPaid?.toNumber() || 0
  const outstandingBalance = outstandingData._sum.balanceRemaining?.toNumber() || 0
  const averageLaybyValue = avgValueData._avg.totalAmount?.toNumber() || 0
  const totalDeposits = depositData._sum.depositAmount?.toNumber() || 0
  const totalFees = feesData._sum.totalFees?.toNumber() || 0
  const completionRate = totalLaybys > 0 ? (completedLaybys / totalLaybys) * 100 : 0

  // Performance metrics
  const completedWithDates = await prisma.customerLayby.findMany({
    where: {
      ...where,
      status: 'COMPLETED',
      completedAt: { not: null }
    },
    select: {
      createdAt: true,
      completedAt: true
    }
  })

  const completionTimes = completedWithDates.map(l => {
    const created = new Date(l.createdAt).getTime()
    const completed = l.completedAt ? new Date(l.completedAt).getTime() : created
    return (completed - created) / (1000 * 60 * 60 * 24) // Convert to days
  })

  const averageCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
    : 0

  const defaultRate = totalLaybys > 0 ? (defaultedLaybys / totalLaybys) * 100 : 0
  const cancellationRate = totalLaybys > 0 ? (cancelledLaybys / totalLaybys) * 100 : 0

  // On-time payment rate (simplified - count laybys with no overdue status)
  const overdueCount = await prisma.customerLayby.count({
    where: {
      ...where,
      status: 'ACTIVE',
      paymentDueDate: { lt: new Date() },
      balanceRemaining: { gt: 0 }
    }
  })
  const onTimePaymentRate = activeLaybys > 0
    ? ((activeLaybys - overdueCount) / activeLaybys) * 100
    : 100

  // Trends (current month vs last month)
  const now = new Date()
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [thisMonthCount, lastMonthCount] = await Promise.all([
    prisma.customerLayby.count({
      where: {
        businessId,
        createdAt: { gte: firstDayThisMonth }
      }
    }),
    prisma.customerLayby.count({
      where: {
        businessId,
        createdAt: {
          gte: firstDayLastMonth,
          lt: firstDayThisMonth
        }
      }
    })
  ])

  const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
    prisma.customerLayby.aggregate({
      where: {
        businessId,
        status: 'COMPLETED',
        completedAt: { gte: firstDayThisMonth }
      },
      _sum: { totalPaid: true }
    }),
    prisma.customerLayby.aggregate({
      where: {
        businessId,
        status: 'COMPLETED',
        completedAt: {
          gte: firstDayLastMonth,
          lt: firstDayThisMonth
        }
      },
      _sum: { totalPaid: true }
    })
  ])

  const revenueThisMonth = thisMonthRevenue._sum.totalPaid?.toNumber() || 0
  const revenueLastMonth = lastMonthRevenue._sum.totalPaid?.toNumber() || 0
  const growthRate = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
    : 0

  return {
    overview: {
      totalLaybys,
      activeLaybys,
      completedLaybys,
      cancelledLaybys,
      defaultedLaybys,
      onHoldLaybys
    },
    financial: {
      totalRevenue,
      outstandingBalance,
      averageLaybyValue,
      totalDeposits,
      totalFees,
      completionRate
    },
    performance: {
      averageCompletionTime,
      defaultRate,
      cancellationRate,
      onTimePaymentRate
    },
    trends: {
      laybysThisMonth: thisMonthCount,
      laybysLastMonth: lastMonthCount,
      revenueThisMonth,
      revenueLastMonth,
      growthRate
    }
  }
}

/**
 * Get customer-specific layby analytics
 */
export async function getCustomerLaybyAnalytics(
  businessId: string,
  customerId: string
): Promise<CustomerLaybyAnalytics> {
  const customer = await prisma.businessCustomers.findUnique({
    where: { id: customerId },
    select: { name: true }
  })

  if (!customer) {
    throw new Error('Customer not found')
  }

  const [totalLaybys, completedLaybys, activeLaybys, defaultCount] = await Promise.all([
    prisma.customerLayby.count({
      where: { businessId, customerId }
    }),
    prisma.customerLayby.count({
      where: { businessId, customerId, status: 'COMPLETED' }
    }),
    prisma.customerLayby.count({
      where: { businessId, customerId, status: 'ACTIVE' }
    }),
    prisma.customerLayby.count({
      where: { businessId, customerId, status: 'DEFAULTED' }
    })
  ])

  const [totalSpentData, avgValueData] = await Promise.all([
    prisma.customerLayby.aggregate({
      where: { businessId, customerId, status: 'COMPLETED' },
      _sum: { totalPaid: true }
    }),
    prisma.customerLayby.aggregate({
      where: { businessId, customerId },
      _avg: { totalAmount: true }
    })
  ])

  const totalSpent = totalSpentData._sum.totalPaid?.toNumber() || 0
  const averageLaybyValue = avgValueData._avg.totalAmount?.toNumber() || 0

  // Calculate reliability score (0-100)
  // Based on: completion rate (60%), default count (30%), active laybys (10%)
  const completionScore = totalLaybys > 0 ? (completedLaybys / totalLaybys) * 60 : 0
  const defaultPenalty = Math.min(defaultCount * 10, 30)
  const activeBonus = activeLaybys > 0 ? 10 : 0
  const reliabilityScore = Math.max(0, Math.min(100, completionScore - defaultPenalty + activeBonus))

  return {
    customerId,
    customerName: customer.name,
    totalLaybys,
    completedLaybys,
    activeLaybys,
    totalSpent,
    averageLaybyValue,
    defaultCount,
    reliabilityScore
  }
}

/**
 * Get top performing customers by layby activity
 */
export async function getTopLaybyCustomers(
  businessId: string,
  limit = 10
) {
  // Get customers with most completed laybys
  const topCustomers = await prisma.customerLayby.groupBy({
    by: ['customerId'],
    where: {
      businessId,
      customerId: { not: null },
      status: 'COMPLETED'
    },
    _count: { id: true },
    _sum: { totalPaid: true },
    orderBy: {
      _sum: {
        totalPaid: 'desc'
      }
    },
    take: limit
  })

  // Fetch customer details
  const customerDetails = await Promise.all(
    topCustomers.map(async (item) => {
      const customer = await prisma.businessCustomers.findUnique({
        where: { id: item.customerId! },
        select: { name: true, customerNumber: true }
      })

      return {
        customerId: item.customerId!,
        customerName: customer?.name || 'Unknown',
        customerNumber: customer?.customerNumber || '',
        completedLaybys: item._count.id,
        totalRevenue: item._sum.totalPaid?.toNumber() || 0
      }
    })
  )

  return customerDetails
}

/**
 * Get layby status distribution
 */
export async function getLaybyStatusDistribution(businessId: string) {
  const statuses: LaybyStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'DEFAULTED', 'ON_HOLD']

  const distribution = await Promise.all(
    statuses.map(async (status) => {
      const count = await prisma.customerLayby.count({
        where: { businessId, status }
      })
      return { status, count }
    })
  )

  return distribution
}

/**
 * Get layby payment trends over time
 */
export async function getLaybyPaymentTrends(
  businessId: string,
  days = 30
) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const payments = await prisma.customerLaybyPayment.findMany({
    where: {
      layby: { businessId },
      paymentDate: { gte: startDate },
      isRefund: false
    },
    select: {
      paymentDate: true,
      amount: true
    },
    orderBy: {
      paymentDate: 'asc'
    }
  })

  // Group by date
  const trendMap = new Map<string, number>()

  for (const payment of payments) {
    const dateKey = payment.paymentDate.toISOString().split('T')[0]
    const current = trendMap.get(dateKey) || 0
    trendMap.set(dateKey, current + payment.amount.toNumber())
  }

  const trends = Array.from(trendMap.entries()).map(([date, amount]) => ({
    date,
    amount
  }))

  return trends
}
