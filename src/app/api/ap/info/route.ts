import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/ap/info
 * Get WiFi access point information for receipt printing
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Check permission - admins have access to all businesses
    const isAdmin = user.role === 'admin';

    // Check if user has access to this business (admins skip this check)
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
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

    // Initialize AP info with defaults
    let apInfo = {
      ssid: 'Guest WiFi', // Default, will be overwritten by ESP32 response
      portalUrl: 'http://192.168.4.1', // ESP32 internal AP address for token redemption
      ipAddress: integration.portalIpAddress,
      port: integration.portalPort,
    };

    // Fetch actual SSID from ESP32 /api/ap/info endpoint
    try {
      const apInfoUrl = `http://${integration.portalIpAddress}:${integration.portalPort}/api/ap/info?api_key=${encodeURIComponent(integration.apiKey)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const esp32Response = await fetch(apInfoUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (esp32Response.ok) {
        const esp32Data = await esp32Response.json();

        // Update SSID from ESP32 response
        if (esp32Data.success && esp32Data.ap_ssid) {
          apInfo.ssid = esp32Data.ap_ssid;
        }
        // Always use ESP32 internal AP address (192.168.4.1) for token redemption
        // Users connect to the WiFi and visit this address to redeem tokens
        apInfo.portalUrl = 'http://192.168.4.1';
      }
    } catch (error) {
      // Ignore errors - use default 'Guest WiFi' as fallback
      console.log('Could not fetch AP info from ESP32, using default:', error);
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