import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/r710/integration/recreate
 *
 * Recreate R710 WLAN integration.
 *
 * This endpoint:
 * 1. Preserves R710TokenConfigs (token package definitions)
 * 2. Deletes unsold R710Tokens (status='AVAILABLE') - they can't be redeemed
 * 3. Optionally deletes existing WLAN from device (if forceDelete=true)
 * 4. Creates a new WLAN on the R710 device with the same settings
 * 5. Updates the R710Wlans record with the new device wlanId
 *
 * Parameters:
 * - businessId: Required - The business ID
 * - forceDelete: Optional - If true, delete existing WLAN from device first
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, forceDelete } = body;

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

    console.log(`[R710 Recreate] Starting WLAN recreation for business ${businessId}...`);

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

    // Get existing WLAN record
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

    console.log(`[R710 Recreate] Found WLAN record: ${wlanRecord.wlanId} - SSID: ${wlanRecord.ssid}`);
    console.log(`[R710 Recreate] Preserving settings: logoType=${wlanRecord.logoType}, title=${wlanRecord.title}, validDays=${wlanRecord.validDays}`);

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

    // Check if WLAN exists on device
    const existingWlan = await r710Service.getWlanById(wlanRecord.wlanId);

    if (existingWlan) {
      if (forceDelete) {
        // Force delete requested - delete the existing WLAN first
        console.log(`[R710 Recreate] Force delete requested - deleting existing WLAN ${wlanRecord.wlanId} from device...`);
        const deleteWlanResult = await r710Service.deleteWlan(wlanRecord.wlanId);
        if (!deleteWlanResult.success) {
          console.error(`[R710 Recreate] Failed to delete existing WLAN:`, deleteWlanResult.error);
          return NextResponse.json({
            error: 'Failed to delete existing WLAN from device',
            details: deleteWlanResult.error
          }, { status: 500 });
        }
        console.log(`[R710 Recreate] Existing WLAN deleted successfully`);
      } else {
        // WLAN exists but force delete not requested
        return NextResponse.json({
          error: 'WLAN still exists on device',
          message: 'The WLAN is still present on the R710 device. Use sync instead of recreate, or use forceDelete to delete and recreate.',
          wlan: {
            wlanId: wlanRecord.wlanId,
            ssid: existingWlan.ssid
          }
        }, { status: 409 });
      }
    } else {
      console.log(`[R710 Recreate] Confirmed WLAN ${wlanRecord.wlanId} is missing from device`);
    }

    // Delete unsold/unredeemed tokens - they can't be redeemed on the new WLAN
    // AVAILABLE = generated but not assigned to anyone
    // REQUESTED = generated and assigned but not yet sold/printed
    // Both are invalid after WLAN recreation since they were created for the old WLAN
    const deleteResult = await prisma.r710Tokens.deleteMany({
      where: {
        wlanId: wlanRecord.id,
        status: {
          in: ['AVAILABLE', 'REQUESTED']
        }
      }
    });

    console.log(`[R710 Recreate] Deleted ${deleteResult.count} invalid tokens (AVAILABLE + REQUESTED)`);

    // Create new WLAN on device with same settings
    console.log(`[R710 Recreate] Creating new WLAN on device...`);
    const wlanResult = await r710Service.createWlan({
      ssid: wlanRecord.ssid,
      guestServiceId: wlanRecord.guestServiceId || '1',
      logoType: wlanRecord.logoType || 'none',
      title: wlanRecord.title || 'Welcome to Guest WiFi !',
      validDays: wlanRecord.validDays || 1,
      enableFriendlyKey: wlanRecord.enableFriendlyKey || false,
      enableZeroIt: wlanRecord.enableZeroIt !== false
    });

    if (!wlanResult.success || !wlanResult.wlanId) {
      console.error(`[R710 Recreate] Failed to create WLAN:`, wlanResult.error);
      return NextResponse.json(
        {
          error: 'Failed to create WLAN on R710 device',
          details: wlanResult.error
        },
        { status: 500 }
      );
    }

    console.log(`[R710 Recreate] New WLAN created with ID: ${wlanResult.wlanId}`);

    // Update database record with new wlanId
    const updatedWlan = await prisma.r710Wlans.update({
      where: { id: wlanRecord.id },
      data: {
        wlanId: wlanResult.wlanId,
        updatedAt: new Date()
      }
    });

    console.log(`[R710 Recreate] Database updated: old wlanId=${wlanRecord.wlanId} -> new wlanId=${wlanResult.wlanId}`);

    // Get count of preserved token configs
    const tokenConfigCount = await prisma.r710TokenConfigs.count({
      where: { wlanId: wlanRecord.id }
    });

    console.log(`[R710 Recreate] Preserved ${tokenConfigCount} token configuration(s)`);

    return NextResponse.json({
      success: true,
      message: 'WLAN integration recreated successfully',
      wlan: {
        id: updatedWlan.id,
        wlanId: updatedWlan.wlanId,
        ssid: updatedWlan.ssid,
        previousWlanId: wlanRecord.wlanId
      },
      deletedTokensCount: deleteResult.count,
      preservedTokenConfigs: tokenConfigCount
    });

  } catch (error) {
    console.error('[R710 Recreate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to recreate WLAN integration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
