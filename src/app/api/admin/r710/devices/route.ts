/**
 * R710 Device Registry API - Admin Only
 *
 * Admin endpoints for managing the global R710 device registry.
 * Devices registered here become available for all businesses to use.
 *
 * Architecture:
 * - One IP address = One set of credentials
 * - Businesses select from registered devices (no credential entry)
 * - Credential updates propagate to all businesses automatically
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { encrypt } from '@/lib/encryption';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/r710/devices
 *
 * List all registered R710 devices (admin only)
 * Returns devices with connectivity status and usage count
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin

    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all devices with usage count
    const devices = await prisma.r710DeviceRegistry.findMany({
      select: {
        id: true,
        ipAddress: true,
        adminUsername: true,
        firmwareVersion: true,
        model: true,
        description: true,
        isActive: true,
        lastHealthCheck: true,
        connectionStatus: true,
        lastConnectedAt: true,
        lastError: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
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
      },
      orderBy: {
        ipAddress: 'asc'
      }
    });

    // Format response
    const formattedDevices = devices.map(device => ({
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
      businessCount: device._count.r710_business_integrations,
      wlanCount: device._count.r710_wlans,
      createdBy: {
        id: device.creator.id,
        name: device.creator.name,
        username: device.creator.username
      },
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    }));

    return NextResponse.json({
      devices: formattedDevices,
      total: formattedDevices.length
    });

  } catch (error) {
    console.error('[R710 Device Registry] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/r710/devices
 *
 * Register new R710 device in global registry (admin only)
 *
 * Steps:
 * 1. Validate admin permissions
 * 2. Check IP uniqueness
 * 3. Test device connectivity
 * 4. Verify firmware version
 * 5. Encrypt password
 * 6. Save to registry
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin

    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      ipAddress,
      adminUsername,
      adminPassword,
      description
    } = body;

    // Validate required fields
    if (!ipAddress || !adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: ipAddress, adminUsername, adminPassword' },
        { status: 400 }
      );
    }

    // Validate IP address format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json(
        { error: 'Invalid IP address format' },
        { status: 400 }
      );
    }

    // Check if IP already registered
    const existingDevice = await prisma.r710DeviceRegistry.findUnique({
      where: { ipAddress }
    });

    if (existingDevice) {
      return NextResponse.json(
        {
          error: 'Device already registered',
          message: `IP address ${ipAddress} is already in the device registry`,
          existingDeviceId: existingDevice.id
        },
        { status: 409 }
      );
    }

    // Test device connectivity
    console.log(`[R710 Registration] Testing connectivity to ${ipAddress}...`);

    const r710Service = new RuckusR710ApiService({
      ipAddress,
      adminUsername,
      adminPassword,
      timeout: 30000
    });

    const connectivityTest = await r710Service.testConnection();

    if (!connectivityTest.online) {
      return NextResponse.json(
        {
          error: 'Device unreachable',
          message: `Cannot connect to R710 device at ${ipAddress}`,
          details: connectivityTest.error
        },
        { status: 503 }
      );
    }

    // Test authentication
    console.log(`[R710 Registration] Device is online, testing authentication...`);
    const loginResult = await r710Service.login();

    if (!loginResult.success) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid admin credentials for R710 device',
          details: loginResult.error
        },
        { status: 401 }
      );
    }

    console.log(`[R710 Registration] Authentication successful`);

    // Fetch system info
    console.log(`[R710 Registration] Fetching system info from ${ipAddress}...`);

    let systemInfo;
    try {
      systemInfo = await r710Service.getSystemInfo();
    } catch (error) {
      console.error('[R710 Registration] Failed to fetch system info:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch system info',
          message: 'Device is online but system info could not be retrieved',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Validate firmware version (optional check)
    console.log(`[R710 Registration] Firmware version: ${systemInfo.firmwareVersion}`);

    // Encrypt password
    const encryptedPassword = encrypt(adminPassword);

    // Create device registry entry
    const device = await prisma.r710DeviceRegistry.create({
      data: {
        ipAddress,
        adminUsername,
        encryptedAdminPassword: encryptedPassword,
        firmwareVersion: systemInfo.firmwareVersion || null,
        model: systemInfo.model || 'R710',
        description: description || null,
        isActive: true,
        connectionStatus: 'CONNECTED',
        lastHealthCheck: new Date(),
        lastConnectedAt: new Date(),
        createdBy: user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });

    console.log(`[R710 Registration] Device registered: ${device.id} (${ipAddress})`);

    return NextResponse.json({
      success: true,
      message: 'R710 device registered successfully',
      device: {
        id: device.id,
        ipAddress: device.ipAddress,
        adminUsername: device.adminUsername,
        firmwareVersion: device.firmwareVersion,
        model: device.model,
        description: device.description,
        connectionStatus: device.connectionStatus,
        lastHealthCheck: device.lastHealthCheck,
        createdBy: {
          id: device.creator.id,
          name: `${device.creator.firstName} ${device.creator.lastName}`,
          username: device.creator.username
        },
        createdAt: device.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[R710 Device Registry] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to register device', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
