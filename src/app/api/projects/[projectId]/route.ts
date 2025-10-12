import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getCustomPermissionValue } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { projectId } = await params

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        projectType: {
          select: {
            id: true,
            name: true,
            description: true,
            businessType: true,
            isSystem: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        projectContractors: {
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                isActive: true
              }
            }
          },
          orderBy: {
            isPrimary: 'desc'
          }
        },
        projectStages: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        projectTransactions: {
          include: {
            projectContractor: {
              include: {
                person: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user has permission to view projects for this business type
    if (!isSystemAdmin(user)) {
      let canViewProjects = false

      if (project.businessType === 'personal') {
        // For personal projects, check general view permission OR personal project permissions
        canViewProjects = user.permissions?.canViewProjects === true ||
                         user.permissions?.canCreatePersonalProjects === true ||
                         user.permissions?.canManagePersonalProjects === true
      } else {
        // For business projects, check business-specific permissions
        canViewProjects = getCustomPermissionValue(user, `${project.businessType}.canViewProjects`, undefined, false)
      }

      if (!canViewProjects) {
        return NextResponse.json({
          error: `Insufficient permissions to view ${project.businessType} projects`
        }, { status: 403 })
      }
    }

    // Calculate financial summaries
    const transactions = project.projectTransactions
    const totalBudget = project.budget ? Number(project.budget) : 0
    const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const contractorPayments = transactions.filter(t => t.transactionType === 'contractor_payment').reduce((sum, t) => sum + Number(t.amount), 0)
    const projectExpenses = transactions.filter(t => t.transactionType === 'project_expense').reduce((sum, t) => sum + Number(t.amount), 0)

    // Group contractor payments by contractor
    const contractorSummaries = project.projectContractors.map(contractor => {
      const payments = transactions.filter(t =>
        t.transactionType === 'contractor_payment' &&
        t.projectContractorId === contractor.id
      )
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

      return {
        ...contractor,
        totalPaid,
        paymentCount: payments.length,
        lastPayment: payments.length > 0 ? payments[0].createdAt : null
      }
    })

    const projectWithSummaries = {
      ...project,
      budget: totalBudget,
      projectTransactions: project.projectTransactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      })),
      contractorSummaries,
      financialSummary: {
        totalBudget,
        totalSpent,
        remainingBudget: totalBudget - totalSpent,
        contractorPayments,
        projectExpenses,
        percentageSpent: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        transactionCounts: {
          total: transactions.length,
          contractorPayments: transactions.filter(t => t.transactionType === 'contractor_payment').length,
          projectExpenses: transactions.filter(t => t.transactionType === 'project_expense').length
        }
      }
    }

    return NextResponse.json(projectWithSummaries)
  } catch (error) {
    console.error('Project fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { projectId } = await params
    const data = await request.json()
    const {
      name,
      description,
      budget,
      startDate,
      endDate,
      status
    } = data

    // Find the existing project
    const existingProject = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        projectType: true
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check permissions
    if (!isSystemAdmin(user)) {
      let canEditProjects = false

      if (existingProject.businessType === 'personal') {
        // For personal projects, check general edit permission OR personal project permissions
        canEditProjects = user.permissions?.canEditProjects === true ||
                         user.permissions?.canCreatePersonalProjects === true ||
                         user.permissions?.canManagePersonalProjects === true
      } else {
        // For business projects, check business-specific permissions
        canEditProjects = getCustomPermissionValue(user, `${existingProject.businessType}.canEditProjects`, undefined, false)
      }

      if (!canEditProjects) {
        return NextResponse.json({
          error: `Insufficient permissions to edit ${existingProject.businessType} projects`
        }, { status: 403 })
      }
    }

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
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

    // Validate status
    const validStatuses = ['active', 'completed', 'on-hold', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      )
    }

    const updatedProject = await prisma.projects.update({
      where: { id: projectId },
      data: {
        name,
        description: description || null,
        budget: budget !== undefined ? (budget ? Number(budget) : null) : existingProject.budget,
        startDate: startDate ? new Date(startDate) : existingProject.startDate,
        endDate: endDate ? new Date(endDate) : existingProject.endDate,
        status: status || existingProject.status
      },
      include: {
        projectType: {
          select: {
            id: true,
            name: true,
            description: true,
            businessType: true
          }
        },
        user: {
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
      ...updatedProject,
      budget: updatedProject.budget ? Number(updatedProject.budget) : null
    }

    return NextResponse.json(projectWithConvertedAmount)
  } catch (error: any) {
    console.error('Project update error:', error)

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { projectId } = await params

    // Find the existing project
    const existingProject = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            projectContractors: true,
            projectTransactions: true,
            projectStages: true
          }
        }
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check permissions
    if (!isSystemAdmin(user)) {
      let canDeleteProjects = false

      if (existingProject.businessType === 'personal') {
        // For personal projects, check general delete permission OR personal project permissions
        canDeleteProjects = user.permissions?.canDeleteProjects === true ||
                           user.permissions?.canCreatePersonalProjects === true ||
                           user.permissions?.canManagePersonalProjects === true
      } else {
        // For business projects, check business-specific permissions
        canDeleteProjects = getCustomPermissionValue(user, `${existingProject.businessType}.canDeleteProjects`, undefined, false)
      }

      if (!canDeleteProjects) {
        return NextResponse.json({
          error: `Insufficient permissions to delete ${existingProject.businessType} projects`
        }, { status: 403 })
      }
    }

    // Check if project has related data
    const hasRelatedData = existingProject._count.projectContractors > 0 ||
                          existingProject._count.projectTransactions > 0 ||
                          existingProject._count.projectStages > 0

    if (hasRelatedData) {
      return NextResponse.json({
        error: 'Cannot delete project with associated contractors, transactions, or stages',
        details: {
          contractorsCount: existingProject._count.projectContractors,
          transactionsCount: existingProject._count.projectTransactions,
          stagesCount: existingProject._count.projectStages
        }
      }, { status: 400 })
    }

    await prisma.projects.delete({
      where: { id: projectId }
    })

    return NextResponse.json({
      message: 'Project deleted successfully'
    })

  } catch (error: any) {
    console.error('Project deletion error:', error)

    // Handle specific database errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found or already deleted' },
        { status: 404 }
      )
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete project due to database constraints' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}