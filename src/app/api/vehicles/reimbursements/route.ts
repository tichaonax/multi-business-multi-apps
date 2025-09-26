import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateReimbursementSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  businessId: z.string().min(1, 'Business ID is required'),
  reimbursementPeriod: z.string().min(1, 'Reimbursement period is required'),
  totalMileage: z.number().min(0, 'Total mileage must be positive'),
  businessMileage: z.number().min(0, 'Business mileage must be positive'),
  personalMileage: z.number().min(0, 'Personal mileage must be positive'),
  statutoryRate: z.number().positive('Statutory rate must be positive'),
  notes: z.string().optional()
})

const UpdateReimbursementSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED']).optional(),
  approvedBy: z.string().optional(),
  notes: z.string().optional()
})

// GET - Fetch vehicle reimbursements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const vehicleId = searchParams.get('vehicleId')
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const reimbursementPeriod = searchParams.get('reimbursementPeriod')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (userId) {
      where.userId = userId
    }
    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (businessId) {
      where.businessId = businessId
    }
    if (status) {
      where.status = status
    }
    if (reimbursementPeriod) {
      where.reimbursementPeriod = reimbursementPeriod
    }

    // Date range filtering based on submission date
    if (dateFrom || dateTo) {
      where.submissionDate = {}
      if (dateFrom) {
        where.submissionDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.submissionDate.lte = new Date(dateTo)
      }
    }

    const [reimbursements, totalCount] = await Promise.all([
      prisma.vehicleReimbursement.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              year: true,
              ownershipType: true
            }
          },
          business: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { submissionDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.vehicleReimbursement.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: reimbursements,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + reimbursements.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching vehicle reimbursements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle reimbursements', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new vehicle reimbursement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateReimbursementSchema.parse(body)

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify vehicle exists and is personal (business vehicles don't need reimbursement)
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validatedData.vehicleId }
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    if (vehicle.ownershipType !== 'PERSONAL') {
      return NextResponse.json(
        { error: 'Reimbursements are only applicable for personal vehicles' },
        { status: 400 }
      )
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Validate mileage calculations
    if (validatedData.businessMileage + validatedData.personalMileage !== validatedData.totalMileage) {
      return NextResponse.json(
        { error: 'Business mileage plus personal mileage must equal total mileage' },
        { status: 400 }
      )
    }

    // Check for duplicate reimbursement for the same period
    const existingReimbursement = await prisma.vehicleReimbursement.findFirst({
      where: {
        userId: validatedData.userId,
        vehicleId: validatedData.vehicleId,
        businessId: validatedData.businessId,
        reimbursementPeriod: validatedData.reimbursementPeriod,
        status: {
          not: 'REJECTED'
        }
      }
    })

    if (existingReimbursement) {
      return NextResponse.json(
        { error: 'Reimbursement already exists for this period' },
        { status: 409 }
      )
    }

    // Calculate total reimbursement amount
    const totalAmount = validatedData.businessMileage * validatedData.statutoryRate

    // Create reimbursement
    const reimbursement = await prisma.vehicleReimbursement.create({
      data: {
        ...validatedData,
        totalAmount,
        status: 'PENDING',
        submissionDate: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            ownershipType: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: reimbursement,
      message: 'Vehicle reimbursement created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating vehicle reimbursement:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle reimbursement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update vehicle reimbursement (mainly for approval/rejection)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateReimbursementSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify reimbursement exists
    const existingReimbursement = await prisma.vehicleReimbursement.findUnique({
      where: { id }
    })

    if (!existingReimbursement) {
      return NextResponse.json(
        { error: 'Vehicle reimbursement not found' },
        { status: 404 }
      )
    }

    // Verify approver exists if being set
    if (updateData.approvedBy) {
      const approver = await prisma.user.findUnique({
        where: { id: updateData.approvedBy }
      })

      if (!approver) {
        return NextResponse.json(
          { error: 'Approver not found' },
          { status: 404 }
        )
      }
    }

    // Handle status transitions
    const statusUpdateData: any = { ...updateData }

    if (updateData.status === 'APPROVED') {
      statusUpdateData.approvalDate = new Date()
      statusUpdateData.approvedBy = updateData.approvedBy || session.user.id
    } else if (updateData.status === 'PAID') {
      statusUpdateData.paymentDate = new Date()
      if (!existingReimbursement.approvedBy) {
        statusUpdateData.approvedBy = session.user.id
        statusUpdateData.approvalDate = new Date()
      }
    }

    // Update reimbursement
    const reimbursement = await prisma.vehicleReimbursement.update({
      where: { id },
      data: statusUpdateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            ownershipType: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        approver: {
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
      data: reimbursement,
      message: 'Vehicle reimbursement updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating vehicle reimbursement:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle reimbursement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete vehicle reimbursement (only if pending)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reimbursementId = searchParams.get('id')

    if (!reimbursementId) {
      return NextResponse.json(
        { error: 'Reimbursement ID is required' },
        { status: 400 }
      )
    }

    // Verify reimbursement exists
    const existingReimbursement = await prisma.vehicleReimbursement.findUnique({
      where: { id: reimbursementId }
    })

    if (!existingReimbursement) {
      return NextResponse.json(
        { error: 'Vehicle reimbursement not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of pending reimbursements
    if (existingReimbursement.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending reimbursements can be deleted' },
        { status: 409 }
      )
    }

    // Delete reimbursement
    await prisma.vehicleReimbursement.delete({
      where: { id: reimbursementId }
    })

    return NextResponse.json({
      success: true,
      message: 'Vehicle reimbursement deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting vehicle reimbursement:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle reimbursement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}