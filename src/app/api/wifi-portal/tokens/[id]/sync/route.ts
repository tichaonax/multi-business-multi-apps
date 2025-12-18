import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPortalClient, PortalAPIError } from '@/lib/wifi-portal/api-client';

/**
 * POST /api/wifi-portal/tokens/[id]/sync
 * Sync WiFi token usage statistics from ESP32 portal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get token
    const token = await prisma.wifiTokens.findUnique({
      where: { id: id },
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

    // Check if token is already EXPIRED or DISABLED - don't attempt sync
    if (token.status === 'EXPIRED' || token.status === 'DISABLED') {
      return NextResponse.json(
        {
          error: `Token is ${token.status} - sync not allowed`,
          tokenStatus: token.status,
          message: `This token is ${token.status.toLowerCase()} and cannot be synced with the portal.`,
        },
        { status: 400 }
      );
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

    // Get portal integration
    const integration = token.businesses.portal_integrations;
    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: 'Portal integration not available or inactive' },
        { status: 400 }
      );
    }

    // Fetch token info from ESP32 API
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
      retries: 3,
    });

    let tokenInfo;
    try {
      tokenInfo = await portalClient.getTokenInfo({
        token: token.token,
      });

      // LOG RAW ESP32 RESPONSE
      console.log('=== ESP32 INDIVIDUAL SYNC RAW RESPONSE ===')
      console.log('Request token:', token.token)
      console.log('Response:', JSON.stringify(tokenInfo, null, 2))
      console.log('==========================================')

      if (!tokenInfo.success) {
        // Check if token was not found on ESP32 (never synced or removed)
        if (tokenInfo.error?.toLowerCase().includes('token not found') ||
            tokenInfo.error?.toLowerCase().includes('not found')) {
          // Differentiate based on current status:
          // - ACTIVE tokens that go missing were in use, so mark as EXPIRED
          // - UNUSED tokens that go missing may never have been synced, so mark as DISABLED
          const newStatus = token.status === 'ACTIVE' ? 'EXPIRED' : 'DISABLED'

          await prisma.wifiTokens.update({
            where: { id: id },
            data: {
              status: newStatus,
              lastSyncedAt: new Date(),
            },
          });

          // Return error to UI but with context that token was marked accordingly
          return NextResponse.json({
            error: `Token not found on ESP32 Portal - marked as ${newStatus}`,
            tokenStatus: newStatus,
            message: newStatus === 'EXPIRED'
              ? 'This token was in use but has been removed from the ESP32 Portal and marked as expired.'
              : 'This token does not exist on the ESP32 Portal and has been marked as disabled.',
          }, { status: 404 });
        }

        throw new Error(tokenInfo.error || 'Failed to get token info from portal');
      }
    } catch (error: any) {
      console.error('ESP32 token info fetch error:', error);

      // Check if the error indicates token not found (similar to batch sync behavior)
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('token not found') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('404') ||
          errorMessage.includes('invalid json response') ||
          (error instanceof PortalAPIError && error.statusCode === 404)) {
        // Differentiate based on current status:
        // - ACTIVE tokens that go missing were in use, so mark as EXPIRED
        // - UNUSED tokens that go missing may never have been synced, so mark as DISABLED
        const newStatus = token.status === 'ACTIVE' ? 'EXPIRED' : 'DISABLED'

        await prisma.wifiTokens.update({
          where: { id: id },
          data: {
            status: newStatus,
            lastSyncedAt: new Date(),
          },
        });

        // Return error to UI but with context that token was marked accordingly
        return NextResponse.json({
          error: `Token not found on ESP32 Portal - marked as ${newStatus}`,
          tokenStatus: newStatus,
          message: newStatus === 'EXPIRED'
            ? 'This token was in use but has been removed from the ESP32 Portal and marked as expired.'
            : 'This token does not exist on the ESP32 Portal and has been marked as disabled.',
        }, { status: 404 });
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch token info from portal server',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Prepare update data
    const updateData: any = {
      lastSyncedAt: new Date(),
    };

    console.log('ESP32 tokenInfo fields:', {
      status: tokenInfo.status,
      bandwidthUsedDown: tokenInfo.bandwidthUsedDown,
      bandwidthUsedUp: tokenInfo.bandwidthUsedUp,
      usageCount: tokenInfo.usageCount,
      hostname: tokenInfo.hostname,
      deviceType: tokenInfo.deviceType,
      firstSeen: tokenInfo.firstSeen,
      lastSeen: tokenInfo.lastSeen,
      deviceCount: tokenInfo.deviceCount,
      firstUsedAt: tokenInfo.firstUsedAt,
      expiresAt: tokenInfo.expiresAt,
      created: tokenInfo.created,
    })

    // Update bandwidth usage if available
    if (tokenInfo.bandwidthUsedDown !== undefined) {
      updateData.bandwidthUsedDown = tokenInfo.bandwidthUsedDown;
    }
    if (tokenInfo.bandwidthUsedUp !== undefined) {
      updateData.bandwidthUsedUp = tokenInfo.bandwidthUsedUp;
    }

    // Update usage count if available
    if (tokenInfo.usageCount !== undefined) {
      updateData.usageCount = tokenInfo.usageCount;
    }

    // Update device tracking fields (v3.4)
    if (tokenInfo.hostname !== undefined) {
      updateData.hostname = tokenInfo.hostname;
    }
    if (tokenInfo.deviceType !== undefined) {
      updateData.deviceType = tokenInfo.deviceType;
    }
    if (tokenInfo.firstSeen !== undefined) {
      updateData.firstSeen = new Date(tokenInfo.firstSeen * 1000);
    }
    if (tokenInfo.lastSeen !== undefined) {
      updateData.lastSeen = new Date(tokenInfo.lastSeen * 1000);
    }
    if (tokenInfo.deviceCount !== undefined) {
      updateData.deviceCount = tokenInfo.deviceCount;
    }
    if (tokenInfo.devices && tokenInfo.devices.length > 0) {
      updateData.primaryMac = tokenInfo.devices[0].mac;
    }

    // Update first used timestamp if available and not already set
    if (tokenInfo.firstUsedAt && !token.firstUsedAt) {
      updateData.firstUsedAt = new Date(tokenInfo.firstUsedAt);

      // Calculate expiration date based on first use + duration
      const tokenConfig = await prisma.tokenConfigurations.findUnique({
        where: { id: token.tokenConfigId },
        select: { durationMinutes: true },
      });

      if (tokenConfig) {
        updateData.expiresAt = new Date(new Date(tokenInfo.firstUsedAt).getTime() + tokenConfig.durationMinutes * 60 * 1000);
      }
    }

    // Update status based on portal response
    if (tokenInfo.status) {
      // Map portal status values to Prisma enum values
      const statusMap: Record<string, 'ACTIVE' | 'UNUSED' | 'EXPIRED' | 'DISABLED'> = {
        'active': 'ACTIVE',
        'expired': 'EXPIRED',
        'unused': 'UNUSED',
      };

      // Convert to lowercase for mapping (API client returns uppercase)
      const newStatus = statusMap[tokenInfo.status.toLowerCase()] || 'ACTIVE';

      // CRITICAL RULE: UNUSED tokens can NEVER become EXPIRED
      // Expiration ONLY applies to tokens that have been redeemed (ACTIVE → EXPIRED)
      // If ESP32 says "expired" but token was never used, mark as DISABLED instead
      if (newStatus === 'EXPIRED' && !token.firstUsedAt && !tokenInfo.firstUsedAt) {
        // Token expired before ever being used - mark as DISABLED
        updateData.status = 'DISABLED';
      } else {
        updateData.status = newStatus;
      }
    } else {
      // Determine status from expiration if portal doesn't provide status
      // Only ACTIVE tokens can expire (tokens that have been redeemed)
      const now = new Date();
      const expiresAt = new Date(token.expiresAt);
      if (now > expiresAt && token.status === 'ACTIVE') {
        updateData.status = 'EXPIRED';
      }
    }

    // Update token in database
    console.log('Updating database with:', JSON.stringify(updateData, null, 2))

    const updatedToken = await prisma.wifiTokens.update({
      where: { id: id },
      data: updateData,
    });

    console.log('Database updated. Token status:', updatedToken.status)

    // Update or create device records (v3.4)
    if (tokenInfo.devices && tokenInfo.devices.length > 0) {
      await Promise.all(
        tokenInfo.devices.map(async (device) => {
          await prisma.wifiTokenDevices.upsert({
            where: {
              wifiTokenId_macAddress: {
                wifiTokenId: id,
                macAddress: device.mac,
              },
            },
            create: {
              wifiTokenId: id,
              macAddress: device.mac,
              isOnline: device.online,
              currentIp: device.currentIp || null,
              firstSeen: new Date(),
              lastSeen: new Date(),
            },
            update: {
              isOnline: device.online,
              currentIp: device.currentIp || null,
              lastSeen: new Date(),
            },
          })
        })
      )
    }

    // Calculate bandwidth remaining
    const bandwidthRemainingDown =
      tokenInfo.bandwidthDownMb !== undefined
        ? tokenInfo.bandwidthDownMb - (Number(updatedToken.bandwidthUsedDown) || 0)
        : null;

    const bandwidthRemainingUp =
      tokenInfo.bandwidthUpMb !== undefined
        ? tokenInfo.bandwidthUpMb - (Number(updatedToken.bandwidthUsedUp) || 0)
        : null;

    return NextResponse.json({
      success: true,
      message: 'Token usage synced successfully',
      token: {
        id: updatedToken.id,
        token: updatedToken.token,
        status: updatedToken.status,
        expiresAt: updatedToken.expiresAt,
        bandwidthUsedDown: updatedToken.bandwidthUsedDown,
        bandwidthUsedUp: updatedToken.bandwidthUsedUp,
        usageCount: updatedToken.usageCount,
        firstUsedAt: updatedToken.firstUsedAt,
        lastSyncedAt: updatedToken.lastSyncedAt,
      },
      portalInfo: {
        status: tokenInfo.status,
        createdAt: tokenInfo.createdAt,
        expiresAt: tokenInfo.expiresAt,
        bandwidthDownMb: tokenInfo.bandwidthDownMb,
        bandwidthUpMb: tokenInfo.bandwidthUpMb,
        bandwidthRemainingDown,
        bandwidthRemainingUp,
      },
    });
  } catch (error: any) {
    console.error('WiFi token sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync WiFi token usage', details: error.message },
      { status: 500 }
    );
  }
}
