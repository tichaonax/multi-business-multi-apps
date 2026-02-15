import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

/**
 * Product Lookup API for Barcode Label Creation
 *
 * Searches business inventory for products to auto-populate label fields
 * Supports search by: SKU, product name, barcode value
 *
 * Query Parameters:
 * - q: Search query (SKU, name, or barcode)
 * - businessId: Business ID to search within (required)
 * - scope: 'current' (default) or 'global' - search current business or all businesses
 * - limit: Max results to return (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const businessId = searchParams.get('businessId');
    const scope = searchParams.get('scope') || 'current';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query (q) is required' },
        { status: 400 }
      );
    }

    const user = session.user as SessionUser;

    // Verify user has access to the business (admins bypass this check)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this business' },
          { status: 403 }
        );
      }
    }

    const searchTerm = query.trim();

    // Build search filters based on scope
    const businessFilter =
      scope === 'global'
        ? {} // Search all businesses user has access to
        : { businessId: businessId }; // Search only current business

    // Search products by SKU, name, or barcode
    const products = await prisma.businessProducts.findMany({
      where: {
        ...businessFilter,
        OR: [
          { sku: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          {
            product_barcodes: {
              some: {
                code: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      take: limit,
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        business_categories: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        inventory_subcategory: {
          select: {
            id: true,
            name: true,
            emoji: true,
            categoryId: true,
            category: {
              select: {
                id: true,
                name: true,
                emoji: true,
              },
            },
          },
        },
        business_brands: {
          select: {
            id: true,
            name: true,
          },
        },
        product_variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            originalPrice: true,
            stockQuantity: true,
            attributes: true,
          },
          where: {
            isActive: true,
          },
        },
        product_barcodes: {
          select: {
            id: true,
            code: true,
            type: true,
            isPrimary: true,
            label: true,
          },
          where: {
            isActive: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    // Also search clothing bales (by SKU, batch number, or barcode)
    const bales = await prisma.clothingBales.findMany({
      where: {
        ...businessFilter,
        isActive: true,
        OR: [
          { sku: { contains: searchTerm, mode: 'insensitive' } },
          { batchNumber: { contains: searchTerm, mode: 'insensitive' } },
          { barcode: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        business: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform bales into ProductSearchResult-compatible format
    const baleResults = bales.map((bale) => ({
      id: `bale_${bale.id}`,
      sku: bale.sku,
      name: `${bale.category?.name || 'Bale'} - ${bale.batchNumber}`,
      description: `Bale batch ${bale.batchNumber} (${bale.remainingCount}/${bale.itemCount} remaining)`,
      sellPrice: bale.unitPrice,
      costPrice: bale.unitPrice,
      stockQuantity: bale.remainingCount,
      unit: 'item',
      imageUrl: null,
      business: bale.business,
      category: bale.category ? { id: bale.category.id, name: bale.category.name, emoji: null } : null,
      department: null,
      domain: null,
      subcategory: null,
      brand: null,
      variants: [],
      hasVariants: false,
      barcodes: bale.barcode ? [{ id: 'bale-barcode', code: bale.barcode, type: 'CODE128', isPrimary: true, label: 'Bale Barcode' }] : [],
      primaryBarcode: bale.barcode ? { id: 'bale-barcode', code: bale.barcode, type: 'CODE128' } : null,
      suggestedTemplateName: `${bale.category?.name || 'Bale'} ${bale.batchNumber}`,
      templateNameParts: {
        department: null,
        domain: null,
        brand: null,
        category: bale.category?.name || null,
        productName: bale.batchNumber,
      },
    }));

    // Transform results to include computed fields
    const results = products.map((product) => {
      // Determine description source (prefer domain > product description)
      const description =
        product.inventory_subcategory?.domain?.name ||
        product.description ||
        '';

      // Get department name
      const departmentName =
        product.inventory_subcategory?.department?.name || null;

      // Get brand name
      const brandName = product.business_brands?.name || null;

      // Get category name
      const categoryName = product.business_categories?.name || null;

      // Get domain name
      const domainName = product.inventory_subcategory?.domain?.name || null;

      // Generate template name
      const templateNameParts: string[] = [];

      // Use department OR domain for first part
      if (departmentName) {
        templateNameParts.push(departmentName);
        if (domainName) {
          templateNameParts.push(domainName);
        }
      } else if (domainName) {
        templateNameParts.push(domainName);
      }

      if (brandName) {
        templateNameParts.push(brandName);
      }
      if (categoryName) {
        templateNameParts.push(categoryName);
      }
      templateNameParts.push(product.name);

      const baseTemplateName = templateNameParts.join(' ');

      // Primary barcode
      const primaryBarcode = product.product_barcodes.find((b) => b.isPrimary);

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: description,
        sellPrice: product.sellPrice,
        costPrice: product.costPrice,
        stockQuantity: product.stockQuantity,
        unit: product.unit,
        imageUrl: product.imageUrl,

        // Business info
        business: product.businesses,

        // Category/Department/Domain hierarchy
        category: product.business_categories,
        department: product.inventory_subcategory?.department || null,
        domain: product.inventory_subcategory?.domain || null,
        subcategory: product.inventory_subcategory
          ? {
              id: product.inventory_subcategory.id,
              name: product.inventory_subcategory.name,
            }
          : null,

        // Brand
        brand: product.business_brands,

        // Variants
        variants: product.product_variants,
        hasVariants: product.product_variants.length > 0,

        // Barcodes
        barcodes: product.product_barcodes,
        primaryBarcode: primaryBarcode || null,

        // Template name suggestion
        suggestedTemplateName: baseTemplateName,
        templateNameParts: {
          department: departmentName,
          domain: domainName,
          brand: brandName,
          category: categoryName,
          productName: product.name,
        },
      };
    });

    // Combine product results and bale results
    const allResults = [...baleResults, ...results].slice(0, limit);

    return NextResponse.json({
      success: true,
      results: allResults,
      count: allResults.length,
      query: searchTerm,
      scope: scope,
      businessId: businessId,
    });
  } catch (error) {
    console.error('Product lookup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
