/**
 * R710 VLAN Overview API
 *
 * Shows all 31 VLAN slots available on R710 devices
 * Indicates which VLANs are occupied and by which businesses
 *
 * CRITICAL: R710 devices support maximum 31 VLANs total
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/r710/wlans/overview
 *
 * Get overview of all VLAN usage across all R710 devices
 *
 * Query Parameters:
 * - deviceRegistryId: (optional) Filter by specific device
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deviceRegistryId = searchParams.get('deviceRegistryId');

    // Get all R710 devices (or specific device if filtering)
    const devices = await prisma.r710DeviceRegistry.findMany({
      where: deviceRegistryId ? { id: deviceRegistryId } : {},
      include: {
        r710_wlans: {
          include: {
            businesses: {
              select: {
                id: true,
                businessName: true,
                businessType: true
              }
            }
          },
          orderBy: {
            vlanId: 'asc'
          }
        }
      },
      orderBy: {
        ipAddress: 'asc'
      }
    });

    if (devices.length === 0) {
      return NextResponse.json({
        devices: [],
        message: deviceRegistryId
          ? 'Device not found'
          : 'No R710 devices registered'
      });
    }

    // Build overview for each device
    const deviceOverviews = devices.map(device => {
      const MAX_VLANS = 31;
      const usedVlans = new Map();

      // Map used VLANs
      device.r710_wlans.forEach(wlan => {
        usedVlans.set(wlan.vlanId, {
          wlanId: wlan.wlanId,
          ssid: wlan.ssid,
          business: {
            id: wlan.businesses.id,
            name: wlan.businesses.businessName,
            type: wlan.businesses.businessType
          },
          isActive: wlan.isActive,
          createdAt: wlan.createdAt
        });
      });

      // Generate all 31 VLAN slots
      const vlanSlots = [];
      for (let vlanId = 1; vlanId <= MAX_VLANS; vlanId++) {
        const usage = usedVlans.get(vlanId);

        vlanSlots.push({
          vlanId,
          status: usage ? 'OCCUPIED' : 'AVAILABLE',
          wlan: usage || null
        });
      }

      return {
        device: {
          id: device.id,
          ipAddress: device.ipAddress,
          description: device.description,
          connectionStatus: device.connectionStatus,
          lastHealthCheck: device.lastHealthCheck
        },
        vlanSlots,
        usage: {
          total: MAX_VLANS,
          occupied: device.r710_wlans.length,
          available: MAX_VLANS - device.r710_wlans.length,
          utilizationPercent: Math.round((device.r710_wlans.length / MAX_VLANS) * 100)
        }
      };
    });

    // Calculate global statistics
    const globalStats = {
      totalDevices: devices.length,
      totalVlanSlots: devices.length * 31,
      occupiedSlots: devices.reduce((sum, device) => sum + device.r710_wlans.length, 0),
      availableSlots: (devices.length * 31) - devices.reduce((sum, device) => sum + device.r710_wlans.length, 0)
    };

    return NextResponse.json({
      overview: deviceOverviews,
      globalStats,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('[R710 VLAN Overview] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VLAN overview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
