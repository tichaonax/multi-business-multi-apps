import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/esp32/[deviceId]/mac-blacklist
 * Add MAC addresses from a token to the blacklist
 *
 * Body:
 * - token: WiFi token to extract MACs from
 * - reason: Reason for blocking (optional, max 31 chars)
 * - businessId: Business ID (optional, for tracking)
 */
export async function POST(
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
    const body = await request.json()
    const { token, reason = 'Blocked by admin', businessId } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    // First, get token info to extract MAC addresses
    const infoUrl = `${integration.apiUrl}/api/token/info?` + new URLSearchParams({
      api_key: integration.apiKey,
      token
    })

    const infoResponse = await fetch(infoUrl)
    const infoData = await infoResponse.json()

    if (!infoData.success) {
      return NextResponse.json(
        { error: 'Token not found or inactive' },
        { status: 404 }
      )
    }

    // Extract MAC addresses from token devices
    const macAddresses = (infoData.devices || []).map((d: any) => d.mac)

    // Call ESP32 blacklist API
    const formData = new URLSearchParams({
      api_key: integration.apiKey,
      token,
      reason
    })

    const response = await fetch(`${integration.apiUrl}/api/mac/blacklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to add to blacklist' },
        { status: 400 }
      )
    }

    // Create database ACL entries for each MAC
    const createdEntries = []
    for (const mac of macAddresses) {
      try {
        const entry = await prisma.macAclEntry.create({
          data: {
            macAddress: mac.toLowerCase(),
            integrationId: deviceId,
            integrationSystem: 'ESP32',
            listType: 'BLACKLIST',
            reason,
            businessId: businessId || integration.businessId,
            createdBy: session.user.id,
            approvedBy: session.user.id,
            isActive: true,
            expiresAt: null
          }
        })
        createdEntries.push(entry)
      } catch (error) {
        console.error(`Failed to create ACL entry for MAC ${mac}:`, error)
        // Continue with other MACs
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: data.message,
        count: data.count,
        macAddresses,
        dbEntriesCreated: createdEntries.length
      }
    })
  } catch (error) {
    console.error('Error adding to ESP32 blacklist:', error)
    return NextResponse.json(
      { error: 'Failed to add to blacklist' },
      { status: 500 }
    )
  }
}
