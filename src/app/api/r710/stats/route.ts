/**
 * R710 Portal Statistics API
 *
 * Get comprehensive stats for R710 Portal dashboard
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    const userBusinessIds = user.businessMemberships?.map((m: any) => m.businessId) || [];

    // Build filter based on user permissions
    const businessFilter = isSystemAdmin(user)
      ? {} // Admin sees all businesses
      : { businessId: { in: userBusinessIds } }; // Regular users see only their businesses

    // Get device statistics
    const totalDevices = await prisma.r710DeviceRegistry.count({
      where: { isActive: true }
    });

    const connectedDevices = await prisma.r710DeviceRegistry.count({
      where: {
        isActive: true,
        connectionStatus: 'CONNECTED'
      }
    });

    // Get WLAN statistics
    const totalWlans = await prisma.r710Wlans.count({
      where: {
        isActive: true,
        ...businessFilter
      }
    });

    // Get unique businesses with distinct (count doesn't support distinct)
    const uniqueBusinesses = await prisma.r710BusinessIntegrations.findMany({
      where: {
        isActive: true,
        ...businessFilter
      },
      distinct: ['businessId'],
      select: { businessId: true }
    });
    const totalBusinesses = uniqueBusinesses.length;

    // Get token inventory statistics
    const tokenStats = await prisma.r710Tokens.groupBy({
      by: ['status'],
      where: businessFilter,
      _count: {
        id: true
      }
    });

    const tokenInventory = {
      total: 0,
      available: 0,
      sold: 0,
      active: 0,
      expired: 0,
      invalidated: 0
    };

    tokenStats.forEach(stat => {
      const count = stat._count.id;
      tokenInventory.total += count;

      switch (stat.status) {
        case 'AVAILABLE':
          tokenInventory.available = count;
          break;
        case 'SOLD':
          tokenInventory.sold = count;
          break;
        case 'ACTIVE':
          tokenInventory.active = count;
          break;
        case 'EXPIRED':
          tokenInventory.expired = count;
          break;
        case 'INVALIDATED':
          tokenInventory.invalidated = count;
          break;
      }
    });

    // Get sales statistics
    const salesAggregate = await prisma.r710TokenSales.aggregate({
      where: businessFilter,
      _count: {
        id: true
      },
      _sum: {
        saleAmount: true
      }
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24HoursSales = await prisma.r710TokenSales.aggregate({
      where: {
        ...businessFilter,
        soldAt: {
          gte: twentyFourHoursAgo
        }
      },
      _count: {
        id: true
      },
      _sum: {
        saleAmount: true
      }
    });

    // Get recent failure statistics
    const recentFailures = await prisma.r710SyncLogs.count({
      where: {
        ...businessFilter,
        syncedAt: {
          gte: twentyFourHoursAgo
        },
        status: {
          in: ['ERROR', 'DEVICE_UNREACHABLE']
        }
      }
    });

    const criticalFailures = await prisma.r710SyncLogs.count({
      where: {
        ...businessFilter,
        syncedAt: {
          gte: twentyFourHoursAgo
        },
        status: 'ERROR'
      }
    });

    const warnings = await prisma.r710SyncLogs.count({
      where: {
        ...businessFilter,
        syncedAt: {
          gte: twentyFourHoursAgo
        },
        status: 'DEVICE_UNREACHABLE'
      }
    });

    return NextResponse.json({
      totalDevices,
      connectedDevices,
      totalBusinesses,
      totalWlans,
      tokenInventory,
      recentSales: {
        totalSales: salesAggregate._count.id,
        totalRevenue: salesAggregate._sum.saleAmount || 0,
        last24Hours: {
          sales: last24HoursSales._count.id,
          revenue: last24HoursSales._sum.saleAmount || 0
        }
      },
      recentFailures: {
        total: recentFailures,
        critical: criticalFailures,
        warnings
      }
    });

  } catch (error) {
    console.error('[R710 Stats] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch R710 statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
