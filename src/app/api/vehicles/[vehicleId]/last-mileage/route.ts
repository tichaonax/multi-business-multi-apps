import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/vehicles/[vehicleId]/last-mileage
 * MBM-302: the highest mileage reading recorded anywhere for this vehicle —
 * across trips (Vehicles.currentMileage, updated when a trip ends),
 * VehicleExpenses.mileageAtExpense and VehicleMaintenanceRecords.mileageAtService.
 * Mileage only increases, so the max across every source is always the
 * latest known reading regardless of which table it came from or when.
 * Powers the receipt flow's mileage prefill — same-day entries are allowed
 * to repeat this value (more than one service can happen before the
 * odometer changes), just never go backwards.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { vehicleId } = await params

    const [vehicle, expenseMax, maintenanceMax] = await Promise.all([
      prisma.vehicles.findUnique({ where: { id: vehicleId }, select: { currentMileage: true } }),
      prisma.vehicleExpenses.aggregate({ where: { vehicleId }, _max: { mileageAtExpense: true } }),
      prisma.vehicleMaintenanceRecords.aggregate({ where: { vehicleId }, _max: { mileageAtService: true } }),
    ])

    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const mileage = Math.max(
      vehicle.currentMileage ?? 0,
      expenseMax._max.mileageAtExpense ?? 0,
      maintenanceMax._max.mileageAtService ?? 0
    )

    return NextResponse.json({ success: true, data: { mileage: mileage > 0 ? mileage : null } })
  } catch (error) {
    console.error('Error fetching last vehicle mileage:', error)
    return NextResponse.json({ error: 'Failed to fetch last mileage' }, { status: 500 })
  }
}
