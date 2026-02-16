import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/esp32/[deviceId]/mac-clear
 * Clear all MAC addresses from blacklist, whitelist, or both
 *
 * Body:
 * - list: Which list to clear (blacklist, whitelist, both - default: both)
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

    // Check permissions (admin only for this destructive operation)
    const permissions = getEffectivePermissions(user)
    if (!permissions.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can clear MAC filtering lists' },
        { status: 403 }
      )
    }

    const { deviceId } = await context.params
    const body = await request.json()
    const { list = 'both' } = body

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

    // Call ESP32 clear API
    const formData = new URLSearchParams({
      api_key: integration.apiKey,
      list
    })

    const response = await fetch(`${integration.apiUrl}/api/mac/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to clear MAC list' },
        { status: 400 }
      )
    }

    // Clear database ACL entries
    const whereClause: any = {
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
        entries_removed: data.entries_removed,
        dbEntriesDeleted: deleteResult.count
      }
    })
  } catch (error) {
    console.error('Error clearing ESP32 MAC list:', error)
    return NextResponse.json(
      { error: 'Failed to clear MAC list' },
      { status: 500 }
    )
  }
}
