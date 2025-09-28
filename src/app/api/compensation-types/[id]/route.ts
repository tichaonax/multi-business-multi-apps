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
    const currentUser = session?.user as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const compensationType = await prisma.compensation_types.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            contracts: true
          }
        }
      }
    })

    if (!compensationType) {
      return NextResponse.json(
        { error: 'Compensation type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(compensationType)
  } catch (error) {
    console.error('Compensation type fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compensation type' },
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

    // Check if user has permission to manage compensation types
    if (!hasPermission(currentUser, 'canManageCompensationTypes')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()
    const {
      name,
      type,
      description,
      baseAmount,
      commissionPercentage,
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
    const validTypes = ['salary', 'commission', 'hourly', 'contract']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if compensation type exists
    const existingCompensationType = await prisma.compensation_types.findUnique({
      where: { id }
    })

    if (!existingCompensationType) {
      return NextResponse.json(
        { error: 'Compensation type not found' },
        { status: 404 }
      )
    }

    // Check for duplicate name (if name is being changed)
    if (name !== existingCompensationType.name) {
      const duplicateName = await prisma.compensation_types.findUnique({
        where: { name }
      })

      if (duplicateName) {
        return NextResponse.json(
          { error: 'A compensation type with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedCompensationType = await prisma.compensation_types.update({
      where: { id },
      data: {
        name,
        type,
        description: description || null,
        baseAmount: baseAmount ? parseFloat(baseAmount) : null,
        commissionPercentage: commissionPercentage ? parseFloat(commissionPercentage) : null,
        isActive: isActive !== undefined ? isActive : existingCompensationType.isActive
      },
      include: {
        _count: {
          select: {
            employees: true,
            contracts: true
          }
        }
      }
    })

    return NextResponse.json(updatedCompensationType)
  } catch (error: any) {
    console.error('Compensation type update error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A compensation type with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update compensation type' },
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

    // Check if user has permission to manage compensation types
    if (!hasPermission(session.user, 'canManageCompensationTypes')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Check if compensation type exists
    const existingCompensationType = await prisma.compensation_types.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            contracts: true
          }
        }
      }
    })

    if (!existingCompensationType) {
      return NextResponse.json(
        { error: 'Compensation type not found' },
        { status: 404 }
      )
    }

    // Check if compensation type is in use
    if (existingCompensationType._count.employees > 0 || existingCompensationType._count.contracts > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete compensation type that is currently assigned to employees or contracts. Please deactivate it instead.' 
        },
        { status: 400 }
      )
    }

    await prisma.compensation_types.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Compensation type deleted successfully' })
  } catch (error) {
    console.error('Compensation type deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete compensation type' },
      { status: 500 }
    )
  }
}