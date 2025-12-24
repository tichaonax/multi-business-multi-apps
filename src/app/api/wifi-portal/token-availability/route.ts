import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/wifi-portal/token-availability?businessId=xxx
 *
 * Unified endpoint for fetching available WiFi token quantities
 * Used by: WiFi Tokens Menu, Grocery POS, Restaurant POS
 *
 * Returns: { success: true, quantityMap: { tokenConfigId: count } }
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

    console.log('🔍 [Token Availability] Starting batched ESP32 sync for business:', businessId);

    // Step 1: Fetch ESP32 tokens in batches (20 tokens per request - ESP32 hardware limit)
    const BATCH_SIZE = 20;
    let offset = 0;
    let hasMore = true;
    const esp32TokenSet = new Set<string>();

    while (hasMore && offset < 1000) {
      try {
        const batchUrl = `/api/wifi-portal/esp32-tokens?businessId=${businessId}&status=unused&limit=${BATCH_SIZE}&offset=${offset}`;

        const batchResponse = await fetch(
          `${request.nextUrl.origin}${batchUrl}`,
          {
            headers: { Cookie: request.headers.get('cookie') || '' }
          }
        );

        if (!batchResponse.ok) {
          console.warn(`⚠️ Batch ${Math.floor(offset / BATCH_SIZE) + 1} failed, stopping`);
          break;
        }

        const batchData = await batchResponse.json();
        const batchTokens = batchData.tokens || [];

        console.log(`✅ Batch ${Math.floor(offset / BATCH_SIZE) + 1}: Received ${batchTokens.length} tokens`);

        batchTokens.forEach((t: any) => {
          if (t.token) esp32TokenSet.add(t.token);
        });

        hasMore = batchData.hasMore === true;
        offset += BATCH_SIZE;
      } catch (batchError: any) {
        console.error(`❌ Batch ${Math.floor(offset / BATCH_SIZE) + 1} error:`, batchError.message);
        break;
      }
    }

    console.log(`✅ ESP32 fetch complete. Total tokens: ${esp32TokenSet.size}`);

    // Step 2: Get database tokens (unsold only)
    const dbTokens = await prisma.wifiTokens.findMany({
      where: {
        businessId: businessId,
        status: 'UNUSED',
        wifi_token_sales: {
          none: {} // Exclude sold tokens
        }
      },
      select: {
        token: true,
        tokenConfigId: true,
      },
    });

    console.log(`📊 Database tokens (unsold): ${dbTokens.length}`);

    // Step 3: Cross-reference - only count tokens in BOTH ESP32 and database
    const quantityMap: Record<string, number> = {};
    let matchedCount = 0;

    dbTokens.forEach((dbToken) => {
      if (esp32TokenSet.has(dbToken.token)) {
        matchedCount++;
        const configId = dbToken.tokenConfigId;
        if (configId) {
          quantityMap[configId] = (quantityMap[configId] || 0) + 1;
        }
      }
    });

    console.log(`✅ Cross-reference complete. Matched: ${matchedCount}, Quantity map:`, quantityMap);

    return NextResponse.json({
      success: true,
      quantityMap,
      stats: {
        esp32Tokens: esp32TokenSet.size,
        databaseTokens: dbTokens.length,
        matchedTokens: matchedCount,
      }
    });

  } catch (error: any) {
    console.error('❌ Token availability fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token availability', details: error.message },
      { status: 500 }
    );
  }
}
