import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { hasUserPermission } from '@/lib/permission-utils'

// Service expense schema
const ServiceExpenseSchema = z.object({
  id: z.string().optional(),
  expenseType: z.string().min(1, 'Expense type is required'),
  amount: z.number().min(0, 'Expense amount must be positive'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  vendorName: z.string().optional(),
  isBusinessDeductible: z.boolean().default(false),
  receiptUrl: z.string().optional()
})

// Maintenance service schema for driver maintenance logging
const MaintenanceServiceSchema = z.object({
  id: z.string().optional(),
  serviceType: z.enum(['ROUTINE', 'REPAIR', 'INSPECTION', 'EMERGENCY', 'WARRANTY', 'UPGRADE', 'OTHER']),
  serviceName: z.string().min(1, 'Service name is required'),
  serviceProvider: z.string().optional(),
  cost: z.number().min(0, 'Service cost must be positive'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  isScheduledService: z.boolean().default(false),
  warrantyUntil: z.string().optional(),
  expenses: z.array(ServiceExpenseSchema).optional().default([])
})

// Enhanced schema for driver maintenance logging with services
const DriverMaintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  serviceDate: z.string().min(1, 'Service date is required'),
  mileageAtService: z.number().int().min(0, 'Mileage must be positive').optional(),
  notes: z.string().optional(),
  services: z.array(MaintenanceServiceSchema).min(1, 'At least one service is required')
})

// GET - Fetch driver's own maintenance records only
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check driver maintenance logging permission
    if (!hasUserPermission(session.user, 'canLogDriverMaintenance')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 for drivers
    const skip = (page - 1) * limit
    const vehicleId = searchParams.get('vehicleId')

    // Get driver record for current user
    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        OR: [
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

    // Get vehicles the driver is authorized to operate
    const authorizedVehicles = await prisma.driverAuthorizations.findMany({
      where: {
        driverId: driver.id,
        isActive: true,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } }
        ]
      },
      select: { vehicleId: true }
    })

    const authorizedVehicleIds = authorizedVehicles.map(auth => auth.vehicleId)

    if (authorizedVehicleIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { total: 0, page, limit, totalPages: 0, hasMore: false },
        message: 'No authorized vehicles found.'
      })
    }

    // Build where clause for maintenance records
    const where: any = {
      vehicleId: { in: authorizedVehicleIds },
      createdBy: session.user.id // Only records created by this driver
    }

    if (vehicleId && authorizedVehicleIds.includes(vehicleId)) {
      where.vehicleId = vehicleId
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
              mileageUnit: true
            }
          },
          services: {
            include: {
              expenses: true
            },
            orderBy: { serviceName: 'asc' }
          }
        },
        orderBy: { serviceDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.vehicleMaintenanceRecords.count({ where })
    ])

    // Format response for driver UI
    const formattedRecords = maintenanceRecords.map(record => ({
      id: record.id,
      vehicle: {
        licensePlate: record.vehicles?.licensePlate || 'Unknown',
        make: record.vehicles?.make || '',
        model: record.vehicles?.model || '',
        year: record.vehicles?.year || 0,
        mileageUnit: record.vehicles?.mileageUnit || 'km'
      },
      serviceDate: record.serviceDate,
      serviceName: record.serviceName,
      serviceType: record.serviceType,
      serviceProvider: record.serviceProvider,
      serviceCost: Number(record.serviceCost || 0),
      mileageAtService: record.mileageAtService,
      nextServiceDue: record.nextServiceDue,
      nextServiceMileage: record.nextServiceMileage,
      warrantyInfo: record.warrantyInfo,
      receiptUrl: record.receiptUrl,
      notes: record.notes,
      isScheduledService: record.isScheduledService,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      // Include services and their expenses
      services: record.services.map(service => ({
        id: service.id,
        serviceName: service.serviceName,
        serviceType: service.serviceType,
        cost: Number(service.cost || 0),
        currency: service.currency,
        serviceProvider: service.serviceProvider,
        description: service.description,
        isScheduledService: service.isScheduledService,
        warrantyUntil: service.warrantyUntil,
        receiptUrl: service.receiptUrl,
        expenses: service.expenses.map(expense => ({
          id: expense.id,
          expenseType: expense.expenseType,
          amount: Number(expense.amount || 0),
          currency: expense.currency,
          description: expense.description,
          vendorName: expense.vendorName,
          isBusinessDeductible: expense.isBusinessDeductible,
          receiptUrl: expense.receiptUrl
        }))
      })),
      // Calculate totals from services and expenses
      totalServicesCount: record.services.length,
      totalExpensesCount: record.services.reduce((sum, service) => sum + service.expenses.length, 0),
      totalCostFromServices: record.services.reduce((sum, service) => {
        const serviceCost = Number(service.cost || 0)
        const expensesCost = service.expenses.reduce((expSum, exp) => expSum + Number(exp.amount || 0), 0)
        return sum + serviceCost + expensesCost
      }, 0)
    }))

    return NextResponse.json({
      success: true,
      data: formattedRecords,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + formattedRecords.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching driver maintenance records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    )
  }
}

// POST - Create new maintenance record with services (drivers can only create for their authorized vehicles)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check driver maintenance logging permission
    if (!hasUserPermission(session.user, 'canLogDriverMaintenance')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    console.log('Received maintenance data:', JSON.stringify(body, null, 2)) // Debug log
    const validatedData = DriverMaintenanceSchema.parse(body)
    console.log('Validated data - services count:', validatedData.services.length) // Debug log

    // Debug log each service and its expenses
    validatedData.services.forEach((service, index) => {
      console.log(`Service ${index + 1}: ${service.serviceName}, Expenses count: ${service.expenses?.length || 0}`)
      if (service.expenses && service.expenses.length > 0) {
        service.expenses.forEach((expense, expIndex) => {
          console.log(`  Expense ${expIndex + 1}: ${expense.expenseType}, Amount: ${expense.amount}`)
        })
      }
    })

    // Get driver record for current user
    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        OR: [
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
            model: true,
            currentMileage: true
          }
        }
      }
    })

    if (!authorization) {
      return NextResponse.json(
        { error: 'You are not authorized to record maintenance for this vehicle' },
        { status: 403 }
      )
    }

    // Validate mileage if provided
    if (validatedData.mileageAtService && validatedData.mileageAtService > authorization.vehicles.currentMileage) {
      return NextResponse.json(
        { error: 'Service mileage cannot be greater than current vehicle mileage' },
        { status: 400 }
      )
    }

    // Map service types to Prisma enum values
    const SERVICE_TYPE_MAP: Record<string, any> = {
      ROUTINE: 'OTHER', // Map to existing Prisma enum
      REPAIR: 'REPAIR',
      INSPECTION: 'INSPECTION',
      EMERGENCY: 'REPAIR',
      WARRANTY: 'OTHER',
      UPGRADE: 'OTHER',
      OTHER: 'OTHER'
    }

    // Create maintenance record with services and expenses in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create one maintenance record for the session
      const maintenanceRecordId = randomUUID()
      const totalCost = validatedData.services.reduce((sum, service) => {
        const serviceCost = service.cost || 0
        const expensesCost = service.expenses?.reduce((expSum, exp) => expSum + (exp.amount || 0), 0) || 0
        return sum + serviceCost + expensesCost
      }, 0)

      const maintenanceRecord = await tx.vehicleMaintenanceRecord.create({
        data: {
          id: maintenanceRecordId,
          vehicleId: validatedData.vehicleId,
          serviceType: 'OTHER', // We'll use service-level types instead
          serviceName: `Maintenance Session - ${validatedData.services.length} service${validatedData.services.length !== 1 ? 's' : ''}`,
          serviceProvider: null,
          serviceDate: new Date(validatedData.serviceDate + 'T00:00:00.000Z'),
          mileageAtService: validatedData.mileageAtService || 0,
          serviceCost: totalCost,
          warrantyInfo: null,
          receiptUrl: null,
          notes: validatedData.notes || null,
          isScheduledService: validatedData.services.some(s => s.isScheduledService),
          createdBy: session.user.id,
          updatedAt: new Date()
        }
      })

      // Create individual services for this maintenance record
      const createdServices = []
      for (const service of validatedData.services) {
        const serviceId = randomUUID()
        const createdService = await tx.vehicleMaintenanceService.create({
          data: {
            id: serviceId,
            maintenanceRecordId: maintenanceRecordId,
            serviceName: service.serviceName,
            serviceType: service.serviceType,
            cost: service.cost,
            currency: service.currency || 'USD',
            serviceProvider: service.serviceProvider || null,
            description: service.description || null,
            isScheduledService: service.isScheduledService,
            warrantyUntil: service.warrantyUntil || null,
            receiptUrl: service.receiptUrl || null
          }
        })

        // Create expenses for this service
        if (service.expenses && service.expenses.length > 0) {
          console.log(`Creating ${service.expenses.length} expenses for service: ${service.serviceName}`)
          for (const expense of service.expenses) {
            const expenseId = randomUUID()
            console.log(`Creating expense: ${expense.expenseType}, Amount: ${expense.amount}, ServiceId: ${serviceId}`)
            const createdExpense = await tx.vehicleMaintenanceServiceExpense.create({
              data: {
                id: expenseId,
                serviceId: serviceId,
                expenseType: expense.expenseType,
                amount: expense.amount,
                currency: expense.currency || 'USD',
                description: expense.description || null,
                vendorName: expense.vendorName || null,
                isBusinessDeductible: expense.isBusinessDeductible || false,
                receiptUrl: expense.receiptUrl || null
              }
            })
            console.log(`Successfully created expense with ID: ${createdExpense.id}`)
          }
        } else {
          console.log(`No expenses to create for service: ${service.serviceName}`)
        }

        createdServices.push(createdService)
      }

      return { maintenanceRecord, services: createdServices }
    })

    console.log('Transaction result - services created:', result.services.length) // Debug log

    // Calculate totals
    const totalCost = validatedData.services.reduce((sum, service) => {
      const serviceCost = service.cost || 0
      const expensesCost = service.expenses?.reduce((expSum, exp) => expSum + (exp.amount || 0), 0) || 0
      return sum + serviceCost + expensesCost
    }, 0)
    const scheduledServices = validatedData.services.filter(service => service.isScheduledService).length

    return NextResponse.json({
      success: true,
      data: {
        maintenanceRecordId: result.maintenanceRecord.id,
        servicesCreated: result.services.length,
        totalCost: totalCost,
        scheduledServices: scheduledServices,
        vehicle: {
          licensePlate: authorization.vehicles?.licensePlate || 'Unknown',
          make: authorization.vehicles?.make || '',
          model: authorization.vehicles?.model || ''
        },
        serviceDate: validatedData.serviceDate,
        services: validatedData.services.map(service => ({
          serviceName: service.serviceName,
          cost: service.cost,
          isScheduledService: service.isScheduledService
        }))
      },
      message: `Maintenance session created successfully with ${result.services.length} service${result.services.length !== 1 ? 's' : ''}`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating driver maintenance record:', error)
    return NextResponse.json(
      { error: 'Failed to create maintenance record' },
      { status: 500 }
    )
  }
}

// PUT - Update maintenance record (drivers can only update their own records)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasUserPermission(session.user, 'canLogDriverMaintenance')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Maintenance record ID is required' }, { status: 400 })
    }

    // Verify record exists and belongs to this driver
    const existingRecord = await prisma.vehicleMaintenanceRecords.findFirst({
      where: {
        id,
        createdBy: session.user.id // Only allow updating own records
      }
    })

    if (!existingRecord) {
      return NextResponse.json({ error: 'Maintenance record not found or access denied' }, { status: 404 })
    }

    // Update record
    const record = await prisma.vehicleMaintenanceRecords.update({
      where: { id },
      data: {
        ...updateData,
        serviceDate: updateData.serviceDate ? new Date(updateData.serviceDate + 'T00:00:00.000Z') : undefined,
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
        id: record.id,
        serviceName: record.serviceName,
        serviceCost: Number(record.serviceCost || 0),
        vehicle: {
          licensePlate: record.vehicles?.licensePlate || 'Unknown',
          make: record.vehicles?.make || '',
          model: record.vehicles?.model || ''
        }
      },
      message: 'Maintenance record updated successfully'
    })

  } catch (error) {
    console.error('Error updating driver maintenance record:', error)
    return NextResponse.json({ error: 'Failed to update maintenance record' }, { status: 500 })
  }
}

// DELETE - Delete maintenance record (drivers can only delete their own records within 24 hours, admins can delete any)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasUserPermission(session.user, 'canLogDriverMaintenance')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('id')

    if (!recordId) {
      return NextResponse.json({ error: 'Maintenance record ID is required' }, { status: 400 })
    }

    // Verify record exists and check permissions
    const existingRecord = await prisma.vehicleMaintenanceRecords.findFirst({
      where: {
        id: recordId,
        createdBy: session.user.id // Only allow deleting own records for drivers
      }
    })

    if (!existingRecord) {
      return NextResponse.json({ error: 'Maintenance record not found or access denied' }, { status: 404 })
    }

    // Check if record can be deleted (within 24 hours for drivers, admins can delete anytime)
    const isAdmin = hasUserPermission(session.user, 'canManageUsers') // Check for admin permission
    const createdAt = new Date(existingRecord.createdAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    if (!isAdmin && hoursDiff >= 24) {
      return NextResponse.json({
        error: 'Cannot delete maintenance records older than 24 hours. Contact your administrator for assistance.'
      }, { status: 403 })
    }

    // Delete record and all related services and expenses (cascade delete)
    await prisma.vehicleMaintenanceRecords.delete({
      where: { id: recordId }
    })

    return NextResponse.json({
      success: true,
      message: 'Maintenance record deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting driver maintenance record:', error)
    return NextResponse.json({ error: 'Failed to delete maintenance record' }, { status: 500 })
  }
}