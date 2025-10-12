import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { normalizePhoneInput } from '@/lib/country-codes'

// Validation schemas
const CreateDriverSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseExpiry: z.string().min(1, 'License expiry is required'),
  phoneNumber: z.string().optional(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  userId: z.string().optional(),
  dateOfBirth: z.string().nullable().optional(),
  address: z.string().optional()
})

const UpdateDriverSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  licenseExpiry: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  userId: z.string().optional(),
  dateOfBirth: z.string().nullable().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional()
})

// GET - Fetch drivers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const isActive = searchParams.get('isActive')
    const includeAuthorizations = searchParams.get('includeAuthorizations') === 'true'
    const includeTrips = searchParams.get('includeTrips') === 'true'
    const vehicleId = searchParams.get('vehicleId') // For finding authorized drivers for a vehicle
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (userId) {
      where.userId = userId
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // If filtering by vehicle, only get authorized drivers
    if (vehicleId) {
      where.driverAuthorizations = {
        some: {
          vehicleId: vehicleId,
          isActive: true
        }
      }
    }

    // Align include keys with Prisma schema relation names and remap later
    const [drivers, totalCount] = await Promise.all([
      prisma.vehicleDrivers.findMany({
        where,
        include: Object.assign(
          {
            users: {
              select: { id: true, name: true, email: true, isActive: true }
            }
          },
          includeAuthorizations
            ? {
                driverAuthorizations: {
                  where: { isActive: true },
                  include: {
                    vehicles: {
                      select: { id: true, licensePlate: true, make: true, model: true }
                    }
                  }
                }
              }
            : {},
          includeTrips
            ? {
                vehicleTrips: {
                  take: 5,
                  orderBy: { startTime: 'desc' as const },
                  include: {
                    vehicles: {
                      select: { id: true, licensePlate: true, make: true, model: true }
                    }
                  }
                }
              }
            : {}
        ),
  orderBy: { fullName: 'asc' as const },
        skip,
        take: limit
      }),
      prisma.vehicleDrivers.count({ where })
    ])

    // Remap drivers relations to original API shape (authorizations -> authorizations, trips -> trips)
    const mappedDrivers = drivers.map((d: any) => ({
      ...d,
      authorizations: d.driverAuthorizations ?? [],
      trips: d.vehicleTrips ?? [],
      user: d.users ?? null
    }))

    return NextResponse.json({
      success: true,
      data: mappedDrivers,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + mappedDrivers.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drivers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new driver
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateDriverSchema.parse(body)

    // Check if license number already exists
    const existingDriver = await prisma.vehicleDrivers.findUnique({
      where: { licenseNumber: validatedData.licenseNumber }
    })

    if (existingDriver) {
      return NextResponse.json(
        { error: 'Driver with this license number already exists' },
        { status: 409 }
      )
    }

    // Verify user exists if userId is provided
    if (validatedData.userId) {
      const user = await prisma.users.findUnique({
        where: { id: validatedData.userId }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Create driver
      // Create driver: build explicit payload so optional userId is handled correctly
      const createPayload: any = {
        fullName: validatedData.fullName,
        licenseNumber: validatedData.licenseNumber,
        licenseExpiry: new Date(validatedData.licenseExpiry),
        phoneNumber: normalizePhoneInput(validatedData.phoneNumber || ''),
        emergencyPhone: normalizePhoneInput(validatedData.emergencyPhone || ''),
        emailAddress: validatedData.emailAddress || undefined,
        emergencyContact: validatedData.emergencyContact || undefined,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
        address: validatedData.address || undefined
      }

      if (validatedData.userId) createPayload.userId = validatedData.userId

      const driver = await prisma.vehicleDrivers.create({
        data: createPayload,
        include: {
          users: {
            select: { id: true, name: true, email: true }
          }
        }
      })

    return NextResponse.json({
      success: true,
      data: driver,
      message: 'Driver created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating driver:', error)
    return NextResponse.json(
      { error: 'Failed to create driver', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update driver
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateDriverSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify driver exists
    const existingDriver = await prisma.vehicleDrivers.findUnique({
      where: { id }
    })

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Check for duplicate license number if it's being updated
    if (updateData.licenseNumber) {
      const duplicateCheck = await prisma.vehicleDrivers.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { licenseNumber: updateData.licenseNumber }
          ]
        }
      })

      if (duplicateCheck) {
        return NextResponse.json(
          { error: 'Driver with this license number already exists' },
          { status: 409 }
        )
      }
    }

    // Verify user exists if userId is being updated
    if (updateData.userId) {
      const user = await prisma.users.findUnique({
        where: { id: updateData.userId }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Normalize phones before update to keep storage consistent
    const normalizedUpdate = {
      ...updateData,
      phoneNumber: updateData.phoneNumber ? normalizePhoneInput(updateData.phoneNumber) : undefined,
      emergencyPhone: updateData.emergencyPhone ? normalizePhoneInput(updateData.emergencyPhone) : undefined,
      licenseExpiry: updateData.licenseExpiry ? new Date(updateData.licenseExpiry) : undefined,
      dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined
    }

    // Update driver
    const driver = await prisma.vehicleDrivers.update({
      where: { id },
      data: normalizedUpdate,
      include: {
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: driver,
      message: 'Driver updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating driver:', error)
    return NextResponse.json(
      { error: 'Failed to update driver', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete driver
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('id')

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    // Verify driver exists
    const existingDriver = await prisma.vehicleDrivers.findUnique({
      where: { id: driverId },
      include: {
        vehicleTrips: { take: 1 },
        driverAuthorizations: { take: 1 }
      }
    })

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Check if driver has related records
  const hasRelatedRecords = (existingDriver.vehicleTrips && existingDriver.vehicleTrips.length > 0) ||
               (existingDriver.driverAuthorizations && existingDriver.driverAuthorizations.length > 0)

    if (hasRelatedRecords) {
      // Soft delete - just mark as inactive
      await prisma.vehicleDrivers.update({
        where: { id: driverId },
        data: { isActive: false }
      })

      return NextResponse.json({
        success: true,
        message: 'Driver deactivated successfully (soft delete due to existing records)'
      })
    } else {
      // Hard delete - no related records
      await prisma.vehicleDrivers.delete({
        where: { id: driverId }
      })

      return NextResponse.json({
        success: true,
        message: 'Driver deleted successfully'
      })
    }

  } catch (error) {
    console.error('Error deleting driver:', error)
    return NextResponse.json(
      { error: 'Failed to delete driver', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}