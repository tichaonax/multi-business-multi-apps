import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateAuthorizationSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  authorizedBy: z.string().min(1, 'Authorizer ID is required'),
  authorizedDate: z.string().min(1, 'Authorization date is required'),
  expiryDate: z.string().optional().nullable(),
  authorizationLevel: z.enum(['BASIC', 'ADVANCED', 'EMERGENCY']).default('BASIC'),
  notes: z.string().optional().nullable()
})

const UpdateAuthorizationSchema = z.object({
  id: z.string().min(1),
  authorizedBy: z.string().optional(),
  authorizedDate: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  authorizationLevel: z.enum(['BASIC', 'ADVANCED', 'EMERGENCY']).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional()
})

// GET - Fetch driver authorizations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId')
    const vehicleId = searchParams.get('vehicleId')
    const authorizationLevel = searchParams.get('authorizationLevel')
    const isActive = searchParams.get('isActive')
    const includeExpired = searchParams.get('includeExpired') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (driverId) {
      where.driverId = driverId
    }
    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (authorizationLevel) {
      where.authorizationLevel = authorizationLevel
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // Filter expired authorizations unless explicitly requested
    if (!includeExpired) {
      where.OR = [
        { expiryDate: null }, // No expiry date
        { expiryDate: { gte: new Date() } } // Not expired
      ]
    }

    const [authorizations, totalCount] = await Promise.all([
      prisma.driverAuthorizations.findMany({
        where,
        include: {
          vehicleDrivers: {
            select: {
              id: true,
              fullName: true,
              licenseNumber: true,
              phoneNumber: true,
              emailAddress: true
            }
          },
          vehicles: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              year: true,
              ownershipType: true
            }
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { authorizedDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.driverAuthorizations.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: authorizations,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + authorizations.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching driver authorizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch driver authorizations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new driver authorization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateAuthorizationSchema.parse(body)

    // Verify driver exists
    const driver = await prisma.vehicleDrivers.findUnique({
      where: { id: validatedData.driverId }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Verify vehicle exists
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: validatedData.vehicleId }
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Verify authorizer exists
    const authorizer = await prisma.users.findUnique({
      where: { id: validatedData.authorizedBy }
    })

    if (!authorizer) {
      return NextResponse.json(
        { error: 'Authorizer not found' },
        { status: 404 }
      )
    }

    // Check if active authorization already exists
    const existingAuthorization = await prisma.driverAuthorizations.findFirst({
      where: {
        driverId: validatedData.driverId,
        vehicleId: validatedData.vehicleId,
        isActive: true,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ]
      }
    })

    if (existingAuthorization) {
      return NextResponse.json(
        { error: 'Active authorization already exists for this driver and vehicle' },
        { status: 409 }
      )
    }

    // Generate unique ID for the authorization
    const authorizationId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create authorization
    const authorization = await prisma.driverAuthorizations.create({
      data: {
        id: authorizationId,
        ...validatedData,
        authorizedDate: new Date(validatedData.authorizedDate),
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        updatedAt: new Date()
      },
      include: {
        vehicleDrivers: {
          select: {
            id: true,
            fullName: true,
            licenseNumber: true,
            phoneNumber: true,
            emailAddress: true
          }
        },
        vehicles: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            ownershipType: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: authorization,
      message: 'Driver authorization created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating driver authorization:', error)
    return NextResponse.json(
      { error: 'Failed to create driver authorization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update driver authorization
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateAuthorizationSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify authorization exists
    const existingAuthorization = await prisma.driverAuthorizations.findUnique({
      where: { id }
    })

    if (!existingAuthorization) {
      return NextResponse.json(
        { error: 'Driver authorization not found' },
        { status: 404 }
      )
    }

    // Verify authorizer exists if being updated
    if (updateData.authorizedBy) {
      const authorizer = await prisma.users.findUnique({
        where: { id: updateData.authorizedBy }
      })

      if (!authorizer) {
        return NextResponse.json(
          { error: 'Authorizer not found' },
          { status: 404 }
        )
      }
    }

    // Update authorization
    const authorization = await prisma.driverAuthorizations.update({
      where: { id },
      data: {
        ...updateData,
        authorizedDate: updateData.authorizedDate ? new Date(updateData.authorizedDate) : undefined,
        expiryDate: updateData.expiryDate ? new Date(updateData.expiryDate) : undefined
      },
      include: {
        vehicleDrivers: {
          select: {
            id: true,
            fullName: true,
            licenseNumber: true,
            phoneNumber: true,
            emailAddress: true
          }
        },
        vehicles: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            ownershipType: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: authorization,
      message: 'Driver authorization updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating driver authorization:', error)
    return NextResponse.json(
      { error: 'Failed to update driver authorization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke driver authorization
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const authorizationId = searchParams.get('id')

    if (!authorizationId) {
      return NextResponse.json(
        { error: 'Authorization ID is required' },
        { status: 400 }
      )
    }

    // Verify authorization exists
    const existingAuthorization = await prisma.driverAuthorizations.findUnique({
      where: { id: authorizationId },
      include: {
        trips: { take: 1 }
      }
    })

    if (!existingAuthorization) {
      return NextResponse.json(
        { error: 'Driver authorization not found' },
        { status: 404 }
      )
    }

    // Check if authorization has related trips
    const hasRelatedTrips = existingAuthorization.trips.length > 0

    if (hasRelatedTrips) {
      // Soft delete - just mark as inactive
      await prisma.driverAuthorizations.update({
        where: { id: authorizationId },
        data: { isActive: false }
      })

      return NextResponse.json({
        success: true,
        message: 'Driver authorization revoked successfully (soft delete due to existing trips)'
      })
    } else {
      // Hard delete - no related records
      await prisma.driverAuthorizations.delete({
        where: { id: authorizationId }
      })

      return NextResponse.json({
        success: true,
        message: 'Driver authorization deleted successfully'
      })
    }

  } catch (error) {
    console.error('Error deleting driver authorization:', error)
    return NextResponse.json(
      { error: 'Failed to delete driver authorization', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}