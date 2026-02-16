import { NextRequest, NextResponse } from 'next/server';


import { trackTemplateUsage } from '@/lib/barcode-lookup';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/universal/barcode-management/track-template-usage
 *
 * Track when a product is created from a barcode template
 * Phase 6: Template-Based Product Creation
 *
 * Request body:
 * {
 *   templateId: string;
 *   productId: string;
 *   userId: string;
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
    const { templateId, productId, userId } = body;

    // Validate input
    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Track template usage
    await trackTemplateUsage(templateId, productId, userId);

    return NextResponse.json({
      success: true,
      message: 'Template usage tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking template usage:', error);
    return NextResponse.json(
      {
        error: 'Failed to track template usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
