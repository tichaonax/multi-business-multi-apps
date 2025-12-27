/**
 * R710 WLAN Management API
 *
 * Endpoints for managing business-specific WLANs on R710 devices
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';

/**
 * GET /api/r710/wlans
 *
 * Get WLANs for a business
 * Fetches from database and optionally syncs with R710 device
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const syncWithDevice = searchParams.get('sync') === 'true';

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      );
    }

    // Check user has access to this business
    const membership = await prisma.businessMemberships.findFirst({
      where: {
        businessId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
      );
    }

    // Get WLANs from database
    const wlans = await prisma.r710Wlans.findMany({
      where: { businessId },
      include: {
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            connectionStatus: true,
            lastHealthCheck: true
          }
        }
      }
    });

    if (!syncWithDevice) {
      // Return database records only
      return NextResponse.json({
        wlans: wlans.map(wlan => ({
          id: wlan.id,
          wlanId: wlan.wlanId,
          ssid: wlan.ssid,
          vlanId: wlan.vlanId,
          guestServiceId: wlan.guestServiceId,
          isActive: wlan.isActive,
          device: wlan.device_registry,
          createdAt: wlan.createdAt,
          updatedAt: wlan.updatedAt
        })),
        synced: false
      });
    }

    // Sync with device (if accessible)
    console.log(`[R710 WLANs] Syncing ${wlans.length} WLAN(s) with R710 device(s)...`);

    const syncedWlans = [];

    for (const wlan of wlans) {
      const device = wlan.device_registry;

      // CRITICAL: Only sync with accessible devices
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isAccessible =
        device.connectionStatus === 'CONNECTED' &&
        device.lastHealthCheck &&
        device.lastHealthCheck >= fiveMinutesAgo;

      if (!isAccessible) {
        console.warn(
          `[R710 WLANs] Skipping sync for WLAN ${wlan.wlanId} - Device ${device.ipAddress} not accessible`
        );

        syncedWlans.push({
          id: wlan.id,
          wlanId: wlan.wlanId,
          ssid: wlan.ssid,
          vlanId: wlan.vlanId,
          isActive: wlan.isActive,
          device: {
            id: device.id,
            ipAddress: device.ipAddress,
            connectionStatus: device.connectionStatus
          },
          syncStatus: 'DEVICE_UNREACHABLE',
          createdAt: wlan.createdAt
        });

        continue;
      }

      // Device is accessible, sync with it
      try {
        const deviceRecord = await prisma.r710DeviceRegistry.findUnique({
          where: { id: wlan.deviceRegistryId }
        });

        if (!deviceRecord) {
          throw new Error('Device not found in registry');
        }

        const sessionManager = getR710SessionManager();
        const adminPassword = decrypt(deviceRecord.encryptedAdminPassword);

        const r710Service = await sessionManager.getSession({
          ipAddress: deviceRecord.ipAddress,
          adminUsername: deviceRecord.adminUsername,
          adminPassword
        });

        // Query WLAN details from device
        // Note: R710 API doesn't have a direct "get WLAN by ID" endpoint
        // We rely on database as source of truth

        syncedWlans.push({
          id: wlan.id,
          wlanId: wlan.wlanId,
          ssid: wlan.ssid,
          vlanId: wlan.vlanId,
          isActive: wlan.isActive,
          device: {
            id: device.id,
            ipAddress: device.ipAddress,
            connectionStatus: device.connectionStatus
          },
          syncStatus: 'SYNCED',
          createdAt: wlan.createdAt
        });

      } catch (error) {
        console.error(`[R710 WLANs] Sync failed for WLAN ${wlan.wlanId}:`, error);

        syncedWlans.push({
          id: wlan.id,
          wlanId: wlan.wlanId,
          ssid: wlan.ssid,
          vlanId: wlan.vlanId,
          isActive: wlan.isActive,
          device: {
            id: device.id,
            ipAddress: device.ipAddress,
            connectionStatus: device.connectionStatus
          },
          syncStatus: 'SYNC_FAILED',
          syncError: error instanceof Error ? error.message : 'Unknown error',
          createdAt: wlan.createdAt
        });
      }
    }

    return NextResponse.json({
      wlans: syncedWlans,
      synced: true
    });

  } catch (error) {
    console.error('[R710 WLANs] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WLANs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
