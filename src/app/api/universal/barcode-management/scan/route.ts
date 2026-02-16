import { NextRequest, NextResponse } from 'next/server';


import { lookupBarcode } from '@/lib/barcode-lookup';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/universal/barcode-management/scan
 *
 * Four-tier barcode lookup:
 * 1. Check existing products
 * 1.5. Check clothing bales (by barcode or SKU)
 * 2. Check barcode templates
 * 3. Return not found
 *
 * Phase 6: Template-Based Product Creation
 *
 * Request body:
 * {
 *   barcode: string;
 *   businessId: string;
 * }
 *
 * Response:
 * {
 *   type: 'product' | 'template' | 'not_found';
 *   data?: ProductLookupData | TemplateLookupData;
 *   barcode?: string; // For not_found type
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
    const { barcode, businessId } = body;

    // Validate input
    if (!barcode || typeof barcode !== 'string') {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Perform three-tier lookup
    const result = await lookupBarcode(barcode.trim(), businessId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in barcode scan API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/universal/barcode-management/scan?barcode=xxx&businessId=yyy
 *
 * Alternative GET endpoint for barcode lookup
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
    const barcode = searchParams.get('barcode');
    const businessId = searchParams.get('businessId');

    // Validate input
    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Perform three-tier lookup
    const result = await lookupBarcode(barcode.trim(), businessId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in barcode scan API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
