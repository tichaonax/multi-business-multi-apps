/**
 * R710 WiFi Token Sales API
 *
 * Fetch token sales history and analytics
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const dateRange = searchParams.get('dateRange'); // 'today', 'week', 'month', 'all'
    const activated = searchParams.get('activated'); // 'true', 'false', null

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }


    // Check if user has access to this business (admins have access to all businesses)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: user.id,
          isActive: true
        }
      });

      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 });
      }
    }

    // Build where clause for sold tokens
    const whereClause: any = {
      businessId: businessId,
      status: {
        in: ['SOLD', 'ACTIVE', 'EXPIRED']
      },
      soldAt: {
        not: null
      }
    };

    // Apply date range filter
    if (dateRange) {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      whereClause.soldAt = {
        ...whereClause.soldAt,
        gte: startDate
      };
    }

    // Apply activation filter
    if (activated !== null) {
      if (activated === 'true') {
        whereClause.firstUsedAt = { not: null };
      } else if (activated === 'false') {
        whereClause.firstUsedAt = null;
      }
    }

    // Fetch sales
    const sales = await prisma.r710Tokens.findMany({
      where: whereClause,
      include: {
        token_config: {
          select: {
            name: true,
            durationMinutes: true
          }
        },
        wlan: {
          select: {
            ssid: true
          }
        }
      },
      orderBy: {
        soldAt: 'desc'
      },
      take: 500 // Limit to 500 sales
    });

    // Calculate statistics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // All-time stats
    const allSales = await prisma.r710Tokens.findMany({
      where: {
        businessId: businessId,
        soldAt: { not: null }
      },
      select: {
        salePrice: true,
        firstUsedAt: true,
        soldAt: true
      }
    });

    const totalSales = allSales.length;
    const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
    const averagePrice = totalSales > 0 ? totalRevenue / totalSales : 0;
    const activatedCount = allSales.filter(s => s.firstUsedAt !== null).length;
    const activationRate = totalSales > 0 ? (activatedCount / totalSales) * 100 : 0;

    // Today stats
    const todaySales = allSales.filter(s => s.soldAt && new Date(s.soldAt) >= todayStart);
    const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);

    // Last 7 days stats
    const last7DaysSalesData = allSales.filter(s => s.soldAt && new Date(s.soldAt) >= last7Days);
    const last7DaysRevenue = last7DaysSalesData.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);

    // Last 30 days stats
    const last30DaysSalesData = allSales.filter(s => s.soldAt && new Date(s.soldAt) >= last30Days);
    const last30DaysRevenue = last30DaysSalesData.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);

    const stats = {
      totalSales,
      totalRevenue,
      averagePrice,
      activatedCount,
      activationRate,
      todaySales: todaySales.length,
      todayRevenue,
      last7DaysSales: last7DaysSalesData.length,
      last7DaysRevenue,
      last30DaysSales: last30DaysSalesData.length,
      last30DaysRevenue
    };

    // Format sales response
    const formattedSales = sales.map(sale => ({
      id: sale.id,
      username: sale.username,
      password: sale.password,
      status: sale.status,
      salePrice: sale.salePrice,
      soldAt: sale.soldAt,
      activatedAt: sale.firstUsedAt,
      expiresAt: sale.expiresAt,
      tokenConfig: sale.token_config,
      wlan: sale.wlan
    }));

    return NextResponse.json({
      sales: formattedSales,
      stats: stats,
      count: sales.length
    });

  } catch (error) {
    console.error('[R710 Sales API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
}
