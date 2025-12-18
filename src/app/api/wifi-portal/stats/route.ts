import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/wifi-portal/stats?businessId=xxx&startDate=...&endDate=...
 * Get WiFi portal statistics and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Check permission - admins have access to all businesses
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    let businessInfo;

    // Check if user has access to this business (admins skip this check)
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
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

      businessInfo = membership.businesses;
    } else {
      // For admins, get business info directly
      businessInfo = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      if (!businessInfo) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
    }

    // Date range for filtering
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Parallel queries for all stats
    const [
      totalTokens,
      unusedTokens,
      activeTokens,
      expiredTokens,
      disabledTokens,
      totalSales,
      salesByPaymentMethod,
      tokensByConfig,
      recentSales,
      bandwidthStats,
    ] = await Promise.all([
      // Total tokens created
      prisma.wifiTokens.count({
        where: {
          businessId: businessId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Unused tokens (available for sale)
      prisma.wifiTokens.count({
        where: {
          businessId: businessId,
          status: 'UNUSED',
        },
      }),

      // Active tokens
      prisma.wifiTokens.count({
        where: {
          businessId: businessId,
          status: 'ACTIVE',
        },
      }),

      // Expired tokens
      prisma.wifiTokens.count({
        where: {
          businessId: businessId,
          status: 'EXPIRED',
        },
      }),

      // Disabled tokens
      prisma.wifiTokens.count({
        where: {
          businessId: businessId,
          status: 'DISABLED',
        },
      }),

      // Total sales (revenue and count)
      prisma.wifiTokenSales.aggregate({
        where: {
          businessId: businessId,
          ...(Object.keys(dateFilter).length > 0 && { soldAt: dateFilter }),
        },
        _sum: {
          saleAmount: true,
        },
        _count: true,
      }),

      // Sales by payment method
      prisma.wifiTokenSales.groupBy({
        by: ['paymentMethod'],
        where: {
          businessId: businessId,
          ...(Object.keys(dateFilter).length > 0 && { soldAt: dateFilter }),
        },
        _sum: {
          saleAmount: true,
        },
        _count: true,
      }),

      // Tokens by configuration
      prisma.wifiTokens.groupBy({
        by: ['tokenConfigId'],
        where: {
          businessId: businessId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: true,
      }),

      // Recent sales (last 10)
      prisma.wifiTokenSales.findMany({
        where: {
          businessId: businessId,
        },
        include: {
          wifi_tokens: {
            select: {
              token: true,
              token_configurations: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { soldAt: 'desc' },
        take: 10,
      }),

      // Bandwidth usage statistics
      prisma.wifiTokens.aggregate({
        where: {
          businessId: businessId,
          status: {
            in: ['ACTIVE', 'EXPIRED'],
          },
        },
        _sum: {
          bandwidthUsedDown: true,
          bandwidthUsedUp: true,
        },
        _avg: {
          bandwidthUsedDown: true,
          bandwidthUsedUp: true,
        },
      }),
    ]);

    // Enrich tokens by config with configuration details
    const tokenConfigIds = tokensByConfig.map((t) => t.tokenConfigId);
    const tokenConfigs = await prisma.tokenConfigurations.findMany({
      where: {
        id: {
          in: tokenConfigIds,
        },
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
      },
    });

    const tokenConfigMap = Object.fromEntries(tokenConfigs.map((c) => [c.id, c]));

    const tokensByConfigWithDetails = tokensByConfig.map((t) => ({
      tokenConfig: tokenConfigMap[t.tokenConfigId],
      count: t._count,
    }));

    // Calculate daily trends (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [tokensCreated, salesCount, salesRevenue] = await Promise.all([
        prisma.wifiTokens.count({
          where: {
            businessId: businessId,
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),

        prisma.wifiTokenSales.count({
          where: {
            businessId: businessId,
            soldAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),

        prisma.wifiTokenSales.aggregate({
          where: {
            businessId: businessId,
            soldAt: {
              gte: date,
              lt: nextDate,
            },
          },
          _sum: {
            saleAmount: true,
          },
        }),
      ]);

      last7Days.push({
        date: date.toISOString().split('T')[0],
        tokensCreated,
        salesCount,
        revenue: salesRevenue._sum.saleAmount || 0,
      });
    }

    // Build response
    const stats = {
      business: {
        id: businessInfo.id,
        name: businessInfo.name,
        type: businessInfo.type,
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalTokensCreated: totalTokens,
        unusedTokens: unusedTokens,
        activeTokens: activeTokens,
        expiredTokens: expiredTokens,
        disabledTokens: disabledTokens,
        totalSales: totalSales._count,
        totalRevenue: totalSales._sum.saleAmount || 0,
        averageSaleAmount:
          totalSales._count > 0
            ? Number(totalSales._sum.saleAmount || 0) / totalSales._count
            : 0,
      },
      salesByPaymentMethod: salesByPaymentMethod.map((pm) => ({
        paymentMethod: pm.paymentMethod,
        count: pm._count,
        totalAmount: pm._sum.saleAmount || 0,
      })),
      tokensByConfiguration: tokensByConfigWithDetails.sort((a, b) => b.count - a.count),
      bandwidthUsage: {
        totalDownloadMb: bandwidthStats._sum.bandwidthUsedDown || 0,
        totalUploadMb: bandwidthStats._sum.bandwidthUsedUp || 0,
        averageDownloadMb: bandwidthStats._avg.bandwidthUsedDown || 0,
        averageUploadMb: bandwidthStats._avg.bandwidthUsedUp || 0,
      },
      dailyTrends: last7Days,
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        token: sale.wifi_tokens.token,
        tokenConfig: sale.wifi_tokens.token_configurations.name,
        saleAmount: sale.saleAmount,
        paymentMethod: sale.paymentMethod,
        soldAt: sale.soldAt,
      })),
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('WiFi portal stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WiFi portal statistics', details: error.message },
      { status: 500 }
    );
  }
}
