import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isSystemAdmin } from '@/lib/permission-utils';
import { Decimal } from '@prisma/client/runtime/library';
import { getServerUser } from '@/lib/get-server-user'

// Validation schema for updating templates
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  barcodeValue: z.string().min(1).max(255).optional(),
  sku: z.string().max(20).optional().nullable(),
  batchId: z.string().max(10).optional().nullable(),
  defaultPrice: z.union([z.string(), z.number()]).optional().nullable(),
  productName: z.string().max(50).optional().nullable(),
  defaultColor: z.string().max(30).optional().nullable(),
  defaultSize: z.string().max(20).optional().nullable(),
  type: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  extraInfo: z.any().optional(),
  symbology: z.enum(['code128', 'ean13', 'ean8', 'code39', 'upca', 'itf14', 'msi', 'pharmacode', 'codabar']).optional(),
  width: z.number().min(1).max(500).optional(),
  height: z.number().min(1).max(500).optional(),
  margin: z.number().min(0).max(50).optional(),
  displayValue: z.boolean().optional(),
  fontSize: z.number().min(8).max(72).optional(),
  backgroundColor: z.string().optional(),
  lineColor: z.string().optional(),
  dpi: z.number().min(72).max(600).optional(),
  quietZone: z.number().min(0).max(50).optional(),
  paperSize: z.enum(['A4', 'A6', 'CR80', 'receipt', 'label_2x1', 'label_4x2']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  layoutTemplate: z.any().optional(),
}).passthrough();

/**
 * GET /api/universal/barcode-management/templates/[id]
 * Get a single barcode template by ID
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

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
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
    }

    // Fetch template
    const template = await prisma.barcodeTemplates.findUnique({
      where: { id },
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
            email: true,
          },
        },
        _count: {
          select: {
            printJobs: true,
            inventoryItems: true,
          },
        },
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
      // Verify user has access to this template's business
      const userBusinessRole = await prisma.userBusinessRole.findFirst({
        where: {
          userId: user.id,
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

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching barcode template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/universal/barcode-management/templates/[id]
 * Update a barcode template
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

    // Extract only the fields we want to validate and update
    const {
      name,
      barcodeValue,
      sku,
      batchId,
      defaultPrice,
      productName,
      defaultColor,
      defaultSize,
      type,
      description,
      extraInfo,
      symbology,
      width,
      height,
      margin,
      displayValue,
      fontSize,
      backgroundColor,
      lineColor,
      dpi,
      quietZone,
      paperSize,
      orientation,
      layoutTemplate,
    } = body;

    // Normalize symbology to lowercase and handle legacy uppercase values
    let normalizedSymbology = symbology;
    if (symbology) {
      const lowerSymbology = symbology.toLowerCase();
      // Map legacy uppercase values to new lowercase format
      const symbologyMap: Record<string, string> = {
        'code128': 'code128',
        'ean13': 'ean13',
        'ean8': 'ean8',
        'code39': 'code39',
        'upc': 'upca',      // Legacy UPC maps to upca
        'upca': 'upca',
        'itf': 'itf14',     // Legacy ITF maps to itf14
        'itf14': 'itf14',
        'msi': 'msi',
        'pharmacode': 'pharmacode',
        'codabar': 'codabar',
      };
      normalizedSymbology = symbologyMap[lowerSymbology] || lowerSymbology;
    }

    const dataToValidate = {
      name,
      barcodeValue,
      sku,
      batchId,
      defaultPrice,
      productName,
      defaultColor,
      defaultSize,
      type,
      description,
      extraInfo,
      symbology: normalizedSymbology,
      width,
      height,
      margin,
      displayValue,
      fontSize,
      backgroundColor,
      lineColor,
      dpi,
      quietZone,
      paperSize,
      orientation,
      layoutTemplate,
    };

    // Validate data using zod (now that module is reinstalled)
    let validatedData;
    try {
      validatedData = updateTemplateSchema.parse(dataToValidate);
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
      throw error;
    }


    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
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
    }

    // Fetch existing template
    const existingTemplate = await prisma.barcodeTemplates.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // System admins bypass business access check
    if (!isSystemAdmin(user)) {
      // Verify user has access to this template's business
      const userBusinessRole = await prisma.userBusinessRole.findFirst({
        where: {
          userId: user.id,
          businessId: existingTemplate.businessId,
        },
      });

      if (!userBusinessRole) {
        return NextResponse.json(
          { error: 'Access denied to this template' },
          { status: 403 }
        );
      }
    }

    // If barcodeValue is being changed, check for duplicates
    if (validatedData.barcodeValue && validatedData.barcodeValue !== existingTemplate.barcodeValue) {
      const duplicate = await prisma.barcodeTemplates.findFirst({
        where: {
          businessId: existingTemplate.businessId,
          barcodeValue: validatedData.barcodeValue,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A template with this barcode value already exists for this business.' },
          { status: 400 }
        );
      }
    }

    // Convert defaultPrice to Decimal if provided
    let priceToUpdate: Decimal | null | undefined = undefined;
    if (validatedData.defaultPrice !== undefined) {
      if (validatedData.defaultPrice === null) {
        priceToUpdate = null;
      } else {
        const priceValue = typeof validatedData.defaultPrice === 'string'
          ? parseFloat(validatedData.defaultPrice)
          : validatedData.defaultPrice;
        if (!isNaN(priceValue)) {
          priceToUpdate = new Decimal(priceValue);
        }
      }
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedBy: user.id,
    };

    // Only update defaultPrice if it was provided
    if (priceToUpdate !== undefined) {
      updateData.defaultPrice = priceToUpdate;
    }

    // Update the template
    const template = await prisma.barcodeTemplates.update({
      where: { id },
      data: updateData,
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
            email: true,
          },
        },
        _count: {
          select: {
            printJobs: true,
            inventoryItems: true,
          },
        },
      },
    });

    return NextResponse.json(template);
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

    console.error('Error updating barcode template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/universal/barcode-management/templates/[id]
 * Delete a barcode template
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

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
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
    }

    // Fetch template to verify access
    const template = await prisma.barcodeTemplates.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            printJobs: true,
            inventoryItems: true,
          },
        },
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
      // Verify user has access to this template's business
      const userBusinessRole = await prisma.userBusinessRole.findFirst({
        where: {
          userId: user.id,
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

    // Check if template has associated print jobs or inventory items
    if (template._count.printJobs > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete template with ${template._count.printJobs} associated print job(s). Delete the print jobs first.`,
        },
        { status: 400 }
      );
    }

    if (template._count.inventoryItems > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete template with ${template._count.inventoryItems} linked inventory item(s). Unlink the items first.`,
        },
        { status: 400 }
      );
    }

    // Delete the template
    await prisma.barcodeTemplates.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Template deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    console.error('Error deleting barcode template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
