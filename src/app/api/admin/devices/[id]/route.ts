import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/devices/[id]
 * Get detailed information about a device including connection history
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.isAdmin && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to access device registry' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    const device = await prisma.deviceRegistry.findUnique({
      where: { id },
      include: {
        firstSeenBusiness: {
          select: { id: true, name: true, type: true }
        },
        lastSeenBusiness: {
          select: { id: true, name: true, type: true }
        },
        connectionHistory: {
          orderBy: { connectedAt: 'desc' },
          take: 50,
          include: {
            business: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        aclEntries: {
          include: {
            business: {
              select: { id: true, name: true }
            },
            creator: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        device: {
          ...device,
          createdAt: device.createdAt.toISOString(),
          updatedAt: device.updatedAt.toISOString(),
          firstSeenAt: device.firstSeenAt.toISOString(),
          lastSeenAt: device.lastSeenAt.toISOString(),
          connectionHistory: device.connectionHistory.map(h => ({
            ...h,
            connectedAt: h.connectedAt.toISOString(),
            disconnectedAt: h.disconnectedAt?.toISOString(),
            createdAt: h.createdAt.toISOString()
          })),
          aclEntries: device.aclEntries.map(a => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
            expiresAt: a.expiresAt?.toISOString()
          }))
        }
      }
    })
  } catch (error) {
    console.error('Error fetching device:', error)
    return NextResponse.json(
      { error: 'Failed to fetch device' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/devices/[id]
 * Update device notes and tags
 *
 * Body:
 * - notes: string (optional)
 * - tags: string[] (optional)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.isAdmin && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to modify device registry' },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const body = await request.json()
    const { notes, tags } = body

    const device = await prisma.deviceRegistry.update({
      where: { id },
      data: {
        notes: notes !== undefined ? notes : undefined,
        tags: tags !== undefined ? tags : undefined
      },
      include: {
        firstSeenBusiness: {
          select: { id: true, name: true, type: true }
        },
        lastSeenBusiness: {
          select: { id: true, name: true, type: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        device: {
          ...device,
          createdAt: device.createdAt.toISOString(),
          updatedAt: device.updatedAt.toISOString(),
          firstSeenAt: device.firstSeenAt.toISOString(),
          lastSeenAt: device.lastSeenAt.toISOString()
        }
      }
    })
  } catch (error) {
    console.error('Error updating device:', error)
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    )
  }
}
