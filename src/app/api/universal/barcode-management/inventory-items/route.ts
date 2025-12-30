import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

// Validation schema for creating barcode inventory items
const createInventoryItemSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  inventoryItemId: z.string().min(1, 'Inventory item ID is required'),
  barcodeData: z.string().optional(),
  customLabel: z.string().max(255).optional(),
  batchNumber: z.string().max(100).optional(),
  expiryDate: z.string().datetime().optional(),
  quantity: z.number().min(1).max(100000).default(1),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/universal/barcode-management/inventory-items
 * List barcode inventory items with filtering and pagination
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
    const isActive = searchParams.get('isActive');
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
              in: ['BARCODE_VIEW_TEMPLATES', 'BARCODE_MANAGE_TEMPLATES'],
            },
          },
        },
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions. You need BARCODE_VIEW_TEMPLATES permission.' },
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

    // Build where clause for template filtering (to enforce business access)
    const templateWhere: any = {};

    if (accessibleBusinessIds.length > 0) {
      templateWhere.businessId = { in: accessibleBusinessIds };
    } else {
      return NextResponse.json({
        inventoryItems: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    if (businessId && accessibleBusinessIds.includes(businessId)) {
      templateWhere.businessId = businessId;
    }

    if (templateId) {
      templateWhere.id = templateId;
    }

    // Build where clause for inventory items
    const where: any = {
      template: templateWhere,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Fetch inventory items
    const [inventoryItems, total] = await Promise.all([
      prisma.barcodeInventoryItems.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              name: true,
              symbology: true,
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
              email: true,
            },
          },
          _count: {
            select: {
              printJobs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.barcodeInventoryItems.count({ where }),
    ]);

    return NextResponse.json({
      inventoryItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching barcode inventory items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/universal/barcode-management/inventory-items
 * Create a new barcode inventory item linkage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createInventoryItemSchema.parse(body);

    const user = session.user as SessionUser;

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
      // Check permissions
      const hasPermission = await prisma.userPermissions.findFirst({
        where: {
          userId: session.user.id,
          granted: true,
          permission: {
            name: 'BARCODE_MANAGE_TEMPLATES',
          },
        },
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions. You need BARCODE_MANAGE_TEMPLATES permission.' },
          { status: 403 }
        );
      }
    }

    // Fetch template to validate access
    const template = await prisma.barcodeTemplates.findUnique({
      where: { id: validatedData.templateId },
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

    // Check if inventory item exists (optional - depends on if InventoryItems table exists)
    // For now, we'll skip this validation since we don't know if InventoryItems table exists

    // Check for duplicate linkage
    const existingLinkage = await prisma.barcodeInventoryItems.findFirst({
      where: {
        templateId: validatedData.templateId,
        inventoryItemId: validatedData.inventoryItemId,
      },
    });

    if (existingLinkage) {
      return NextResponse.json(
        { error: 'This inventory item is already linked to this template.' },
        { status: 400 }
      );
    }

    // Generate barcode data if not provided
    const barcodeData = validatedData.barcodeData || validatedData.inventoryItemId;

    // Create the inventory item linkage
    const inventoryItem = await prisma.barcodeInventoryItems.create({
      data: {
        templateId: validatedData.templateId,
        inventoryItemId: validatedData.inventoryItemId,
        barcodeData,
        customLabel: validatedData.customLabel,
        batchNumber: validatedData.batchNumber,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : undefined,
        quantity: validatedData.quantity,
        isActive: validatedData.isActive,
        createdById: session.user.id,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            symbology: true,
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
            email: true,
          },
        },
      },
    });

    return NextResponse.json(inventoryItem, { status: 201 });
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

    console.error('Error creating barcode inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
