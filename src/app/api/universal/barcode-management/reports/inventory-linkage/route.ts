import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/universal/barcode-management/reports/inventory-linkage
 * Generate inventory linkage report showing templates linked to inventory items
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const templateId = searchParams.get('templateId');
    const isActive = searchParams.get('isActive');
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
          templatesWithLinkages: 0,
          totalInventoryItems: 0,
          activeInventoryItems: 0,
          linkageRate: 0,
        },
        linkages: [],
      });
    }

    // Build where clause for templates
    const templateWhere: any = {
      businessId: { in: accessibleBusinessIds },
    };

    if (businessId && accessibleBusinessIds.includes(businessId)) {
      templateWhere.businessId = businessId;
    }

    if (templateId) {
      templateWhere.id = templateId;
    }

    // Fetch all templates
    const allTemplates = await prisma.barcodeTemplates.findMany({
      where: templateWhere,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
    });

    // Build where clause for inventory items
    const inventoryWhere: any = {
      template: templateWhere,
    };

    if (isActive !== null && isActive !== undefined) {
      inventoryWhere.isActive = isActive === 'true';
    }

    // Fetch inventory linkages
    const inventoryItems = await prisma.barcodeInventoryItems.findMany({
      where: inventoryWhere,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            symbology: true,
            type: true,
            businessId: true,
            business: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary statistics
    const totalTemplates = allTemplates.length;
    const templatesWithLinkages = allTemplates.filter((t) => t._count.inventoryItems > 0).length;
    const totalInventoryItems = inventoryItems.length;
    const activeInventoryItems = inventoryItems.filter((item) => item.isActive).length;
    const linkageRate = totalTemplates > 0 ? (templatesWithLinkages / totalTemplates) * 100 : 0;

    const summary = {
      totalTemplates,
      templatesWithLinkages,
      totalInventoryItems,
      activeInventoryItems,
      linkageRate: Math.round(linkageRate * 100) / 100,
    };

    // Prepare linkage data
    const linkages = inventoryItems.map((item) => ({
      id: item.id,
      template: item.template,
      inventoryItemId: item.inventoryItemId,
      barcodeData: item.barcodeData,
      customLabel: item.customLabel,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      quantity: item.quantity,
      isActive: item.isActive,
      printJobsCount: item._count.printJobs,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
    }));

    // If CSV format requested
    if (format === 'csv') {
      const csvHeader = 'Template Name,Business,Symbology,Type,Inventory Item ID,Barcode Data,Custom Label,Batch Number,Expiry Date,Quantity,Is Active,Print Jobs Count,Created By,Created At\n';
      const csvRows = linkages.map((linkage) => {
        return [
          linkage.template.name,
          linkage.template.business.name,
          linkage.template.symbology,
          linkage.template.type,
          linkage.inventoryItemId,
          linkage.barcodeData || '',
          linkage.customLabel || '',
          linkage.batchNumber || '',
          linkage.expiryDate ? linkage.expiryDate.toISOString() : '',
          linkage.quantity,
          linkage.isActive ? 'Yes' : 'No',
          linkage.printJobsCount,
          linkage.createdBy?.name || '',
          linkage.createdAt.toISOString(),
        ]
          .map((field) => `"${field}"`)
          .join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="inventory-linkage-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Return JSON format
    return NextResponse.json({
      summary,
      linkages,
    });
  } catch (error) {
    console.error('Error generating inventory linkage report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
