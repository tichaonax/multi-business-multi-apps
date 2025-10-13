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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

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

    const projectContractors = await prisma.projectContractors.findMany({
      where: { projectId },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            nationalId: true,
            address: true,
            isActive: true,
            idFormatTemplates: {
              select: {
                name: true,
                countryCode: true
              }
            }
          }
        },
        stage_contractor_assignments: {
          include: {
            project_stages: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        project_transactions: {
          include: {
            project_stages: {
              select: {
                id: true,
                name: true
              }
            },
            personal_expenses: {
              select: {
                amount: true,
                date: true
              }
            }
          }
        },
        _count: {
          select: {
            stage_contractor_assignments: true,
            project_transactions: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' }, // Primary contractors first
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(projectContractors)
  } catch (error) {
    console.error('Project contractors fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project contractors' },
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

    const { projectId } = await params
    const data = await req.json()
    const { 
      personId, 
      isPrimary, 
      role, 
      hourlyRate, 
      totalContractAmount, 
      startDate, 
      endDate,
      notes 
    } = data

    // Validation
    if (!personId) {
      return NextResponse.json(
        { error: 'Person ID is required' },
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

    // Verify person exists
    const person = await prisma.persons.findUnique({
      where: { id: personId }
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      )
    }

    // Check if person is already assigned to this project
    const existingAssignment = await prisma.projectContractors.findFirst({
      where: {
        projectId,
        personId
      }
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Person is already assigned to this project' },
        { status: 400 }
      )
    }

    // If setting as primary, ensure no other primary contractor exists
    if (isPrimary) {
      const existingPrimary = await prisma.projectContractors.findFirst({
        where: {
          projectId,
          isPrimary: true
        }
      })

      if (existingPrimary) {
        return NextResponse.json(
          { error: 'Project already has a primary contractor. Set isPrimary to false or remove the existing primary contractor first.' },
          { status: 400 }
        )
      }
    }

    const newProjectContractor = await prisma.projectContractors.create({
      data: {
        projectId,
        personId,
        isPrimary: isPrimary || false,
        role: role || null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        totalContractAmount: totalContractAmount ? parseFloat(totalContractAmount) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null
      },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            nationalId: true,
            address: true,
            isActive: true,
            idFormatTemplates: {
              select: {
                name: true,
                countryCode: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(newProjectContractor)
  } catch (error) {
    console.error('Project contractor creation error:', error)
    return NextResponse.json(
      { error: 'Failed to assign contractor to project' },
      { status: 500 }
    )
  }
}