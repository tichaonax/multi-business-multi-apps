import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/admin/esp32-connected-clients
 * Query ESP32 connected clients with filtering and pagination
 *
 * Query params:
 * - businessId: Filter by business (optional, admins only)
 * - status: Filter by online status (online, offline, all - default: all)
 * - search: Search by MAC, hostname, device type, or IP
 * - limit: Max items per page (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.isAdmin && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to access connected clients' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || undefined
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}

    // Business filter (admin can see all, regular users see their businesses)
    if (businessId) {
      where.businessId = businessId
    } else if (!permissions.isAdmin) {
      // Non-admin users see only their businesses
      const userBusinessIds = session.user.businessMemberships?.map((m) => m.businessId) || []
      where.businessId = { in: userBusinessIds }
    }

    // Status filter
    if (status === 'online') {
      where.isOnline = true
    } else if (status === 'offline') {
      where.isOnline = false
    }

    // Search filter
    if (search) {
      where.OR = [
        { macAddress: { contains: search.toLowerCase() } },
        { ipAddress: { contains: search } },
        { hostname: { contains: search, mode: 'insensitive' } },
        { deviceType: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count
    const total = await prisma.eSP32ConnectedClients.count({ where })

    // Get connected clients
    const clients = await prisma.eSP32ConnectedClients.findMany({
      where,
      include: {
        wifiToken: {
          select: {
            id: true,
            token: true,
            status: true,
            durationMinutes: true
          }
        },
        business: {
          select: {
            id: true,
            businessName: true,
            type: true
          }
        }
      },
      orderBy: { lastSyncedAt: 'desc' },
      take: limit,
      skip: offset
    })

    return NextResponse.json({
      success: true,
      data: {
        clients: clients.map((client) => ({
          ...client,
          connectedAt: client.connectedAt.toISOString(),
          lastSyncedAt: client.lastSyncedAt.toISOString(),
          createdAt: client.createdAt.toISOString(),
          updatedAt: client.updatedAt.toISOString()
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        statistics: {
          total,
          online: await prisma.eSP32ConnectedClients.count({
            where: { ...where, isOnline: true }
          }),
          offline: await prisma.eSP32ConnectedClients.count({
            where: { ...where, isOnline: false }
          })
        }
      }
    })
  } catch (error) {
    console.error('Error fetching ESP32 connected clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connected clients' },
      { status: 500 }
    )
  }
}
