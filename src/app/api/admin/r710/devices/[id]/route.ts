/**
 * R710 Device Management API - Individual Device Operations
 *
 * Admin endpoints for managing individual R710 devices in the registry.
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { encrypt, decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/r710/devices/[id]
 *
 * Get detailed information about a specific R710 device
 */
export async function GET(
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
        creator: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        r710_business_integrations: {
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        r710_wlans: {
          select: {
            id: true,
            ssid: true,
            wlanId: true,
            businessId: true,
            isActive: true
          }
        },
        _count: {
          select: {
            r710_business_integrations: true,
            r710_wlans: true
          }
        }
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Map integrations, handling orphaned ones (where business may have been deleted)
    const businesses = device.r710_business_integrations.map(integration => {
      if (integration.businesses) {
        return {
          id: integration.businesses.id,
          name: integration.businesses.name,
          type: integration.businesses.type,
          integrationId: integration.id,
          isActive: integration.isActive,
          isOrphaned: false
        };
      } else {
        // Orphaned integration - business was deleted but integration remains
        return {
          id: null,
          name: `[Deleted Business]`,
          type: 'Unknown',
          integrationId: integration.id,
          isActive: integration.isActive,
          isOrphaned: true
        };
      }
    });

    return NextResponse.json({
      device: {
        id: device.id,
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        firmwareVersion: device.firmwareVersion,
        model: device.model,
        description: device.description,
        isActive: device.isActive,
        connectionStatus: device.connectionStatus,
        lastHealthCheck: device.lastHealthCheck,
        lastConnectedAt: device.lastConnectedAt,
        lastError: device.lastError,
        createdBy: {
          id: device.creator.id,
          name: device.creator.name,
          username: device.creator.username
        },
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        businesses,
        wlans: device.r710_wlans,
        usage: {
          businessCount: device._count.r710_business_integrations,
          wlanCount: device._count.r710_wlans
        }
      }
    });

  } catch (error) {
    console.error('[R710 Device] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/r710/devices/[id]
 *
 * Update R710 device information (primarily for credential rotation)
 *
 * IMPORTANT: When credentials are updated:
 * 1. Cached session is invalidated
 * 2. All businesses using this device automatically use new credentials
 * 3. Next API call will re-authenticate with new credentials
 */
export async function PUT(
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
      where: { id }
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      ipAddress,
      adminUsername,
      adminPassword,
      description,
      isActive
    } = body;

    // Prepare update data
    const updateData: any = {};

    if (description !== undefined) {
      updateData.description = description;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Handle IP address change
    let ipAddressChanged = false;
    const newIpAddress = ipAddress && ipAddress !== device.ipAddress ? ipAddress : device.ipAddress;

    if (ipAddress && ipAddress !== device.ipAddress) {
      // Check if new IP is already registered
      const existingDevice = await prisma.r710DeviceRegistry.findUnique({
        where: { ipAddress }
      });

      if (existingDevice) {
        return NextResponse.json(
          {
            error: 'IP address already registered',
            message: 'Another device is already registered with this IP address'
          },
          { status: 409 }
        );
      }

      updateData.ipAddress = ipAddress;
      ipAddressChanged = true;
    }

    // Handle credential updates
    let credentialsChanged = false;

    if (adminUsername !== undefined && adminUsername !== device.adminUsername) {
      updateData.adminUsername = adminUsername;
      credentialsChanged = true;
    }

    if (adminPassword !== undefined) {
      updateData.encryptedAdminPassword = encrypt(adminPassword);
      credentialsChanged = true;
    }

    // If IP or credentials changed, test connectivity
    if (ipAddressChanged || credentialsChanged) {
      console.log(`[R710 Device Update] Testing connection for ${newIpAddress}...`);

      const r710Service = new RuckusR710ApiService({
        ipAddress: newIpAddress,
        adminUsername: adminUsername || device.adminUsername,
        adminPassword: adminPassword || decrypt(device.encryptedAdminPassword),
        timeout: 30000
      });

      const connectivityTest = await r710Service.testConnection();

      if (!connectivityTest.online) {
        return NextResponse.json(
          {
            error: 'Device unreachable',
            message: 'Cannot connect to R710 device with new credentials',
            details: connectivityTest.error
          },
          { status: 503 }
        );
      }

      if (!connectivityTest.authenticated) {
        return NextResponse.json(
          {
            error: 'Authentication failed',
            message: 'New credentials are invalid',
            details: connectivityTest.error
          },
          { status: 401 }
        );
      }

      // Invalidate cached session (forces re-authentication on next use)
      console.log(`[R710 Device Update] Invalidating session for ${device.ipAddress}...`);
      const sessionManager = getR710SessionManager();
      await sessionManager.invalidateSession(device.ipAddress);

      // If IP changed, also invalidate any session for the new IP
      if (ipAddressChanged) {
        await sessionManager.invalidateSession(newIpAddress);
      }

      // Update connection status
      updateData.connectionStatus = 'CONNECTED';
      updateData.lastHealthCheck = new Date();
      updateData.lastConnectedAt = new Date();
      updateData.lastError = null;

      console.log(`[R710 Device Update] ${ipAddressChanged ? 'IP address and ' : ''}Credentials updated and session invalidated`);
    }

    // Perform update
    const updatedDevice = await prisma.r710DeviceRegistry.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        _count: {
          select: {
            r710_business_integrations: true,
            r710_wlans: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: ipAddressChanged && credentialsChanged
        ? 'Device IP address and credentials updated'
        : ipAddressChanged
        ? 'Device IP address updated'
        : credentialsChanged
        ? 'Device credentials updated'
        : 'Device updated successfully',
      device: {
        id: updatedDevice.id,
        ipAddress: updatedDevice.ipAddress,
        adminUsername: updatedDevice.adminUsername,
        firmwareVersion: updatedDevice.firmwareVersion,
        model: updatedDevice.model,
        description: updatedDevice.description,
        isActive: updatedDevice.isActive,
        connectionStatus: updatedDevice.connectionStatus,
        lastHealthCheck: updatedDevice.lastHealthCheck,
        businessCount: updatedDevice._count.r710_business_integrations,
        wlanCount: updatedDevice._count.r710_wlans,
        updatedAt: updatedDevice.updatedAt
      }
    });

  } catch (error) {
    console.error('[R710 Device] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update device', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/r710/devices/[id]
 *
 * Remove R710 device from registry
 *
 * NOTE: This will fail if businesses are still using this device.
 * Admin must remove all business integrations first.
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

    const { id } = await params;
    const device = await prisma.r710DeviceRegistry.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            r710_business_integrations: true,
            r710_wlans: true
          }
        }
      }
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Check if device is still in use by businesses
    if (device._count.r710_business_integrations > 0) {
      return NextResponse.json(
        {
          error: 'Device still in use',
          message: `Cannot delete device: ${device._count.r710_business_integrations} business(es) are still using this device. Remove all business integrations first.`,
          businessCount: device._count.r710_business_integrations
        },
        { status: 409 }
      );
    }

    // Auto-cleanup orphaned WLANs (WLANs without business integrations)
    if (device._count.r710_wlans > 0) {
      console.log(`[R710 Device Delete] Cleaning up ${device._count.r710_wlans} orphaned WLAN(s)...`);

      // Get the WLANs to delete
      const wlans = await prisma.r710Wlans.findMany({
        where: { deviceRegistryId: id }
      });

      // Try to delete from device (best effort)
      try {
        const adminPassword = decrypt(device.encryptedAdminPassword);
        const r710Service = new RuckusR710ApiService({
          ipAddress: device.ipAddress,
          adminUsername: device.adminUsername,
          adminPassword,
          timeout: 30000
        });

        for (const wlan of wlans) {
          try {
            await r710Service.deleteWlan(wlan.wlanId);
            console.log(`[R710 Device Delete] Deleted WLAN ${wlan.wlanId} from device`);
          } catch (e) {
            console.warn(`[R710 Device Delete] Could not delete WLAN ${wlan.wlanId} from device:`, e);
          }
        }
      } catch (e) {
        console.warn('[R710 Device Delete] Could not connect to device to delete WLANs:', e);
      }

      // Delete from database
      await prisma.r710Wlans.deleteMany({
        where: { deviceRegistryId: id }
      });

      console.log(`[R710 Device Delete] Cleaned up ${wlans.length} orphaned WLAN(s)`);
    }

    // Invalidate cached session
    console.log(`[R710 Device Delete] Invalidating session for ${device.ipAddress}...`);
    const sessionManager = getR710SessionManager();
    await sessionManager.invalidateSession(device.ipAddress);

    // Delete device
    await prisma.r710DeviceRegistry.delete({
      where: { id }
    });

    console.log(`[R710 Device Delete] Device removed: ${device.id} (${device.ipAddress})`);

    return NextResponse.json({
      success: true,
      message: 'Device removed from registry'
    });

  } catch (error) {
    console.error('[R710 Device] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete device', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
