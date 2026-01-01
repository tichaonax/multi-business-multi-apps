import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/products/[productId]/barcodes
 *
 * Retrieves all barcodes associated with a product.
 *
 * Response:
 * {
 *   success: true;
 *   product: { id, name, sku };
 *   barcodes: [
 *     {
 *       id: string;
 *       code: string;
 *       type: string;
 *       isPrimary: boolean;
 *       source: string;
 *       createdAt: Date;
 *       createdBy: { id, name, email } | null;
 *     }
 *   ];
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId } = params;

    // Fetch product with business membership check
    const product = await prisma.businessProducts.findUnique({
      where: { id: productId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
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
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
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

    // Format barcodes
    const formattedBarcodes = product.product_barcodes.map((barcode) => ({
      id: barcode.id,
      code: barcode.code,
      type: barcode.type,
      isPrimary: barcode.isPrimary,
      source: barcode.source || 'MANUAL',
      label: barcode.label,
      createdAt: barcode.createdAt,
      createdBy: barcode.user
        ? {
            id: barcode.user.id,
            name: `${barcode.user.firstName} ${barcode.user.lastName}`.trim() || 'Unknown',
            email: barcode.user.email,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
      barcodes: formattedBarcodes,
      totalBarcodes: formattedBarcodes.length,
    });
  } catch (error) {
    console.error('Error fetching product barcodes:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch product barcodes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[productId]/barcodes
 *
 * Adds a new barcode to a product. Checks for conflicts with existing barcodes.
 *
 * Request body:
 * {
 *   code: string;              // Barcode value
 *   type: string;              // Symbology (CODE128, UPC, EAN13, etc.)
 *   isPrimary?: boolean;       // Set as primary barcode (default: false)
 *   source?: string;           // MANUAL, BARCODE_LABEL_PRINT, IMPORT, etc.
 *   label?: string;            // Optional label/description
 *   replaceConflict?: boolean; // If true, remove from existing product
 * }
 *
 * Response on success:
 * {
 *   success: true;
 *   barcode: { ... };
 *   message: string;
 * }
 *
 * Response on conflict (when replaceConflict is false):
 * {
 *   success: false;
 *   conflict: true;
 *   conflictingProduct: {
 *     id: string;
 *     name: string;
 *     sku: string;
 *     businessId: string;
 *     businessName: string;
 *     businessType: string;
 *     existingBarcode: { id, code, type, isPrimary };
 *   };
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId } = params;
    const body = await request.json();
    const { code, type, isPrimary = false, source = 'MANUAL', label, replaceConflict = false } = body;

    // Validate input
    if (!code || !type) {
      return NextResponse.json(
        { error: 'Barcode code and type are required' },
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
            type: true,
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

    // Check for existing barcode with same code
    const existingBarcode = await prisma.productBarcodes.findFirst({
      where: {
        code: code,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            businessId: true,
            businesses: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    // If barcode exists on a different product and replaceConflict is false
    if (existingBarcode && existingBarcode.productId !== productId && !replaceConflict) {
      return NextResponse.json({
        success: false,
        conflict: true,
        conflictingProduct: {
          id: existingBarcode.product.id,
          name: existingBarcode.product.name,
          sku: existingBarcode.product.sku,
          businessId: existingBarcode.product.businessId,
          businessName: existingBarcode.product.businesses.name,
          businessType: existingBarcode.product.businesses.type,
          existingBarcode: {
            id: existingBarcode.id,
            code: existingBarcode.code,
            type: existingBarcode.type,
            isPrimary: existingBarcode.isPrimary,
          },
        },
      });
    }

    // If replaceConflict is true, delete the existing barcode
    if (existingBarcode && existingBarcode.productId !== productId && replaceConflict) {
      await prisma.productBarcodes.delete({
        where: { id: existingBarcode.id },
      });
    }

    // If setting as primary, unset other primary barcodes for this product
    if (isPrimary) {
      await prisma.productBarcodes.updateMany({
        where: {
          productId: productId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Check if barcode already exists for this product
    const existingForProduct = await prisma.productBarcodes.findFirst({
      where: {
        productId: productId,
        code: code,
      },
    });

    if (existingForProduct) {
      // Update existing barcode
      const updatedBarcode = await prisma.productBarcodes.update({
        where: { id: existingForProduct.id },
        data: {
          type: type,
          isPrimary: isPrimary,
          source: source,
          label: label || null,
          createdBy: session.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        barcode: updatedBarcode,
        message: 'Barcode updated successfully',
      });
    }

    // Create new barcode
    const newBarcode = await prisma.productBarcodes.create({
      data: {
        code: code,
        type: type,
        isPrimary: isPrimary,
        source: source,
        label: label || null,
        productId: productId,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      barcode: newBarcode,
      message: replaceConflict
        ? 'Barcode moved successfully from previous product'
        : 'Barcode added successfully',
    });
  } catch (error) {
    console.error('Error adding product barcode:', error);
    return NextResponse.json(
      {
        error: 'Failed to add product barcode',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
