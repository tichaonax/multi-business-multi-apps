import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/wifi-portal/integration/health
 * Check ESP32 portal health status
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
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get portal integration for this business
    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
      select: {
        id: true,
        portalIpAddress: true,
        portalPort: true,
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: 'No portal integration found for this business',
          health: {
            status: 'unknown',
          },
        },
        { status: 404 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Portal integration is disabled',
        health: {
          status: 'unhealthy',
        },
      });
    }

    // Call ESP32 /api/health endpoint
    const portalUrl = `http://${integration.portalIpAddress}:${integration.portalPort}/api/health`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const healthResponse = await fetch(portalUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!healthResponse.ok) {
        return NextResponse.json({
          success: false,
          error: `Portal returned HTTP ${healthResponse.status}`,
          health: {
            status: 'unhealthy',
          },
        });
      }

      const healthData = await healthResponse.json();

      return NextResponse.json({
        success: true,
        health: {
          status: healthData.status || 'healthy',
          uptime_seconds: healthData.uptime_seconds,
          time_synced: healthData.time_synced,
          last_time_sync: healthData.last_time_sync,
          current_time: healthData.current_time,
          active_tokens: healthData.active_tokens,
          max_tokens: healthData.max_tokens,
          free_heap_bytes: healthData.free_heap_bytes,
        },
      });
    } catch (fetchError: any) {
      // Portal unreachable
      return NextResponse.json({
        success: false,
        error:
          fetchError.name === 'AbortError'
            ? 'Portal timeout - device may be offline'
            : 'Portal unreachable',
        health: {
          status: 'unhealthy',
        },
      });
    }
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        health: {
          status: 'unknown',
        },
      },
      { status: 500 }
    );
  }
}
