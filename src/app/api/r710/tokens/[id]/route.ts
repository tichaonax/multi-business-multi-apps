/**
 * R710 Token Detail API
 *
 * Get details for a specific WiFi token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tokenId } = await params;

    // Fetch token with full details
    const token = await prisma.r710Tokens.findUnique({
      where: { id: tokenId },
      include: {
        r710_token_configs: {
          select: {
            id: true,
            name: true,
            description: true,
            durationValue: true,
            durationUnit: true,
            deviceLimit: true,
            basePrice: true
          }
        },
        r710_wlans: {
          select: {
            id: true,
            ssid: true,
            wlanId: true,
            device_registry: {
              select: {
                ipAddress: true,
                description: true
              }
            }
          }
        },
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const user = session.user as SessionUser;

    // Check user has access to this business (admin OR has membership)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.BusinessMemberships.findFirst({
        where: {
          businessId: token.businessId,
          userId: session.user.id
        }
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this token' },
          { status: 403 }
        );
      }
    }

    // Format response
    const formattedToken = {
      id: token.id,
      username: token.username,
      password: token.password,
      status: token.status,
      validTimeSeconds: token.validTimeSeconds,
      expiresAt: token.expiresAtR710,
      firstUsedAt: token.firstUsedAt,
      soldAt: token.soldAt,
      salePrice: token.salePrice,
      connectedMac: token.connectedMac,
      createdAt: token.createdAt,
      createdAtR710: token.createdAtR710,
      lastSyncedAt: token.lastSyncedAt,
      tokenConfig: token.r710_token_configs,
      wlan: token.r710_wlans,
      business: token.businesses
    };

    return NextResponse.json({
      token: formattedToken
    });

  } catch (error) {
    console.error('[R710 Token Detail] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token details' },
      { status: 500 }
    );
  }
}
