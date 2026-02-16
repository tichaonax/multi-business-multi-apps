import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/mac-acl
 * List all MAC ACL entries from both ESP32 and R710 systems
 *
 * Query params:
 * - system: Filter by system (ESP32, R710, or both - default: both)
 * - listType: Filter by list type (BLACKLIST, WHITELIST, both - default: both)
 * - businessId: Filter by business ID (optional)
 * - search: Search by MAC address (optional)
 * - limit: Number of entries per page (default: 50)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const system = searchParams.get('system') || 'both'
    const listType = searchParams.get('listType') || 'both'
    const businessId = searchParams.get('businessId')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}

    if (system !== 'both') {
      where.integrationSystem = system
    }

    if (listType !== 'both') {
      where.listType = listType
    }

    if (businessId) {
      where.businessId = businessId
    }

    if (search) {
      where.macAddress = {
        contains: search.toLowerCase()
      }
    }

    // Get total count
    const total = await prisma.macAclEntry.count({ where })

    // Get ACL entries
    const entries = await prisma.macAclEntry.findMany({
      where,
      include: {
        deviceRegistry: {
          select: {
            hostname: true,
            deviceType: true,
            manufacturer: true,
            firstSeenAt: true,
            lastSeenAt: true,
            totalConnections: true
          }
        },
        business: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Calculate statistics
    const stats = {
      total,
      esp32Count: await prisma.macAclEntry.count({
        where: { ...where, integrationSystem: 'ESP32' }
      }),
      r710Count: await prisma.macAclEntry.count({
        where: { ...where, integrationSystem: 'R710' }
      }),
      blacklistCount: await prisma.macAclEntry.count({
        where: { ...where, listType: 'BLACKLIST' }
      }),
      whitelistCount: await prisma.macAclEntry.count({
        where: { ...where, listType: 'WHITELIST' }
      }),
      activeCount: await prisma.macAclEntry.count({
        where: { ...where, isActive: true }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        entries,
        stats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    })
  } catch (error) {
    console.error('Error fetching MAC ACL entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MAC ACL entries' },
      { status: 500 }
    )
  }
}
