import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/connected-clients
 * Unified connected clients dashboard showing both ESP32 and R710 clients
 *
 * Query params:
 * - businessId: Filter by business (optional, admins only)
 * - system: Filter by system (ESP32, R710, or BOTH - default: BOTH)
 * - status: Filter by online status (online, offline, all - default: all)
 * - search: Search by MAC, hostname, device type, IP, or WLAN
 * - limit: Max items per page (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = getEffectivePermissions(user)
    if (!isSystemAdmin(user) && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to access connected clients' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || undefined
    const system = searchParams.get('system') || 'BOTH'
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause for business and user access
    const businessWhere: any = {}

    if (businessId) {
      businessWhere.businessId = businessId
    } else if (!isSystemAdmin(user)) {
      // Non-admin users see only their businesses
      const userBusinessIds = user.businessMemberships?.map((m) => m.businessId) || []
      businessWhere.businessId = { in: userBusinessIds }
    }

    // Status filter (only applies to ESP32 which has isOnline field)
    const esp32StatusWhere = status === 'all' ? {} : { isOnline: status === 'online' }

    // Fetch ESP32 clients
    const esp32Clients =
      system === 'BOTH' || system === 'ESP32'
        ? await prisma.eSP32ConnectedClients.findMany({
            where: {
              ...businessWhere,
              ...esp32StatusWhere,
              ...(search
                ? {
                    OR: [
                      { macAddress: { contains: search.toLowerCase() } },
                      { ipAddress: { contains: search } },
                      { hostname: { contains: search, mode: 'insensitive' } },
                      { deviceType: { contains: search, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            include: {
              wifiToken: {
                select: {
                  id: true,
                  token: true,
                  status: true,
                  expiresAt: true,
                  tokenConfigId: true
                }
              },
              business: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            },
            orderBy: { lastSyncedAt: 'desc' }
          })
        : []

    // Fetch R710 clients
    const r710Clients =
      system === 'BOTH' || system === 'R710'
        ? await prisma.r710ConnectedClients.findMany({
            where: {
              ...businessWhere,
              ...(search
                ? {
                    OR: [
                      { macAddress: { contains: search.toLowerCase() } },
                      { hostname: { contains: search, mode: 'insensitive' } },
                      { tokenUsername: { contains: search, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            include: {
              wlan: {
                select: {
                  ssid: true
                }
              },
              business: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            },
            orderBy: { lastSyncedAt: 'desc' }
          })
        : []

    // Transform clients to unified format
    const unifiedClients = [
      ...esp32Clients.map((client) => ({
        id: client.id,
        system: 'ESP32' as const,
        macAddress: client.macAddress,
        ipAddress: client.ipAddress || null,
        hostname: client.hostname || null,
        deviceType: client.deviceType || null,
        isOnline: client.isOnline,
        connectedAt: client.connectedAt.toISOString(),
        disconnectedAt: null,
        lastSyncedAt: client.lastSyncedAt.toISOString(),
        bandwidthUsedDown: client.bandwidthUsedDown || 0,
        bandwidthUsedUp: client.bandwidthUsedUp || 0,
        wlanName: null,
        tokenInfo: {
          id: client.wifiToken.id,
          token: client.wifiToken.token,
          status: client.wifiToken.status,
          expiresAt: client.wifiToken.expiresAt?.toISOString() || null
        },
        business: client.business,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString()
      })),
      ...r710Clients.map((client) => ({
        id: client.id,
        system: 'R710' as const,
        macAddress: client.macAddress,
        ipAddress: client.ipAddress || null,
        hostname: client.hostname || null,
        deviceType: client.deviceType || null,
        isOnline: true, // R710 doesn't track offline, only syncs connected clients
        connectedAt: client.connectedAt.toISOString(),
        disconnectedAt: null, // R710 doesn't track disconnection
        lastSyncedAt: client.lastSyncedAt.toISOString(),
        bandwidthUsedDown: Number(client.rxBytes) / (1024 * 1024), // Convert bytes to MB
        bandwidthUsedUp: Number(client.txBytes) / (1024 * 1024), // Convert bytes to MB
        wlanName: client.wlan.ssid,
        tokenInfo: {
          id: client.tokenUsername || 'unknown',
          username: client.tokenUsername || null,
          password: null, // Not stored in connected clients
          status: 'ACTIVE' // R710 clients are always active when connected
        },
        business: client.business,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString()
      }))
    ]

    // Sort by lastSyncedAt descending
    unifiedClients.sort((a, b) => {
      return new Date(b.lastSyncedAt).getTime() - new Date(a.lastSyncedAt).getTime()
    })

    // Apply pagination
    const total = unifiedClients.length
    const paginatedClients = unifiedClients.slice(offset, offset + limit)

    // Calculate statistics
    const onlineClients = unifiedClients.filter((c) => c.isOnline)
    const offlineClients = unifiedClients.filter((c) => !c.isOnline)
    const esp32Count = unifiedClients.filter((c) => c.system === 'ESP32').length
    const r710Count = unifiedClients.filter((c) => c.system === 'R710').length

    return NextResponse.json({
      success: true,
      data: {
        clients: paginatedClients,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        statistics: {
          total,
          online: onlineClients.length,
          offline: offlineClients.length,
          esp32: esp32Count,
          r710: r710Count,
          bySystem: {
            ESP32: {
              total: esp32Count,
              online: esp32Clients.filter((c) => c.isOnline).length
            },
            R710: {
              total: r710Count,
              online: r710Count // R710 clients are all considered online
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Error fetching unified connected clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connected clients' },
      { status: 500 }
    )
  }
}
