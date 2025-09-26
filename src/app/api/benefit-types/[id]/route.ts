import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const benefitType = await prisma.benefitType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employeeBenefits: true,
            contractBenefits: true
          }
        }
      }
    })

    if (!benefitType) {
      return NextResponse.json(
        { error: 'Benefit type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(benefitType)
  } catch (error) {
    console.error('Benefit type fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch benefit type' },
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

    // Check if user has permission to manage benefit types
    if (!hasPermission(session.user, 'canManageBenefitTypes')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()
    const {
      name,
      description,
      type,
      defaultAmount,
      isPercentage,
      isActive
    } = data

    // Validation
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['allowance', 'insurance', 'time_off', 'bonus']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if benefit type exists
    const existingBenefitType = await prisma.benefitType.findUnique({
      where: { id }
    })

    if (!existingBenefitType) {
      return NextResponse.json(
        { error: 'Benefit type not found' },
        { status: 404 }
      )
    }

    // Check for duplicate name (if name is being changed)
    if (name !== existingBenefitType.name) {
      const duplicateName = await prisma.benefitType.findUnique({
        where: { name }
      })

      if (duplicateName) {
        return NextResponse.json(
          { error: 'A benefit type with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedBenefitType = await prisma.benefitType.update({
      where: { id },
      data: {
        name,
        description: description || null,
        type,
        defaultAmount: defaultAmount ? parseFloat(defaultAmount) : null,
        isPercentage: isPercentage || false,
        isActive: isActive !== undefined ? isActive : existingBenefitType.isActive
      },
      include: {
        _count: {
          select: {
            employeeBenefits: true,
            contractBenefits: true
          }
        }
      }
    })

    return NextResponse.json(updatedBenefitType)
  } catch (error: any) {
    console.error('Benefit type update error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A benefit type with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update benefit type' },
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

    // Check if user has permission to manage benefit types
    if (!hasPermission(session.user, 'canManageBenefitTypes')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Check if benefit type exists
    const existingBenefitType = await prisma.benefitType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employeeBenefits: true,
            contractBenefits: true
          }
        }
      }
    })

    if (!existingBenefitType) {
      return NextResponse.json(
        { error: 'Benefit type not found' },
        { status: 404 }
      )
    }

    // Check if benefit type is in use
    if (existingBenefitType._count.employeeBenefits > 0 || existingBenefitType._count.contractBenefits > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete benefit type that is currently assigned to employees or contracts. Please deactivate it instead.' 
        },
        { status: 400 }
      )
    }

    await prisma.benefitType.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Benefit type deleted successfully' })
  } catch (error) {
    console.error('Benefit type deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete benefit type' },
      { status: 500 }
    )
  }
}