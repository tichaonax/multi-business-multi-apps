/**
 * Business R710 Integration Status API
 *
 * Get comprehensive integration status for a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/business/[businessId]/r710-integration
 *
 * Get R710 integration status for a business
 *
 * Returns:
 * - Integration existence
 * - Device information
 * - WLAN information
 * - Token inventory summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user has access to this business
    const membership = await prisma.businessMemberships.findFirst({
      where: {
        businessId: params.businessId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
      );
    }

    // Get integration
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: { businessId: params.businessId },
      include: {
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            model: true,
            firmwareVersion: true,
            connectionStatus: true,
            lastHealthCheck: true,
            lastConnectedAt: true
          }
        }
      }
    });

    if (!integration) {
      return NextResponse.json({
        hasIntegration: false,
        message: 'No R710 integration found for this business'
      });
    }

    // Get WLANs
    const wlans = await prisma.r710Wlans.findMany({
      where: {
        businessId: params.businessId,
        deviceRegistryId: integration.deviceRegistryId
      },
      select: {
        id: true,
        wlanId: true,
        ssid: true,
        vlanId: true,
        guestServiceId: true,
        isActive: true,
        createdAt: true
      }
    });

    // Get token inventory summary
    const tokenStats = await prisma.r710Tokens.groupBy({
      by: ['status'],
      where: { businessId: params.businessId },
      _count: {
        status: true
      }
    });

    const inventory = {
      available: 0,
      sold: 0,
      active: 0,
      expired: 0,
      invalidated: 0,
      total: 0
    };

    tokenStats.forEach(stat => {
      const count = stat._count.status;
      inventory.total += count;

      switch (stat.status) {
        case 'AVAILABLE':
          inventory.available = count;
          break;
        case 'SOLD':
          inventory.sold = count;
          break;
        case 'ACTIVE':
          inventory.active = count;
          break;
        case 'EXPIRED':
          inventory.expired = count;
          break;
        case 'INVALIDATED':
          inventory.invalidated = count;
          break;
      }
    });

    // Get token configurations with inventory counts
    const configs = await prisma.r710TokenConfigs.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        bandwidthDownMb: true,
        bandwidthUpMb: true,
        basePrice: true,
        _count: {
          select: {
            r710_tokens: {
              where: {
                businessId: params.businessId,
                status: 'AVAILABLE'
              }
            }
          }
        }
      }
    });

    const tokenConfigInventory = configs.map(config => ({
      configId: config.id,
      name: config.name,
      description: config.description,
      durationMinutes: config.durationMinutes,
      bandwidthDownMb: config.bandwidthDownMb,
      bandwidthUpMb: config.bandwidthUpMb,
      basePrice: config.basePrice,
      availableTokens: config._count.r710_tokens
    }));

    // Get sales statistics
    const salesStats = await prisma.r710TokenSales.aggregate({
      where: { businessId: params.businessId },
      _count: {
        id: true
      },
      _sum: {
        saleAmount: true
      }
    });

    return NextResponse.json({
      hasIntegration: true,
      integration: {
        id: integration.id,
        businessId: integration.businessId,
        isActive: integration.isActive,
        createdAt: integration.createdAt
      },
      device: integration.device_registry,
      wlans,
      tokenInventory: {
        summary: inventory,
        byConfig: tokenConfigInventory
      },
      sales: {
        totalSales: salesStats._count.id,
        totalRevenue: salesStats._sum.saleAmount || 0
      }
    });

  } catch (error) {
    console.error('[R710 Integration Status] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
