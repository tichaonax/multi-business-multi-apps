/**
 * R710 Device Management API - Individual Device Operations
 *
 * Admin endpoints for managing individual R710 devices in the registry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { encrypt, decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { isSystemAdmin } from '@/lib/permission-utils';

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

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
        businesses: device.r710_business_integrations.map(integration => ({
          id: integration.businesses.id,
          name: integration.businesses.name,
          type: integration.businesses.type,
          integrationId: integration.id,
          isActive: integration.isActive
        })),
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

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

    // If credentials changed, test connectivity with new credentials
    if (credentialsChanged) {
      console.log(`[R710 Device Update] Testing new credentials for ${device.ipAddress}...`);

      const r710Service = new RuckusR710ApiService({
        ipAddress: device.ipAddress,
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

      // Update connection status
      updateData.connectionStatus = 'CONNECTED';
      updateData.lastHealthCheck = new Date();
      updateData.lastConnectedAt = new Date();
      updateData.lastError = null;

      console.log(`[R710 Device Update] Credentials updated and session invalidated for ${device.ipAddress}`);
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
      message: credentialsChanged
        ? 'Device credentials updated and session invalidated'
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

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

    // Check if device is still in use
    if (device._count.r710_business_integrations > 0) {
      return NextResponse.json(
        {
          error: 'Device still in use',
          message: `Cannot delete device: ${device._count.r710_business_integrations} business(es) are still using this device`,
          businessCount: device._count.r710_business_integrations
        },
        { status: 409 }
      );
    }

    if (device._count.r710_wlans > 0) {
      return NextResponse.json(
        {
          error: 'Device has active WLANs',
          message: `Cannot delete device: ${device._count.r710_wlans} WLAN(s) still exist on this device`,
          wlanCount: device._count.r710_wlans
        },
        { status: 409 }
      );
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
