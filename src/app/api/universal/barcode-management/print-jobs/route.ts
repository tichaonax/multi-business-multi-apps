import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

// Validation schema for creating print jobs
const createPrintJobSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  itemType: z.enum(['INVENTORY_ITEM', 'PRODUCT', 'CUSTOM']),
  itemId: z.string().optional(), // Required for INVENTORY_ITEM and PRODUCT types
  customData: z.record(z.any()).optional(), // Required for CUSTOM type
  quantity: z.number().min(1).max(1000, 'Maximum 1000 labels per job'),
  printerId: z.string().optional(),
  userNotes: z.string().max(500).optional(),
});

/**
 * GET /api/universal/barcode-management/print-jobs
 * List print jobs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const user = session.user as SessionUser;

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
      // Check permissions
      const hasPermission = await prisma.userPermissions.findFirst({
        where: {
          userId: session.user.id,
          granted: true,
          permission: {
            name: {
              in: ['BARCODE_PRINT', 'BARCODE_MANAGE_TEMPLATES'],
            },
          },
        },
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions. You need BARCODE_PRINT permission.' },
          { status: 403 }
        );
      }
    }

    // Get user's accessible businesses
    let accessibleBusinessIds: string[] = [];

    if (isSystemAdmin(user)) {
      // System admins have access to all businesses
      const allBusinesses = await prisma.businesses.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      accessibleBusinessIds = allBusinesses.map(b => b.id);
    } else {
      const userBusinesses = await prisma.userBusinessRole.findMany({
        where: { userId: session.user.id },
        select: { businessId: true },
      });
      accessibleBusinessIds = userBusinesses.map((ubr) => ubr.businessId);
    }

    // Build where clause
    const where: any = {};

    // Filter by accessible businesses
    if (accessibleBusinessIds.length > 0) {
      where.businessId = { in: accessibleBusinessIds };
    } else {
      return NextResponse.json({
        printJobs: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    if (businessId && accessibleBusinessIds.includes(businessId)) {
      where.businessId = businessId;
    }

    if (status) {
      where.status = status;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    // Fetch print jobs
    const [printJobs, total] = await Promise.all([
      prisma.barcodePrintJobs.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              name: true,
              symbology: true,
              businessId: true,
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
              printerName: true,
              printerType: true,
              isOnline: true,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.barcodePrintJobs.count({ where }),
    ]);

    return NextResponse.json({
      printJobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching print jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/universal/barcode-management/print-jobs
 * Create a new print job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate using try-catch to handle zod module issues
    let validatedData;
    try {
      validatedData = createPrintJobSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation error',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      // If not a zod error, do basic manual validation
      const { templateId, itemType, quantity } = body;

      if (!templateId || typeof templateId !== 'string' || templateId.length === 0) {
        return NextResponse.json(
          { error: 'Validation error', details: [{ field: 'templateId', message: 'Template ID is required' }] },
          { status: 400 }
        );
      }

      if (!itemType || !['INVENTORY_ITEM', 'PRODUCT', 'CUSTOM'].includes(itemType)) {
        return NextResponse.json(
          { error: 'Validation error', details: [{ field: 'itemType', message: 'Item type must be INVENTORY_ITEM, PRODUCT, or CUSTOM' }] },
          { status: 400 }
        );
      }

      if (!quantity || typeof quantity !== 'number' || quantity < 1 || quantity > 1000) {
        return NextResponse.json(
          { error: 'Validation error', details: [{ field: 'quantity', message: 'Quantity must be between 1 and 1000' }] },
          { status: 400 }
        );
      }

      validatedData = body;
    }

    const user = session.user as SessionUser;

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
      // Check permissions
      const hasPermission = await prisma.userPermissions.findFirst({
        where: {
          userId: session.user.id,
          granted: true,
          permission: {
            name: 'BARCODE_PRINT',
          },
        },
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions. You need BARCODE_PRINT permission.' },
          { status: 403 }
        );
      }
    }

    // Fetch template
    const template = await prisma.barcodeTemplates.findUnique({
      where: { id: validatedData.templateId },
      include: {
        business: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // System admins bypass business access check
    if (!isSystemAdmin(user)) {
      // Verify user has access to the template's business
      const userBusinessRole = await prisma.userBusinessRole.findFirst({
        where: {
          userId: session.user.id,
          businessId: template.businessId,
        },
      });

      if (!userBusinessRole) {
        return NextResponse.json(
          { error: 'Access denied to this template' },
          { status: 403 }
        );
      }
    }

    // Generate barcode data and item name based on item type
    let barcodeData = template.barcodeValue;
    let itemName = '';
    let itemId: string | undefined;

    if (validatedData.itemType === 'INVENTORY_ITEM' && validatedData.itemId) {
      const inventoryItem = await prisma.inventoryItems.findUnique({
        where: { id: validatedData.itemId },
        select: { id: true, name: true, sku: true },
      });

      if (!inventoryItem) {
        return NextResponse.json(
          { error: 'Inventory item not found' },
          { status: 404 }
        );
      }

      barcodeData = inventoryItem.sku || inventoryItem.id;
      itemName = inventoryItem.name;
      itemId = inventoryItem.id;
    } else if (validatedData.itemType === 'PRODUCT' && validatedData.itemId) {
      const product = await prisma.products.findUnique({
        where: { id: validatedData.itemId },
        select: { id: true, name: true, sku: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      barcodeData = product.sku || product.id;
      itemName = product.name;
      itemId = product.id;
    } else if (validatedData.itemType === 'CUSTOM') {
      barcodeData = validatedData.customData?.barcodeValue || template.barcodeValue;
      itemName = validatedData.customData?.name || 'Custom Item';
    }

    // Create print settings snapshot
    const printSettings = {
      symbology: template.symbology,
      width: template.width,
      height: template.height,
      margin: template.margin,
      displayValue: template.displayValue,
      fontSize: template.fontSize,
      backgroundColor: template.backgroundColor,
      lineColor: template.lineColor,
      dpi: template.dpi,
      quietZone: template.quietZone,
      paperSize: template.paperSize,
      orientation: template.orientation,
    };

    // Store barcode parameters for generation at print time
    // (ESC/POS commands contain null bytes which can't be stored in PostgreSQL text fields)
    const barcodeParams = {
      barcodeData,
      symbology: template.symbology,
      itemName,
      businessName: template.business.name,
      templateName: template.name,
      width: template.width,
      height: template.height,
      displayValue: template.displayValue,
      fontSize: template.fontSize,
      sku: template.sku, // Add SKU field for thermal printer
      // Include custom data fields for printing
      customData: validatedData.customData,
    };

    // Create the print job with label data in printSettings
    const printJob = await prisma.barcodePrintJobs.create({
      data: {
        templateId: validatedData.templateId,
        itemId: itemId,
        itemType: validatedData.itemType,
        barcodeData,
        itemName,
        customData: validatedData.customData,
        requestedQuantity: validatedData.quantity,
        printedQuantity: 0,
        status: 'QUEUED',
        printerId: validatedData.printerId,
        printSettings: {
          ...printSettings,
          // Add barcode parameters for generation at print time
          barcodeParams,
          jobType: 'label',
          barcodeValue: barcodeData,
        },
        userNotes: validatedData.userNotes,
        businessId: template.businessId,
        createdById: session.user.id,
      },
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
            printerName: true,
            printerType: true,
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
    });

    // Add barcode to product if applicable (Phase 4: Multi-Barcode Support)
    // Check if we have a product ID from the print job
    let productIdForBarcode: string | null = null;

    // Try to get product ID from custom data (new print job form integration)
    if (validatedData.customData?.selectedProductId) {
      productIdForBarcode = validatedData.customData.selectedProductId;
    }
    // Fallback to itemId if itemType is PRODUCT
    else if (validatedData.itemType === 'PRODUCT' && validatedData.itemId) {
      productIdForBarcode = validatedData.itemId;
    }

    // If we have a product ID and barcode data, add/update the barcode
    if (productIdForBarcode && barcodeData) {
      try {
        // Check if barcode already exists for this product
        const existingBarcode = await prisma.productBarcodes.findFirst({
          where: {
            productId: productIdForBarcode,
            code: barcodeData,
          },
        });

        if (!existingBarcode) {
          // Check if this is the first barcode for the product
          const barcodeCount = await prisma.productBarcodes.count({
            where: { productId: productIdForBarcode },
          });

          // Create the barcode
          await prisma.productBarcodes.create({
            data: {
              code: barcodeData,
              type: template.symbology,
              isPrimary: barcodeCount === 0, // First barcode is primary
              source: 'BARCODE_LABEL_PRINT',
              label: `Generated from ${template.name}`,
              productId: productIdForBarcode,
              createdBy: session.user.id,
            },
          });
        }
      } catch (barcodeError) {
        // Log error but don't fail the print job creation
        console.error('Error adding barcode to product:', barcodeError);
      }
    }

    // TODO: Queue the print job for actual printing
    // This would integrate with the existing printer system

    return NextResponse.json(printJob, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error creating print job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
