import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const CreateLicenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  licenseType: z.enum(['REGISTRATION', 'RADIO', 'ROAD_USE', 'INSURANCE', 'INSPECTION']),
  licenseNumber: z.string().min(1, 'License number is required'),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  renewalCost: z.number().optional(),
  lateFee: z.number().min(0).optional(),
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
  lateFee: z.number().min(0).optional(),
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
      prisma.vehicleLicenses.findMany({
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
      prisma.vehicleLicenses.count({ where })
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
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: validatedData.vehicleId }
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check if an active license exists for this vehicle and type
    const existingLicense = await prisma.vehicleLicenses.findFirst({
      where: {
        vehicleId: validatedData.vehicleId,
        licenseType: validatedData.licenseType,
        isActive: true
      }
    })

    const now = new Date()

    if (existingLicense) {
      // If the existing active license is expired, automatically deactivate it and create the new license
      if (existingLicense.expiryDate && new Date(existingLicense.expiryDate) < now) {
        const newLicenseId = crypto.randomUUID()

        // Do the deactivation + creation transactionally
        const [deactivated, created] = await prisma.$transaction([
          prisma.vehicleLicenses.update({ where: { id: existingLicense.id }, data: { isActive: false } }),
          prisma.vehicleLicenses.create({
            data: {
              id: newLicenseId,
              ...validatedData,
              issueDate: new Date(validatedData.issueDate),
              expiryDate: new Date(validatedData.expiryDate),
              updatedAt: now
            },
            include: { vehicles: { select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true } } }
          })
        ])

        // Audit deactivation
        try {
          await prisma.auditLogs.create({
            data: {
              id: crypto.randomUUID(),
              userId: session.user.id,
              action: 'DEACTIVATE',
              entityType: 'VehicleLicense',
              entityId: deactivated.id,
              oldValues: existingLicense as any,
              newValues: deactivated as any,
              metadata: undefined,
              tableName: 'vehicle_licenses',
              recordId: deactivated.id,
              details: 'Auto-deactivated expired license to allow replacement'
            }
          })
        } catch (e) {
          console.error('Failed to write audit log for vehicle license deactivation', e)
        }

        // Audit creation
        try {
          const normalizedCreated = { ...created, vehicle: (created as any).vehicles || null }
          await prisma.auditLogs.create({
            data: {
              id: crypto.randomUUID(),
              userId: session.user.id,
              action: 'CREATE',
              entityType: 'VehicleLicense',
              entityId: created.id,
              oldValues: undefined,
              newValues: normalizedCreated as any,
              metadata: undefined,
              tableName: 'vehicle_licenses',
              recordId: created.id,
              details: 'Created vehicle license after auto-deactivating expired one'
            }
          })
        } catch (e) {
          console.error('Failed to write audit log for vehicle license create (post-transaction)', e)
        }

        const normalizedLicense = { ...created, vehicle: (created as any).vehicles || null }
        return NextResponse.json({ success: true, data: normalizedLicense, message: 'Vehicle license created successfully' }, { status: 201 })
      }

      // Existing active license is not expired — reject
      return NextResponse.json(
        { error: `Active ${validatedData.licenseType.toLowerCase().replace('_', ' ')} license already exists for this vehicle` },
        { status: 409 }
      )
    }

    // No active license exists — create normally
    const license = await prisma.vehicleLicenses.create({
      data: {
        id: crypto.randomUUID(),
        ...validatedData,
        issueDate: new Date(validatedData.issueDate),
        expiryDate: new Date(validatedData.expiryDate),
        updatedAt: now
      },
      include: { vehicles: { select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true } } }
    })

    const normalizedLicense = { ...license, vehicle: (license as any).vehicles || null }

    // Audit log for creation
    try {
      await prisma.auditLogs.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          action: 'CREATE',
          entityType: 'VehicleLicense',
          entityId: license.id,
          // Prisma JSON fields accept undefined rather than null for optional values
          oldValues: undefined,
          newValues: normalizedLicense as any,
          metadata: undefined,
          tableName: 'vehicle_licenses',
          recordId: license.id,
          details: 'Created vehicle license'
        }
      })
    } catch (e) {
      console.error('Failed to write audit log for vehicle license create', e)
    }

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
    const existingLicense = await prisma.vehicleLicenses.findUnique({
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
      const duplicateCheck = await prisma.vehicleLicenses.findFirst({
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
    const license = await prisma.vehicleLicenses.update({
      where: { id },
      data: { ...updateData, issueDate: updateData.issueDate ? new Date(updateData.issueDate) : undefined, expiryDate: updateData.expiryDate ? new Date(updateData.expiryDate) : undefined } as any,
      include: { vehicles: { select: { id: true, licensePlate: true, make: true, model: true, year: true, ownershipType: true } } }
    })

    const normalizedUpdated = { ...license, vehicle: (license as any).vehicles || null }

    // Audit log for update
    try {
      await prisma.auditLogs.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          action: 'UPDATE',
          entityType: 'VehicleLicense',
          entityId: license.id,
          oldValues: existingLicense as any,
          newValues: normalizedUpdated as any,
          metadata: undefined,
          tableName: 'vehicle_licenses',
          recordId: license.id,
          details: 'Updated vehicle license'
        }
      })
    } catch (e) {
      console.error('Failed to write audit log for vehicle license update', e)
    }

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

    // Support bulk delete via JSON body: { ids: string[] }
    const url = new URL(request.url)
    const searchParams = url.searchParams
    const licenseId = searchParams.get('id')

    let body: any = null
    try {
      body = await request.json().catch(() => null)
    } catch (e) {
      body = null
    }

    const idsToDelete: string[] = []
    if (body && Array.isArray(body.ids) && body.ids.length > 0) {
      idsToDelete.push(...body.ids)
    } else if (licenseId) {
      idsToDelete.push(licenseId)
    } else {
      return NextResponse.json({ error: 'License ID(s) required' }, { status: 400 })
    }

    // Validate all ids exist and belong to the same vehicle (prevent cross-vehicle accidental deletes)
    const licenses = await prisma.vehicleLicenses.findMany({ where: { id: { in: idsToDelete } } })
    if (licenses.length !== idsToDelete.length) {
      return NextResponse.json({ error: 'One or more licenses not found' }, { status: 404 })
    }

    const vehicleIds = Array.from(new Set(licenses.map(l => l.vehicleId)))
    if (vehicleIds.length > 1) {
      return NextResponse.json({ error: 'Selected licenses belong to multiple vehicles; please select licenses for a single vehicle' }, { status: 400 })
    }

    // If caller provided a vehicleId, ensure it matches the licenses' vehicleId
    const providedVehicleId = body && body.vehicleId ? String(body.vehicleId) : null
    if (providedVehicleId && providedVehicleId !== vehicleIds[0]) {
      return NextResponse.json({ error: 'Provided vehicleId does not match selected licenses' }, { status: 400 })
    }

    // Soft delete all selected licenses in a transaction and return deactivated ids
    const updates = idsToDelete.map(id => prisma.vehicleLicenses.update({ where: { id }, data: { isActive: false } }))
    const results = await prisma.$transaction(updates)
    const deactivatedIds = results.map(r => (r as any).id)

    // Audit logs for deactivation
    try {
      for (const r of results) {
        const rec: any = r
        await prisma.auditLogs.create({
          data: {
            id: crypto.randomUUID(),
            userId: session.user.id,
            action: 'DEACTIVATE',
            entityType: 'VehicleLicense',
            entityId: rec.id,
            oldValues: undefined,
            newValues: { ...rec, isActive: false } as any,
            metadata: undefined,
            tableName: 'vehicle_licenses',
            recordId: rec.id,
            details: 'Deactivated vehicle license'
          }
        })
      }
    } catch (e) {
      console.error('Failed to write audit logs for vehicle license deactivation', e)
    }

    return NextResponse.json({ success: true, message: `${deactivatedIds.length} license(s) deactivated successfully`, deactivatedIds })

  } catch (error) {
    console.error('Error deleting vehicle license:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle license', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}