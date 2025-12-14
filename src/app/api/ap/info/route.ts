import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ap/info
 * Get WiFi access point information for receipt printing
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

    // Check permission - admins have access to all businesses
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    // Check if user has access to this business (admins skip this check)
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Get portal integration for this business
    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
      select: {
        id: true,
        portalIpAddress: true,
        portalPort: true,
        apiKey: true,
        isActive: true,
        ssid: true, // WiFi network name
        portalUrl: true, // Public portal URL if configured
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No portal integration found for this business' },
        { status: 404 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'Portal integration is disabled' },
        { status: 403 }
      );
    }

    // Try to get additional AP info from ESP32 if available
    let apInfo = {
      ssid: integration.ssid || 'WiFi Portal',
      portalUrl: integration.portalUrl || `http://${integration.portalIpAddress}:${integration.portalPort}`,
      ipAddress: integration.portalIpAddress,
      port: integration.portalPort,
    };

    // Try to get system info from ESP32 for additional details
    try {
      const systemUrl = `http://${integration.portalIpAddress}:${integration.portalPort}/api/health?api_key=${encodeURIComponent(integration.apiKey)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const systemResponse = await fetch(systemUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (systemResponse.ok) {
        const systemData = await systemResponse.json();

        // Add any additional AP info from system response
        if (systemData.ssid) {
          apInfo.ssid = systemData.ssid;
        }
        if (systemData.portal_url) {
          apInfo.portalUrl = systemData.portal_url;
        }
      }
    } catch (error) {
      // Ignore errors - use database info as fallback
      console.log('Could not fetch additional AP info from ESP32:', error);
    }

    return NextResponse.json({
      success: true,
      apInfo,
    });
  } catch (error: any) {
    console.error('AP info error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}