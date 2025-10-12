import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const type = searchParams.get('type') // Filter by type: salary, commission, hourly, contract

    const whereClause: any = {}
    
    if (!includeInactive) {
      whereClause.isActive = true
    }

    if (type) {
      whereClause.type = type
    }

    const compensationTypes = await prisma.compensationTypes.findMany({
      where: whereClause,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(compensationTypes)
  } catch (error) {
    console.error('Compensation types fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compensation types' },
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

    // Check if user has permission to manage compensation types
    if (!hasPermission(session.user, 'canManageCompensationTypes')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      name,
      type,
      description,
      baseAmount,
      commissionPercentage,
      frequency
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

    // Validate frequency if provided
    if (frequency) {
      const validFrequencies = ['weekly', 'monthly', 'yearly']
      if (!validFrequencies.includes(frequency)) {
        return NextResponse.json(
          { error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Check for duplicate name
    const existingCompensationType = await prisma.compensationTypes.findUnique({
      where: { name }
    })

    if (existingCompensationType) {
      return NextResponse.json(
        { error: 'A compensation type with this name already exists' },
        { status: 400 }
      )
    }

    const newCompensationType = await prisma.compensationTypes.create({
      data: {
        name,
        type,
        description: description || null,
        baseAmount: baseAmount ? parseFloat(baseAmount) : null,
        commissionPercentage: commissionPercentage ? parseFloat(commissionPercentage) : null,
        frequency: frequency || 'monthly'
      }
    })

    return NextResponse.json(newCompensationType)
  } catch (error: any) {
    console.error('Compensation type creation error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A compensation type with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create compensation type' },
      { status: 500 }
    )
  }
}