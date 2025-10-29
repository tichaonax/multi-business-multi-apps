import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { randomUUID } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const locationType = searchParams.get('locationType')

    const user = session.user as SessionUser

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

    // Build where clause
    const where: any = { businessId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { locationCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (locationType) {
      where.locationType = locationType
    }

    // Get locations with product count
    const locations = await prisma.businessLocations.findMany({
      where,
      include: {
        _count: {
          select: {
            business_products: true
          }
        }
      },
      orderBy: { locationCode: 'asc' }
    })

    return NextResponse.json({
      locations: locations.map(loc => ({
        id: loc.id,
        businessId: loc.businessId,
        locationCode: loc.locationCode,
        name: loc.name,
        emoji: loc.emoji,
        description: loc.description,
        locationType: loc.locationType,
        capacity: loc.capacity,
        isActive: loc.isActive,
        parentLocationId: loc.parentLocationId,
        productCount: loc._count.business_products,
        createdAt: loc.createdAt.toISOString(),
        updatedAt: loc.updatedAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    // Validate required fields
    if (!body.locationCode || !body.name) {
      return NextResponse.json(
        { error: 'Location code and name are required' },
        { status: 400 }
      )
    }

    const user = session.user as SessionUser

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

    // Check if location code already exists
    const existing = await prisma.businessLocations.findFirst({
      where: {
        businessId,
        locationCode: body.locationCode
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Location code already exists' },
        { status: 409 }
      )
    }

    // Validate parent location if provided
    if (body.parentLocationId) {
      const parentLocation = await prisma.businessLocations.findFirst({
        where: {
          id: body.parentLocationId,
          businessId
        }
      })

      if (!parentLocation) {
        return NextResponse.json(
          { error: 'Invalid parent location' },
          { status: 400 }
        )
      }
    }

    // Create location
    const location = await prisma.businessLocations.create({
      data: {
        id: randomUUID(),
        businessId,
        locationCode: body.locationCode,
        name: body.name,
        emoji: body.emoji || null,
        description: body.description || null,
        locationType: body.locationType || null,
        capacity: body.capacity ? parseInt(body.capacity) : null,
        parentLocationId: body.parentLocationId || null,
        isActive: body.isActive !== false,
        attributes: body.attributes || {},
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Location created successfully',
      location: {
        id: location.id,
        businessId: location.businessId,
        locationCode: location.locationCode,
        name: location.name,
        emoji: location.emoji,
        description: location.description,
        locationType: location.locationType,
        capacity: location.capacity,
        isActive: location.isActive,
        parentLocationId: location.parentLocationId,
        createdAt: location.createdAt.toISOString(),
        updatedAt: location.updatedAt.toISOString()
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating location:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Location with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
