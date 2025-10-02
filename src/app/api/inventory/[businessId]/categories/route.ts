import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

interface InventoryCategory {
  id: string
  businessId: string
  businessType: string
  name: string
  description?: string
  icon?: string
  color?: string
  sortOrder: number
  isActive: boolean
  itemCount: number
  createdAt: string
  updatedAt: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
)
 {

    const { businessId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Get categories for the business from database
    const businessCategories = await prisma.businessCategory.findMany({
      where: {
        businessId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        _count: {
          select: {
            businessProducts: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Transform to match expected interface
    const categories = businessCategories.map(cat => ({
      id: cat.id,
      businessId: cat.businessId,
      businessType: cat.businessType,
      name: cat.name,
      description: cat.description || '',
      icon: '📦', // Default icon, could be made configurable
      color: 'gray', // Default color, could be made configurable
      sortOrder: 1, // Could be added to database schema
      isActive: cat.isActive,
      itemCount: cat._count.businessProducts,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString()
    }))

    return NextResponse.json({
      categories,
      summary: {
        total: categories.length,
        active: categories.filter(cat => cat.isActive).length,
        totalItems: categories.reduce((sum, cat) => sum + cat.itemCount, 0)
      }
    })

  } catch (error) {
    console.error('Error fetching inventory categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory categories' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
)
 {

    const { businessId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['name']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const user = session.user as SessionUser

    // System admins can access any business inventory
    let business: any = null
    if (isSystemAdmin(user)) {
      // For admin, just verify the business exists
      business = await prisma.business.findUnique({
        where: { id: businessId }
      })
    } else {
      // Verify business exists and user has access
      business = await prisma.business.findFirst({
        where: {
          id: businessId,
          businessMemberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Create the category
    const category = await prisma.businessCategory.create({
      data: {
        businessId,
        name: body.name,
        description: body.description || '',
        businessType: business.type,
        isActive: body.isActive !== false
      }
    })

    return NextResponse.json({
      message: 'Category created successfully',
      category: {
        id: category.id,
        businessId: category.businessId,
        businessType: category.businessType,
        name: category.name,
        description: category.description,
        icon: '📦',
        color: 'gray',
        sortOrder: 1,
        isActive: category.isActive,
        itemCount: 0,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating inventory category:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory category' },
      { status: 500 }
    )
  }
}