/**
 * R710 WiFi Token Analytics API
 *
 * Fetch analytics data including package performance and revenue trends
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const dateRange = searchParams.get('dateRange'); // 'week', 'month', 'all'

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Check user has access to this business
    const membership = await prisma.userBusinessMemberships.findFirst({
      where: {
        businessId: businessId,
        userId: user.id
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Fetch all sold tokens for this business in the date range
    const soldTokens = await prisma.r710Tokens.findMany({
      where: {
        businessId: businessId,
        soldAt: {
          not: null,
          gte: startDate
        }
      },
      include: {
        token_config: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        soldAt: 'asc'
      }
    });

    // Calculate package performance
    const packageMap = new Map<string, { totalSales: number; totalRevenue: number; activatedCount: number }>();

    soldTokens.forEach(token => {
      const pkgName = token.token_config.name;
      if (!packageMap.has(pkgName)) {
        packageMap.set(pkgName, { totalSales: 0, totalRevenue: 0, activatedCount: 0 });
      }
      const pkg = packageMap.get(pkgName)!;
      pkg.totalSales++;
      pkg.totalRevenue += token.salePrice || 0;
      if (token.firstUsedAt) pkg.activatedCount++;
    });

    const packagePerformance = Array.from(packageMap.entries())
      .map(([packageName, data]) => ({
        packageName,
        totalSales: data.totalSales,
        totalRevenue: data.totalRevenue,
        activationRate: data.totalSales > 0 ? (data.activatedCount / data.totalSales) * 100 : 0,
        averagePrice: data.totalSales > 0 ? data.totalRevenue / data.totalSales : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate daily revenue
    const dailyMap = new Map<string, { sales: number; revenue: number }>();

    soldTokens.forEach(token => {
      if (!token.soldAt) return;
      const dateKey = new Date(token.soldAt).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { sales: 0, revenue: 0 });
      }
      const day = dailyMap.get(dateKey)!;
      day.sales++;
      day.revenue += token.salePrice || 0;
    });

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: data.revenue
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate top metrics
    const bestSellingPackage = packagePerformance.length > 0 ? packagePerformance[0].packageName : null;
    const highestRevenuePackage = packagePerformance.length > 0
      ? packagePerformance.reduce((max, pkg) => pkg.totalRevenue > max.totalRevenue ? pkg : max, packagePerformance[0]).packageName
      : null;
    const bestActivationRate = packagePerformance.length > 0
      ? packagePerformance.reduce((max, pkg) => pkg.activationRate > max.activationRate ? pkg : max, packagePerformance[0]).packageName
      : null;
    const peakSalesDay = dailyRevenue.length > 0
      ? dailyRevenue.reduce((max, day) => day.sales > max.sales ? day : max, dailyRevenue[0]).date
      : null;

    // Calculate summary
    const totalSales = soldTokens.length;
    const totalRevenue = soldTokens.reduce((sum, token) => sum + (token.salePrice || 0), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const activatedCount = soldTokens.filter(t => t.firstUsedAt !== null).length;
    const overallActivationRate = totalSales > 0 ? (activatedCount / totalSales) * 100 : 0;

    return NextResponse.json({
      packagePerformance,
      dailyRevenue,
      topMetrics: {
        bestSellingPackage,
        highestRevenuePackage,
        bestActivationRate,
        peakSalesDay: peakSalesDay ? new Date(peakSalesDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
      },
      summary: {
        totalSales,
        totalRevenue,
        averageOrderValue,
        overallActivationRate
      }
    });

  } catch (error) {
    console.error('[R710 Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
