import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerUser } from '@/lib/get-server-user'

// Validation schema for updating inventory items
const updateInventoryItemSchema = z.object({
  barcodeData: z.string().optional(),
  customLabel: z.string().max(255).optional(),
  batchNumber: z.string().max(100).optional(),
  expiryDate: z.string().datetime().optional(),
  quantity: z.number().min(1).max(100000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/universal/barcode-management/inventory-items/[id]
 * Get a single barcode inventory item by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check permissions
    const hasPermission = await prisma.userPermissions.findFirst({
      where: {
        userId: user.id,
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
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch inventory item
    const inventoryItem = await prisma.barcodeInventoryItems.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            symbology: true,
            width: true,
            height: true,
            displayValue: true,
            businessId: true,
            business: {
              select: {
                id: true,
                name: true,
                shortName: true,
                type: true,
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
        printJobs: {
          select: {
            id: true,
            status: true,
            requestedQuantity: true,
            printedQuantity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 print jobs
        },
        _count: {
          select: {
            printJobs: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this item's business
    const userBusinessRole = await prisma.userBusinessRole.findFirst({
      where: {
        userId: user.id,
        businessId: inventoryItem.template.businessId,
      },
    });

    if (!userBusinessRole) {
      return NextResponse.json(
        { error: 'Access denied to this inventory item' },
        { status: 403 }
      );
    }

    return NextResponse.json(inventoryItem);
  } catch (error) {
    console.error('Error fetching barcode inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/universal/barcode-management/inventory-items/[id]
 * Update a barcode inventory item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateInventoryItemSchema.parse(body);

    // Check permissions
    const hasPermission = await prisma.userPermissions.findFirst({
      where: {
        userId: user.id,
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

    // Fetch existing inventory item
    const existingItem = await prisma.barcodeInventoryItems.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            businessId: true,
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this item's business
    const userBusinessRole = await prisma.userBusinessRole.findFirst({
      where: {
        userId: user.id,
        businessId: existingItem.template.businessId,
      },
    });

    if (!userBusinessRole) {
      return NextResponse.json(
        { error: 'Access denied to this inventory item' },
        { status: 403 }
      );
    }

    // Update the inventory item
    const inventoryItem = await prisma.barcodeInventoryItems.update({
      where: { id },
      data: {
        ...validatedData,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : undefined,
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
                type: true,
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
    });

    return NextResponse.json(inventoryItem);
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

    console.error('Error updating barcode inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/universal/barcode-management/inventory-items/[id]
 * Delete a barcode inventory item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check permissions
    const hasPermission = await prisma.userPermissions.findFirst({
      where: {
        userId: user.id,
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

    // Fetch inventory item to verify access
    const inventoryItem = await prisma.barcodeInventoryItems.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            businessId: true,
          },
        },
        _count: {
          select: {
            printJobs: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this item's business
    const userBusinessRole = await prisma.userBusinessRole.findFirst({
      where: {
        userId: user.id,
        businessId: inventoryItem.template.businessId,
      },
    });

    if (!userBusinessRole) {
      return NextResponse.json(
        { error: 'Access denied to this inventory item' },
        { status: 403 }
      );
    }

    // Check if inventory item has associated print jobs
    if (inventoryItem._count.printJobs > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete inventory item with ${inventoryItem._count.printJobs} associated print job(s). Delete the print jobs first or mark the item as inactive.`,
        },
        { status: 400 }
      );
    }

    // Delete the inventory item
    await prisma.barcodeInventoryItems.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Inventory item deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    console.error('Error deleting barcode inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
