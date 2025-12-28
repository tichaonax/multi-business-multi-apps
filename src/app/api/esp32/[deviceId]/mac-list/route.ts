import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/esp32/[deviceId]/mac-list
 * Get MAC filtering entries from ESP32 device
 *
 * Query params:
 * - list: Filter by list type (blacklist, whitelist, both - default: both)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.isAdmin && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to manage WiFi portal' },
        { status: 403 }
      )
    }

    const { deviceId } = await context.params
    const { searchParams } = new URL(request.url)
    const list = searchParams.get('list') || 'both'

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

    // Call ESP32 API
    const url = `${integration.apiUrl}/api/mac/list?` + new URLSearchParams({
      api_key: integration.apiKey,
      list
    })

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`ESP32 API error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: 'Failed to fetch MAC list from ESP32' },
        { status: 500 }
      )
    }

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch MAC list' },
        { status: 400 }
      )
    }

    // Get database ACL entries for this integration
    const dbEntries = await prisma.macAclEntry.findMany({
      where: {
        integrationId: deviceId,
        integrationSystem: 'ESP32'
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map database entries by MAC address
    const dbEntriesMap = new Map(dbEntries.map((e) => [e.macAddress.toLowerCase(), e]))

    // Merge ESP32 data with database entries
    const blacklist = (data.blacklist || []).map((entry: any) => {
      const dbEntry = dbEntriesMap.get(entry.mac.toLowerCase())
      return {
        ...entry,
        id: dbEntry?.id,
        businessId: dbEntry?.businessId,
        createdBy: dbEntry?.createdBy,
        approvedBy: dbEntry?.approvedBy,
        isActive: dbEntry?.isActive ?? true
      }
    })

    const whitelist = (data.whitelist || []).map((entry: any) => {
      const dbEntry = dbEntriesMap.get(entry.mac.toLowerCase())
      return {
        ...entry,
        id: dbEntry?.id,
        businessId: dbEntry?.businessId,
        createdBy: dbEntry?.createdBy,
        approvedBy: dbEntry?.approvedBy,
        isActive: dbEntry?.isActive ?? true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        blacklist,
        whitelist,
        blacklist_count: blacklist.length,
        whitelist_count: whitelist.length,
        total_count: blacklist.length + whitelist.length
      }
    })
  } catch (error) {
    console.error('Error fetching ESP32 MAC list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MAC list' },
      { status: 500 }
    )
  }
}
