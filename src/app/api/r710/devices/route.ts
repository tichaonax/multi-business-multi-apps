/**
 * R710 Devices API
 *
 * List all R710 devices in the system
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/r710/devices
 *
 * Get all R710 devices (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can list devices
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json(
        { error: 'Only system administrators can list R710 devices' },
        { status: 403 }
      )
    }

    const devices = await prisma.r710DeviceRegistry.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedDevices = devices.map(device => ({
      id: device.id,
      ipAddress: device.ipAddress,
      description: device.description,
      model: device.model,
      firmwareVersion: device.firmwareVersion,
      connectionStatus: device.connectionStatus,
      lastHealthCheck: device.lastHealthCheck?.toISOString(),
      lastConnectedAt: device.lastConnectedAt?.toISOString(),
      isActive: device.isActive,
      createdAt: device.createdAt.toISOString()
    }))

    return NextResponse.json({
      devices: formattedDevices
    })

  } catch (error) {
    console.error('[R710 Devices] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
