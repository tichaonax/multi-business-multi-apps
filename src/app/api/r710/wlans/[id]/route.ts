/**
 * R710 WLAN Update API
 *
 * Update individual WLAN settings on R710 device
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getR710SessionManager } from '@/lib/r710-session-manager';

/**
 * PUT /api/r710/wlans/[id]
 *
 * Update WLAN settings
 * Currently supports: isActive toggle
 *
 * Note: R710 API has limited WLAN update capabilities.
 * For significant changes, delete and recreate WLAN.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isActive } = body;

    // Get WLAN record
    const wlan = await prisma.r710Wlans.findUnique({
      where: { id: params.id },
      include: {
        device_registry: true,
        businesses: {
          select: {
            id: true,
            businessName: true
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

    // Check user has access to this business
    const membership = await prisma.businessMemberships.findFirst({
      where: {
        businessId: wlan.businessId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
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
      return NextResponse.json(
        {
          error: 'Device unreachable',
          message: `R710 device at ${device.ipAddress} is not currently accessible`,
          deviceStatus: device.connectionStatus,
          lastHealthCheck: device.lastHealthCheck
        },
        { status: 503 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (isActive !== undefined) {
      updateData.isActive = isActive;

      console.log(
        `[R710 WLAN Update] ${isActive ? 'Activating' : 'Deactivating'} WLAN ${wlan.wlanId} for ${wlan.businesses.businessName}`
      );

      // Note: R710 API doesn't have enable/disable WLAN endpoint
      // We track this in database only
      // To truly disable, would need to delete WLAN from device
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update database
    const updatedWlan = await prisma.r710Wlans.update({
      where: { id: params.id },
      data: updateData,
      include: {
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            connectionStatus: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'WLAN updated successfully',
      wlan: {
        id: updatedWlan.id,
        wlanId: updatedWlan.wlanId,
        ssid: updatedWlan.ssid,
        vlanId: updatedWlan.vlanId,
        isActive: updatedWlan.isActive,
        device: updatedWlan.device_registry,
        updatedAt: updatedWlan.updatedAt
      }
    });

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get WLAN record
    const wlan = await prisma.r710Wlans.findUnique({
      where: { id: params.id },
      include: {
        device_registry: true,
        businesses: {
          select: {
            id: true,
            businessName: true
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

    // Check user has access to this business
    const membership = await prisma.businessMemberships.findFirst({
      where: {
        businessId: wlan.businessId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
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

    // Delete from R710 device
    const sessionManager = getR710SessionManager();
    const adminPassword = decrypt(device.encryptedAdminPassword);

    const r710Service = await sessionManager.getSession({
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword
    });

    const deleteResult = await r710Service.deleteWlan(wlan.wlanId);

    if (!deleteResult.success) {
      console.error(`[R710 WLAN Delete] Device deletion failed:`, deleteResult.error);

      return NextResponse.json(
        {
          error: 'Failed to delete WLAN from R710 device',
          details: deleteResult.error
        },
        { status: 500 }
      );
    }

    // Delete from database
    await prisma.r710Wlans.delete({
      where: { id: params.id }
    });

    console.log(`[R710 WLAN Delete] WLAN ${wlan.wlanId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'WLAN deleted from R710 device and database'
    });

  } catch (error) {
    console.error('[R710 WLAN Delete] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete WLAN', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
