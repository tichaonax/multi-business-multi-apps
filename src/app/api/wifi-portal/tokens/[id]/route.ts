import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPortalClient } from '@/lib/wifi-portal/api-client';

/**
 * GET /api/wifi-portal/tokens/[id]
 * Get WiFi token details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await prisma.wifiTokens.findUnique({
      where: { id: params.id },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        token_configurations: true,
        business_token_menu_items: {
          select: {
            businessPrice: true,
            isActive: true,
          },
        },
        wifi_token_sales: {
          select: {
            id: true,
            saleAmount: true,
            paymentMethod: true,
            soldAt: true,
            soldBy: true,
            receiptPrinted: true,
          },
        },
      },
    });

    if (!token) {
      return NextResponse.json({ error: 'WiFi token not found' }, { status: 404 });
    }

    // Check if user has access to this business
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: token.businessId,
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

    return NextResponse.json({
      success: true,
      token: {
        id: token.id,
        token: token.token,
        status: token.status,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        firstUsedAt: token.firstUsedAt,
        bandwidthUsedDown: token.bandwidthUsedDown,
        bandwidthUsedUp: token.bandwidthUsedUp,
        usageCount: token.usageCount,
        lastSyncedAt: token.lastSyncedAt,
        business: token.businesses,
        tokenConfig: token.token_configurations,
        businessMenuItem: token.business_token_menu_items,
        sales: token.wifi_token_sales,
      },
    });
  } catch (error: any) {
    console.error('WiFi token fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WiFi token', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wifi-portal/tokens/[id]
 * Extend WiFi token expiration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { additionalMinutes } = body;

    if (!additionalMinutes || additionalMinutes <= 0) {
      return NextResponse.json(
        { error: 'additionalMinutes is required and must be positive' },
        { status: 400 }
      );
    }

    // Get token
    const token = await prisma.wifiTokens.findUnique({
      where: { id: params.id },
      include: {
        businesses: {
          include: {
            portal_integrations: true,
          },
        },
      },
    });

    if (!token) {
      return NextResponse.json({ error: 'WiFi token not found' }, { status: 404 });
    }

    // Check if user has access to this business
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: token.businessId,
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

    // Check if token can be extended
    if (token.status === 'DISABLED') {
      return NextResponse.json(
        { error: 'Cannot extend disabled token' },
        { status: 400 }
      );
    }

    // Get portal integration
    const integration = token.businesses.portal_integrations;
    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: 'Portal integration not available or inactive' },
        { status: 400 }
      );
    }

    // Extend token via ESP32 API
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
      retries: 3,
    });

    let extendResponse;
    try {
      extendResponse = await portalClient.extendToken({
        token: token.token,
        additionalMinutes: additionalMinutes,
      });

      if (!extendResponse.success) {
        throw new Error(extendResponse.error || 'Failed to extend token on portal');
      }
    } catch (error: any) {
      console.error('ESP32 token extension error:', error);
      return NextResponse.json(
        {
          error: 'Failed to extend WiFi token on portal server',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Update token in database
    const newExpiresAt = new Date(token.expiresAt.getTime() + additionalMinutes * 60 * 1000);
    const updatedToken = await prisma.wifiTokens.update({
      where: { id: params.id },
      data: {
        expiresAt: newExpiresAt,
        status: 'ACTIVE', // Reactivate if expired
      },
    });

    return NextResponse.json({
      success: true,
      token: {
        id: updatedToken.id,
        token: updatedToken.token,
        status: updatedToken.status,
        expiresAt: updatedToken.expiresAt,
        additionalMinutesAdded: additionalMinutes,
      },
      portalResponse: {
        expiresAt: extendResponse.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('WiFi token extension error:', error);
    return NextResponse.json(
      { error: 'Failed to extend WiFi token', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wifi-portal/tokens/[id]
 * Disable WiFi token
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Disabled by admin';

    // Get token
    const token = await prisma.wifiTokens.findUnique({
      where: { id: params.id },
      include: {
        businesses: {
          include: {
            portal_integrations: true,
          },
        },
      },
    });

    if (!token) {
      return NextResponse.json({ error: 'WiFi token not found' }, { status: 404 });
    }

    // Check if user has access to this business
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: token.businessId,
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

    // Check if already disabled
    if (token.status === 'DISABLED') {
      return NextResponse.json(
        { error: 'Token is already disabled' },
        { status: 400 }
      );
    }

    // Get portal integration
    const integration = token.businesses.portal_integrations;
    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: 'Portal integration not available or inactive' },
        { status: 400 }
      );
    }

    // Disable token via ESP32 API
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
      retries: 3,
    });

    try {
      const disableResponse = await portalClient.disableToken({
        token: token.token,
        reason: reason,
      });

      if (!disableResponse.success) {
        throw new Error(disableResponse.error || 'Failed to disable token on portal');
      }
    } catch (error: any) {
      console.error('ESP32 token disable error:', error);
      return NextResponse.json(
        {
          error: 'Failed to disable WiFi token on portal server',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Update token in database
    const updatedToken = await prisma.wifiTokens.update({
      where: { id: params.id },
      data: {
        status: 'DISABLED',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'WiFi token disabled successfully',
      token: {
        id: updatedToken.id,
        token: updatedToken.token,
        status: updatedToken.status,
        reason: reason,
      },
    });
  } catch (error: any) {
    console.error('WiFi token disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable WiFi token', details: error.message },
      { status: 500 }
    );
  }
}
