/**
 * R710 Device Connectivity Test API
 *
 * Admin endpoint to test connectivity to a registered R710 device.
 * This is useful for:
 * - Verifying device is still reachable after network changes
 * - Testing credentials after updates
 * - Health check on demand
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { decrypt } from '@/lib/encryption';
import { isSystemAdmin } from '@/lib/permission-utils';

/**
 * POST /api/admin/r710/devices/[id]/test
 *
 * Test connectivity to R710 device and update status in registry
 */
export async function POST(
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

    console.log(`[R710 Device Test] Testing connectivity to ${device.ipAddress}...`);

    // Decrypt password and create service instance
    let adminPassword: string;
    try {
      adminPassword = decrypt(device.encryptedAdminPassword);
    } catch (decryptError) {
      console.error(`[R710 Device Test] Decryption failed for ${device.ipAddress}:`, decryptError);

      // Update device status to reflect credential issue
      await prisma.r710DeviceRegistry.update({
        where: { id },
        data: {
          connectionStatus: 'ERROR',
          lastHealthCheck: new Date(),
          lastError: 'Credential decryption failed - device password needs to be updated'
        }
      });

      return NextResponse.json({
        success: false,
        result: {
          online: false,
          authenticated: false,
          error: 'Unable to decrypt stored credentials. Please edit the device and re-enter the password.',
          timestamp: new Date().toISOString()
        },
        device: {
          id: device.id,
          ipAddress: device.ipAddress,
          connectionStatus: 'ERROR',
          lastHealthCheck: new Date(),
          lastError: 'Credential decryption failed - device password needs to be updated'
        }
      });
    }

    const r710Service = new RuckusR710ApiService({
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword,
      timeout: 30000
    });

    // Test connection
    const testResult = await r710Service.testConnection();

    // Update device status based on test result
    const updateData: any = {
      lastHealthCheck: new Date()
    };

    if (testResult.online && testResult.authenticated) {
      updateData.connectionStatus = 'CONNECTED';
      updateData.lastConnectedAt = new Date();
      updateData.lastError = null;

      // Try to fetch system info
      try {
        const systemInfo = await r710Service.getSystemInfo();
        if (systemInfo.firmwareVersion) {
          updateData.firmwareVersion = systemInfo.firmwareVersion;
        }
        if (systemInfo.model) {
          updateData.model = systemInfo.model;
        }
      } catch (error) {
        console.warn('[R710 Device Test] Could not fetch system info:', error);
        // Don't fail the test if system info fetch fails
      }

    } else {
      updateData.connectionStatus = 'DISCONNECTED';
      updateData.lastError = testResult.error || 'Connection test failed';
    }

    // Update device in database
    const updatedDevice = await prisma.r710DeviceRegistry.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        ipAddress: true,
        connectionStatus: true,
        lastHealthCheck: true,
        lastConnectedAt: true,
        lastError: true,
        firmwareVersion: true,
        model: true
      }
    });

    console.log(
      `[R710 Device Test] Result: ${device.ipAddress} - ${testResult.online ? 'ONLINE' : 'OFFLINE'} / ${testResult.authenticated ? 'AUTHENTICATED' : 'AUTH FAILED'}`
    );

    return NextResponse.json({
      success: testResult.online && testResult.authenticated,
      result: {
        online: testResult.online,
        authenticated: testResult.authenticated,
        error: testResult.error,
        timestamp: new Date().toISOString()
      },
      device: {
        id: updatedDevice.id,
        ipAddress: updatedDevice.ipAddress,
        connectionStatus: updatedDevice.connectionStatus,
        lastHealthCheck: updatedDevice.lastHealthCheck,
        lastConnectedAt: updatedDevice.lastConnectedAt,
        lastError: updatedDevice.lastError,
        firmwareVersion: updatedDevice.firmwareVersion,
        model: updatedDevice.model
      }
    });

  } catch (error) {
    console.error('[R710 Device Test] POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test device connectivity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
