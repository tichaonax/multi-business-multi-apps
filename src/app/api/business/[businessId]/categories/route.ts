import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: user.id,
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

    // Get categories for this business and business type
    const categories = await prisma.businessCategories.findMany({
      where: {
        OR: [
          { businessId: businessId },
          { businessId: null, businessType: business.type }
        ],
        isActive: true
      },
      include: {
        _count: {
          select: {
            business_products: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(categories)

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }
    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: user.id,
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

    // Create category using raw SQL to avoid Prisma extension validation issues
    const id = crypto.randomUUID()
    const now = new Date()
    await prisma.$executeRawUnsafe(
      `INSERT INTO business_categories (id, "businessId", "businessType", name, description, emoji, "isActive", "isUserCreated", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      id,
      businessId,
      business.type,
      body.name,
      body.description || null,
      body.emoji || '📦',
      body.isActive !== false,
      true,
      now,
      now
    )

    // Fetch the created category to return it
    const category = await prisma.businessCategories.findUnique({
      where: { id }
    })

    return NextResponse.json(category, { status: 201 })

  } catch (error: any) {
    console.error('Error creating category:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
