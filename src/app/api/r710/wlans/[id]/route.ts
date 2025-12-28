/**
 * R710 WLAN Detail API
 *
 * Get, update, or delete individual WLAN settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin } from '@/lib/permission-utils';
import { decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';

/**
 * GET /api/r710/wlans/[id]
 * Get details for a specific WLAN
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const wlan = await prisma.r710Wlans.findUnique({
      where: { id },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            connectionStatus: true
          }
        },
        r710_token_configs: {
          select: {
            id: true
          }
        }
      }
    });

    if (!wlan) {
      return NextResponse.json({ error: 'WLAN not found' }, { status: 404 });
    }

    // Check permissions
    if (!isSystemAdmin(session.user)) {
      const userBusinessIds = session.user.businessMemberships?.map((m: any) => m.businessId) || [];
      if (!userBusinessIds.includes(wlan.businessId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const transformedWlan = {
      id: wlan.id,
      ssid: wlan.ssid,
      wlanId: wlan.wlanId,
      guestServiceId: wlan.guestServiceId,
      title: wlan.title,
      validDays: wlan.validDays,
      enableFriendlyKey: wlan.enableFriendlyKey,
      enableZeroIt: wlan.enableZeroIt,
      isActive: wlan.isActive,
      logoType: wlan.logoType,
      businesses: wlan.businesses,
      device_registry: wlan.device_registry,
      tokenPackages: wlan.r710_token_configs.length,
      createdAt: wlan.createdAt.toISOString(),
      updatedAt: wlan.updatedAt.toISOString()
    };

    return NextResponse.json({
      wlan: transformedWlan
    });
  } catch (error) {
    console.error('Error fetching WLAN:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WLAN' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/r710/wlans/[id]
 *
 * Update WLAN settings (both database and R710 device)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const { ssid, title, validDays, enableFriendlyKey, enableZeroIt, isActive, logoType } = body;

    if (ssid !== undefined && (!ssid || ssid.trim().length === 0)) {
      return NextResponse.json({ error: 'SSID cannot be empty' }, { status: 400 });
    }

    if (validDays !== undefined && (validDays < 1 || validDays > 365)) {
      return NextResponse.json({ error: 'Valid days must be between 1 and 365' }, { status: 400 });
    }

    // Get existing WLAN
    const existingWlan = await prisma.r710Wlans.findUnique({
      where: { id },
      include: {
        device_registry: true,
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        r710_token_configs: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingWlan) {
      return NextResponse.json({ error: 'WLAN not found' }, { status: 404 });
    }

    // Check permissions
    if (!isSystemAdmin(session.user)) {
      const userBusinessIds = session.user.businessMemberships?.map((m: any) => m.businessId) || [];
      if (!userBusinessIds.includes(existingWlan.businessId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Update R710 device FIRST (device-as-source-of-truth)
    // CRITICAL: Must update BOTH Guest Service AND WLAN (two-step workflow)
    const device = existingWlan.device_registry;
    console.log(`[R710 WLAN Update] Updating WLAN ${existingWlan.wlanId} on device ${device.ipAddress}...`);

    try {
      const sessionManager = getR710SessionManager();
      const adminPassword = decrypt(device.encryptedAdminPassword);

      const r710Service = await sessionManager.getSession({
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        adminPassword
      });

      // Prepare values
      const newSsid = ssid !== undefined ? ssid.trim() : existingWlan.ssid;
      const newTitle = title !== undefined ? (title?.trim() || 'Welcome to Guest WiFi !') : existingWlan.title;
      const newValidDays = validDays !== undefined ? parseInt(validDays.toString()) : existingWlan.validDays;
      const newEnableFriendlyKey = enableFriendlyKey !== undefined ? Boolean(enableFriendlyKey) : existingWlan.enableFriendlyKey;
      const newEnableZeroIt = enableZeroIt !== undefined ? Boolean(enableZeroIt) : existingWlan.enableZeroIt;
      const newLogoType = logoType !== undefined ? (logoType || 'none') : existingWlan.logoType;

      // CRITICAL: R710 uses numeric guest service IDs (e.g., '1'), not string IDs like 'guest-default'
      // The database may have 'guest-default' but the device only knows about '1'
      const actualGuestServiceId = existingWlan.guestServiceId === 'guest-default' ? '1' : existingWlan.guestServiceId;

      // Step 1: Update Guest Service (portal configuration)
      // Note: Zero-IT onboarding is controlled by WLAN's bypass-cna, not Guest Service
      console.log(`[R710 WLAN Update] Step 1: Updating Guest Service ${actualGuestServiceId}...`);
      const guestServiceResult = await r710Service.updateGuestService(actualGuestServiceId, {
        serviceName: newSsid,
        title: newTitle,
        validDays: newValidDays,
        logoType: newLogoType
      });

      if (!guestServiceResult.success) {
        console.error('[R710 WLAN Update] Guest Service update failed:', guestServiceResult.error);
        return NextResponse.json(
          { error: guestServiceResult.error || 'Failed to update Guest Service on R710 device' },
          { status: 500 }
        );
      }

      console.log(`[R710 WLAN Update] Step 1 complete: Guest Service updated`);

      // Step 2: Update WLAN (network configuration)
      // CRITICAL: Use NUMERIC wlanId from database (e.g., "0", "5", "1")
      const numericWlanId = existingWlan.wlanId;
      console.log(`[R710 WLAN Update] Step 2: Updating WLAN with NUMERIC ID "${numericWlanId}" (current SSID: "${existingWlan.ssid}", new SSID: "${newSsid}")...`);
      const wlanResult = await r710Service.updateWlan(numericWlanId, {
        ssid: newSsid,
        title: newTitle,
        validDays: newValidDays,
        enableFriendlyKey: newEnableFriendlyKey,
        enableZeroIt: newEnableZeroIt,
        logoType: newLogoType,
        guestServiceId: actualGuestServiceId, // Use the corrected guest service ID
        vlanId: 1 // Keep existing VLAN
      });

      if (!wlanResult.success) {
        console.error('[R710 WLAN Update] WLAN update failed:', wlanResult.error);
        return NextResponse.json(
          { error: wlanResult.error || 'Failed to update WLAN on R710 device' },
          { status: 500 }
        );
      }

      console.log(`[R710 WLAN Update] Step 2 complete: WLAN updated.`);

      // Step 3: Verify the update by querying device (CRITICAL!)
      // Search by NUMERIC ID (device's actual ID format)
      console.log(`[R710 WLAN Update] Step 3: Verifying update on device...`);
      console.log(`[R710 WLAN Update] Searching for WLAN with NUMERIC ID: "${numericWlanId}", expecting new SSID: "${newSsid}"`);
      const verificationResult = await r710Service.verifyWlanUpdate(numericWlanId, newSsid);

      if (!verificationResult.success || !verificationResult.verified) {
        console.error('[R710 WLAN Update] Verification failed:', verificationResult.error);
        return NextResponse.json(
          {
            error: 'WLAN update failed verification',
            details: verificationResult.error || 'Update was not confirmed on device'
          },
          { status: 500 }
        );
      }

      console.log(`[R710 WLAN Update] Step 3 complete: Update verified on device.`);

      // Step 4: Query device to get actual WLAN configuration (CRITICAL - device is source of truth!)
      console.log(`[R710 WLAN Update] Step 4: Querying device for actual WLAN configuration...`);
      const deviceWlans = await r710Service.discoverWlans();

      if (!deviceWlans.success) {
        console.error('[R710 WLAN Update] Failed to query device WLANs');
        return NextResponse.json(
          { error: 'Failed to query device after update' },
          { status: 500 }
        );
      }

      // Find the updated WLAN in device response
      // CRITICAL: Search by NUMERIC ID (which should remain the same even if SSID changed)
      const updatedWlanOnDevice = deviceWlans.wlans.find(w => w.id === numericWlanId);

      console.log(`[R710 WLAN Update] Looking for WLAN with NUMERIC ID "${numericWlanId}"`);

      if (!updatedWlanOnDevice) {
        console.error(`[R710 WLAN Update] Could not find WLAN with ID "${numericWlanId}" on device after update`);
        console.error(`[R710 WLAN Update] Available WLANs:`, deviceWlans.wlans.map(w => ({ id: w.id, ssid: w.ssid })));
        return NextResponse.json(
          { error: 'WLAN not found on device after update' },
          { status: 500 }
        );
      }

      console.log(`[R710 WLAN Update] Step 4 complete: Found WLAN on device - ID: "${updatedWlanOnDevice.id}", SSID: "${updatedWlanOnDevice.ssid}"`);

      // CRITICAL: Update database with ACTUAL data from device, not what we think we sent
      // The numeric ID should remain the same, but SSID and other fields come from device
      const syncedData = {
        ssid: updatedWlanOnDevice.ssid, // SSID from device (should match newSsid)
        wlanId: updatedWlanOnDevice.id, // Numeric ID from device (should match numericWlanId)
        title: newTitle, // Portal settings not in device response
        validDays: newValidDays,
        enableFriendlyKey: newEnableFriendlyKey,
        enableZeroIt: newEnableZeroIt,
        logoType: newLogoType,
        guestServiceId: actualGuestServiceId,
        isActive: isActive !== undefined ? Boolean(isActive) : existingWlan.isActive,
        updatedAt: new Date()
      };

      console.log(`[R710 WLAN Update] Syncing database with device data:`, syncedData);

      // Only update database after ALL steps succeed (Guest Service + WLAN + Verification + Device Query)
      const updatedWlan = await prisma.r710Wlans.update({
        where: { id },
        data: syncedData,
        include: {
          businesses: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          device_registry: {
            select: {
              id: true,
              ipAddress: true,
              description: true,
              connectionStatus: true
            }
          },
          r710_token_configs: {
            select: {
              id: true
            }
          }
        }
      });

      const transformedWlan = {
        id: updatedWlan.id,
        ssid: updatedWlan.ssid,
        wlanId: updatedWlan.wlanId,
        guestServiceId: updatedWlan.guestServiceId,
        title: updatedWlan.title,
        validDays: updatedWlan.validDays,
        enableFriendlyKey: updatedWlan.enableFriendlyKey,
        enableZeroIt: updatedWlan.enableZeroIt,
        isActive: updatedWlan.isActive,
        logoType: updatedWlan.logoType,
        businesses: updatedWlan.businesses,
        device_registry: updatedWlan.device_registry,
        tokenPackages: updatedWlan.r710_token_configs.length,
        createdAt: updatedWlan.createdAt.toISOString(),
        updatedAt: updatedWlan.updatedAt.toISOString()
      };

      return NextResponse.json({
        wlan: transformedWlan,
        message: 'WLAN updated successfully'
      });

    } catch (deviceError) {
      console.error('[R710 WLAN Update] Error updating R710 device:', deviceError);
      return NextResponse.json(
        {
          error: 'Failed to update WLAN on R710 device',
          details: deviceError instanceof Error ? deviceError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[R710 WLAN Update] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update WLAN', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/r710/wlans/[id]
 *
 * Delete WLAN from R710 device and database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only system admins can delete WLANs
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json({ error: 'Only system administrators can delete WLANs' }, { status: 403 });
    }

    const { id } = await params;

    // Get WLAN record
    const wlan = await prisma.r710Wlans.findUnique({
      where: { id },
      include: {
        device_registry: true,
        businesses: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!wlan) {
      return NextResponse.json(
        { error: 'WLAN not found' },
        { status: 404 }
      );
    }

    // Check if device is accessible
    const device = wlan.device_registry;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isAccessible =
      device.connectionStatus === 'CONNECTED' &&
      device.lastHealthCheck &&
      device.lastHealthCheck >= fiveMinutesAgo;

    if (!isAccessible) {
      console.warn(
        `[R710 WLAN Delete] Device ${device.ipAddress} not accessible - deleting from database only`
      );

      // Delete from database even if device unreachable
      // Admin can manually clean up device later
      await prisma.r710Wlans.delete({
        where: { id: params.id }
      });

      return NextResponse.json({
        success: true,
        message: 'WLAN removed from database (device unreachable)',
        warning: `R710 device at ${device.ipAddress} is not accessible. WLAN may still exist on device.`
      });
    }

    console.log(`[R710 WLAN Delete] Deleting WLAN ${wlan.wlanId} from device ${device.ipAddress}...`);

    // Try to delete from R710 device first (non-blocking)
    try {
      const sessionManager = getR710SessionManager();
      const adminPassword = decrypt(device.encryptedAdminPassword);

      const r710Service = await sessionManager.getSession({
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        adminPassword
      });

      const deleteResult = await r710Service.deleteWlan(wlan.wlanId);

      if (!deleteResult.success) {
        console.warn(`[R710 WLAN Delete] Device deletion failed:`, deleteResult.error);
      }
    } catch (deleteError) {
      console.warn('Failed to delete WLAN from R710 device:', deleteError);
      // Continue with database deletion even if device deletion fails
    }

    // Delete from database (cascade will handle related records)
    await prisma.r710Wlans.delete({
      where: { id }
    });

    console.log(`[R710 WLAN Delete] WLAN ${wlan.wlanId} deleted successfully`);

    return NextResponse.json({
      message: 'WLAN deleted successfully'
    });

  } catch (error) {
    console.error('[R710 WLAN Delete] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete WLAN', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
