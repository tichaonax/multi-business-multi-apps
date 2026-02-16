import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/products/[productId]/price-history
 *
 * Retrieves the price change history for a product or variant.
 *
 * Query params:
 * - variantId: (optional) Filter by specific variant
 * - limit: (optional) Number of records to return (default: 50)
 *
 * Response:
 * {
 *   success: true;
 *   product: { ... };
 *   priceHistory: [
 *     {
 *       id: string;
 *       oldPrice: number;
 *       newPrice: number;
 *       changeReason: string;
 *       notes: string | null;
 *       changedAt: Date;
 *       changedBy: { id, name, email };
 *       barcodeJob: { id, name } | null;
 *       variant: { id, name } | null;
 *     }
 *   ];
 * }
 */
export async function GET(
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
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (must be between 1 and 500)' },
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

    // Build where clause for price history query
    const whereClause: any = {
      productId: productId,
    };

    if (variantId) {
      whereClause.variantId = variantId;
    }

    // Fetch price change history
    const priceHistory = await prisma.product_price_changes.findMany({
      where: whereClause,
      orderBy: {
        changedAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        barcodeJob: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    // Fetch variant info if filtering by variant
    let variantInfo = null;
    if (variantId) {
      variantInfo = await prisma.productVariants.findUnique({
        where: { id: variantId },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
        },
      });
    }

    // Format response
    const formattedHistory = priceHistory.map((record) => ({
      id: record.id,
      oldPrice: record.oldPrice ? parseFloat(record.oldPrice.toString()) : null,
      newPrice: parseFloat(record.newPrice.toString()),
      priceDifference: record.oldPrice
        ? parseFloat(record.newPrice.toString()) - parseFloat(record.oldPrice.toString())
        : null,
      changeReason: record.changeReason,
      notes: record.notes,
      changedAt: record.changedAt,
      changedBy: record.user
        ? {
            id: record.user.id,
            name: `${record.user.firstName} ${record.user.lastName}`.trim() || 'Unknown',
            email: record.user.email,
          }
        : null,
      barcodeJob: record.barcodeJob
        ? {
            id: record.barcodeJob.id,
            name: record.barcodeJob.name,
            status: record.barcodeJob.status,
          }
        : null,
      product: {
        id: record.product.id,
        name: record.product.name,
        sku: record.product.sku,
      },
    }));

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentPrice: parseFloat(product.sellPrice.toString()),
      },
      variant: variantInfo
        ? {
            id: variantInfo.id,
            name: variantInfo.name,
            sku: variantInfo.sku,
            currentPrice: parseFloat(variantInfo.price.toString()),
          }
        : null,
      priceHistory: formattedHistory,
      totalRecords: formattedHistory.length,
      limit: limit,
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch price history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
