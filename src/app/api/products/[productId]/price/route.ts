import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * PATCH /api/products/[productId]/price
 *
 * Updates the price of a product or variant and creates an audit log entry.
 *
 * Request body:
 * {
 *   newPrice: number;
 *   variantId?: string;         // If updating a specific variant
 *   reason: string;              // BARCODE_LABEL_PRINT, PROMOTIONAL, SUPPLIER_UPDATE, etc.
 *   notes?: string;              // Optional explanation
 *   barcodeJobId?: string;       // Optional link to barcode print job
 * }
 *
 * Response:
 * {
 *   success: true;
 *   product?: { ... };           // Updated product if not variant
 *   variant?: { ... };           // Updated variant if variantId provided
 *   auditLog: { ... };           // Created audit log entry
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId } = params;
    const body = await request.json();
    const { newPrice, variantId, reason, notes, barcodeJobId } = body;

    // Validate input
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      return NextResponse.json(
        { error: 'Invalid price value' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for price changes' },
        { status: 400 }
      );
    }

    // Fetch product with business membership check
    const product = await prisma.businessProducts.findUnique({
      where: { id: productId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            business_memberships: {
              where: {
                userId: user.id,
                isActive: true,
              },
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
        product_variants: variantId
          ? {
              where: { id: variantId },
            }
          : undefined,
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
      user.role?.toLowerCase() === 'admin' ||
      product.businesses.business_memberships.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this product' },
        { status: 403 }
      );
    }

    const newPriceDecimal = parseFloat(newPrice);

    // Handle variant price update
    if (variantId) {
      const variant = product.product_variants?.[0];

      if (!variant) {
        return NextResponse.json(
          { error: 'Variant not found' },
          { status: 404 }
        );
      }

      const oldPrice = parseFloat(variant.price.toString());

      // Update variant price
      const updatedVariant = await prisma.productVariants.update({
        where: { id: variantId },
        data: {
          price: newPriceDecimal,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      const auditLog = await prisma.product_price_changes.create({
        data: {
          productId: productId,
          variantId: variantId,
          oldPrice: oldPrice,
          newPrice: newPriceDecimal,
          changedBy: user.id,
          changeReason: reason,
          notes: notes || null,
          barcodeJobId: barcodeJobId || null,
        },
      });

      return NextResponse.json({
        success: true,
        variant: updatedVariant,
        auditLog: auditLog,
        message: `Variant price updated from $${oldPrice.toFixed(2)} to $${newPriceDecimal.toFixed(2)}`,
      });
    }

    // Handle product price update
    const oldPrice = parseFloat(product.sellPrice.toString());

    // Update product price
    const updatedProduct = await prisma.businessProducts.update({
      where: { id: productId },
      data: {
        sellPrice: newPriceDecimal,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    const auditLog = await prisma.product_price_changes.create({
      data: {
        productId: productId,
        variantId: null,
        oldPrice: oldPrice,
        newPrice: newPriceDecimal,
        changedBy: user.id,
        changeReason: reason,
        notes: notes || null,
        barcodeJobId: barcodeJobId || null,
      },
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      auditLog: auditLog,
      message: `Product price updated from $${oldPrice.toFixed(2)} to $${newPriceDecimal.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error updating product price:', error);
    return NextResponse.json(
      {
        error: 'Failed to update product price',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
