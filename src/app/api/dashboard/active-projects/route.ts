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

    // Fetch full user data with permissions and business memberships
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        businessMemberships: {
          where: { isActive: true },
          select: {
            businessId: true,
            role: true,
            permissions: true,
            isActive: true,
            joinedAt: true,
            lastAccessedAt: true,
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Transform to SessionUser format
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions as Record<string, any>,
      businessMemberships: user.business_memberships.map(m => ({
        businessId: m.businessId,
        businessName: m.businesses.name,
        role: m.role,
        permissions: m.permissions as Record<string, any>,
        isActive: m.isActive,
        joinedAt: m.joinedAt,
        lastAccessedAt: m.lastAccessedAt
      }))
    }

    const userBusinessIds = sessionUser.business_memberships?.map(m => m.businessId) || []

    // Check if user can view projects
    if (!hasUserPermission(sessionUser, 'canViewProjects') &&
        !hasUserPermission(sessionUser, 'canCreatePersonalProjects') &&
        !hasUserPermission(sessionUser, 'canManagePersonalProjects') &&
        !isSystemAdmin(sessionUser)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get filter parameters
    const { searchParams } = new URL(req.url)
    const filterType = searchParams.get('filter') || 'all' // 'all', 'own', 'business', 'personal'

    const whereClause: any = {
      status: 'active'
    }

    // Apply creator and access filtering
    if (!isSystemAdmin(sessionUser)) {
      const canAccessCrossBusinessProjects = hasUserPermission(sessionUser, 'canAccessCrossBusinessProjects')

      if (filterType === 'own') {
        // Only projects created by this user
        whereClause.createdBy = session.user.id
      } else if (filterType === 'personal') {
        // Only personal projects (no business) that user created or has access to
        whereClause.AND = [
          { businessId: null },
          { createdBy: session.user.id }
        ]
      } else if (filterType === 'business') {
        // Only business projects user has access to
        whereClause.AND = [
          { businessId: { not: null } },
          { businessId: { in: userBusinessIds } }
        ]
      } else {
        // Default 'all' - apply standard access controls
        if (!canAccessCrossBusinessProjects) {
          whereClause.OR = [
            {
              AND: [
                { businessId: null }, // Personal projects
                { createdBy: session.user.id } // Only personal projects user created
              ]
            },
            { businessId: { in: userBusinessIds } } // Projects from user's businesses
          ]
        }
      }
    }

    const activeProjects = await prisma.projects.findMany({
      where: whereClause,
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        projectTransactions: {
          select: {
            id: true,
            amount: true,
            status: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            projectTransactions: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { name: 'asc' }
      ]
    })

    // Calculate project progress and financial summaries
    const projectsWithDetails = activeProjects.map(project => {
      const completedTransactions = project.project_transactions.filter(t => t.status === 'completed')
      const activeTransactions = project.project_transactions.filter(t => t.status === 'completed' || t.status === 'pending')
      const totalBudget = Number(project.budget || 0)
      const totalSpent = activeTransactions
        .filter(t => Number(t.amount) > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0)
      const totalReceived = completedTransactions
        .filter(t => Number(t.amount) < 0) // Negative amounts are typically payments received
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

      const progressPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        businessType: project.businessType,
        totalCost: totalBudget,
        totalSpent,
        totalReceived,
        remainingBudget: totalBudget - totalSpent,
        progressPercentage: Math.min(progressPercentage, 100),
        transactionCount: project._count.project_transactions,
        activeTransactionCount: activeTransactions.length,
        completedTransactionCount: completedTransactions.length,
        createdAt: project.createdAt,
        expectedCompletionDate: project.endDate,
        business: project.business ? {
          id: project.businesses.id,
          name: project.businesses.name,
          type: project.businesses.type
        } : null,
        createdBy: project.user ? {
          id: project.users.id,
          name: project.users.name,
          email: project.users.email
        } : null,
        isPersonal: !project.businessId,
        isOwnProject: project.users?.id === session.user.id,
        netProfit: totalReceived - totalSpent
      }
    })

    // Summary statistics
    const summary = {
      totalProjects: projectsWithDetails.length,
      totalBudget: projectsWithDetails.reduce((sum, p) => sum + p.totalCost, 0),
      totalSpent: projectsWithDetails.reduce((sum, p) => sum + p.totalSpent, 0),
      totalReceived: projectsWithDetails.reduce((sum, p) => sum + p.totalReceived, 0),
      averageProgress: projectsWithDetails.length > 0
        ? projectsWithDetails.reduce((sum, p) => sum + p.progressPercentage, 0) / projectsWithDetails.length
        : 0,
      personalProjects: projectsWithDetails.filter(p => p.isPersonal).length,
      businessProjects: projectsWithDetails.filter(p => !p.isPersonal).length,
      ownProjects: projectsWithDetails.filter(p => p.isOwnProject).length,
      sharedProjects: projectsWithDetails.filter(p => !p.isOwnProject).length,
      byBusinessType: projectsWithDetails.reduce((acc, project) => {
        const type = project.businessType || 'personal'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      filterApplied: filterType,
      canAccessCrossBusinessProjects: isSystemAdmin(sessionUser) || hasUserPermission(sessionUser, 'canAccessCrossBusinessProjects')
    }

    return NextResponse.json({
      projects: projectsWithDetails,
      summary
    })

  } catch (error) {
    console.error('Active projects fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active projects' },
      { status: 500 }
    )
  }
}