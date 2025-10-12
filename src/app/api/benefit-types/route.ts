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
    const type = searchParams.get('type') // Filter by type: allowance, insurance, time_off, bonus

    const whereClause: any = {}
    
    if (!includeInactive) {
      whereClause.isActive = true
    }

    if (type) {
      whereClause.type = type
    }

    const benefitTypes = await prisma.benefitTypes.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            employeeBenefits: true,
            contractBenefits: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(benefitTypes)
  } catch (error) {
    console.error('Benefit types fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch benefit types' },
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

    // Check if user has permission to manage benefit types
    if (!hasPermission(session.user, 'canManageBenefitTypes')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      name,
      description,
      type,
      defaultAmount,
      isPercentage
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

    // Check for duplicate name
    const existingBenefitType = await prisma.benefitTypes.findUnique({
      where: { name }
    })

    if (existingBenefitType) {
      return NextResponse.json(
        { error: 'A benefit type with this name already exists' },
        { status: 400 }
      )
    }

    const newBenefitType = await prisma.benefitTypes.create({
      data: {
        name,
        description: description || null,
        type,
        defaultAmount: defaultAmount ? parseFloat(defaultAmount) : null,
        isPercentage: isPercentage || false
      }
    })

    return NextResponse.json(newBenefitType)
  } catch (error: any) {
    console.error('Benefit type creation error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A benefit type with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create benefit type' },
      { status: 500 }
    )
  }
}