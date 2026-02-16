import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { createPortalClient } from '@/lib/wifi-portal/api-client';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/wifi-portal/esp32-tokens?businessId=xxx&status=unused&limit=500
 * Fetch token list directly from ESP32 portal hardware
 * CRITICAL: This returns the ACTUAL ESP32 state, not database records
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status') || 'unused'; // unused, active, expired, all
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Validate limit (CRITICAL: ESP32 hardware limit is 20 tokens per request)
    if (limit > 20) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 20 tokens per request (ESP32 hardware limit)' },
        { status: 400 }
      );
    }

    // Check permission - admins have access to all businesses
    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

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
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No portal integration found for this business' },
        { status: 404 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'Portal integration is disabled for this business' },
        { status: 403 }
      );
    }

    // Create ESP32 API client
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 15000, // 15 second timeout for ESP32 calls
      retries: 3,
    });

    console.log(`📡 Fetching ${status} tokens from ESP32 for business ${businessId} (offset: ${offset}, limit: ${limit})...`);

    // Call ESP32 /api/tokens/list endpoint with pagination
    const tokenListResponse = await portalClient.listTokens({
      businessId: businessId, // CRITICAL: Filter by business for multi-business ESP32 sharing
      status: status as 'unused' | 'active' | 'expired' | 'all',
      limit: limit,
      offset: offset,
    });

    if (!tokenListResponse.success) {
      throw new Error(tokenListResponse.error || 'Failed to fetch tokens from ESP32');
    }

    console.log(`✅ Fetched ${tokenListResponse.tokens.length} tokens from ESP32 (total: ${tokenListResponse.count}, hasMore: ${tokenListResponse.hasMore})`);

    return NextResponse.json({
      success: true,
      count: tokenListResponse.count,
      tokens: tokenListResponse.tokens,
      offset: tokenListResponse.offset,
      limit: tokenListResponse.limit,
      hasMore: tokenListResponse.hasMore,
      source: 'ESP32', // Indicate this is real-time ESP32 data
    });

  } catch (error: any) {
    console.error('❌ ESP32 token list fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tokens from ESP32 portal',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
