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

    console.log('🔍 Looking for project:', projectId, 'created by:', session.user.id)
    
    // Get project with all related data
    const project = await prisma.constructionProject.findFirst({
      where: {
        id: projectId,
        createdBy: session.user.id
      },
      include: {
        projectStages: {
          include: {
            stageContractorAssignments: {
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
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        projectContractors: {
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
        },
        projectTransactions: {
          include: {
            personalExpense: {
              select: {
                amount: true,
                date: true
              }
            },
            projectStage: {
              select: {
                id: true,
                name: true
              }
            },
            recipientPerson: {
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

    // Format the response
    const formattedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      budget: project.budget ? parseFloat(project.budget.toString()) : null,
      startDate: project.startDate?.toISOString() || null,
      endDate: project.endDate?.toISOString() || null,
      createdAt: project.createdAt.toISOString(),
      stages: project.projectStages.map(stage => ({
        id: stage.id,
        name: stage.name,
        status: stage.status,
        estimatedAmount: stage.estimatedAmount ? parseFloat(stage.estimatedAmount.toString()) : null,
        orderIndex: stage.orderIndex,
        startDate: stage.startDate?.toISOString() || null,
        endDate: stage.endDate?.toISOString() || null,
        completionDate: stage.completionDate?.toISOString() || null,
        contractorAssignments: stage.stageContractorAssignments.map(assignment => ({
          id: assignment.id,
          predeterminedAmount: parseFloat(assignment.predeterminedAmount.toString()),
          depositAmount: assignment.depositAmount ? parseFloat(assignment.depositAmount.toString()) : null,
          isDepositPaid: assignment.isDepositPaid,
          isFinalPaymentMade: assignment.isFinalPaymentMade,
          contractor: {
            id: assignment.projectContractor.person.id,
            fullName: assignment.projectContractor.person.fullName,
            phone: assignment.projectContractor.person.phone,
            email: assignment.projectContractor.person.email
          }
        }))
      })),
      projectContractors: project.projectContractors.map(contractor => ({
        id: contractor.id,
        isPrimary: contractor.isPrimary,
        role: contractor.role,
        person: {
          id: contractor.person.id,
          fullName: contractor.person.fullName,
          phone: contractor.person.phone,
          email: contractor.person.email
        }
      })),
      projectTransactions: project.projectTransactions.map(transaction => ({
        id: transaction.id,
        transactionType: transaction.transactionType,
        amount: parseFloat(transaction.amount.toString()),
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
        status: transaction.status,
        recipientPerson: transaction.recipientPerson ? {
          fullName: transaction.recipientPerson.fullName
        } : null,
        stage: transaction.projectStage ? {
          name: transaction.projectStage.name
        } : null
      }))
    }

    return NextResponse.json(formattedProject)
  } catch (error) {
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