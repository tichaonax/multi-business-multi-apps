/**
 * R710 Available Devices API - Business Endpoint
 *
 * Returns R710 devices that are currently accessible from this system.
 * Implements connectivity validation strategy for multi-machine deployments.
 *
 * CRITICAL: Only shows devices that:
 * - Are marked as active
 * - Have connectionStatus = CONNECTED
 * - Have been health-checked within last 5 minutes
 *
 * This prevents businesses from selecting unreachable devices
 * (e.g., after database restore from different machine/network).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { decrypt } from '@/lib/encryption';

/**
 * GET /api/r710/devices/available
 *
 * List R710 devices available for business integration
 *
 * Query Parameters:
 * - testRealTime: 'true' to test connectivity in real-time (slower but accurate)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testRealTime = searchParams.get('testRealTime') === 'true';

    if (testRealTime) {
      // Real-time connectivity testing (slower but most accurate)
      console.log('[R710 Available Devices] Performing real-time connectivity tests...');

      const allDevices = await prisma.r710DeviceRegistry.findMany({
        where: { isActive: true },
        select: {
          id: true,
          ipAddress: true,
          adminUsername: true,
          encryptedAdminPassword: true,
          description: true,
          model: true,
          firmwareVersion: true,
          _count: {
            select: {
              r710_business_integrations: true
            }
          }
        }
      });

      const availableDevices = [];

      // Test each device in parallel with Promise.all
      const testResults = await Promise.all(
        allDevices.map(async (device) => {
          try {
            const adminPassword = decrypt(device.encryptedAdminPassword);

            const r710Service = new RuckusR710ApiService({
              ipAddress: device.ipAddress,
              adminUsername: device.adminUsername,
              adminPassword,
              timeout: 5000 // 5 second timeout for quick check
            });

            const result = await r710Service.testConnection();

            if (result.online && result.authenticated) {
              return {
                id: device.id,
                ipAddress: device.ipAddress,
                description: device.description,
                model: device.model,
                firmwareVersion: device.firmwareVersion,
                businessCount: device._count.r710_business_integrations,
                connectionStatus: 'CONNECTED',
                testedAt: new Date()
              };
            }

            return null;
          } catch (error) {
            console.warn(`[R710 Available] Real-time test failed for ${device.ipAddress}:`, error);
            return null;
          }
        })
      );

      // Filter out null results (failed tests)
      const reachableDevices = testResults.filter(device => device !== null);

      console.log(`[R710 Available Devices] Real-time test: ${reachableDevices.length}/${allDevices.length} devices reachable`);

      return NextResponse.json({
        devices: reachableDevices,
        testedInRealTime: true,
        lastUpdated: new Date(),
        note: 'Devices tested for connectivity in real-time'
      });

    } else {
      // Default: Use cached health check results (faster)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const availableDevices = await prisma.r710DeviceRegistry.findMany({
        where: {
          isActive: true,
          connectionStatus: 'CONNECTED',
          lastHealthCheck: {
            gte: fiveMinutesAgo // Only devices checked in last 5 minutes
          }
        },
        select: {
          id: true,
          ipAddress: true,
          description: true,
          model: true,
          firmwareVersion: true,
          connectionStatus: true,
          lastHealthCheck: true,
          _count: {
            select: {
              r710_business_integrations: true
            }
          }
        },
        orderBy: {
          ipAddress: 'asc'
        }
      });

      const formattedDevices = availableDevices.map(device => ({
        id: device.id,
        ipAddress: device.ipAddress,
        description: device.description,
        model: device.model,
        firmwareVersion: device.firmwareVersion,
        businessCount: device._count.r710_business_integrations,
        connectionStatus: device.connectionStatus,
        lastHealthCheck: device.lastHealthCheck
      }));

      console.log(`[R710 Available Devices] Returning ${formattedDevices.length} devices (cached, last 5 minutes)`);

      return NextResponse.json({
        devices: formattedDevices,
        testedInRealTime: false,
        lastUpdated: new Date(),
        note: 'Only showing devices accessible from this system (health-checked within 5 minutes)'
      });
    }

  } catch (error) {
    console.error('[R710 Available Devices] GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch available devices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
