import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes, randomUUID } from 'crypto'
import { z } from 'zod'

const CreateTripSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverId: z.string().min(1, 'Driver ID is required'),
  businessId: z.string().optional(),
  startMileage: z.number().int().min(0, 'Start mileage must be positive'),
  endMileage: z.number().int().min(0, 'End mileage must be positive').optional(),
  tripPurpose: z.string().min(1, 'Trip purpose is required'),
  tripType: z.enum(['BUSINESS', 'PERSONAL', 'MIXED']),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  gpsTrackingData: z.any().optional()
})

const UpdateTripSchema = z.object({
  id: z.string().min(1),
  endMileage: z.number().int().min(0).optional(),
  tripPurpose: z.string().min(1).optional(),
  tripType: z.enum(['BUSINESS', 'PERSONAL', 'MIXED']).optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  gpsTrackingData: z.any().optional(),
  isCompleted: z.boolean().optional()
})

// GET - Fetch vehicle trips
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    const driverId = searchParams.get('driverId')
    const businessId = searchParams.get('businessId')
    const tripType = searchParams.get('tripType')
    const isCompleted = searchParams.get('isCompleted')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const includeExpenses = searchParams.get('includeExpenses') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (driverId) {
      where.driverId = driverId
    }
    if (businessId) {
      where.businessId = businessId
    }
    if (tripType) {
      where.tripType = tripType
    }
    if (isCompleted !== null && isCompleted !== undefined) {
      where.isCompleted = isCompleted === 'true'
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.startTime = {}
      if (dateFrom) {
        where.startTime.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.startTime.lte = new Date(dateTo)
      }
    }

    // Build include object explicitly to avoid spreading non-objects and
    // make it easier to reason about the query shape.
    // Use actual Prisma relation field names from schema and then remap
    const include: any = {
      // relation field for Vehicle is `vehicles` in schema
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
      // relation field for driver is `vehicle_drivers`
      vehicle_drivers: {
        select: {
          id: true,
          fullName: true,
          licenseNumber: true,
          phoneNumber: true
        }
      },
      // relation field for business is `businesses`
      businesses: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }

    if (includeExpenses) {
      // relation field name for expenses on VehicleTrip is `vehicle_expenses`
      include.vehicle_expenses = { orderBy: { expenseDate: 'desc' } }
    }

    const [trips, totalCount] = await Promise.all([
      prisma.vehicleTrips.findMany({ where, include, orderBy: { startTime: 'desc' }, skip, take: limit }),
      prisma.vehicleTrips.count({ where })
    ])

    // Calculate trip mileage for completed trips
    // Remap relation fields to the expected API shape (vehicle, driver, business, expenses)
    const tripsWithCalculatedData = trips.map((trip: any) => {
      const vehicle = trip.vehicles ?? null
      const driver = trip.vehicle_drivers ?? null
      const business = trip.businesses ?? null
      const expenses = trip.vehicle_expenses ?? []
      const base = { ...trip, vehicle, driver, business, expenses }

      return {
        ...base,
        tripMileage: trip.isCompleted && trip.endMileage ? trip.endMileage - trip.startMileage : trip.tripMileage || 0
      }
    })

    return NextResponse.json({
      success: true,
      data: tripsWithCalculatedData,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + trips.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching vehicle trips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle trips', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new vehicle trip
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
  const validatedData = CreateTripSchema.parse(body)

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

    // Verify driver is authorized for this vehicle
    const authorization = await prisma.driverAuthorizations.findFirst({
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

    if (!authorization) {
      return NextResponse.json(
        { error: 'Driver is not authorized to operate this vehicle' },
        { status: 403 }
      )
    }

    // Verify business exists if provided
    if (validatedData.businessId) {
      const business = await prisma.businesses.findUnique({
        where: { id: validatedData.businessId }
      })

      if (!business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }
    }

    // Validate end mileage if provided
    if (validatedData.endMileage && validatedData.endMileage <= validatedData.startMileage) {
      return NextResponse.json(
        { error: 'End mileage must be greater than start mileage' },
        { status: 400 }
      )
    }

    // Calculate trip mileage and completion status
    const tripMileage = validatedData.endMileage
      ? validatedData.endMileage - validatedData.startMileage
      : 0
    const isCompleted = !!(validatedData.endMileage && validatedData.endTime)

    // Create trip
    // Ensure optional foreign keys are not empty strings (which would violate FK)
    const createData: any = {
      ...validatedData,
      // ensure a primary key id is present (schema requires id without default)
      id: randomUUID(),
      startTime: new Date(validatedData.startTime),
      endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
      tripMileage,
      isCompleted,
      // updatedAt is required by the schema (many models don't have a DB default)
      updatedAt: new Date()
    }

    if (!createData.businessId) {
      // remove falsy businessId so Prisma doesn't try to insert empty string
      delete createData.businessId
    }

    const trip = await prisma.vehicleTrips.create({
      data: createData as any,
      include: {
        vehicles: { select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true } },
        vehicle_drivers: { select: { id: true, fullName: true, licenseNumber: true, phoneNumber: true } },
        businesses: { select: { id: true, name: true, type: true } }
      }
    })

    // Update vehicle mileage if trip is completed
    if (isCompleted && validatedData.endMileage) {
      await prisma.vehicles.update({
        where: { id: validatedData.vehicleId },
        data: { currentMileage: validatedData.endMileage }
      })
    }

    // normalize created trip to legacy API shape
    const normalized = { ...trip, vehicle: (trip as any).vehicles || null, driver: (trip as any).vehicle_drivers || null, business: (trip as any).businesses || null }

    return NextResponse.json({ success: true, data: normalized, message: 'Vehicle trip created successfully' }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating vehicle trip:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle trip', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update vehicle trip (mainly for completing trips)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateTripSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify trip exists
    const existingTrip = await prisma.vehicleTrips.findUnique({
      where: { id }
    })

    if (!existingTrip) {
      return NextResponse.json(
        { error: 'Vehicle trip not found' },
        { status: 404 }
      )
    }

    // Validate end mileage if provided
    if (updateData.endMileage && updateData.endMileage <= existingTrip.startMileage) {
      return NextResponse.json(
        { error: 'End mileage must be greater than start mileage' },
        { status: 400 }
      )
    }

    // Calculate trip mileage and completion status
    const endMileage = updateData.endMileage || existingTrip.endMileage
    const endTime = updateData.endTime || existingTrip.endTime
    const tripMileage = endMileage ? endMileage - existingTrip.startMileage : existingTrip.tripMileage
    const isCompleted = updateData.isCompleted !== undefined
      ? updateData.isCompleted
      : !!(endMileage && endTime)

    // Update trip
    const trip = await prisma.vehicleTrips.update({
      where: { id },
      data: { ...updateData, endTime: updateData.endTime ? new Date(updateData.endTime) : undefined, tripMileage, isCompleted } as any,
      include: {
        vehicles: { select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true } },
        vehicle_drivers: { select: { id: true, fullName: true, licenseNumber: true, phoneNumber: true } },
        businesses: { select: { id: true, name: true, type: true } }
      }
    })

    // Update vehicle mileage if trip is completed and end mileage is provided
    if (isCompleted && endMileage) {
      await prisma.vehicles.update({
        where: { id: existingTrip.vehicleId },
        data: { currentMileage: endMileage }
      })
    }

    const normalizedTrip = { ...trip, vehicle: (trip as any).vehicles || null, driver: (trip as any).vehicle_drivers || null, business: (trip as any).businesses || null }

    return NextResponse.json({ success: true, data: normalizedTrip, message: 'Vehicle trip updated successfully' })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating vehicle trip:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle trip', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete vehicle trip
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('id')

    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      )
    }

    // Verify trip exists
    const existingTrip = await prisma.vehicleTrips.findUnique({ where: { id: tripId }, include: { vehicle_expenses: { take: 1 } } })

    if (!existingTrip) {
      return NextResponse.json(
        { error: 'Vehicle trip not found' },
        { status: 404 }
      )
    }

    // Check if trip has related expenses
  const hasRelatedExpenses = (existingTrip as any).vehicle_expenses?.length > 0

    if (hasRelatedExpenses) {
      return NextResponse.json(
        { error: 'Cannot delete trip with associated expenses. Delete expenses first.' },
        { status: 409 }
      )
    }

    // Delete trip
    await prisma.vehicleTrips.delete({
      where: { id: tripId }
    })

    return NextResponse.json({
      success: true,
      message: 'Vehicle trip deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting vehicle trip:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle trip', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}