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

    let stats = {
      activeProjects: 0,
      totalRevenue: 0,
      teamMembers: 1, // At least the current user
      pendingTasks: 0
    }

    // 1. Count Active Projects
    if (hasUserPermission(user, 'canViewProjects') ||
        hasUserPermission(user, 'canCreatePersonalProjects') ||
        hasUserPermission(user, 'canManagePersonalProjects') ||
        isSystemAdmin(user)) {
      try {
        const whereClause: any = {
          status: 'active'
        }

        // Filter by user's business access if not system admin
        if (!isSystemAdmin(user)) {
          const canAccessCrossBusinessProjects = hasUserPermission(user, 'canAccessCrossBusinessProjects')

          if (!canAccessCrossBusinessProjects) {
            whereClause.OR = [
              { businessId: null }, // Personal projects
              { businessId: { in: userBusinessIds } } // Projects from user's businesses
            ]
          }
        }

        const activeProjectsCount = await prisma.projects.count({
          where: whereClause
        })

        stats.activeProjects = activeProjectsCount
      } catch (error) {
        console.warn('Failed to count active projects:', error)
      }
    }

    // 2. Calculate Total Revenue (from multiple sources)
    try {
      let totalRevenue = 0

      // Revenue from Restaurant Orders (completed orders)
      if (hasUserPermission(user, 'canViewOrders') || isSystemAdmin(user)) {
        try {
          const restaurantRevenue = await prisma.businessOrders.aggregate({
            where: {
              status: 'COMPLETED'
            },
            _sum: {
              totalAmount: true
            }
          })
          totalRevenue += Number(restaurantRevenue._sum.totalAmount || 0)
        } catch (error) {
          console.warn('Failed to calculate restaurant revenue:', error)
        }
      }

      // Revenue from Business Orders (completed sales across all business types)
      if (hasUserPermission(user, 'canViewOrders') ||
          hasUserPermission(user, 'canViewBusinessOrders') ||
          isSystemAdmin(user)) {
        try {
          const businessWhereClause: any = {
            status: 'COMPLETED'
          }

          // Filter by user's business access if not system admin
          if (!isSystemAdmin(user) && userBusinessIds.length > 0) {
            businessWhereClause.businessId = { in: userBusinessIds }
          }

          const businessRevenue = await prisma.businessOrders.aggregate({
            where: businessWhereClause,
            _sum: {
              subtotal: true
            }
          })
          totalRevenue += Number(businessRevenue._sum.subtotal || 0)
        } catch (error) {
          console.warn('Failed to calculate business revenue:', error)
        }
      }

      // Revenue from Project Income (positive amounts in projects)
      if (hasUserPermission(user, 'canViewProjects') || isSystemAdmin(user)) {
        try {
          const projectWhereClause: any = {
            status: 'completed',
            amount: { gt: 0 }, // Only positive amounts (income)
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

          const projectRevenue = await prisma.projectTransactions.aggregate({
            where: projectWhereClause,
            _sum: {
              amount: true
            }
          })

          totalRevenue += Number(projectRevenue._sum.amount || 0)
        } catch (error) {
          console.warn('Failed to calculate project revenue:', error)
        }
      }

      // Revenue from Personal Income (expenses with income-like categories)
      if (hasUserPermission(user, 'canViewPersonalFinances') ||
          hasUserPermission(user, 'canCreatePersonalProjects') ||
          isSystemAdmin(user)) {
        try {
          const personalIncome = await prisma.personalExpenses.aggregate({
            where: {
              userId: session.user.id,
              amount: { gt: 0 }, // Only positive amounts
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
            }
          })

          totalRevenue += Number(personalIncome._sum.amount || 0)
        } catch (error) {
          console.warn('Failed to calculate personal income:', error)
        }
      }

      stats.totalRevenue = totalRevenue
    } catch (error) {
      console.warn('Failed to calculate total revenue:', error)
    }

    // 3. Count Team Members (users in same businesses)
    try {
      if (hasUserPermission(user, 'canViewEmployees') ||
          hasUserPermission(user, 'canManageEmployees') ||
          isSystemAdmin(user)) {

        if (isSystemAdmin(user)) {
          // System admin can see all users
          const allUsersCount = await prisma.users.count({
            where: {
              isActive: true
            }
          })
          stats.teamMembers = allUsersCount
        } else if (userBusinessIds.length > 0) {
          // Count users in the same businesses
          const businessUsers = await prisma.businessMemberships.findMany({
            where: {
              businessId: { in: userBusinessIds },
              isActive: true
            },
            select: {
              userId: true
            },
            distinct: ['userId']
          })
          stats.teamMembers = businessUsers.length
        }
      }
    } catch (error) {
      console.warn('Failed to count team members:', error)
    }

    // 4. Get Pending Tasks Count (reuse logic from pending-tasks endpoint)
    try {
      const response = await fetch(new URL('/api/pending-tasks', req.url).toString(), {
        headers: {
          'cookie': req.headers.get('cookie') || ''
        }
      })

      if (response.ok) {
        const pendingData = await response.json()
        stats.pendingTasks = pendingData.count || 0
      }
    } catch (error) {
      console.warn('Failed to fetch pending tasks count:', error)
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Dashboard stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}