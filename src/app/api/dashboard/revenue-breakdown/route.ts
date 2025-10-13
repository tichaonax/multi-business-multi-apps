import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const userBusinessIds = user.businessMemberships?.map(m => m.businessId) || []

    let breakdown = {
      restaurant: { amount: 0, count: 0 },
      businesses: { amount: 0, count: 0 },
      projects: { amount: 0, count: 0 },
      personal: { amount: 0, count: 0 },
      total: 0
    }

    // 1. Restaurant Orders Revenue
    if (hasUserPermission(user, 'canViewOrders') || isSystemAdmin(user)) {
      try {
        const restaurantData = await prisma.orders.aggregate({
          where: {
            status: 'completed'
          },
          _sum: {
            total: true
          },
          _count: true
        })
        breakdown.restaurant.amount = Number(restaurantData._sum.total || 0)
        breakdown.restaurant.count = restaurantData._count
      } catch (error) {
        console.warn('Failed to calculate restaurant revenue breakdown:', error)
      }
    }

    // 2. Business Orders Revenue
    if (hasUserPermission(user, 'canViewOrders') ||
        hasUserPermission(user, 'canViewBusinessOrders') ||
        isSystemAdmin(user)) {
      try {
        const businessWhereClause: any = {
          status: 'COMPLETED'
        }

        if (!isSystemAdmin(user) && userBusinessIds.length > 0) {
          businessWhereClause.businessId = { in: userBusinessIds }
        }

        const businessData = await prisma.businessOrders.aggregate({
          where: businessWhereClause,
          _sum: {
            subtotal: true
          },
          _count: true
        })
        breakdown.businesses.amount = Number(businessData._sum.subtotal || 0)
        breakdown.businesses.count = businessData._count
      } catch (error) {
        console.warn('Failed to calculate business revenue breakdown:', error)
      }
    }

    // 3. Project Revenue
    if (hasUserPermission(user, 'canViewProjects') || isSystemAdmin(user)) {
      try {
        const projectWhereClause: any = {
          status: 'completed',
          amount: { gt: 0 },
          OR: [
            { transactionType: 'project_income' },
            { transactionType: 'payment_received' },
            { description: { contains: 'payment', mode: 'insensitive' } }
          ]
        }

        if (!isSystemAdmin(user)) {
          const canAccessCrossBusinessProjects = hasUserPermission(user, 'canAccessCrossBusinessProjects')
          if (!canAccessCrossBusinessProjects) {
            projectWhereClause.AND = [
              {
                OR: [
                  { project: { businessId: null } },
                  { project: { businessId: { in: userBusinessIds } } }
                ]
              }
            ]
          }
        }

        const projectData = await prisma.projectTransactions.aggregate({
          where: projectWhereClause,
          _sum: {
            amount: true
          },
          _count: true
        })
        breakdown.projects.amount = Number(projectData._sum.amount || 0)
        breakdown.projects.count = projectData._count
      } catch (error) {
        console.warn('Failed to calculate project revenue breakdown:', error)
      }
    }

    // 4. Personal Income
    if (hasUserPermission(user, 'canViewPersonalFinances') ||
        hasUserPermission(user, 'canCreatePersonalProjects') ||
        isSystemAdmin(user)) {
      try {
        const personalData = await prisma.personalExpenses.aggregate({
          where: {
            userId: session.user.id,
            amount: { gt: 0 },
            OR: [
              { category: { contains: 'income', mode: 'insensitive' } },
              { category: { contains: 'salary', mode: 'insensitive' } },
              { category: { contains: 'revenue', mode: 'insensitive' } },
              { category: { contains: 'payment', mode: 'insensitive' } },
              { category: { contains: 'earning', mode: 'insensitive' } },
              { description: { contains: 'income', mode: 'insensitive' } },
              { description: { contains: 'revenue', mode: 'insensitive' } }
            ]
          },
          _sum: {
            amount: true
          },
          _count: true
        })
        breakdown.personal.amount = Number(personalData._sum.amount || 0)
        breakdown.personal.count = personalData._count
      } catch (error) {
        console.warn('Failed to calculate personal income breakdown:', error)
      }
    }

    // Calculate total
    breakdown.total = breakdown.restaurant.amount +
                    breakdown.businesses.amount +
                    breakdown.projects.amount +
                    breakdown.personal.amount

    // Add percentage calculations
    const breakdownWithPercentages = Object.entries(breakdown).reduce((acc, [key, value]) => {
      if (key === 'total') {
        acc[key] = value
      } else {
        acc[key] = {
          ...value,
          percentage: breakdown.total > 0 ? (value.amount / breakdown.total) * 100 : 0
        }
      }
      return acc
    }, {} as any)

    return NextResponse.json(breakdownWithPercentages)

  } catch (error) {
    console.error('Revenue breakdown fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue breakdown' },
      { status: 500 }
    )
  }
}