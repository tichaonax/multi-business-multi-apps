import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ServiceType } from '@prisma/client'
import { randomBytes, randomUUID } from 'crypto'
import { z } from 'zod'

const CreateMaintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  serviceType: z.enum(['OIL_CHANGE', 'TIRE_REPLACEMENT', 'BRAKE_SERVICE', 'INSPECTION', 'REPAIR', 'OTHER']),
  serviceName: z.string().min(1, 'Service name is required'),
  serviceProvider: z.string().optional(),
  serviceDate: z.string().min(1, 'Service date is required'),
  mileageAtService: z.number().int().min(0).optional(),
  cost: z.number().min(0, 'Service cost must be positive'),
  currency: z.string().default('USD'),
  nextServiceMileage: z.number().int().min(0).optional(),
  nextServiceDue: z.string().optional(),
  warrantyUntil: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
  isCompleted: z.boolean().default(false)
})

const UpdateMaintenanceSchema = z.object({
  id: z.string().min(1),
  serviceType: z.enum(['OIL_CHANGE', 'TIRE_REPLACEMENT', 'BRAKE_SERVICE', 'INSPECTION', 'REPAIR', 'OTHER']).optional(),
  serviceName: z.string().min(1).optional(),
  serviceProvider: z.string().optional(),
  serviceDate: z.string().optional(),
  mileageAtService: z.number().int().min(0).optional(),
  cost: z.number().min(0).optional(),
  currency: z.string().optional(),
  nextServiceMileage: z.number().int().min(0).optional(),
  nextServiceDue: z.string().optional(),
  warrantyUntil: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
  isCompleted: z.boolean().optional()
})

// GET - Fetch vehicle maintenance records
export async function GET(request: NextRequest) {
  try {
  let session = await getServerSession(authOptions)

  // normalize session.user for consistent downstream usage
  const currentUser = session?.user as any

    // Development-only override: allow testing endpoints locally by passing
    // ?_devUserId=<id> when NODE_ENV !== 'production'. This avoids needing to
    // copy auth cookies for quick smoke tests. It will not run in production.
    if (!currentUser?.id) {
      try {
        const { searchParams } = new URL(request.url)
        const devUserId = searchParams.get('_devUserId')
        if (devUserId && process.env.NODE_ENV !== 'production') {
          // minimal shape expected by the rest of the handler
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          session = { user: { id: devUserId } } as any
        }
      } catch (e) {
        // ignore URL parsing issues; will fall through to unauthorized
      }
    }

    const currentUserAfter = session?.user as any
    if (!currentUserAfter?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    const serviceType = searchParams.get('serviceType')
    const isScheduledService = searchParams.get('isScheduledService')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const serviceProvider = searchParams.get('serviceProvider')
    const dueSoon = searchParams.get('dueSoon') === 'true'
    const overdue = searchParams.get('overdue') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (serviceType) {
      where.serviceType = serviceType
    }
    const isCompletedParam = searchParams.get('isCompleted')
    if (isCompletedParam !== null && isCompletedParam !== '') {
      where.isScheduledService = isCompletedParam === 'true'
    }
    if (serviceProvider) {
      where.serviceProvider = {
        contains: serviceProvider,
        mode: 'insensitive'
      }
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.serviceDate = {}
      if (dateFrom) {
        where.serviceDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.serviceDate.lte = new Date(dateTo)
      }
    }

    // Filter for services due soon (within 30 days)
    if (dueSoon) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      where.nextServiceDue = {
        lte: futureDate,
        gte: new Date()
      }
    }

    // Filter for overdue services
    if (overdue) {
      where.nextServiceDue = {
        lt: new Date()
      }
    }

    const [maintenanceRecords, totalCount] = await Promise.all([
      prisma.vehicleMaintenanceRecords.findMany({
        where,
        include: {
          vehicles: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              year: true,
              currentMileage: true,
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
        orderBy: { serviceDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.vehicleMaintenanceRecords.count({ where })
    ])

    // Remap Prisma relation field names back to the API shape expected by callers
    const mapped = maintenanceRecords.map((r: any) => ({
      ...r,
      cost: r.serviceCost ?? 0, // Map database field serviceCost to API field cost
      currency: r.currency ?? 'USD', // Ensure currency is present
      isCompleted: r.isScheduledService ?? false, // Map database field isScheduledService to API field isCompleted
      vehicle: r.vehicles ?? null,
      creator: r.users ?? null
    }))

    return NextResponse.json({
      success: true,
      data: mapped,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + mapped.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching vehicle maintenance records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle maintenance records', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new vehicle maintenance record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const currentUser = session?.user as any
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateMaintenanceSchema.parse(body)

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

    // Validate mileage at service against current vehicle mileage
    if (typeof validatedData.mileageAtService === 'number' && validatedData.mileageAtService > vehicle.currentMileage) {
      return NextResponse.json(
        { error: 'Service mileage cannot be greater than current vehicle mileage' },
        { status: 400 }
      )
    }

    // Validate next service mileage if provided
    if (typeof validatedData.nextServiceMileage === 'number' && typeof validatedData.mileageAtService === 'number' && validatedData.nextServiceMileage <= validatedData.mileageAtService) {
      return NextResponse.json(
        { error: 'Next service mileage must be greater than current service mileage' },
        { status: 400 }
      )
    }

    // Validate next service date if provided
    if (validatedData.nextServiceDue) {
      const serviceDate = new Date(validatedData.serviceDate)
      const nextServiceDue = new Date(validatedData.nextServiceDue)

      if (nextServiceDue <= serviceDate) {
        return NextResponse.json(
          { error: 'Next service date must be after the current service date' },
          { status: 400 }
        )
      }
    }

    // Map incoming serviceType (frontend) to Prisma ServiceType enum
    const SERVICE_TYPE_MAP: Record<string, ServiceType> = {
      ROUTINE: ServiceType.OTHER,
      REPAIR: ServiceType.REPAIR,
      INSPECTION: ServiceType.INSPECTION,
      EMERGENCY: ServiceType.REPAIR,
      WARRANTY: ServiceType.OTHER,
      UPGRADE: ServiceType.OTHER
    }

    const prismaServiceType = SERVICE_TYPE_MAP[validatedData.serviceType]
    if (!prismaServiceType) {
      return NextResponse.json({ error: 'Invalid serviceType' }, { status: 400 })
    }

    // Create maintenance record (map front-end names to DB columns)
    const maintenanceRecord = await prisma.vehicleMaintenanceRecords.create({
      data: {
        id: randomUUID(),
        vehicleId: validatedData.vehicleId,
        serviceType: prismaServiceType,
        serviceName: validatedData.serviceName,
        serviceProvider: validatedData.serviceProvider || null,
        serviceDate: new Date(validatedData.serviceDate),
        mileageAtService: typeof validatedData.mileageAtService === 'number' ? validatedData.mileageAtService : 0,
        nextServiceDue: validatedData.nextServiceDue ? new Date(validatedData.nextServiceDue) : null,
        nextServiceMileage: typeof validatedData.nextServiceMileage === 'number' ? validatedData.nextServiceMileage : null,
        serviceCost: typeof validatedData.cost === 'number' ? validatedData.cost : 0,
        // Map warrantyUntil -> warrantyInfo (string field in DB)
        warrantyInfo: validatedData.warrantyUntil ? String(validatedData.warrantyUntil) : null,
        receiptUrl: validatedData.receiptUrl || null,
        notes: validatedData.notes || null,
        isScheduledService: !!validatedData.isCompleted,
        createdBy: currentUser.id,
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
            currentMileage: true,
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
    // remap to legacy API field names
    const created = {
      ...maintenanceRecord,
      cost: (maintenanceRecord as any).serviceCost ?? 0, // Map database field serviceCost to API field cost
      currency: (maintenanceRecord as any).currency ?? 'USD',
      isCompleted: (maintenanceRecord as any).isScheduledService ?? false, // Map database field isScheduledService to API field isCompleted
      vehicle: (maintenanceRecord as any).vehicles ?? null,
      creator: (maintenanceRecord as any).users ?? null
    }

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Vehicle maintenance record created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: (error as any).issues || (error as any).errors },
        { status: 400 }
      )
    }

    console.error('Error creating vehicle maintenance record:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle maintenance record', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update vehicle maintenance record
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateMaintenanceSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify maintenance record exists
    const existingRecord = await prisma.vehicleMaintenanceRecords.findUnique({
      where: { id },
      include: {
        vehicles: {
          select: { currentMileage: true }
        }
      }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Vehicle maintenance record not found' },
        { status: 404 }
      )
    }

    // Validate mileage at service if being updated
    if (updateData.mileageAtService && updateData.mileageAtService > (existingRecord as any).vehicles.currentMileage) {
      return NextResponse.json(
        { error: 'Service mileage cannot be greater than current vehicle mileage' },
        { status: 400 }
      )
    }

    // Validate next service mileage if provided
    const serviceM = updateData.mileageAtService || existingRecord.mileageAtService
    if (updateData.nextServiceMileage && updateData.nextServiceMileage <= serviceM) {
      return NextResponse.json(
        { error: 'Next service mileage must be greater than current service mileage' },
        { status: 400 }
      )
    }

    // Validate next service date if provided
    if (updateData.nextServiceDue) {
      const serviceDate = updateData.serviceDate ? new Date(updateData.serviceDate) : existingRecord.serviceDate
      const nextServiceDue = new Date(updateData.nextServiceDue)

      if (nextServiceDue <= serviceDate) {
        return NextResponse.json(
          { error: 'Next service date must be after the current service date' },
          { status: 400 }
        )
      }
    }

    // Map incoming serviceType to Prisma enum
    const SERVICE_TYPE_MAP: Record<string, ServiceType> = {
      ROUTINE: ServiceType.OTHER,
      REPAIR: ServiceType.REPAIR,
      INSPECTION: ServiceType.INSPECTION,
      EMERGENCY: ServiceType.REPAIR,
      WARRANTY: ServiceType.OTHER,
      UPGRADE: ServiceType.OTHER
    }

    // Update maintenance record (map front-end fields to DB columns)
    const maintenanceRecord = await prisma.vehicleMaintenanceRecords.update({
      where: { id },
      data: {
        serviceType: updateData.serviceType ? SERVICE_TYPE_MAP[updateData.serviceType as string] ?? undefined : undefined,
        serviceName: updateData.serviceName ?? undefined,
        serviceProvider: updateData.serviceProvider ?? undefined,
        serviceDate: updateData.serviceDate ? new Date(updateData.serviceDate) : undefined,
        mileageAtService: typeof updateData.mileageAtService === 'number' ? updateData.mileageAtService : undefined,
        nextServiceMileage: typeof updateData.nextServiceMileage === 'number' ? updateData.nextServiceMileage : undefined,
        nextServiceDue: updateData.nextServiceDue ? new Date(updateData.nextServiceDue) : undefined,
        serviceCost: typeof updateData.cost === 'number' ? updateData.cost : undefined,
        warrantyInfo: updateData.warrantyUntil ? String(updateData.warrantyUntil) : undefined,
        receiptUrl: updateData.receiptUrl ?? undefined,
        notes: updateData.notes ?? undefined,
        isScheduledService: typeof updateData.isCompleted === 'boolean' ? updateData.isCompleted : undefined
      },
      include: {
        vehicles: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            currentMileage: true,
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

    const updated = {
      ...maintenanceRecord,
      cost: (maintenanceRecord as any).serviceCost ?? 0, // Map database field serviceCost to API field cost
      currency: (maintenanceRecord as any).currency ?? 'USD',
      isCompleted: (maintenanceRecord as any).isScheduledService ?? false, // Map database field isScheduledService to API field isCompleted
      vehicle: (maintenanceRecord as any).vehicles ?? null,
      creator: (maintenanceRecord as any).users ?? null
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Vehicle maintenance record updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: (error as any).issues || (error as any).errors },
        { status: 400 }
      )
    }

    console.error('Error updating vehicle maintenance record:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle maintenance record', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete vehicle maintenance record
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('id')

    if (!recordId) {
      return NextResponse.json(
        { error: 'Maintenance record ID is required' },
        { status: 400 }
      )
    }

    // Verify maintenance record exists
    const existingRecord = await prisma.vehicleMaintenanceRecords.findUnique({
      where: { id: recordId }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Vehicle maintenance record not found' },
        { status: 404 }
      )
    }

    // Delete maintenance record
    await prisma.vehicleMaintenanceRecords.delete({
      where: { id: recordId }
    })

    return NextResponse.json({
      success: true,
      message: 'Vehicle maintenance record deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting vehicle maintenance record:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle maintenance record', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}