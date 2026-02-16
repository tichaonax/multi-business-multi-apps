/**
 * R710 WiFi Portal Alerts API
 *
 * Get recent R710 failures and warnings for dashboard display
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

    // Get recent failures (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Build where clause
    const whereClause: any = {
      syncedAt: { gte: twentyFourHoursAgo },
      status: {
        in: ['ERROR', 'DEVICE_UNREACHABLE']
      }
    };

    // Filter by business access
    if (!isSystemAdmin(user)) {
      whereClause.businessId = { in: userBusinessIds };
    }

    // Get failure logs
    const failureLogs = await prisma.r710SyncLogs.findMany({
      where: whereClause,
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            connectionStatus: true,
            lastHealthCheck: true
          }
        }
      },
      orderBy: {
        syncedAt: 'desc'
      },
      take: 10
    });

    // Group failures by business and device
    const alertsByBusiness = new Map<string, any>();

    failureLogs.forEach(log => {
      const businessId = log.businessId;

      if (!alertsByBusiness.has(businessId)) {
        alertsByBusiness.set(businessId, {
          businessId,
          businessName: log.businesses.name,
          businessType: log.businesses.type,
          deviceIp: log.device_registry.ipAddress,
          deviceStatus: log.device_registry.connectionStatus,
          lastHealthCheck: log.device_registry.lastHealthCheck,
          failures: [],
          totalFailures: 0,
          lastFailureAt: log.syncedAt
        });
      }

      const alert = alertsByBusiness.get(businessId);
      alert.totalFailures++;
      alert.failures.push({
        id: log.id,
        syncType: log.syncType,
        status: log.status,
        errorMessage: log.errorMessage,
        syncedAt: log.syncedAt,
        tokensChecked: log.tokensChecked,
        tokensUpdated: log.tokensUpdated
      });

      // Update last failure time if more recent
      if (new Date(log.syncedAt) > new Date(alert.lastFailureAt)) {
        alert.lastFailureAt = log.syncedAt;
      }
    });

    // Convert to array and sort by last failure time
    const alerts = Array.from(alertsByBusiness.values()).sort((a, b) =>
      new Date(b.lastFailureAt).getTime() - new Date(a.lastFailureAt).getTime()
    );

    // Calculate summary statistics
    const summary = {
      totalAlerts: alerts.length,
      totalFailures: failureLogs.length,
      byStatus: {
        ERROR: failureLogs.filter(log => log.status === 'ERROR').length,
        DEVICE_UNREACHABLE: failureLogs.filter(log => log.status === 'DEVICE_UNREACHABLE').length
      },
      bySyncType: {
        TOKEN_SYNC: failureLogs.filter(log => log.syncType === 'TOKEN_SYNC').length,
        AUTO_GENERATION: failureLogs.filter(log => log.syncType === 'AUTO_GENERATION').length,
        HEALTH_CHECK: failureLogs.filter(log => log.syncType === 'HEALTH_CHECK').length
      },
      timeRange: {
        from: twentyFourHoursAgo,
        to: new Date()
      }
    };

    return NextResponse.json({
      alerts,
      summary,
      hasFailures: alerts.length > 0
    });

  } catch (error) {
    console.error('[R710 Alerts] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch R710 alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
