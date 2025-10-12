import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ projectId: string; stageId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, stageId } = await params

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
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

    const stage = await prisma.projectStages.findFirst({
      where: {
        id: stageId,
        projectId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        contractorAssignments: {
          include: {
            projectContractor: {
              include: {
                person: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    nationalId: true
                  }
                }
              }
            },
            projectTransactions: {
              include: {
                personalExpense: {
                  select: {
                    id: true,
                    amount: true,
                    description: true,
                    date: true
                  }
                }
              }
            }
          }
        },
        projectTransactions: {
          include: {
            recipientPerson: {
              select: {
                id: true,
                fullName: true
              }
            },
            personalExpense: {
              select: {
                id: true,
                amount: true,
                description: true,
                date: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(stage)
  } catch (error) {
    console.error('Project stage fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project stage' },
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

    const { projectId, stageId } = await params
    const data = await req.json()
    const { 
      name, 
      description, 
      estimatedAmount, 
      status, 
      startDate, 
      endDate, 
      completionDate,
      notes,
      orderIndex 
    } = data

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Stage name is required' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
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

    // Check if stage exists
    const existingStage = await prisma.projectStages.findFirst({
      where: {
        id: stageId,
        projectId
      }
    })

    if (!existingStage) {
      return NextResponse.json(
        { error: 'Stage not found' },
        { status: 404 }
      )
    }

    // Auto-set completion date when status changes to completed
    let finalCompletionDate = completionDate
    if (status === 'completed' && !finalCompletionDate && existingStage.status !== 'completed') {
      finalCompletionDate = new Date().toISOString()
    }

    const updatedStage = await prisma.projectStages.update({
      where: { id: stageId },
      data: {
        name,
        description: description || null,
        estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : null,
        status: status || existingStage.status,
        startDate: startDate ? new Date(startDate) : (startDate === null ? null : existingStage.startDate),
        endDate: endDate ? new Date(endDate) : (endDate === null ? null : existingStage.endDate),
        completionDate: finalCompletionDate ? new Date(finalCompletionDate) : (completionDate === null ? null : existingStage.completionDate),
        notes: notes !== undefined ? notes : existingStage.notes,
        orderIndex: orderIndex !== undefined ? orderIndex : existingStage.orderIndex
      },
      include: {
        contractorAssignments: {
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
      }
    })

    return NextResponse.json(updatedStage)
  } catch (error) {
    console.error('Project stage update error:', error)
    return NextResponse.json(
      { error: 'Failed to update project stage' },
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

    const { projectId, stageId } = await params

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
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

    // Check if stage exists and has dependencies
    const existingStage = await prisma.projectStages.findFirst({
      where: {
        id: stageId,
        projectId
      },
      include: {
        contractorAssignments: true,
        projectTransactions: true
      }
    })

    if (!existingStage) {
      return NextResponse.json(
        { error: 'Stage not found' },
        { status: 404 }
      )
    }

    // Check for contractor assignments
    if (existingStage.contractorAssignments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete stage with contractor assignments. Remove assignments first.' },
        { status: 400 }
      )
    }

    // Check for transactions
    if (existingStage.projectTransactions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete stage with transaction history.' },
        { status: 400 }
      )
    }

    // Safe to delete
    await prisma.projectStages.delete({
      where: { id: stageId }
    })

    return NextResponse.json({ message: 'Stage deleted successfully' })
  } catch (error) {
    console.error('Project stage deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project stage' },
      { status: 500 }
    )
  }
}