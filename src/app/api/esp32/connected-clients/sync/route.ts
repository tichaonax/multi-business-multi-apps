import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { syncAllESP32ConnectedClients } from '@/lib/esp32/connected-clients-sync-service'

/**
 * GET /api/esp32/connected-clients/sync
 * Sync connected clients from ESP32 devices to database
 *
 * This endpoint calls the existing ESP32 sync service
 * which queries all businesses with ESP32 integrations
 * and syncs their connected clients
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = getEffectivePermissions(session.user)
    if (!isSystemAdmin(session.user) && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to sync connected clients' },
        { status: 403 }
      )
    }

    console.log('[ESP32 Sync] Starting connected clients sync...')

    // Call the existing ESP32 sync service
    const result = await syncAllESP32ConnectedClients()

    console.log(
      `[ESP32 Sync] Sync complete: ${result.successCount} businesses succeeded, ${result.failureCount} failed`
    )

    return NextResponse.json({
      success: true,
      message: `Synced ${result.successCount} businesses (${result.failureCount} failed)`,
      synced: result.successCount,
      devices: result.totalBusinesses,
      successCount: result.successCount,
      failureCount: result.failureCount
    })
  } catch (error) {
    console.error('[ESP32 Sync] Error syncing connected clients:', error)
    return NextResponse.json(
      { error: 'Failed to sync connected clients', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
