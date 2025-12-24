import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPortalClient } from '@/lib/wifi-portal/api-client';

/**
 * POST /api/wifi-portal/tokens/bulk
 * Create multiple WiFi tokens in a single request (calls ESP32 bulk API and saves to database)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessId,
      tokenConfigId,
      quantity,
    } = body;

    // Validate required fields
    if (!businessId || !tokenConfigId || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, tokenConfigId, quantity' },
        { status: 400 }
      );
    }

    if (quantity < 1 || quantity > 50) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Check permission - admins have access to all businesses
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    // Check if user has access to this business (admins skip this check)
    let membership = null;
    if (!isAdmin) {
      membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
        include: {
          businesses: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Get business info (for admins who don't have membership)
    const business = membership?.businesses || await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Validate business type (only restaurant and grocery allowed)
    const businessType = business.type;
    if (businessType !== 'restaurant' && businessType !== 'grocery') {
      return NextResponse.json(
        { error: 'WiFi token generation is only available for restaurant and grocery businesses' },
        { status: 403 }
      );
    }

    // Get portal integration for this business
    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No portal integration found for this business. Please setup WiFi portal first.' },
        { status: 404 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'Portal integration is disabled for this business' },
        { status: 403 }
      );
    }

    // Get token configuration
    const tokenConfig = await prisma.tokenConfigurations.findUnique({
      where: { id: tokenConfigId },
    });

    if (!tokenConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    if (!tokenConfig.isActive) {
      return NextResponse.json(
        { error: 'This token configuration is inactive' },
        { status: 400 }
      );
    }

    // Check for business-specific overrides
    const businessMenuItem = await prisma.businessTokenMenuItems.findUnique({
      where: {
        businessId_tokenConfigId: {
          businessId: businessId,
          tokenConfigId: tokenConfigId,
        },
      },
    });

    // Use override values if they exist, otherwise use defaults from config
    const durationMinutes = businessMenuItem?.durationMinutesOverride ?? tokenConfig.durationMinutes;
    const bandwidthDownMb = businessMenuItem?.bandwidthDownMbOverride ?? tokenConfig.bandwidthDownMb;
    const bandwidthUpMb = businessMenuItem?.bandwidthUpMbOverride ?? tokenConfig.bandwidthUpMb;

    console.log('Token creation values:', {
      tokenConfigId,
      businessId,
      durationMinutes,
      bandwidthDownMb,
      bandwidthUpMb,
      hasOverrides: !!(businessMenuItem?.durationMinutesOverride || businessMenuItem?.bandwidthDownMbOverride || businessMenuItem?.bandwidthUpMbOverride),
    });

    // Create WiFi tokens via ESP32 bulk API
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 15000, // Longer timeout for bulk operations
      retries: 3,
    });

    console.log('Portal client created for bulk creation:', {
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey.substring(0, 10) + '...',
      timeout: 15000,
      retries: 3,
    });

    let bulkResponse;
    try {
      console.log('Calling portalClient.bulkCreateTokens with params:', {
        count: quantity,
        businessId: businessId,
        durationMinutes,
        bandwidthDownMb,
        bandwidthUpMb,
      });

      bulkResponse = await portalClient.bulkCreateTokens({
        count: quantity,
        businessId: businessId,
        durationMinutes,
        bandwidthDownMb,
        bandwidthUpMb,
      });

      console.log('Portal bulk API response:', bulkResponse);

      if (!bulkResponse.success) {
        throw new Error(bulkResponse.error || 'Failed to create tokens on portal');
      }
    } catch (error: any) {
      console.error('ESP32 bulk token creation error:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to create WiFi tokens on portal server',
          details: error.message,
          portalUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
        },
        { status: 500 }
      );
    }

    // Use database transaction to save all tokens atomically
    const result = await prisma.$transaction(async (tx) => {
      const createdTokens = [];

      // Save each WiFi token to database
      for (const tokenData of bulkResponse.tokens) {
        const wifiToken = await tx.wifiTokens.create({
          data: {
            businessId: businessId,
            tokenConfigId: tokenConfigId,
            token: tokenData.token,
            status: 'UNUSED', // CRITICAL: Tokens are UNUSED until redeemed by customer
            bandwidthUsedDown: 0,
            bandwidthUsedUp: 0,
            usageCount: 0,
          },
        });

        createdTokens.push(wifiToken);
      }

      return createdTokens;
    });

    console.log(`Successfully created ${result.length} tokens in bulk`);

    return NextResponse.json({
      success: true,
      tokensCreated: result.length,
      requested: quantity,
      tokens: result.map(token => ({
        id: token.id,
        token: token.token,
        businessId: token.businessId,
      })),
    });

  } catch (error: any) {
    console.error('Bulk token creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create bulk WiFi tokens',
        details: error.message,
      },
      { status: 500 }
    );
  }
}