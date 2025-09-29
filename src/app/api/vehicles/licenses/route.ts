import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateLicenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  licenseType: z.enum(['REGISTRATION', 'RADIO', 'ROAD_USE', 'INSURANCE', 'INSPECTION']),
  licenseNumber: z.string().min(1, 'License number is required'),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  renewalCost: z.number().optional(),
  documentUrl: z.string().optional(),
  reminderDays: z.number().int().min(1).max(365).default(30)
})

const UpdateLicenseSchema = z.object({
  id: z.string().min(1),
  licenseType: z.enum(['REGISTRATION', 'RADIO', 'ROAD_USE', 'INSURANCE', 'INSPECTION']).optional(),
  licenseNumber: z.string().min(1).optional(),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().min(1).optional(),
  expiryDate: z.string().min(1).optional(),
  renewalCost: z.number().optional(),
  documentUrl: z.string().optional(),
  reminderDays: z.number().int().min(1).max(365).optional(),
  isActive: z.boolean().optional()
})

// GET - Fetch vehicle licenses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    const licenseType = searchParams.get('licenseType')
    const isActive = searchParams.get('isActive')
    const expiringWithinDays = searchParams.get('expiringWithinDays')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (licenseType) {
      where.licenseType = licenseType
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // Filter by expiring within specified days
    if (expiringWithinDays) {
      const days = parseInt(expiringWithinDays)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)

      where.expiryDate = {
        lte: futureDate
      }
      where.isActive = true
    }

    const [licenses, totalCount] = await Promise.all([
      prisma.vehicleLicense.findMany({
        where,
        include: {
          // schema relation name is `vehicles`
          vehicles: {
            select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true }
          }
        },
        orderBy: { expiryDate: 'asc' },
        skip,
        take: limit
      }),
      prisma.vehicleLicense.count({ where })
    ])

    const normalized = licenses.map(l => ({ ...l, vehicle: (l as any).vehicles || null }))

    return NextResponse.json({ success: true, data: normalized, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit), hasMore: skip + licenses.length < totalCount } })

  } catch (error) {
    console.error('Error fetching vehicle licenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle licenses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new vehicle license
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateLicenseSchema.parse(body)

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validatedData.vehicleId }
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check if license already exists for this vehicle and type
    const existingLicense = await prisma.vehicleLicense.findFirst({
      where: {
        vehicleId: validatedData.vehicleId,
        licenseType: validatedData.licenseType,
        isActive: true
      }
    })

    if (existingLicense) {
      return NextResponse.json(
        { error: `Active ${validatedData.licenseType.toLowerCase().replace('_', ' ')} license already exists for this vehicle` },
        { status: 409 }
      )
    }

    // Create license
    const license = await prisma.vehicleLicense.create({
      data: { ...validatedData, issueDate: new Date(validatedData.issueDate), expiryDate: new Date(validatedData.expiryDate) } as any,
      include: { vehicles: { select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true } } }
    })

    const normalizedLicense = { ...license, vehicle: (license as any).vehicles || null }

    return NextResponse.json({ success: true, data: normalizedLicense, message: 'Vehicle license created successfully' }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }

    console.error('Error creating vehicle license:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle license', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update vehicle license
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateLicenseSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify license exists
    const existingLicense = await prisma.vehicleLicense.findUnique({
      where: { id }
    })

    if (!existingLicense) {
      return NextResponse.json(
        { error: 'Vehicle license not found' },
        { status: 404 }
      )
    }

    // Check for duplicate license type if it's being updated
    if (updateData.licenseType) {
      const duplicateCheck = await prisma.vehicleLicense.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { vehicleId: existingLicense.vehicleId },
            { licenseType: updateData.licenseType },
            { isActive: true }
          ]
        }
      })

      if (duplicateCheck) {
        return NextResponse.json(
          { error: `Active ${updateData.licenseType.toLowerCase().replace('_', ' ')} license already exists for this vehicle` },
          { status: 409 }
        )
      }
    }

    // Update license
    const license = await prisma.vehicleLicense.update({
      where: { id },
      data: { ...updateData, issueDate: updateData.issueDate ? new Date(updateData.issueDate) : undefined, expiryDate: updateData.expiryDate ? new Date(updateData.expiryDate) : undefined } as any,
      include: { vehicles: { select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true } } }
    })

    const normalizedUpdated = { ...license, vehicle: (license as any).vehicles || null }

    return NextResponse.json({ success: true, data: normalizedUpdated, message: 'Vehicle license updated successfully' })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }

    console.error('Error updating vehicle license:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle license', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete vehicle license
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const licenseId = searchParams.get('id')

    if (!licenseId) {
      return NextResponse.json(
        { error: 'License ID is required' },
        { status: 400 }
      )
    }

    // Verify license exists
    const existingLicense = await prisma.vehicleLicense.findUnique({
      where: { id: licenseId }
    })

    if (!existingLicense) {
      return NextResponse.json(
        { error: 'Vehicle license not found' },
        { status: 404 }
      )
    }

    // Soft delete - mark as inactive
    await prisma.vehicleLicense.update({
      where: { id: licenseId },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Vehicle license deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting vehicle license:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle license', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}