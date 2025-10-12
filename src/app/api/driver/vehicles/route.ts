import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'

// GET - Fetch vehicles authorized for the current driver
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check driver trip logging or maintenance permission
    if (!hasUserPermission(session.user, 'canLogDriverTrips') && !hasUserPermission(session.user, 'canLogDriverMaintenance')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

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
        message: 'No driver record found. Contact administrator for vehicle access.'
      })
    }

    // Get authorized vehicles for this driver
    const authorizations = await prisma.driverAuthorizations.findMany({
      where: {
        driverId: driver.id,
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
            year: true,
            currentMileage: true,
            mileageUnit: true,
            ownershipType: true
          }
        }
      }
    })

    // Format vehicles for driver UI
    const authorizedVehicles = authorizations.map(auth => ({
      id: auth.vehicles?.id,
      licensePlate: auth.vehicles?.licensePlate,
      make: auth.vehicles?.make,
      model: auth.vehicles?.model,
      year: auth.vehicles?.year,
      currentMileage: auth.vehicles?.currentMileage,
      mileageUnit: auth.vehicles?.mileageUnit,
      displayName: `${auth.vehicles?.licensePlate} - ${auth.vehicles?.make} ${auth.vehicles?.model}`,
      authorizationExpiry: auth.expiryDate
    })).filter(vehicle => vehicle.id) // Filter out any null vehicles

    return NextResponse.json({
      success: true,
      data: authorizedVehicles,
      message: authorizedVehicles.length === 0
        ? 'No authorized vehicles found. Contact administrator for vehicle access.'
        : `Found ${authorizedVehicles.length} authorized vehicle(s)`
    })

  } catch (error) {
    console.error('Error fetching authorized vehicles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch authorized vehicles' },
      { status: 500 }
    )
  }
}