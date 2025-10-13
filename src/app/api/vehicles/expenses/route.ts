import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const CreateExpenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  tripId: z.string().optional(),
  businessId: z.string().optional(),
  expenseType: z.enum(['FUEL', 'TOLL', 'PARKING', 'MAINTENANCE', 'INSURANCE', 'OTHER']),
  expenseCategory: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  isBusinessDeductible: z.boolean().default(false),
  receiptUrl: z.string().optional(),
  vendorName: z.string().optional(),
  description: z.string().optional(),
  mileageAtExpense: z.number().int().min(0).optional(),
  fuelQuantity: z.number().positive().optional(),
  fuelType: z.enum(['GASOLINE', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional()
})

const UpdateExpenseSchema = z.object({
  id: z.string().min(1),
  expenseType: z.enum(['FUEL', 'TOLL', 'PARKING', 'MAINTENANCE', 'INSURANCE', 'OTHER']).optional(),
  expenseCategory: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  expenseDate: z.string().optional(),
  isBusinessDeductible: z.boolean().optional(),
  receiptUrl: z.string().optional(),
  vendorName: z.string().optional(),
  description: z.string().optional(),
  mileageAtExpense: z.number().int().min(0).optional(),
  fuelQuantity: z.number().positive().optional(),
  fuelType: z.enum(['GASOLINE', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional()
})

// GET - Fetch vehicle expenses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    const tripId = searchParams.get('tripId')
    const businessId = searchParams.get('businessId')
    const expenseType = searchParams.get('expenseType')
    const isBusinessDeductible = searchParams.get('isBusinessDeductible')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const createdBy = searchParams.get('createdBy')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (tripId) {
      where.tripId = tripId
    }
    if (businessId) {
      where.businessId = businessId
    }
    if (expenseType) {
      where.expenseType = expenseType
    }
    if (isBusinessDeductible !== null && isBusinessDeductible !== undefined) {
      where.isBusinessDeductible = isBusinessDeductible === 'true'
    }
    if (createdBy) {
      where.createdBy = createdBy
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.expenseDate = {}
      if (dateFrom) {
        where.expenseDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.expenseDate.lte = new Date(dateTo)
      }
    }

    const [expenses, totalCount] = await Promise.all([
      prisma.vehicleExpenses.findMany({
        where,
        include: {
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
          vehicleTrips: {
            select: {
              id: true,
              tripPurpose: true,
              tripType: true,
              startTime: true,
              endTime: true,
              isCompleted: true
            }
          },
          businesses: {
            select: {
              id: true,
              name: true,
              type: true
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
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.vehicleExpenses.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: expenses,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + expenses.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching vehicle expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle expenses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new vehicle expense
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateExpenseSchema.parse(body)

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

    // Verify trip exists if provided
    if (validatedData.tripId) {
      const trip = await prisma.vehicleTrips.findUnique({
        where: { id: validatedData.tripId }
      })

      if (!trip) {
        return NextResponse.json(
          { error: 'Trip not found' },
          { status: 404 }
        )
      }

      // Verify trip belongs to the same vehicle
      if (trip.vehicleId !== validatedData.vehicleId) {
        return NextResponse.json(
          { error: 'Trip does not belong to the specified vehicle' },
          { status: 400 }
        )
      }
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

    // Validate fuel-specific fields
    if (validatedData.expenseType === 'FUEL') {
      if (!validatedData.fuelQuantity || !validatedData.fuelType) {
        return NextResponse.json(
          { error: 'Fuel quantity and fuel type are required for fuel expenses' },
          { status: 400 }
        )
      }
    }

    // Create expense
    const expense = await prisma.vehicleExpenses.create({
      data: {
        id: randomUUID(),
        ...validatedData,
        expenseDate: new Date(validatedData.expenseDate),
        createdBy: session.user.id,
        updatedAt: new Date()
      },
      include: {
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
        vehicleTrips: {
          select: {
            id: true,
            tripPurpose: true,
            tripType: true,
            startTime: true,
            endTime: true,
            isCompleted: true
          }
        },
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
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
      data: expense,
      message: 'Vehicle expense created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating vehicle expense:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update vehicle expense
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateExpenseSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify expense exists
    const existingExpense = await prisma.vehicleExpenses.findUnique({
      where: { id }
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Vehicle expense not found' },
        { status: 404 }
      )
    }

    // Validate fuel-specific fields if expense type is being updated to FUEL
    if (updateData.expenseType === 'FUEL') {
      const fuelQuantity = updateData.fuelQuantity || existingExpense.fuelQuantity
      const fuelType = updateData.fuelType || existingExpense.fuelType

      if (!fuelQuantity || !fuelType) {
        return NextResponse.json(
          { error: 'Fuel quantity and fuel type are required for fuel expenses' },
          { status: 400 }
        )
      }
    }

    // Update expense
    const expense = await prisma.vehicleExpenses.update({
      where: { id },
      data: {
        ...updateData,
        expenseDate: updateData.expenseDate ? new Date(updateData.expenseDate) : undefined
      },
      include: {
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
        vehicleTrips: {
          select: {
            id: true,
            tripPurpose: true,
            tripType: true,
            startTime: true,
            endTime: true,
            isCompleted: true
          }
        },
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
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
      data: expense,
      message: 'Vehicle expense updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating vehicle expense:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete vehicle expense
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const expenseId = searchParams.get('id')

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      )
    }

    // Verify expense exists
    const existingExpense = await prisma.vehicleExpenses.findUnique({
      where: { id: expenseId }
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Vehicle expense not found' },
        { status: 404 }
      )
    }

    // Delete expense
    await prisma.vehicleExpenses.delete({
      where: { id: expenseId }
    })

    return NextResponse.json({
      success: true,
      message: 'Vehicle expense deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting vehicle expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}