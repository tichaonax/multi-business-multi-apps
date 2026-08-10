/**
 * R710 Device Registry API - Swap IP Addresses
 *
 * Atomically swaps the ipAddress of two registered devices. Exists because
 * ipAddress is unique, so fixing a mixed-up pair (see MBM-257) otherwise
 * requires a manual temp-value dance via raw SQL. Doing it here also
 * invalidates any cached sessions so the app doesn't keep using a session
 * authenticated against the old IP/business mapping.
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { deviceIdA, deviceIdB } = body;

    if (!deviceIdA || !deviceIdB) {
      return NextResponse.json(
        { error: 'deviceIdA and deviceIdB are required' },
        { status: 400 }
      );
    }

    if (deviceIdA === deviceIdB) {
      return NextResponse.json(
        { error: 'Cannot swap a device with itself' },
        { status: 400 }
      );
    }

    const [deviceA, deviceB] = await Promise.all([
      prisma.r710DeviceRegistry.findUnique({ where: { id: deviceIdA } }),
      prisma.r710DeviceRegistry.findUnique({ where: { id: deviceIdB } })
    ]);

    if (!deviceA || !deviceB) {
      return NextResponse.json(
        { error: 'One or both devices were not found' },
        { status: 404 }
      );
    }

    const tempIp = `SWAP-TEMP-${Date.now()}`;

    await prisma.$transaction([
      prisma.r710DeviceRegistry.update({
        where: { id: deviceA.id },
        data: { ipAddress: tempIp }
      }),
      prisma.r710DeviceRegistry.update({
        where: { id: deviceB.id },
        data: {
          ipAddress: deviceA.ipAddress,
          connectionStatus: 'DISCONNECTED',
          lastError: null
        }
      }),
      prisma.r710DeviceRegistry.update({
        where: { id: deviceA.id },
        data: {
          ipAddress: deviceB.ipAddress,
          connectionStatus: 'DISCONNECTED',
          lastError: null
        }
      })
    ]);

    // Old sessions were authenticated for the wrong device now - drop them
    const sessionManager = getR710SessionManager();
    await Promise.all([
      sessionManager.invalidateSession(deviceA.ipAddress).catch(() => {}),
      sessionManager.invalidateSession(deviceB.ipAddress).catch(() => {})
    ]);

    console.log(
      `[R710 Device Swap] ${user.id} swapped IPs: ${deviceA.description || deviceA.id} ` +
      `(${deviceA.ipAddress} -> ${deviceB.ipAddress}), ${deviceB.description || deviceB.id} ` +
      `(${deviceB.ipAddress} -> ${deviceA.ipAddress})`
    );

    return NextResponse.json({
      success: true,
      message: 'IP addresses swapped successfully. Test both devices to confirm connectivity.',
      devices: [
        { id: deviceA.id, description: deviceA.description, ipAddress: deviceB.ipAddress },
        { id: deviceB.id, description: deviceB.description, ipAddress: deviceA.ipAddress }
      ]
    });

  } catch (error) {
    console.error('[R710 Device Swap] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to swap IP addresses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
