import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isSystemAdmin, type SessionUser } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
import * as crypto from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
// Validation schemas
const CreateVehicleSchema = z.object({
  licensePlate: z.string().min(1, 'License plate is required'),
  vin: z.string().min(5, 'VIN must be at least 5 characters'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
  weight: z.number().optional(),
  driveType: z.enum(['LEFT_HAND', 'RIGHT_HAND']),
  ownershipType: z.enum(['PERSONAL', 'BUSINESS']),
  currentMileage: z.number().int().min(0),
  mileageUnit: z.enum(['km', 'miles']),
  businessId: z.string().optional(),
  userId: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  notes: z.string().optional()
})

const UpdateVehicleSchema = z.object({
  id: z.string().min(1),
  licensePlate: z.string().min(1).optional(),
  vin: z.string().min(5, 'VIN must be at least 5 characters').optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  weight: z.number().optional(),
  driveType: z.enum(['LEFT_HAND', 'RIGHT_HAND']).optional(),
  ownershipType: z.enum(['PERSONAL', 'BUSINESS']).optional(),
  currentMileage: z.number().int().min(0).optional(),
  mileageUnit: z.enum(['km', 'miles']).optional(),
  businessId: z.string().optional(),
  userId: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
})

// GET - Fetch vehicles
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  const id = searchParams.get('id')
    const userId = searchParams.get('userId')
    const ownershipType = searchParams.get('ownershipType')
    const isActive = searchParams.get('isActive')
    const includeLicenses = searchParams.get('includeLicenses') === 'true'
    const includeTrips = searchParams.get('includeTrips') === 'true'
    const includeMaintenance = searchParams.get('includeMaintenance') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    // Filter by id, business or user based on ownership
    if (id) {
      where.id = id
    }
    if (businessId) {
      where.businessId = businessId
    }
    if (userId) {
      where.userId = userId
    }
    if (ownershipType) {
      where.ownershipType = ownershipType
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const [vehicles, totalCount] = await Promise.all([
      prisma.vehicles.findMany({
        where,
        include: {
          businesses: {
            select: { id: true, name: true, type: true }
          },
          users: {
            select: { id: true, name: true, email: true }
          },
          ...(includeLicenses && {
            vehicle_licenses: {
              where: { isActive: true },
              orderBy: { expiryDate: 'asc' }
            }
          }),
          ...(includeTrips && {
            vehicle_trips: {
              take: 5,
              orderBy: { startTime: 'desc' },
              include: {
                vehicle_drivers: {
                  select: { id: true, fullName: true }
                }
              }
            }
          }),
          ...(includeMaintenance && {
            vehicle_maintenance_records: {
              take: 5,
              orderBy: { serviceDate: 'desc' }
            }
          })
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.vehicles.count({ where })
    ])

    const normalizedVehicles = vehicles.map((v: any) => ({
      ...v,
      business: v.businesses || null,
      user: v.users || null,
      vehicleLicenses: v.vehicle_licenses || [],
      trips: v.vehicle_trips || [],
      maintenanceRecords: v.vehicle_maintenance_records || [],
      expenseRecords: v.vehicle_expenses || [],
    }))

    return NextResponse.json({
      success: true,
      data: normalizedVehicles,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + vehicles.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new vehicle
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateVehicleSchema.parse(body)

    // Check if license plate or VIN already exists
    const existingVehicle = await prisma.vehicles.findFirst({
      where: {
        OR: [
          { licensePlate: validatedData.licensePlate },
          { vin: validatedData.vin }
        ]
      }
    })

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle with this license plate or VIN already exists' },
        { status: 409 }
      )
    }

    // Verify business exists if businessId is provided
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

    // Create vehicle (use a loose any-typed payload to avoid strict create input mismatches)
    const createData: any = {
      id: crypto.randomUUID(),
      ...validatedData,
      // Set hasInitialMileage to true if currentMileage is greater than 0
      hasInitialMileage: validatedData.currentMileage > 0,
      purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : undefined,
      updatedAt: new Date()
    }
    if (!createData.businessId) delete createData.businessId
    if (!createData.userId) delete createData.userId

    const vehicle = await prisma.vehicles.create({
      data: createData,
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: vehicle,
      message: 'Vehicle created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update vehicle
export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateVehicleSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify vehicle exists
    const existingVehicle = await prisma.vehicles.findUnique({
      where: { id }
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check for duplicate license plate or VIN if they're being updated
    if (updateData.licensePlate || updateData.vin) {
      const duplicateCheck = await prisma.vehicles.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(updateData.licensePlate ? [{ licensePlate: updateData.licensePlate }] : []),
                ...(updateData.vin ? [{ vin: updateData.vin }] : [])
              ]
            }
          ]
        }
      })

      if (duplicateCheck) {
        return NextResponse.json(
          { error: 'Vehicle with this license plate or VIN already exists' },
          { status: 409 }
        )
      }
    }

    // Verify business exists if businessId is being updated
    if (updateData.businessId) {
      const business = await prisma.businesses.findUnique({
        where: { id: updateData.businessId }
      })

      if (!business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }
    }

    // Check if user is trying to change mileage unit
    const userIsAdmin = isSystemAdmin(user as SessionUser)
    if (updateData.mileageUnit && updateData.mileageUnit !== existingVehicle.mileageUnit) {
      // If vehicle has initial mileage and user is not admin, prevent change
      if (existingVehicle.hasInitialMileage && !userIsAdmin) {
        return NextResponse.json(
          { error: 'Mileage unit cannot be changed after initial mileage entries. Contact an administrator.' },
          { status: 403 }
        )
      }
    }

    // Update vehicle (loose typing for update payload)
    const updatePayload: any = {
      ...updateData,
      purchaseDate: updateData.purchaseDate ? new Date(updateData.purchaseDate) : undefined
    }
    if (updatePayload.businessId === undefined) delete updatePayload.businessId
    if (updatePayload.userId === undefined) delete updatePayload.userId

    const vehicle = await prisma.vehicles.update({
      where: { id },
      data: updatePayload,
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: vehicle,
      message: 'Vehicle updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete vehicle
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('id')

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      )
    }

    // Verify vehicle exists
    const existingVehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId },
      include: {
        vehicle_trips: { take: 1 },
        vehicle_maintenance_records: { take: 1 },
        vehicle_expenses: { take: 1 }
      }
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check if vehicle has related records
    const hasRelatedRecords = (existingVehicle as any).vehicle_trips.length > 0 ||
                 (existingVehicle as any).vehicle_maintenance_records.length > 0 ||
                 (existingVehicle as any).vehicle_expenses.length > 0

    if (hasRelatedRecords) {
      // Soft delete - just mark as inactive
      await prisma.vehicles.update({
        where: { id: vehicleId },
        data: { isActive: false }
      })

      return NextResponse.json({
        success: true,
        message: 'Vehicle deactivated successfully (soft delete due to existing records)'
      })
    } else {
      // Hard delete - no related records
      await prisma.vehicles.delete({
        where: { id: vehicleId }
      })

      return NextResponse.json({
        success: true,
        message: 'Vehicle deleted successfully'
      })
    }

  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}