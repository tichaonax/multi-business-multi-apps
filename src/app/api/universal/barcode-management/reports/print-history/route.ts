import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/universal/barcode-management/reports/print-history
 * Generate print history report with filtering by date, business, template, status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const templateId = searchParams.get('templateId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json'; // json or csv

    // Check permissions
    const hasPermission = await prisma.userPermissions.findFirst({
      where: {
        userId: session.user.id,
        granted: true,
        permission: {
          name: {
            in: ['BARCODE_VIEW_REPORTS', 'BARCODE_MANAGE_TEMPLATES'],
          },
        },
      },
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. You need BARCODE_VIEW_REPORTS permission.' },
        { status: 403 }
      );
    }

    // Get user's accessible businesses
    const userBusinesses = await prisma.userBusinessRole.findMany({
      where: { userId: session.user.id },
      select: { businessId: true },
    });

    const accessibleBusinessIds = userBusinesses.map((ubr) => ubr.businessId);

    if (accessibleBusinessIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalJobs: 0,
          totalQuantityRequested: 0,
          totalQuantityPrinted: 0,
          successRate: 0,
          byStatus: {},
        },
        jobs: [],
      });
    }

    // Build where clause
    const where: any = {
      businessId: { in: accessibleBusinessIds },
    };

    if (businessId && accessibleBusinessIds.includes(businessId)) {
      where.businessId = businessId;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch print jobs for the report
    const jobs = await prisma.barcodePrintJobs.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            symbology: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        printer: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary statistics
    const totalJobs = jobs.length;
    const totalQuantityRequested = jobs.reduce((sum, job) => sum + job.requestedQuantity, 0);
    const totalQuantityPrinted = jobs.reduce((sum, job) => sum + job.printedQuantity, 0);
    const completedJobs = jobs.filter((job) => job.status === 'COMPLETED').length;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Group by status
    const byStatus = jobs.reduce((acc: any, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});

    const summary = {
      totalJobs,
      totalQuantityRequested,
      totalQuantityPrinted,
      successRate: Math.round(successRate * 100) / 100,
      byStatus,
    };

    // If CSV format requested
    if (format === 'csv') {
      const csvHeader = 'Job ID,Created,Business,Template,Item Type,Item Name,Status,Requested,Printed,Created By\n';
      const csvRows = jobs.map((job) => {
        return [
          job.id,
          job.createdAt.toISOString(),
          job.business.name,
          job.template.name,
          job.itemType || '',
          job.itemName || '',
          job.status,
          job.requestedQuantity,
          job.printedQuantity,
          job.createdBy?.name || '',
        ]
          .map((field) => `"${field}"`)
          .join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="print-history-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json({
      summary,
      jobs,
    });
  } catch (error) {
    console.error('Error generating print history report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
