import { NextResponse } from 'next/server'
import { isSystemAdmin } from '@/lib/permission-utils'
import { sweepVehicleLicenseReminders } from '@/lib/vehicles/license-reminder-notify'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/admin/trigger-vehicle-license-sweep
 * Manually runs the vehicle/driver license compliance sweep (MBM-304) —
 * same logic as the nightly cron and the throttled lazy trigger on
 * GET /api/notifications, just without the throttle, for testing without
 * waiting for either. Admin only.
 */
export async function POST() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log(`[VehicleLicenseSweep] Manual trigger by ${user.email}`)

    const result = await sweepVehicleLicenseReminders()

    return NextResponse.json({
      success: true,
      message: 'Vehicle license compliance sweep completed',
      result,
    })
  } catch (error: any) {
    console.error('[VehicleLicenseSweep] Error:', error)
    return NextResponse.json(
      { error: 'Failed to run vehicle license sweep', details: error.message },
      { status: 500 }
    )
  }
}
