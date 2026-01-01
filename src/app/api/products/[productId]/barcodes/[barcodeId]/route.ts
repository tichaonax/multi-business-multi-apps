import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/products/[productId]/barcodes/[barcodeId]
 *
 * Updates a barcode (e.g., set as primary, change label, change type).
 *
 * Request body:
 * {
 *   isPrimary?: boolean;
 *   type?: string;
 *   label?: string;
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string; barcodeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId, barcodeId } = params;
    const body = await request.json();
    const { isPrimary, type, label } = body;

    // Fetch product with business membership check
    const product = await prisma.businessProducts.findUnique({
      where: { id: productId },
      include: {
        businesses: {
          select: {
            id: true,
            business_members: {
              where: {
                userId: session.user.id,
                status: 'ACTIVE',
              },
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this business
    const hasAccess =
      session.user.role === 'ADMIN' ||
      product.businesses.business_members.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this product' },
        { status: 403 }
      );
    }

    // Verify barcode belongs to this product
    const barcode = await prisma.productBarcodes.findUnique({
      where: { id: barcodeId },
    });

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      );
    }

    if (barcode.productId !== productId) {
      return NextResponse.json(
        { error: 'Barcode does not belong to this product' },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primary barcodes for this product
    if (isPrimary === true) {
      await prisma.productBarcodes.updateMany({
        where: {
          productId: productId,
          isPrimary: true,
          id: { not: barcodeId },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Build update data
    const updateData: any = {};
    if (isPrimary !== undefined) updateData.isPrimary = isPrimary;
    if (type !== undefined) updateData.type = type;
    if (label !== undefined) updateData.label = label || null;

    // Update the barcode
    const updatedBarcode = await prisma.productBarcodes.update({
      where: { id: barcodeId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      barcode: updatedBarcode,
      message: 'Barcode updated successfully',
    });
  } catch (error) {
    console.error('Error updating barcode:', error);
    return NextResponse.json(
      {
        error: 'Failed to update barcode',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[productId]/barcodes/[barcodeId]
 *
 * Deletes a barcode from a product.
 * Cannot delete the primary barcode if it's the only barcode.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string; barcodeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId, barcodeId } = params;

    // Fetch product with business membership check
    const product = await prisma.businessProducts.findUnique({
      where: { id: productId },
      include: {
        businesses: {
          select: {
            id: true,
            business_members: {
              where: {
                userId: session.user.id,
                status: 'ACTIVE',
              },
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
        product_barcodes: {
          select: {
            id: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this business
    const hasAccess =
      session.user.role === 'ADMIN' ||
      product.businesses.business_members.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this product' },
        { status: 403 }
      );
    }

    // Verify barcode belongs to this product
    const barcode = await prisma.productBarcodes.findUnique({
      where: { id: barcodeId },
    });

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      );
    }

    if (barcode.productId !== productId) {
      return NextResponse.json(
        { error: 'Barcode does not belong to this product' },
        { status: 400 }
      );
    }

    // Check if this is the only barcode
    const totalBarcodes = product.product_barcodes.length;

    if (totalBarcodes === 1 && barcode.isPrimary) {
      return NextResponse.json(
        { error: 'Cannot delete the only barcode. Products must have at least one barcode.' },
        { status: 400 }
      );
    }

    // If deleting primary barcode and there are other barcodes, promote one to primary
    if (barcode.isPrimary && totalBarcodes > 1) {
      const otherBarcode = product.product_barcodes.find((b) => b.id !== barcodeId);
      if (otherBarcode) {
        await prisma.productBarcodes.update({
          where: { id: otherBarcode.id },
          data: { isPrimary: true },
        });
      }
    }

    // Delete the barcode
    await prisma.productBarcodes.delete({
      where: { id: barcodeId },
    });

    return NextResponse.json({
      success: true,
      message: barcode.isPrimary
        ? 'Primary barcode deleted. Another barcode has been promoted to primary.'
        : 'Barcode deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting barcode:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete barcode',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
