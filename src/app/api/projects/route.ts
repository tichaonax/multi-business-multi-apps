import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  isSystemAdmin,
  getCustomPermissionValue,
  hasUserPermission,
  canCreatePersonalProjects,
  canCreateBusinessProjects
} from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { searchParams } = new URL(req.url)
    const businessType = searchParams.get('businessType')
    const status = searchParams.get('status')
    const projectTypeId = searchParams.get('projectTypeId')
    const businessId = searchParams.get('businessId')

    // Build filter criteria
    const whereClause: any = {}

    if (businessId) {
      whereClause.businessId = businessId
    }

    if (businessType) {
      whereClause.businessType = businessType

      // Check if user has permission to view projects for this business type
      if (!isSystemAdmin(user)) {
        let canViewProjects = false

        if (businessType === 'personal') {
          // For personal projects, check general view permission OR personal project permissions
          canViewProjects = user.permissions?.canViewProjects === true ||
                           user.permissions?.canCreatePersonalProjects === true ||
                           user.permissions?.canManagePersonalProjects === true
        } else {
          // For business projects, check business-specific permissions
          canViewProjects = getCustomPermissionValue(user, `${businessType}.canViewProjects`, undefined, false)
        }

        if (!canViewProjects) {
          return NextResponse.json({
            error: `Insufficient permissions to view ${businessType} projects`
          }, { status: 403 })
        }
      }
    }

    if (status) {
      whereClause.status = status
    }

    if (projectTypeId) {
      whereClause.projectTypeId = projectTypeId
    }

    // Check cross-business access permission
    const canAccessCrossBusinessProjects = hasUserPermission(user, 'canAccessCrossBusinessProjects')

    // If user doesn't have cross-business access and no specific business type is requested,
    // only show projects they have direct access to
    if (!businessType && !canAccessCrossBusinessProjects && !isSystemAdmin(user)) {
      // Get user's business memberships
      const userBusinessIds = user.business_memberships?.map(m => m.businessId) || []

      // Filter to projects from user's businesses or personal projects (businessId is null)
      whereClause.OR = [
        { businessId: null }, // Personal projects
        { businessId: { in: userBusinessIds } } // Projects from user's businesses
      ]
    }

    const projects = await prisma.projects.findMany({
      where: whereClause,
      include: {
        project_types: {
          select: {
            id: true,
            name: true,
            description: true,
            businessType: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        project_contractors: {
          include: {
            persons: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        project_transactions: {
          select: {
            id: true,
            amount: true,
            description: true,
            transactionType: true,
            transactionSubType: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            project_contractors: true,
            project_transactions: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Calculate financial summaries for each project
    const projectsWithSummaries = projects.map(project => {
      const transactions = project.project_transactions
      const totalBudget = project.budget ? Number(project.budget) : 0
      const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
      const contractorPayments = transactions.filter(t => t.transactionType === 'contractor_payment').reduce((sum, t) => sum + Number(t.amount), 0)
      const projectExpenses = transactions.filter(t => t.transactionType === 'project_expense').reduce((sum, t) => sum + Number(t.amount), 0)

      return {
        ...project,
        budget: totalBudget,
        projectTransactions: project.project_transactions.map(t => ({
          ...t,
          amount: Number(t.amount)
        })),
        financialSummary: {
          totalBudget,
          totalSpent,
          remainingBudget: totalBudget - totalSpent,
          contractorPayments,
          projectExpenses,
          percentageSpent: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
        }
      }
    })

    return NextResponse.json(projectsWithSummaries)
  } catch (error) {
    console.error('Projects fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const data = await req.json()
    const {
      name,
      description,
      projectTypeId,
      businessType,
      businessId,
      budget,
      startDate,
      endDate
    } = data

    // Validation
    if (!name || !projectTypeId || !businessType) {
      return NextResponse.json(
        { error: 'Name, project type, and business type are required' },
        { status: 400 }
      )
    }

    // For business projects (not personal), business assignment is required for non-admin users
    // Admins can create projects without business assignment
    if (businessType !== 'personal' && !businessId && !isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Business assignment is required for business projects' },
        { status: 400 }
      )
    }

    // Check permissions for creating projects using new graduated permission system
    if (!isSystemAdmin(user)) {
      if (businessType === 'personal') {
        // Check user-level permission for personal projects
        if (!canCreatePersonalProjects(user)) {
          return NextResponse.json({
            error: 'Insufficient permissions to create personal projects'
          }, { status: 403 })
        }
      } else {
        // Check user-level permission for business projects
        if (!canCreateBusinessProjects(user)) {
          return NextResponse.json({
            error: 'Insufficient permissions to create business projects'
          }, { status: 403 })
        }

        // Also check business-type-specific permission
        const canCreateProjectsForType = getCustomPermissionValue(user, `${businessType}.canCreateProjects`, undefined, false)
        if (!canCreateProjectsForType) {
          return NextResponse.json({
            error: `Insufficient permissions to create ${businessType} projects`
          }, { status: 403 })
        }
      }
    }

    // Verify project type exists and matches business type
    const projectType = await prisma.projectTypes.findUnique({
      where: { id: projectTypeId }
    })

    if (!projectType) {
      return NextResponse.json(
        { error: 'Invalid project type' },
        { status: 400 }
      )
    }

    if (projectType.businessType !== businessType) {
      return NextResponse.json(
        { error: 'Project type does not match the specified business type' },
        { status: 400 }
      )
    }

    // Validate dates
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (start >= end) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
    }

    const newProject = await prisma.projects.create({
      data: {
        name,
        description: description || null,
        projectTypeId,
        businessType,
        businessId: businessType === 'personal' ? null : businessId || null,
        budget: budget ? Number(budget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: session.user.id,
        status: 'active'
      },
      include: {
        project_types: {
          select: {
            id: true,
            name: true,
            description: true,
            businessType: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Convert budget to number for response
    const projectWithConvertedAmount = {
      ...newProject,
      budget: newProject.budget ? Number(newProject.budget) : null
    }

    return NextResponse.json(projectWithConvertedAmount)
  } catch (error: any) {
    console.error('Project creation error:', error)

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}