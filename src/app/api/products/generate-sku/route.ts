import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/products/generate-sku
 *
 * Generates a new SKU for a product based on business SKU configuration.
 * Calls the PostgreSQL generate_next_sku() function created in Phase 1.
 *
 * Request body:
 * {
 *   businessId: string;           // Required
 *   categoryName?: string;        // Optional - for {CATEGORY}-{SEQ} format
 *   departmentName?: string;      // Optional - for {DEPARTMENT}-{SEQ} format
 * }
 *
 * Response:
 * {
 *   success: true;
 *   sku: string;                  // Generated SKU (e.g., "MG-00001")
 *   format: string;               // Format used (e.g., "{BUSINESS}-{SEQ}")
 *   prefix: string;               // Prefix used (e.g., "MG")
 *   sequence: number;             // Sequence number (e.g., 1)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { businessId, categoryName, departmentName } = body;

    // Validate input
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Fetch business with membership check
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      include: {
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
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this business
    const hasAccess =
      user.role?.toLowerCase() === 'admin' ||
      business.business_memberships.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this business' },
        { status: 403 }
      );
    }

    const format = business.sku_format || '{BUSINESS}-{SEQ}';
    const prefix = business.sku_prefix || 'SKU';
    const digits = business.sku_digits || 5;

    // Atomically claim the next sequence number (same logic as the inventory items POST route)
    const claimed = await prisma.$queryRaw<Array<{ next_seq: bigint }>>`
      INSERT INTO sku_sequences ("businessId", prefix, "currentSequence", "updatedAt")
      VALUES (
        ${businessId}::TEXT,
        ${prefix}::VARCHAR,
        COALESCE((
          SELECT MAX(CAST(NULLIF(TRIM(SUBSTRING(sku, LENGTH(${`${prefix}-`}) + 1)), '') AS INTEGER))
          FROM business_products
          WHERE "businessId" = ${businessId}
            AND sku LIKE ${`${prefix}-%`}
        ), 0) + 1,
        NOW()
      )
      ON CONFLICT ("businessId", prefix) DO UPDATE
        SET "currentSequence" = GREATEST(
          sku_sequences."currentSequence",
          COALESCE((
            SELECT MAX(CAST(NULLIF(TRIM(SUBSTRING(sku, LENGTH(${`${prefix}-`}) + 1)), '') AS INTEGER))
            FROM business_products
            WHERE "businessId" = ${businessId}
              AND sku LIKE ${`${prefix}-%`}
          ), 0)
        ) + 1,
        "updatedAt" = NOW()
      RETURNING "currentSequence" AS next_seq
    `;
    const nextSeq = Number(claimed[0]?.next_seq ?? 1);
    const generatedSku = `${prefix}-${String(nextSeq).padStart(digits, '0')}`;

    return NextResponse.json({
      success: true,
      sku: generatedSku,
      format: format,
      prefix: prefix,
      sequence: nextSeq,
      businessName: business.name,
    });
  } catch (error) {
    console.error('Error generating SKU:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate SKU',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/products/generate-sku?businessId=xxx
 *
 * Preview the next SKU that would be generated without actually incrementing the sequence.
 * Useful for showing users what the next SKU will be.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const categoryName = searchParams.get('categoryName');
    const departmentName = searchParams.get('departmentName');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Fetch business with membership check
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      include: {
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
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this business
    const hasAccess =
      user.role?.toLowerCase() === 'admin' ||
      business.business_memberships.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this business' },
        { status: 403 }
      );
    }

    // Determine the prefix based on SKU format
    const format = business.sku_format || '{BUSINESS}-{SEQ}';
    const prefix = business.sku_prefix || 'SKU';
    const digits = business.sku_digits || 5;

    let finalPrefix = prefix;

    // Determine prefix based on format
    if (format === '{CATEGORY}-{SEQ}' && categoryName) {
      finalPrefix = categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    } else if (format === '{DEPARTMENT}-{SEQ}' && departmentName) {
      finalPrefix = departmentName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    } else if (format === '{BUSINESS}-{CATEGORY}-{SEQ}' && categoryName) {
      const catPrefix = categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
      finalPrefix = `${prefix}-${catPrefix}`;
    }

    // Scan actual products to find the true numeric max — sequence table can drift
    const allSkus = await prisma.businessProducts.findMany({
      where: { businessId, sku: { startsWith: `${finalPrefix}-` } },
      select: { sku: true }
    })
    const maxSeq = allSkus.reduce((max, p) => {
      const num = parseInt((p.sku ?? '').replace(`${finalPrefix}-`, ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
    const nextSequence = maxSeq + 1
    const previewSku = `${finalPrefix}-${nextSequence.toString().padStart(digits, '0')}`;

    return NextResponse.json({
      success: true,
      previewSku: previewSku,
      format: format,
      prefix: finalPrefix,
      nextSequence: nextSequence,
      businessName: business.name,
      note: 'This is a preview. The SKU will be generated when you create the product.',
    });
  } catch (error) {
    console.error('Error previewing SKU:', error);
    return NextResponse.json(
      {
        error: 'Failed to preview SKU',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
