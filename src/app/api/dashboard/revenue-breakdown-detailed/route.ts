import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

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
        select: {
          id: true,
          name: true,
          type: true
        }
      })
    } else if (userBusinessIds.length > 0) {
      // Filter businesses where user has financial data access permission
      const businessesWithPermission = await Promise.all(
        userBusinessIds.map(async (businessId) => {
          const hasFinancialAccess = hasPermission(user, 'canAccessFinancialData', businessId)
          if (hasFinancialAccess) {
            const business = await prisma.businesses.findUnique({
              where: { id: businessId, isActive: true },
              select: {
                id: true,
                name: true,
                type: true
              }
            })
            return business
          }
          return null
        })
      )
      accessibleBusinesses = businessesWithPermission.filter(business => business !== null)
    }

    // Group businesses by type
    const businessesByType = accessibleBusinesses.reduce((acc, business) => {
      if (!acc[business.type]) {
        acc[business.type] = []
      }
      acc[business.type].push(business)
      return acc
    }, {} as Record<string, typeof accessibleBusinesses>)

    // Calculate revenue for each business
    const revenueByBusiness = await Promise.all(
      accessibleBusinesses.map(async (business) => {
        // Get completed orders revenue
        const completedRevenue = await prisma.businessOrders.aggregate({
          where: {
            businessId: business.id,
            status: 'COMPLETED'
          },
          _sum: {
            totalAmount: true
          },
          _count: true
        })

        // Get pending orders revenue
        const pendingRevenue = await prisma.businessOrders.aggregate({
          where: {
            businessId: business.id,
            status: 'PENDING'
          },
          _sum: {
            totalAmount: true
          },
          _count: true
        })

        const completedAmount = Number(completedRevenue._sum.totalAmount || 0)
        const pendingAmount = Number(pendingRevenue._sum.totalAmount || 0)
        const totalRevenue = completedAmount + pendingAmount
        const totalOrders = completedRevenue._count + pendingRevenue._count

        return {
          businessId: business.id,
          businessName: business.name,
          businessType: business.type,
          revenue: totalRevenue,
          orderCount: totalOrders,
          completedRevenue: completedAmount,
          pendingRevenue: pendingAmount,
          completedOrders: completedRevenue._count,
          pendingOrders: pendingRevenue._count
        }
      })
    )

    // Group revenue by business type
    const revenueByType = revenueByBusiness.reduce((acc, item) => {
      if (!acc[item.businessType]) {
        acc[item.businessType] = {
          totalRevenue: 0,
          totalOrders: 0,
          completedRevenue: 0,
          pendingRevenue: 0,
          completedOrders: 0,
          pendingOrders: 0,
          businesses: []
        }
      }
      acc[item.businessType].totalRevenue += item.revenue
      acc[item.businessType].totalOrders += item.orderCount
      acc[item.businessType].completedRevenue += item.completedRevenue
      acc[item.businessType].pendingRevenue += item.pendingRevenue
      acc[item.businessType].completedOrders += item.completedOrders
      acc[item.businessType].pendingOrders += item.pendingOrders
      acc[item.businessType].businesses.push({
        id: item.businessId,
        name: item.businessName,
        type: item.businessType,
        revenue: item.revenue,
        orderCount: item.orderCount,
        completedRevenue: item.completedRevenue,
        pendingRevenue: item.pendingRevenue,
        completedOrders: item.completedOrders,
        pendingOrders: item.pendingOrders
      })
      return acc
    }, {} as Record<string, { totalRevenue: number, totalOrders: number, completedRevenue: number, pendingRevenue: number, completedOrders: number, pendingOrders: number, businesses: any[] }>)

    // Calculate overall totals
    const overallTotal = Object.values(revenueByType).reduce((sum, type) => sum + type.totalRevenue, 0)
    const overallOrders = Object.values(revenueByType).reduce((sum, type) => sum + type.totalOrders, 0)
    const overallCompletedRevenue = Object.values(revenueByType).reduce((sum, type) => sum + type.completedRevenue, 0)
    const overallPendingRevenue = Object.values(revenueByType).reduce((sum, type) => sum + type.pendingRevenue, 0)
    const overallCompletedOrders = Object.values(revenueByType).reduce((sum, type) => sum + type.completedOrders, 0)
    const overallPendingOrders = Object.values(revenueByType).reduce((sum, type) => sum + type.pendingOrders, 0)

    // Add percentages
    Object.keys(revenueByType).forEach(type => {
      revenueByType[type].percentage = overallTotal > 0 ? (revenueByType[type].totalRevenue / overallTotal) * 100 : 0

      // Sort businesses by revenue descending
      revenueByType[type].businesses.sort((a, b) => b.revenue - a.revenue)
    })

    return NextResponse.json({
      summary: {
        totalRevenue: overallTotal,
        totalOrders: overallOrders,
        completedRevenue: overallCompletedRevenue,
        pendingRevenue: overallPendingRevenue,
        completedOrders: overallCompletedOrders,
        pendingOrders: overallPendingOrders,
        businessTypes: Object.keys(revenueByType).length,
        businesses: accessibleBusinesses.length
      },
      byType: revenueByType,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Detailed revenue breakdown fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailed revenue breakdown' },
      { status: 500 }
    )
  }
}