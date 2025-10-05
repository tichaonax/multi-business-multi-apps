import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    console.log('🔍 Project API Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name
    })
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    console.log('🔍 Looking for project:', projectId, 'requested by:', session.user.id)

    // Fetch the project basic record first to diagnose not-found vs access-denied
    const basicProject = await prisma.constructionProject.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, createdBy: true }
    })

    if (!basicProject) {
      console.log('❌ Project not found with ID:', projectId)
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Users with construction view or personal finance access may view any project
    const canViewAll = hasPermission(session.user, 'canViewConstructionProjects') || hasPermission(session.user, 'canAccessPersonalFinance')

    // Enforce ownership for users without broader viewing permissions
    if (!canViewAll && basicProject.createdBy !== session.user.id) {
      console.log('❌ Access denied for user:', session.user.id, 'project.createdBy:', basicProject.createdBy)
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      )
    }

    // Get project with all related data now that access is verified
    const project = await prisma.constructionProject.findUnique({
      where: { id: projectId },
      include: {
        projectStages: {
          include: {
            stageContractorAssignments: {
              include: {
                    projectContractors: {
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
                    }
                  }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        projectContractors: {
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
        projectTransactions: {
          include: {
            personalExpenses: {
              select: {
                amount: true,
                date: true
              }
            },
            projectStages: {
              select: {
                id: true,
                name: true
              }
            },
            persons: {
              select: {
                id: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!project) {
      console.log('❌ Project not found with ID:', projectId, 'for user:', session.user.id)
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }
    
    console.log('✅ Project found:', project.name)

    // Format the response (cast to any so TypeScript doesn't complain about generated types)
    const p: any = project
    const formattedProject = {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      budget: p.budget ? parseFloat(p.budget.toString()) : null,
      startDate: p.startDate?.toISOString() || null,
      endDate: p.endDate?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      stages: (p.projectStages || []).map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        status: stage.status,
        estimatedAmount: stage.estimatedAmount ? parseFloat(stage.estimatedAmount.toString()) : null,
        orderIndex: stage.orderIndex,
        startDate: stage.startDate?.toISOString() || null,
        endDate: stage.endDate?.toISOString() || null,
        completionDate: stage.completionDate?.toISOString() || null,
          contractorAssignments: (stage.stageContractorAssignments || []).map((assignment: any) => ({
          id: assignment.id,
          predeterminedAmount: parseFloat(assignment.predeterminedAmount.toString()),
          depositAmount: assignment.depositAmount ? parseFloat(assignment.depositAmount.toString()) : null,
          isDepositPaid: assignment.isDepositPaid,
          isFinalPaymentMade: assignment.isFinalPaymentMade,
          contractor: {
            id: assignment.projectContractors?.id || null,
            fullName: assignment.projectContractors?.persons?.fullName || null,
            phone: assignment.projectContractors?.persons?.phone || null,
            email: assignment.projectContractors?.persons?.email || null
          }
        }))
      })),
      projectContractors: (p.projectContractors || []).map((contractor: any) => ({
        id: contractor.id,
        isPrimary: contractor.isPrimary,
        role: contractor.role,
        person: {
          id: contractor.persons?.id || null,
          fullName: contractor.persons?.fullName || null,
          phone: contractor.persons?.phone || null,
          email: contractor.persons?.email || null
        }
      })),
      projectTransactions: (p.projectTransactions || []).map((transaction: any) => ({
        id: transaction.id,
        transactionType: transaction.transactionType,
        amount: parseFloat(transaction.amount.toString()),
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
        status: transaction.status,
        recipientPerson: transaction.persons ? {
          fullName: transaction.persons.fullName
        } : null,
        stage: transaction.projectStages ? {
          name: transaction.projectStages.name
        } : null
      }))
    }

    return NextResponse.json(formattedProject)
  } catch (err) {
    const error: any = err
    console.error('💥 Project fetch error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check edit project permission
    if (!hasPermission(session.user, 'canEditProjects')) {
      return NextResponse.json(
        { error: 'Permission denied. You need canEditProjects permission to edit projects.' },
        { status: 403 }
      )
    }

    const { projectId } = await params
    const data = await req.json()
    const { name, description, status, budget, startDate, endDate } = data

    // Verify project exists and user has access (creator or with edit permissions)
    const existingProject = await prisma.constructionProject.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: session.user.id }, // Project creator can always edit
          // Users with edit permission can edit any project in their accessible construction module
        ]
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Update project
    const updatedProject = await prisma.constructionProject.update({
      where: { id: projectId },
      data: {
        name: name || existingProject.name,
        description: description !== undefined ? description : existingProject.description,
        status: status || existingProject.status,
        budget: budget !== undefined ? (budget ? parseFloat(budget) : null) : existingProject.budget,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existingProject.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existingProject.endDate
      }
    })

    return NextResponse.json({
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      status: updatedProject.status,
      budget: updatedProject.budget ? parseFloat(updatedProject.budget.toString()) : null,
      startDate: updatedProject.startDate?.toISOString() || null,
      endDate: updatedProject.endDate?.toISOString() || null,
      createdAt: updatedProject.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Project update error:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.constructionProject.findFirst({
      where: {
        id: projectId,
        createdBy: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Delete project (cascade will handle related records)
    await prisma.constructionProject.delete({
      where: { id: projectId }
    })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Project deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}