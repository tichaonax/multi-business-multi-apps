import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/devices
 * List all devices in the device registry with filtering and pagination
 *
 * Query params:
 * - search: Search by MAC, hostname, or device type
 * - system: Filter by system (ESP32, R710, or BOTH)
 * - businessId: Filter by business
 * - tags: Filter by tags (comma-separated)
 * - limit: Max items per page (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const system = searchParams.get('system') || undefined
    const businessId = searchParams.get('businessId') || undefined
    const tagsParam = searchParams.get('tags')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { macAddress: { contains: search.toLowerCase() } },
        { hostname: { contains: search, mode: 'insensitive' } },
        { deviceType: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (system && system !== 'BOTH') {
      where.OR = [
        { firstSeenSystem: system },
        { lastSeenSystem: system }
      ]
    }

    if (businessId) {
      where.OR = [
        { firstSeenBusinessId: businessId },
        { lastSeenBusinessId: businessId }
      ]
    }

    if (tagsParam) {
      const tags = tagsParam.split(',').map(t => t.trim())
      where.tags = { hasSome: tags }
    }

    // Get total count
    const total = await prisma.deviceRegistry.count({ where })

    // Get devices
    const devices = await prisma.deviceRegistry.findMany({
      where,
      include: {
        firstSeenBusiness: {
          select: { id: true, name: true, type: true }
        },
        lastSeenBusiness: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { lastSeenAt: 'desc' },
      take: limit,
      skip: offset
    })

    return NextResponse.json({
      success: true,
      data: {
        devices: devices.map(device => ({
          ...device,
          createdAt: device.createdAt.toISOString(),
          updatedAt: device.updatedAt.toISOString(),
          firstSeenAt: device.firstSeenAt.toISOString(),
          lastSeenAt: device.lastSeenAt.toISOString()
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    })
  } catch (error) {
    console.error('Error fetching devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/devices
 * Create or update a device in the registry (upsert)
 *
 * Body:
 * - macAddress: string (required, normalized format)
 * - hostname: string (optional)
 * - deviceType: string (optional)
 * - manufacturer: string (optional)
 * - system: string (ESP32 or R710)
 * - businessId: string (optional)
 * - notes: string (optional)
 * - tags: string[] (optional)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      macAddress,
      hostname,
      deviceType,
      manufacturer,
      system,
      businessId,
      notes,
      tags
    } = body

    // Validate required fields
    if (!macAddress || !system) {
      return NextResponse.json(
        { error: 'MAC address and system are required' },
        { status: 400 }
      )
    }

    // Normalize MAC address
    const normalizedMac = macAddress.toLowerCase().replace(/[^a-f0-9]/g, '')
    if (normalizedMac.length !== 12) {
      return NextResponse.json(
        { error: 'Invalid MAC address format' },
        { status: 400 }
      )
    }
    const formattedMac = normalizedMac.match(/.{1,2}/g)?.join(':') || normalizedMac

    const now = new Date()

    // Upsert device
    const device = await prisma.deviceRegistry.upsert({
      where: { macAddress: formattedMac },
      create: {
        macAddress: formattedMac,
        hostname,
        deviceType,
        manufacturer,
        firstSeenAt: now,
        firstSeenSystem: system,
        firstSeenBusinessId: businessId,
        lastSeenAt: now,
        lastSeenSystem: system,
        lastSeenBusinessId: businessId,
        totalConnections: 1,
        esp32Connections: system === 'ESP32' ? 1 : 0,
        r710Connections: system === 'R710' ? 1 : 0,
        notes,
        tags: tags || []
      },
      update: {
        hostname: hostname || undefined,
        deviceType: deviceType || undefined,
        manufacturer: manufacturer || undefined,
        lastSeenAt: now,
        lastSeenSystem: system,
        lastSeenBusinessId: businessId,
        totalConnections: { increment: 1 },
        esp32Connections: system === 'ESP32' ? { increment: 1 } : undefined,
        r710Connections: system === 'R710' ? { increment: 1 } : undefined,
        notes: notes || undefined,
        tags: tags || undefined
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
    console.error('Error creating/updating device:', error)
    return NextResponse.json(
      { error: 'Failed to create/update device' },
      { status: 500 }
    )
  }
}
