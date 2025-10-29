import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
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

    // Get location with product count
    const location = await prisma.businessLocations.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        _count: {
          select: {
            business_products: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
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
        productCount: location._count.business_products,
        createdAt: location.createdAt.toISOString(),
        updatedAt: location.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    const body = await request.json()
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

    // Check if location exists
    const existingLocation = await prisma.businessLocations.findFirst({
      where: {
        id,
        businessId
      }
    })

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Validate parent location if provided
    if (body.parentLocationId && body.parentLocationId !== id) {
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

      // Prevent circular hierarchy
      if (body.parentLocationId === id) {
        return NextResponse.json(
          { error: 'Location cannot be its own parent' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.locationCode) updateData.locationCode = body.locationCode
    if (body.name) updateData.name = body.name
    if (body.emoji !== undefined) updateData.emoji = body.emoji || null
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.locationType !== undefined) updateData.locationType = body.locationType || null
    if (body.capacity !== undefined) updateData.capacity = body.capacity ? parseInt(body.capacity) : null
    if (body.parentLocationId !== undefined) updateData.parentLocationId = body.parentLocationId || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.attributes) updateData.attributes = body.attributes

    // Update location
    const location = await prisma.businessLocations.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      message: 'Location updated successfully',
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
    })

  } catch (error: any) {
    console.error('Error updating location:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Location code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
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

    // Check if location exists
    const location = await prisma.businessLocations.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        _count: {
          select: {
            business_products: true,
            child_locations: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if location is being used
    if (location._count.business_products > 0) {
      return NextResponse.json(
        {
          error: 'Location in use',
          message: `Cannot delete location. It is currently assigned to ${location._count.business_products} product(s). Please reassign these products first.`
        },
        { status: 400 }
      )
    }

    // Check if location has child locations
    if (location._count.child_locations > 0) {
      return NextResponse.json(
        {
          error: 'Location has children',
          message: `Cannot delete location. It has ${location._count.child_locations} child location(s). Please delete or reassign child locations first.`
        },
        { status: 400 }
      )
    }

    // Delete location
    await prisma.businessLocations.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Location deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}
