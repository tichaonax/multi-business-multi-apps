import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/wifi-portal/integration/slots
 * Check available ESP32 token slots for bulk creation
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

    // Call ESP32 /api/health endpoint to get capacity info
    const portalUrl = `http://${integration.portalIpAddress}:${integration.portalPort}/api/health?api_key=${encodeURIComponent(integration.apiKey)}`;

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
          error: `Portal returned HTTP ${healthResponse.status}`,
          availableSlots: 0,
          maxSlots: 0,
        }, { status: 503 });
      }

      const healthData = await healthResponse.json();

      const activeTokens = healthData.active_tokens || 0;
      const maxTokens = healthData.max_tokens || 500; // Default to 500 if not provided
      const availableSlots = Math.max(0, maxTokens - activeTokens);

      return NextResponse.json({
        availableSlots,
        maxSlots: maxTokens,
        activeTokens,
        success: true,
      });
    } catch (fetchError: any) {
      // Portal unreachable
      return NextResponse.json({
        error: fetchError.name === 'AbortError'
          ? 'Portal timeout - device may be offline'
          : 'Portal unreachable',
        availableSlots: 0,
        maxSlots: 0,
        success: false,
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Slot check error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        availableSlots: 0,
        maxSlots: 0,
        success: false,
      },
      { status: 500 }
    );
  }
}