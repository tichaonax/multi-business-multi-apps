import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/db';

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this business
    const hasAccess =
      session.user.role === 'ADMIN' ||
      business.business_members.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this business' },
        { status: 403 }
      );
    }

    // Call the PostgreSQL function generate_next_sku()
    // This function was created in Phase 1: Migration 4
    const result = await prisma.$queryRaw<Array<{ generate_next_sku: string }>>`
      SELECT generate_next_sku(
        ${businessId}::TEXT,
        ${categoryName || null}::VARCHAR,
        ${departmentName || null}::VARCHAR
      )
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate SKU' },
        { status: 500 }
      );
    }

    const generatedSku = result[0].generate_next_sku;

    // Parse the SKU to extract prefix and sequence
    const skuParts = generatedSku.split('-');
    const prefix = skuParts.slice(0, -1).join('-');
    const sequenceStr = skuParts[skuParts.length - 1];
    const sequence = parseInt(sequenceStr, 10);

    // Get the format from business settings
    const format = business.sku_format || '{BUSINESS}-{SEQ}';

    return NextResponse.json({
      success: true,
      sku: generatedSku,
      format: format,
      prefix: prefix,
      sequence: sequence,
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this business
    const hasAccess =
      session.user.role === 'ADMIN' ||
      business.business_members.length > 0;

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

    // Get the current sequence for this prefix
    const sequenceRecord = await prisma.sku_sequences.findUnique({
      where: {
        businessId_prefix: {
          businessId: businessId,
          prefix: finalPrefix,
        },
      },
    });

    const nextSequence = sequenceRecord ? sequenceRecord.currentSequence + 1 : 1;
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
