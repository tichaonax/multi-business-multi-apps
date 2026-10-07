import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getLastKnownMileage } from '@/lib/vehicles/get-last-known-mileage'

/**
 * GET /api/vehicles/[vehicleId]/last-mileage
 * MBM-302: the highest mileage reading recorded anywhere for this vehicle —
 * powers the receipt flow's mileage prefill. Same-day entries are allowed
 * to repeat this value (more than one service can happen before the
 * odometer changes), just never go backwards — see getLastKnownMileage.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { vehicleId } = await params

    const vehicle = await prisma.vehicles.findUnique({ where: { id: vehicleId }, select: { id: true } })
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const mileage = await getLastKnownMileage(prisma, vehicleId)

    return NextResponse.json({ success: true, data: { mileage: mileage > 0 ? mileage : null } })
  } catch (error) {
    console.error('Error fetching last vehicle mileage:', error)
    return NextResponse.json({ error: 'Failed to fetch last mileage' }, { status: 500 })
  }
}
