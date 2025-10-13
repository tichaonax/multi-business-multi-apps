import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

import { randomBytes } from 'crypto';
interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.constructionProjects.findFirst({
      where: {
        id: projectId,
        createdBy: session.users.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    const stages = await prisma.projectStages.findMany({
      where: { projectId },
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
        },
        projectTransactions: {
          include: {
            recipientPerson: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        _count: {
          select: {
            stageContractorAssignments: true,
            projectTransactions: true
          }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })

    return NextResponse.json(stages)
  } catch (error) {
    console.error('Project stages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project stages' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const data = await req.json()
    const { name, description, estimatedAmount, orderIndex, startDate, endDate } = data

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
        createdBy: session.users.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // If orderIndex is not provided, set it to the next available index
    let finalOrderIndex = orderIndex
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const maxOrderStage = await prisma.projectStages.findFirst({
        where: { projectId },
        orderBy: { orderIndex: 'desc' }
      })
      finalOrderIndex = (maxOrderStage?.orderIndex || 0) + 1
    }

    const newStage = await prisma.projectStages.create({
      data: {
        projectId,
        name,
        description: description || null,
        estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : null,
        orderIndex: finalOrderIndex,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
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
      }
    })

    return NextResponse.json(newStage)
  } catch (error) {
    console.error('Project stage creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create project stage' },
      { status: 500 }
    )
  }
}