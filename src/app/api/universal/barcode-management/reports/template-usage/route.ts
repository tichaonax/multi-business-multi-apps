import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/universal/barcode-management/reports/template-usage
 * Generate template usage report showing which templates are most used
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';

    // Check permissions
    const hasPermission = await prisma.userPermissions.findFirst({
      where: {
        userId: user.id,
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
      where: { userId: user.id },
      select: { businessId: true },
    });

    const accessibleBusinessIds = userBusinesses.map((ubr) => ubr.businessId);

    if (accessibleBusinessIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalTemplates: 0,
          totalPrintJobs: 0,
          mostUsedTemplate: null,
        },
        templates: [],
      });
    }

    // Build where clause for templates
    const templateWhere: any = {
      businessId: { in: accessibleBusinessIds },
    };

    if (businessId && accessibleBusinessIds.includes(businessId)) {
      templateWhere.businessId = businessId;
    }

    // Build where clause for print jobs (for date filtering)
    const printJobWhere: any = {};
    if (startDate || endDate) {
      printJobWhere.createdAt = {};
      if (startDate) {
        printJobWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        printJobWhere.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch templates with usage statistics
    const templates = await prisma.barcodeTemplates.findMany({
      where: templateWhere,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            printJobs: true,
            inventoryItems: true,
          },
        },
        printJobs: {
          where: printJobWhere,
          select: {
            id: true,
            status: true,
            requestedQuantity: true,
            printedQuantity: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate usage statistics for each template
    const templateStats = templates.map((template) => {
      const jobs = template.printJobs;
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;
      const failedJobs = jobs.filter((j) => j.status === 'FAILED').length;
      const totalQuantityRequested = jobs.reduce((sum, j) => sum + j.requestedQuantity, 0);
      const totalQuantityPrinted = jobs.reduce((sum, j) => sum + j.printedQuantity, 0);

      return {
        template: {
          id: template.id,
          name: template.name,
          symbology: template.symbology,
          type: template.type,
          business: template.business,
          createdBy: template.createdBy,
          createdAt: template.createdAt,
        },
        usage: {
          totalPrintJobs: totalJobs,
          completedJobs,
          failedJobs,
          inventoryItemsLinked: template._count.inventoryItems,
          totalQuantityRequested,
          totalQuantityPrinted,
          successRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100 * 100) / 100 : 0,
        },
      };
    });

    // Sort by total print jobs (most used first)
    templateStats.sort((a, b) => b.usage.totalPrintJobs - a.usage.totalPrintJobs);

    // Calculate summary
    const totalTemplates = templates.length;
    const totalPrintJobs = templateStats.reduce((sum, t) => sum + t.usage.totalPrintJobs, 0);
    const mostUsedTemplate = templateStats.length > 0 ? templateStats[0].template : null;

    const summary = {
      totalTemplates,
      totalPrintJobs,
      mostUsedTemplate,
    };

    // If CSV format requested
    if (format === 'csv') {
      const csvHeader = 'Template ID,Template Name,Business,Symbology,Type,Total Jobs,Completed,Failed,Qty Requested,Qty Printed,Success Rate %,Inventory Linked\n';
      const csvRows = templateStats.map((stat) => {
        return [
          stat.template.id,
          stat.template.name,
          stat.template.business.name,
          stat.template.symbology,
          stat.template.type,
          stat.usage.totalPrintJobs,
          stat.usage.completedJobs,
          stat.usage.failedJobs,
          stat.usage.totalQuantityRequested,
          stat.usage.totalQuantityPrinted,
          stat.usage.successRate,
          stat.usage.inventoryItemsLinked,
        ]
          .map((field) => `"${field}"`)
          .join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="template-usage-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json({
      summary,
      templates: templateStats,
    });
  } catch (error) {
    console.error('Error generating template usage report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
