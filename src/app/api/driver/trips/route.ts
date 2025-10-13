import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { hasUserPermission } from '@/lib/permission-utils'

// Expense schema for driver trip logging
const TripExpenseSchema = z.object({
  expenseType: z.enum(['FUEL', 'TOLL', 'PARKING', 'FOOD', 'MAINTENANCE', 'TIRE', 'OIL', 'OTHER']),
  amount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  vendorName: z.string().optional(),
  isBusinessDeductible: z.boolean().default(false),
  fuelQuantity: z.number().optional(),
  fuelType: z.enum(['GASOLINE', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional(),
  receiptUrl: z.string().optional()
})

// Enhanced schema for driver trip logging with expenses
const DriverTripSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  startMileage: z.number().int().min(0, 'Start mileage must be positive'),
  endMileage: z.number().int().min(0, 'End mileage must be positive').optional(),
  tripPurpose: z.string().min(1, 'Trip purpose is required'),
  tripType: z.enum(['BUSINESS', 'PERSONAL', 'MIXED']),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  expenses: z.array(TripExpenseSchema).default([])
})

// GET - Fetch driver's own trips only
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check driver trip logging permission
    if (!hasUserPermission(session.user, 'canLogDriverTrips')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 for drivers
    const skip = (page - 1) * limit

    // Get driver record for current user
    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { emailAddress: session.user.email || '' },
          { fullName: session.user.name || '' }
        ]
      }
    })

    if (!driver) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { total: 0, page, limit, totalPages: 0, hasMore: false },
        message: 'No driver record found. Contact administrator for vehicle access.'
      })
    }

    // Only fetch trips for this specific driver
    const where = {
      driverId: driver.id
    }

    const [trips, totalCount] = await Promise.all([
      prisma.vehicleTrips.findMany({
        where,
        include: {
          vehicles: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              year: true,
              mileageUnit: true
            }
          },
          vehicle_expenses: {
            select: {
              id: true,
              expenseType: true,
              amount: true,
              currency: true,
              description: true,
              vendorName: true,
              isBusinessDeductible: true,
              fuelQuantity: true,
              fuelType: true
            }
          }
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit
      }),
      prisma.vehicleTrips.count({ where })
    ])

    // Format response for driver UI
    const formattedTrips = trips.map(trip => {
      const expenses = trip.vehicle_expenses || []
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
      const businessExpenses = expenses.filter(exp => exp.isBusinessDeductible).reduce((sum, exp) => sum + Number(exp.amount), 0)

      return {
        id: trip.id,
        vehicle: {
          licensePlate: trip.vehicles?.licensePlate || 'Unknown',
          make: trip.vehicles?.make || '',
          model: trip.vehicles?.model || '',
          mileageUnit: trip.vehicles?.mileageUnit || 'km'
        },
        startMileage: trip.startMileage,
        endMileage: trip.endMileage,
        tripMileage: trip.isCompleted && trip.endMileage
          ? trip.endMileage - trip.startMileage
          : trip.tripMileage || 0,
        tripPurpose: trip.tripPurpose,
        tripType: trip.tripType,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        startTime: trip.startTime,
        endTime: trip.endTime,
        isCompleted: trip.isCompleted,
        notes: trip.notes,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        expenses: expenses.map(exp => ({
          id: exp.id,
          expenseType: exp.expenseType,
          amount: Number(exp.amount),
          currency: exp.currency,
          description: exp.description,
          vendorName: exp.vendorName,
          isBusinessDeductible: exp.isBusinessDeductible,
          fuelQuantity: exp.fuelQuantity ? Number(exp.fuelQuantity) : undefined,
          fuelType: exp.fuelType
        })),
        expenseSummary: {
          totalExpenses: totalExpenses,
          expenseCount: expenses.length,
          businessDeductibleTotal: businessExpenses,
          personalTotal: totalExpenses - businessExpenses
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedTrips,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + trips.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching driver trips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    )
  }
}

// POST - Create new trip (drivers can only create trips for themselves)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check driver trip logging permission
    if (!hasUserPermission(session.user, 'canLogDriverTrips')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = DriverTripSchema.parse(body)

    // Get driver record for current user
    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { emailAddress: session.user.email || '' },
          { fullName: session.user.name || '' }
        ]
      }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver record not found. Contact administrator for vehicle access.' },
        { status: 404 }
      )
    }

    // Verify vehicle exists and driver is authorized
    const authorization = await prisma.driverAuthorizations.findFirst({
      where: {
        driverId: driver.id,
        vehicleId: validatedData.vehicleId,
        isActive: true,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ]
      },
      include: {
        vehicles: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true
          }
        }
      }
    })

    if (!authorization) {
      return NextResponse.json(
        { error: 'You are not authorized to operate this vehicle' },
        { status: 403 }
      )
    }

    // Validate end mileage if provided
    if (validatedData.endMileage && validatedData.endMileage <= validatedData.startMileage) {
      return NextResponse.json(
        { error: 'End mileage must be greater than start mileage' },
        { status: 400 }
      )
    }

    // Calculate trip data
    const tripMileage = validatedData.endMileage
      ? validatedData.endMileage - validatedData.startMileage
      : 0
    const isCompleted = !!(validatedData.endMileage && validatedData.endTime)

    // Create trip and expenses in a transaction
    const tripId = randomUUID()
    const result = await prisma.$transaction(async (tx) => {
      // Create trip data
      const trip = await tx.vehicleTrip.create({
        data: {
          id: tripId,
          vehicleId: validatedData.vehicleId,
          driverId: driver.id,
          startMileage: validatedData.startMileage,
          endMileage: validatedData.endMileage || null,
          tripPurpose: validatedData.tripPurpose,
          tripType: validatedData.tripType,
          startLocation: validatedData.startLocation || null,
          endLocation: validatedData.endLocation || null,
          startTime: new Date(validatedData.startTime),
          endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
          notes: validatedData.notes || null,
          tripMileage,
          isCompleted,
          updatedAt: new Date()
        },
        include: {
          vehicles: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true
            }
          }
        }
      })

      // Create expenses if provided
      const createdExpenses = []
      if (validatedData.expenses && validatedData.expenses.length > 0) {
        for (const expense of validatedData.expenses) {
          const createdExpense = await tx.vehicleExpense.create({
            data: {
              id: randomUUID(),
              vehicleId: validatedData.vehicleId,
              tripId: tripId,
              expenseType: expense.expenseType,
              amount: expense.amount,
              currency: expense.currency || 'USD',
              description: expense.description || null,
              vendorName: expense.vendorName || null,
              isBusinessDeductible: expense.isBusinessDeductible,
              fuelQuantity: expense.fuelQuantity || null,
              fuelType: expense.fuelType || null,
              receiptUrl: expense.receiptUrl || null,
              expenseDate: new Date(validatedData.startTime), // Use trip start time
              mileageAtExpense: validatedData.startMileage,
              createdBy: session.user.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          createdExpenses.push(createdExpense)
        }
      }

      // Update vehicle mileage if trip is completed
      if (isCompleted && validatedData.endMileage) {
        await tx.vehicle.update({
          where: { id: validatedData.vehicleId },
          data: { currentMileage: validatedData.endMileage }
        })
      }

      return { trip, expenses: createdExpenses }
    })

    const { trip, expenses } = result

    // Calculate expense totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
    const businessExpenses = expenses.filter(exp => exp.isBusinessDeductible).reduce((sum, exp) => sum + Number(exp.amount), 0)

    return NextResponse.json({
      success: true,
      data: {
        id: trip.id,
        vehicle: {
          licensePlate: trip.vehicles?.licensePlate || 'Unknown',
          make: trip.vehicles?.make || '',
          model: trip.vehicles?.model || ''
        },
        startMileage: trip.startMileage,
        endMileage: trip.endMileage,
        tripMileage: trip.tripMileage,
        tripPurpose: trip.tripPurpose,
        tripType: trip.tripType,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        startTime: trip.startTime,
        endTime: trip.endTime,
        isCompleted: trip.isCompleted,
        notes: trip.notes,
        expenses: expenses.map(exp => ({
          id: exp.id,
          expenseType: exp.expenseType,
          amount: Number(exp.amount),
          currency: exp.currency,
          description: exp.description,
          vendorName: exp.vendorName,
          isBusinessDeductible: exp.isBusinessDeductible,
          fuelQuantity: exp.fuelQuantity ? Number(exp.fuelQuantity) : undefined,
          fuelType: exp.fuelType
        })),
        expenseSummary: {
          totalExpenses: totalExpenses,
          expenseCount: expenses.length,
          businessDeductibleTotal: businessExpenses,
          personalTotal: totalExpenses - businessExpenses
        }
      },
      message: `Trip logged successfully${expenses.length > 0 ? ` with ${expenses.length} expenses` : ''}`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating driver trip:', error)
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    )
  }
}

// PUT - Update trip (drivers can only update their own trips)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasUserPermission(session.user, 'canLogDriverTrips')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 })
    }

    // Get driver record
    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { emailAddress: session.user.email || '' },
          { fullName: session.user.name || '' }
        ]
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver record not found' }, { status: 404 })
    }

    // Verify trip exists and belongs to this driver
    const existingTrip = await prisma.vehicleTrips.findFirst({
      where: {
        id,
        driverId: driver.id // Only allow updating own trips
      }
    })

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 })
    }

    // Check if trip is within 24-hour edit window (unless user is admin/manager)
    const canEdit = hasUserPermission(session.user, 'isSystemAdmin') ||
                   hasUserPermission(session.user, 'isBusinessManager')

    if (!canEdit) {
      const now = new Date()
      const hoursSinceCreation = (now.getTime() - existingTrip.createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursSinceCreation > 24) {
        return NextResponse.json({
          error: 'Cannot edit trip. Only trips created within the last 24 hours can be edited by drivers.'
        }, { status: 403 })
      }
    }

    // Update trip
    const trip = await prisma.vehicleTrips.update({
      where: { id },
      data: {
        ...updateData,
        endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
        tripMileage: updateData.endMileage
          ? updateData.endMileage - existingTrip.startMileage
          : undefined,
        isCompleted: updateData.endMileage && updateData.endTime ? true : undefined,
        updatedAt: new Date()
      },
      include: {
        vehicles: {
          select: {
            licensePlate: true,
            make: true,
            model: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: trip.id,
        vehicle: {
          licensePlate: trip.vehicles?.licensePlate || 'Unknown',
          make: trip.vehicles?.make || '',
          model: trip.vehicles?.model || ''
        },
        startMileage: trip.startMileage,
        endMileage: trip.endMileage,
        tripMileage: trip.tripMileage,
        isCompleted: trip.isCompleted
      },
      message: 'Trip updated successfully'
    })

  } catch (error) {
    console.error('Error updating driver trip:', error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}

// DELETE - Delete trip (drivers can only delete their own trips within 24 hours)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasUserPermission(session.user, 'canLogDriverTrips')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('id')

    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 })
    }

    // Get driver record
    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { emailAddress: session.user.email || '' },
          { fullName: session.user.name || '' }
        ]
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver record not found' }, { status: 404 })
    }

    // Verify trip exists and belongs to this driver
    const existingTrip = await prisma.vehicleTrips.findFirst({
      where: {
        id: tripId,
        driverId: driver.id
      }
    })

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 })
    }

    // Check permissions for deletion
    const isAdmin = hasUserPermission(session.user, 'isSystemAdmin')
    const isManager = hasUserPermission(session.user, 'isBusinessManager')

    if (!isAdmin && !isManager) {
      // Regular drivers can only delete within 24 hours
      const now = new Date()
      const hoursSinceCreation = (now.getTime() - existingTrip.createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursSinceCreation > 24) {
        return NextResponse.json({
          error: 'Cannot delete trip. Only trips created within the last 24 hours can be deleted by drivers.'
        }, { status: 403 })
      }
    }

    // Delete trip and associated expenses in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete associated expenses first
      await tx.vehicleExpense.deleteMany({
        where: { tripId: tripId }
      })

      // Delete the trip
      await tx.vehicleTrip.delete({
        where: { id: tripId }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Trip deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting driver trip:', error)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}