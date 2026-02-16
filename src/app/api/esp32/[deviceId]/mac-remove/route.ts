import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/esp32/[deviceId]/mac-remove
 * Remove a MAC address from blacklist, whitelist, or both
 *
 * Body:
 * - mac: MAC address to remove (XX:XX:XX:XX:XX:XX format)
 * - list: Which list to remove from (blacklist, whitelist, both - default: both)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.isAdmin && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to manage WiFi portal' },
        { status: 403 }
      )
    }

    const { deviceId } = await context.params
    const body = await request.json()
    const { mac, list = 'both' } = body

    if (!mac) {
      return NextResponse.json(
        { error: 'MAC address is required' },
        { status: 400 }
      )
    }

    // Get ESP32 portal integration
    const integration = await prisma.portalIntegrations.findUnique({
      where: { id: deviceId }
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'ESP32 integration not found' },
        { status: 404 }
      )
    }

    if (!integration.apiUrl || !integration.apiKey) {
      return NextResponse.json(
        { error: 'ESP32 API credentials not configured' },
        { status: 400 }
      )
    }

    // Call ESP32 remove API
    const formData = new URLSearchParams({
      api_key: integration.apiKey,
      mac,
      list
    })

    const response = await fetch(`${integration.apiUrl}/api/mac/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to remove MAC' },
        { status: 400 }
      )
    }

    // Remove database ACL entries
    const normalizedMac = mac.toLowerCase()
    const whereClause: any = {
      macAddress: normalizedMac,
      integrationId: deviceId,
      integrationSystem: 'ESP32'
    }

    if (list !== 'both') {
      whereClause.listType = list.toUpperCase()
    }

    const deleteResult = await prisma.macAclEntry.deleteMany({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      data: {
        message: data.message,
        removed: data.removed,
        dbEntriesDeleted: deleteResult.count
      }
    })
  } catch (error) {
    console.error('Error removing MAC from ESP32:', error)
    return NextResponse.json(
      { error: 'Failed to remove MAC' },
      { status: 500 }
    )
  }
}
