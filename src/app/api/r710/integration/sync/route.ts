import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/r710/integration/sync
 *
 * Sync WLAN configuration from R710 device to local database
 * Updates SSID and other WLAN settings to match current device configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required field: businessId' },
        { status: 400 }
      );
    }

    const user = session.user as any;

    // Check permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSetupPortalIntegration', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need portal setup permission for this business.' },
        { status: 403 }
      );
    }

    console.log(`[R710 Sync] Starting WLAN sync for business ${businessId}...`);

    // Get integration
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId },
      include: {
        device_registry: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No R710 integration found for this business' },
        { status: 404 }
      );
    }

    // Get WLAN record
    const wlanRecord = await prisma.r710Wlans.findFirst({
      where: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    if (!wlanRecord) {
      return NextResponse.json(
        { error: 'No WLAN record found for this integration' },
        { status: 404 }
      );
    }

    console.log(`[R710 Sync] Found WLAN record: wlanId=${wlanRecord.wlanId}, guestServiceId=${wlanRecord.guestServiceId}, SSID=${wlanRecord.ssid}, validDays=${wlanRecord.validDays}`);

    // Get device details
    const device = integration.device_registry;

    // Connect to R710 device
    const sessionManager = getR710SessionManager();
    const adminPassword = decrypt(device.encryptedAdminPassword);

    const r710Service = await sessionManager.getSession({
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword
    });

    // Get current WLAN configuration from device
    console.log(`[R710 Sync] Fetching WLAN details from device...`);
    const deviceWlan = await r710Service.getWlanById(wlanRecord.wlanId);

    if (!deviceWlan) {
      console.log(`[R710 Sync] WLAN ${wlanRecord.wlanId} not found on device - may have been deleted`);
      // Return success but indicate no changes (WLAN doesn't exist on device)
      return NextResponse.json({
        message: 'WLAN not found on device. It may have been deleted manually.',
        changed: false,
        warning: 'WLAN configuration missing on R710 device',
        wlan: {
          wlanId: wlanRecord.wlanId,
          ssid: wlanRecord.ssid
        }
      });
    }

    console.log(`[R710 Sync] Device WLAN: ${deviceWlan.name} - SSID: ${deviceWlan.ssid}`);

    // Also fetch guest service config from device (contains validDays, title, logoType)
    console.log(`[R710 Sync] Fetching guest service config for guestServiceId="${wlanRecord.guestServiceId}"...`);
    let guestServiceConfig: { validDays?: number; title?: string; logoType?: string; name?: string } | null = null;
    let guestServiceError: string | null = null;
    try {
      guestServiceConfig = await r710Service.getGuestServiceConfig(wlanRecord.guestServiceId);
      console.log(`[R710 Sync] Guest service config from device:`, JSON.stringify(guestServiceConfig));
    } catch (err) {
      guestServiceError = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[R710 Sync] Failed to fetch guest service config:`, guestServiceError);
    }

    // Build updates for any fields that differ
    const updates: Record<string, any> = {};
    let changes: string[] = [];

    // Check SSID
    const ssidChanged = deviceWlan.ssid !== wlanRecord.ssid;

    // Check guest service fields
    if (guestServiceConfig) {
      if (guestServiceConfig.validDays !== undefined && guestServiceConfig.validDays !== wlanRecord.validDays) {
        updates.validDays = guestServiceConfig.validDays;
        changes.push(`validDays: ${wlanRecord.validDays} → ${guestServiceConfig.validDays}`);
      }
      if (guestServiceConfig.title && guestServiceConfig.title !== wlanRecord.title) {
        updates.title = guestServiceConfig.title;
        changes.push(`title: "${wlanRecord.title}" → "${guestServiceConfig.title}"`);
      }
      if (guestServiceConfig.logoType && guestServiceConfig.logoType !== wlanRecord.logoType) {
        updates.logoType = guestServiceConfig.logoType;
        changes.push(`logoType: ${wlanRecord.logoType} → ${guestServiceConfig.logoType}`);
      }
    }

    // If SSID changed, require user confirmation (existing behavior)
    if (ssidChanged) {
      console.log(`[R710 Sync] SSID mismatch detected: expected "${wlanRecord.ssid}" but found "${deviceWlan.ssid}"`);

      return NextResponse.json({
        message: 'SSID mismatch detected. The WLAN on the device has a different name.',
        changed: false,
        warning: 'SSID_MISMATCH',
        expectedSsid: wlanRecord.ssid,
        deviceSsid: deviceWlan.ssid,
        pendingUpdates: updates,
        wlan: {
          wlanId: wlanRecord.wlanId,
          ssid: wlanRecord.ssid
        }
      });
    }

    // No SSID change - apply any other field updates silently
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await prisma.r710Wlans.update({
        where: { id: wlanRecord.id },
        data: updates
      });

      console.log(`[R710 Sync] Updated fields: ${changes.join(', ')}`);
      return NextResponse.json({
        message: `WLAN configuration synced from device. Updated: ${changes.join(', ')}`,
        changed: true,
        changes,
        wlan: {
          wlanId: wlanRecord.wlanId,
          ssid: wlanRecord.ssid,
          ...updates
        }
      });
    }

    console.log(`[R710 Sync] Everything up to date`);
    return NextResponse.json({
      message: 'WLAN configuration is already up to date',
      changed: false,
      wlan: {
        wlanId: wlanRecord.wlanId,
        ssid: wlanRecord.ssid
      }
    });

  } catch (error) {
    console.error('[R710 Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync WLAN configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/r710/integration/sync
 *
 * Accept SSID change - user confirms the WLAN on device is the same, just renamed.
 * Updates the database SSID to match the device.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, newSsid, pendingUpdates } = body;

    if (!businessId || !newSsid) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, newSsid' },
        { status: 400 }
      );
    }

    const user = session.user as any;

    // Check permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSetupPortalIntegration', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need portal setup permission for this business.' },
        { status: 403 }
      );
    }

    console.log(`[R710 Sync] Accepting SSID change for business ${businessId}: new SSID = "${newSsid}"`);

    // Get integration
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId },
      include: {
        device_registry: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No R710 integration found for this business' },
        { status: 404 }
      );
    }

    // Get WLAN record
    const wlanRecord = await prisma.r710Wlans.findFirst({
      where: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    if (!wlanRecord) {
      return NextResponse.json(
        { error: 'No WLAN record found for this integration' },
        { status: 404 }
      );
    }

    const previousSsid = wlanRecord.ssid;

    // Update database with new SSID and any pending guest service updates
    const updateData: Record<string, any> = {
      ssid: newSsid,
      updatedAt: new Date()
    };

    // Apply pending updates from sync (validDays, title, logoType)
    if (pendingUpdates) {
      if (pendingUpdates.validDays !== undefined) updateData.validDays = pendingUpdates.validDays;
      if (pendingUpdates.title !== undefined) updateData.title = pendingUpdates.title;
      if (pendingUpdates.logoType !== undefined) updateData.logoType = pendingUpdates.logoType;
    }

    const updatedWlan = await prisma.r710Wlans.update({
      where: { id: wlanRecord.id },
      data: updateData
    });

    console.log(`[R710 Sync] SSID updated: "${previousSsid}" → "${newSsid}"`);

    return NextResponse.json({
      success: true,
      message: 'SSID updated successfully',
      changed: true,
      previousSsid,
      currentSsid: newSsid,
      wlan: {
        wlanId: updatedWlan.wlanId,
        ssid: updatedWlan.ssid
      }
    });

  } catch (error) {
    console.error('[R710 Sync] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update SSID', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
