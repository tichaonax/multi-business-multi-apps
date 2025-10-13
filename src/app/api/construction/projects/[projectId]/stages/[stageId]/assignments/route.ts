import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

import { randomBytes } from 'crypto';
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

    const assignments = await prisma.stageContractorAssignments.findMany({
      where: { stageId },
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        projectContractor: {
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
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
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Stage assignments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stage assignments' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, stageId } = await params
    const data = await req.json()
    const { 
      projectContractorId, 
      predeterminedAmount, 
      depositPercentage,
      depositAmount,
      notes 
    } = data

    // Validation
    if (!projectContractorId || !predeterminedAmount) {
      return NextResponse.json(
        { error: 'Project contractor ID and predetermined amount are required' },
        { status: 400 }
      )
    }

    if (predeterminedAmount <= 0) {
      return NextResponse.json(
        { error: 'Predetermined amount must be greater than 0' },
        { status: 400 }
      )
    }

    if (depositPercentage && (depositPercentage < 0 || depositPercentage > 100)) {
      return NextResponse.json(
        { error: 'Deposit percentage must be between 0 and 100' },
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

    // Verify stage exists and belongs to project
    const stage = await prisma.projectStages.findFirst({
      where: {
        id: stageId,
        projectId
      }
    })

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage not found' },
        { status: 404 }
      )
    }

    // Verify project contractor exists and belongs to project
    const projectContractor = await prisma.projectContractors.findFirst({
      where: {
        id: projectContractorId,
        projectId
      }
    })

    if (!projectContractor) {
      return NextResponse.json(
        { error: 'Project contractor not found' },
        { status: 404 }
      )
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.stageContractorAssignments.findFirst({
      where: {
        stageId,
        projectContractorId
      }
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Contractor is already assigned to this stage' },
        { status: 400 }
      )
    }

    // Calculate deposit amount if percentage is provided
    let finalDepositAmount = depositAmount
    if (depositPercentage && !depositAmount) {
      finalDepositAmount = (parseFloat(predeterminedAmount) * parseFloat(depositPercentage)) / 100
    }

    const newAssignment = await prisma.stageContractorAssignments.create({
      data: {
        stageId,
        projectContractorId,
        predeterminedAmount: parseFloat(predeterminedAmount),
        depositPercentage: depositPercentage ? parseFloat(depositPercentage) : 0,
        depositAmount: finalDepositAmount ? parseFloat(finalDepositAmount) : null,
        notes: notes || null
      },
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        projectContractor: {
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                nationalId: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(newAssignment)
  } catch (error) {
    console.error('Stage assignment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create stage assignment' },
      { status: 500 }
    )
  }
}