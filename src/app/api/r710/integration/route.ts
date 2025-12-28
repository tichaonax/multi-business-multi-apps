/**
 * R710 Business Integration API
 *
 * Endpoints for businesses to create and manage their R710 WiFi integration.
 *
 * Architecture:
 * - Business selects from available R710 devices (dropdown)
 * - System automatically creates business-specific WLAN
 * - System creates R710 expense account for token sales
 * - Credentials inherited from device registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { getOrCreateR710ExpenseAccount } from '@/lib/r710-expense-account-utils';
import { isSystemAdmin, SessionUser, hasPermission } from '@/lib/permission-utils';

/**
 * GET /api/r710/integration
 *
 * Get current business's R710 integration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canSetupPortalIntegration permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSetupPortalIntegration', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need portal setup permission for this business.' },
        { status: 403 }
      );
    }

    // Get integration
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId },
      include: {
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            model: true,
            firmwareVersion: true,
            connectionStatus: true,
            lastHealthCheck: true
          }
        }
      }
    });

    if (!integration) {
      return NextResponse.json({
        hasIntegration: false,
        message: 'No R710 integration found for this business'
      });
    }

    // Get WLANs for this business
    const wlans = await prisma.r710Wlans.findMany({
      where: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId
      },
      select: {
        id: true,
        wlanId: true,
        ssid: true,
        guestServiceId: true,
        logoType: true,
        title: true,
        validDays: true,
        enableFriendlyKey: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      hasIntegration: true,
      integration: {
        id: integration.id,
        businessId: integration.businessId,
        deviceRegistryId: integration.deviceRegistryId,
        isActive: integration.isActive,
        createdAt: integration.createdAt,
        device: integration.device_registry,
        wlans
      }
    });

  } catch (error) {
    console.error('[R710 Integration] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/r710/integration
 *
 * Create R710 integration for a business
 *
 * Steps:
 * 1. Validate business access
 * 2. Select R710 device from registry
 * 3. Create business-specific WLAN on device
 * 4. Create business integration record
 * 5. Create R710 expense account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessId,
      deviceRegistryId,
      ssid,
      vlanId,
      logoType,
      title,
      validDays,
      enableFriendlyKey
    } = body;

    // Validate required fields
    if (!businessId || !deviceRegistryId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, deviceRegistryId' },
        { status: 400 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canSetupPortalIntegration permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSetupPortalIntegration', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need portal setup permission for this business.' },
        { status: 403 }
      );
    }

    // Check if integration already exists
    const existingIntegration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId, deviceRegistryId }
    });

    if (existingIntegration) {
      return NextResponse.json(
        {
          error: 'Integration already exists',
          integrationId: existingIntegration.id
        },
        { status: 409 }
      );
    }

    // Get business details
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get device from registry
    const device = await prisma.r710DeviceRegistry.findUnique({
      where: { id: deviceRegistryId }
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found in registry' },
        { status: 404 }
      );
    }

    if (!device.isActive) {
      return NextResponse.json(
        { error: 'Device is not active' },
        { status: 400 }
      );
    }

    // Generate SSID if not provided
    const wlanSsid = ssid || `${business.name} Guest WiFi`;

    // VLAN ID is optional and passed to R710 device but not stored in database
    // If not provided, R710 will use default VLAN
    const wlanVlanId = vlanId;

    console.log(`[R710 Integration] Creating WLAN for ${business.name} on ${device.ipAddress}...`);

    // Get or create session for this device
    const sessionManager = getR710SessionManager();
    const adminPassword = decrypt(device.encryptedAdminPassword);

    const r710Service = await sessionManager.getSession({
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword
    });

    // Create WLAN on R710 device
    const wlanResult = await r710Service.createWlan({
      ssid: wlanSsid,
      guestServiceId: 'guest-default',
      vlanId: wlanVlanId,
      logoType: logoType || 'none',
      title: title || 'Welcome to Guest WiFi !',
      validDays: validDays || 1,
      enableFriendlyKey: enableFriendlyKey || false
    });

    if (!wlanResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to create WLAN on R710 device',
          details: wlanResult.error
        },
        { status: 500 }
      );
    }

    console.log(`[R710 Integration] WLAN created: ${wlanResult.wlanId}`);

    // Create business integration and WLAN record in database (atomic transaction)
    // If any database operation fails, both integration and WLAN records will be rolled back
    let integration;
    let wlan;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create integration record
        const newIntegration = await tx.r710BusinessIntegrations.create({
          data: {
            businessId,
            deviceRegistryId,
            isActive: true
          }
        });

        // Use upsert in case WLAN record exists from previous integration
        const newWlan = await tx.r710Wlans.upsert({
          where: {
            deviceRegistryId_wlanId: {
              deviceRegistryId,
              wlanId: wlanResult.wlanId!
            }
          },
          update: {
            businessId,
            ssid: wlanSsid,
            guestServiceId: 'guest-default',
            logoType: logoType || 'none',
            title: title || 'Welcome to Guest WiFi !',
            validDays: validDays || 1,
            enableFriendlyKey: enableFriendlyKey || false,
            isActive: true
          },
          create: {
            businessId,
            deviceRegistryId,
            wlanId: wlanResult.wlanId!,
            ssid: wlanSsid,
            guestServiceId: 'guest-default',
            logoType: logoType || 'none',
            title: title || 'Welcome to Guest WiFi !',
            validDays: validDays || 1,
            enableFriendlyKey: enableFriendlyKey || false,
            isActive: true
          }
        });

        return { integration: newIntegration, wlan: newWlan };
      });

      integration = result.integration;
      wlan = result.wlan;

      console.log(`[R710 Integration] Database records created successfully`);
    } catch (dbError) {
      console.error('[R710 Integration] Database transaction failed:', dbError);
      // Note: R710 WLAN was created but database failed.
      // Admin should manually delete WLAN from R710 device or retry integration
      return NextResponse.json(
        {
          error: 'Failed to create integration records in database',
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
          note: 'WLAN was created on R710 device but database transaction failed. Please contact administrator.'
        },
        { status: 500 }
      );
    }

    // Create R710 expense account for this business
    console.log(`[R710 Integration] Creating expense account for ${business.name}...`);

    try {
      await getOrCreateR710ExpenseAccount(businessId, session.user.id);
      console.log(`[R710 Integration] Expense account created/verified`);
    } catch (error) {
      console.error('[R710 Integration] Failed to create expense account:', error);
      // Don't fail the integration if expense account creation fails
    }

    console.log(`[R710 Integration] Integration complete for ${business.name}`);

    return NextResponse.json({
      success: true,
      message: 'R710 integration created successfully',
      integration: {
        id: integration.id,
        businessId: integration.businessId,
        deviceRegistryId: integration.deviceRegistryId,
        isActive: integration.isActive,
        createdAt: integration.createdAt
      },
      wlan: {
        id: wlan.id,
        wlanId: wlan.wlanId,
        ssid: wlan.ssid,
        isActive: wlan.isActive
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[R710 Integration] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create integration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/r710/integration
 *
 * Remove R710 integration for a business
 * Deletes WLAN from device and removes database records
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      );
    }

    const user = session.user as SessionUser;

    // Check permission: admin OR has canSetupPortalIntegration permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSetupPortalIntegration', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need portal setup permission for this business.' },
        { status: 403 }
      );
    }

    // Get integration with device details
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId },
      include: {
        device_registry: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Get WLANs to delete
    const wlans = await prisma.r710Wlans.findMany({
      where: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    console.log(`[R710 Integration Delete] Removing ${wlans.length} WLAN(s) from device...`);

    // Delete WLANs from R710 device
    const sessionManager = getR710SessionManager();
    const adminPassword = decrypt(integration.device_registry.encryptedAdminPassword);

    const r710Service = await sessionManager.getSession({
      ipAddress: integration.device_registry.ipAddress,
      adminUsername: integration.device_registry.adminUsername,
      adminPassword
    });

    for (const wlan of wlans) {
      try {
        const deleteResult = await r710Service.deleteWlan(wlan.wlanId);
        if (!deleteResult.success) {
          console.warn(`[R710 Integration Delete] Failed to delete WLAN ${wlan.wlanId}: ${deleteResult.error}`);
        }
      } catch (error) {
        console.error(`[R710 Integration Delete] Error deleting WLAN ${wlan.wlanId}:`, error);
      }
    }

    // Delete database records
    await prisma.r710Wlans.deleteMany({
      where: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    await prisma.r710BusinessIntegrations.delete({
      where: { id: integration.id }
    });

    console.log(`[R710 Integration Delete] Integration removed for business ${businessId}`);

    return NextResponse.json({
      success: true,
      message: 'R710 integration removed successfully'
    });

  } catch (error) {
    console.error('[R710 Integration] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove integration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/r710/integration
 *
 * Update WLAN configuration (logoType, title, validDays)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { logoType, title, validDays, enableFriendlyKey } = body;

    const user = session.user as SessionUser;

    // Check permission: admin OR has canSetupPortalIntegration permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canSetupPortalIntegration', businessId)) {
      return NextResponse.json(
        { error: 'Access denied. You need portal setup permission for this business.' },
        { status: 403 }
      );
    }

    // Get integration with WLAN
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId },
      include: {
        device_registry: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Update WLAN in database
    const wlan = await prisma.r710Wlans.findFirst({
      where: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    if (!wlan) {
      return NextResponse.json(
        { error: 'WLAN not found' },
        { status: 404 }
      );
    }

    const updatedWlan = await prisma.r710Wlans.update({
      where: { id: wlan.id },
      data: {
        logoType: logoType !== undefined ? logoType : wlan.logoType,
        title: title !== undefined ? title : wlan.title,
        validDays: validDays !== undefined ? validDays : wlan.validDays,
        enableFriendlyKey: enableFriendlyKey !== undefined ? enableFriendlyKey : wlan.enableFriendlyKey
      }
    });

    console.log(`[R710 Integration] WLAN configuration updated for business ${businessId}`);

    return NextResponse.json({
      success: true,
      message: 'WLAN configuration updated successfully',
      wlan: {
        id: updatedWlan.id,
        logoType: updatedWlan.logoType,
        title: updatedWlan.title,
        validDays: updatedWlan.validDays,
        enableFriendlyKey: updatedWlan.enableFriendlyKey
      }
    });

  } catch (error) {
    console.error('[R710 Integration] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update WLAN configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
