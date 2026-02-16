/**
 * R710 Device Cleanup API
 *
 * Handles cleanup of orphaned WLANs and integrations from a device
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/admin/r710/devices/[id]/cleanup-wlans
 *
 * Delete all orphaned WLANs from a device (WLANs without business integrations)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const device = await prisma.r710DeviceRegistry.findUnique({
      where: { id },
      include: {
        r710_wlans: true
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    if (device.r710_wlans.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No WLANs to clean up',
        deletedCount: 0
      });
    }

    console.log(`[R710 WLAN Cleanup] Cleaning up ${device.r710_wlans.length} WLAN(s) from device ${device.ipAddress}...`);

    // Get session manager for device
    const sessionManager = getR710SessionManager();
    const adminPassword = decrypt(device.encryptedAdminPassword);

    let r710Service: RuckusR710ApiService;
    try {
      r710Service = await sessionManager.getSession({
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        adminPassword
      });
    } catch (error) {
      console.warn('[R710 WLAN Cleanup] Could not connect to device, deleting database records only');
      // Delete from database only
      await prisma.r710Wlans.deleteMany({
        where: { deviceRegistryId: id }
      });

      return NextResponse.json({
        success: true,
        message: 'Deleted WLAN records from database (device unreachable)',
        deletedCount: device.r710_wlans.length
      });
    }

    // Delete WLANs from device
    let deletedCount = 0;
    for (const wlan of device.r710_wlans) {
      try {
        const deleteResult = await r710Service.deleteWlan(wlan.wlanId);
        if (deleteResult.success) {
          deletedCount++;
          console.log(`[R710 WLAN Cleanup] Deleted WLAN ${wlan.wlanId} (${wlan.ssid})`);
        } else {
          console.warn(`[R710 WLAN Cleanup] Failed to delete WLAN ${wlan.wlanId}: ${deleteResult.error}`);
        }
      } catch (error) {
        console.error(`[R710 WLAN Cleanup] Error deleting WLAN ${wlan.wlanId}:`, error);
      }
    }

    // Delete all WLAN records from database
    await prisma.r710Wlans.deleteMany({
      where: { deviceRegistryId: id }
    });

    console.log(`[R710 WLAN Cleanup] Completed. Deleted ${deletedCount}/${device.r710_wlans.length} WLANs from device.`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} WLAN(s)`,
      deletedCount
    });

  } catch (error) {
    console.error('[R710 WLAN Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clean up WLANs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/r710/devices/[id]/cleanup-wlans?integrationId=xxx
 *
 * Delete an orphaned integration by its ID (for when business was deleted but integration remains)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { id: deviceId } = await params;
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify the integration belongs to this device
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: {
        id: integrationId,
        deviceRegistryId: deviceId
      },
      include: {
        businesses: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found for this device' },
        { status: 404 }
      );
    }

    console.log(`[R710 Integration Cleanup] Deleting integration ${integrationId} from device ${deviceId}`);

    // Delete the integration
    await prisma.r710BusinessIntegrations.delete({
      where: { id: integrationId }
    });

    console.log(`[R710 Integration Cleanup] Successfully deleted integration ${integrationId}`);

    return NextResponse.json({
      success: true,
      message: 'Integration removed successfully'
    });

  } catch (error) {
    console.error('[R710 Integration Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
