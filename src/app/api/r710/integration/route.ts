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

    // Check permission: admin OR canSetupPortalIntegration OR canSellWifiTokens (read-only for salespersons)
    const canSetup = hasPermission(user, 'canSetupPortalIntegration', businessId);
    const canSell = hasPermission(user, 'canSellWifiTokens', businessId);

    if (!isSystemAdmin(user) && !canSetup && !canSell) {
      return NextResponse.json(
        { error: 'Access denied. You need WiFi token permissions for this business.' },
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
        enableZeroIt: true,
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
      enableFriendlyKey,
      enableZeroIt,
      associateExistingWlanId  // Optional: If provided, associate with existing WLAN instead of creating new
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

    // CRITICAL: Business can only have ONE R710 integration maximum
    const existingIntegration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId },
      include: {
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true
          }
        }
      }
    });

    if (existingIntegration) {
      return NextResponse.json(
        {
          error: 'Business already has an R710 integration',
          details: `This business is already integrated with R710 device at ${existingIntegration.device_registry.ipAddress}. A business can only have ONE R710 integration.`,
          existingDevice: {
            id: existingIntegration.device_registry.id,
            ipAddress: existingIntegration.device_registry.ipAddress,
            description: existingIntegration.device_registry.description
          }
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

    // CRITICAL: Check if WLAN with same SSID already exists on device
    console.log(`[R710 Integration] Checking for duplicate WLAN with SSID "${wlanSsid}"...`);
    const discoveryResult = await r710Service.discoverWlans();

    if (!discoveryResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to discover WLANs on device',
          details: discoveryResult.error
        },
        { status: 500 }
      );
    }

    // Check if SSID already exists
    const existingWlan = discoveryResult.wlans.find(w => w.ssid === wlanSsid && w.isGuest);

    // Handle association with existing WLAN
    if (associateExistingWlanId) {
      console.log(`[R710 Integration] Associating with existing WLAN ID: ${associateExistingWlanId}`);

      // Find the WLAN on the device
      const wlanToAssociate = discoveryResult.wlans.find(w => w.id === associateExistingWlanId && w.isGuest);

      if (!wlanToAssociate) {
        return NextResponse.json(
          {
            error: 'WLAN not found on device',
            details: `Could not find guest WLAN with ID "${associateExistingWlanId}" on the R710 device.`
          },
          { status: 404 }
        );
      }

      // Check if this WLAN is already associated with another business
      const existingAssociation = await prisma.r710Wlans.findFirst({
        where: {
          deviceRegistryId,
          wlanId: associateExistingWlanId
        },
        include: {
          businesses: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (existingAssociation) {
        return NextResponse.json(
          {
            error: 'WLAN already associated',
            type: 'DUPLICATE_SSID_ASSOCIATED',
            details: `This WLAN is already associated with business "${existingAssociation.businesses.name}".`
          },
          { status: 409 }
        );
      }

      // Create database records for association (no WLAN creation on device needed)
      console.log(`[R710 Integration] Creating database records for existing WLAN "${wlanToAssociate.ssid}"...`);

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

          // Create WLAN record linking to existing device WLAN
          const newWlan = await tx.r710Wlans.create({
            data: {
              businessId,
              deviceRegistryId,
              wlanId: associateExistingWlanId,
              ssid: wlanToAssociate.ssid,
              guestServiceId: '1',
              logoType: logoType || 'none',
              title: title || 'Welcome to Guest WiFi !',
              validDays: validDays || 1,
              enableFriendlyKey: enableFriendlyKey || false,
              enableZeroIt: enableZeroIt !== undefined ? enableZeroIt : true,
              isActive: true
            }
          });

          return { integration: newIntegration, wlan: newWlan };
        });

        integration = result.integration;
        wlan = result.wlan;

        console.log(`[R710 Integration] Database records created successfully for association`);
      } catch (dbError) {
        console.error('[R710 Integration] Database transaction failed:', dbError);
        return NextResponse.json(
          {
            error: 'Failed to create integration records in database',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }

      // Create R710 expense account for this business
      console.log(`[R710 Integration] Creating expense account for ${business.name}...`);
      await getOrCreateR710ExpenseAccount(businessId, session.user.id);
      console.log(`[R710 Integration] Expense account created/verified`);

      console.log(`[R710 Integration] Association complete for ${business.name} with existing WLAN`);

      return NextResponse.json({
        success: true,
        message: 'R710 integration created successfully (associated with existing WLAN)',
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
    }

    if (existingWlan) {
      console.log(`[R710 Integration] WLAN with SSID "${wlanSsid}" already exists on device (ID: ${existingWlan.id})`);

      // Check if this WLAN is already associated with another business
      const wlanInDb = await prisma.r710Wlans.findFirst({
        where: {
          deviceRegistryId,
          wlanId: existingWlan.id
        },
        include: {
          businesses: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (wlanInDb) {
        return NextResponse.json(
          {
            error: 'WLAN SSID already in use',
            type: 'DUPLICATE_SSID_ASSOCIATED',
            details: `A WLAN with SSID "${wlanSsid}" already exists on this device and is associated with business "${wlanInDb.businesses.name}".`,
            suggestion: 'Please choose a different SSID name for your business.',
            existingWlan: {
              id: existingWlan.id,
              ssid: existingWlan.ssid,
              associatedBusiness: wlanInDb.businesses.name
            }
          },
          { status: 409 }
        );
      } else {
        // WLAN exists on device but not in database - offer to associate
        return NextResponse.json(
          {
            error: 'WLAN SSID already exists on device',
            type: 'DUPLICATE_SSID_UNASSOCIATED',
            details: `A WLAN with SSID "${wlanSsid}" already exists on this R710 device but is not associated with any business in the system.`,
            suggestion: 'You can either: (1) Choose a different SSID name, or (2) Associate your business with the existing WLAN.',
            existingWlan: {
              id: existingWlan.id,
              ssid: existingWlan.ssid,
              name: existingWlan.name
            },
            canAssociate: true
          },
          { status: 409 }
        );
      }
    }

    console.log(`[R710 Integration] No duplicate WLAN found. Proceeding with creation...`);

    // Create WLAN on R710 device
    // CRITICAL: R710 uses numeric guest service IDs (e.g., '1'), not string IDs
    const wlanResult = await r710Service.createWlan({
      ssid: wlanSsid,
      guestServiceId: '1', // R710 default guest service ID (was 'guest-default')
      vlanId: wlanVlanId,
      logoType: logoType || 'none',
      title: title || 'Welcome to Guest WiFi !',
      validDays: validDays || 1,
      enableFriendlyKey: enableFriendlyKey || false,
      enableZeroIt: enableZeroIt !== undefined ? enableZeroIt : true
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

    // Validate and fix Guest Service firewall rules AFTER WLAN creation
    // The R710 may reset guest service rules when a new WLAN binds to the guest service
    console.log(`[R710 Integration] Validating Guest Service firewall rules...`);
    const firewallValidation = await r710Service.validateGuestServiceFirewallRules('1', {
      title: title || 'Welcome to Guest WiFi !',
      validDays: validDays || 1,
      logoType: logoType || 'none',
      autoFix: true
    });

    if (firewallValidation.valid) {
      console.log(`[R710 Integration] ✅ Firewall rules validated: ${JSON.stringify(firewallValidation.details)}`);
    } else if (firewallValidation.fixed) {
      console.log(`[R710 Integration] 🔧 Firewall rules were misconfigured and have been fixed`);
    } else {
      console.warn(`[R710 Integration] ⚠️ Firewall rules validation issue: ${firewallValidation.error}`);
    }

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
            guestServiceId: '1', // R710 numeric guest service ID
            logoType: logoType || 'none',
            title: title || 'Welcome to Guest WiFi !',
            validDays: validDays || 1,
            enableFriendlyKey: enableFriendlyKey || false,
            enableZeroIt: enableZeroIt !== undefined ? enableZeroIt : true,
            isActive: true
          },
          create: {
            businessId,
            deviceRegistryId,
            wlanId: wlanResult.wlanId!,
            ssid: wlanSsid,
            guestServiceId: '1', // R710 numeric guest service ID
            logoType: logoType || 'none',
            title: title || 'Welcome to Guest WiFi !',
            validDays: validDays || 1,
            enableFriendlyKey: enableFriendlyKey || false,
            enableZeroIt: enableZeroIt !== undefined ? enableZeroIt : true,
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

    // Create R710 expense account for this business - REQUIRED
    console.log(`[R710 Integration] Creating expense account for ${business.name}...`);
    await getOrCreateR710ExpenseAccount(businessId, session.user.id);
    console.log(`[R710 Integration] Expense account created/verified`);

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
    const { logoType, title, validDays, enableFriendlyKey, enableZeroIt } = body;

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

    // Ensure R710 expense account exists (retro-fix for integrations created without accounts)
    console.log(`[R710 Integration] Checking expense account for business ${businessId}...`);
    const expenseAccount = await getOrCreateR710ExpenseAccount(businessId, session.user.id);
    console.log(`[R710 Integration] Expense account verified: ${expenseAccount.accountName}`);

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

    // Update database only - WLAN device configuration is handled by wlans/[id] endpoint
    const updatedWlan = await prisma.r710Wlans.update({
      where: { id: wlan.id },
      data: {
        logoType: logoType !== undefined ? logoType : wlan.logoType,
        title: title !== undefined ? title : wlan.title,
        validDays: validDays !== undefined ? validDays : wlan.validDays,
        enableFriendlyKey: enableFriendlyKey !== undefined ? enableFriendlyKey : wlan.enableFriendlyKey,
        enableZeroIt: enableZeroIt !== undefined ? enableZeroIt : wlan.enableZeroIt
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
        enableFriendlyKey: updatedWlan.enableFriendlyKey,
        enableZeroIt: updatedWlan.enableZeroIt
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
