import { NextRequest, NextResponse } from 'next/server'
import { seedClothingProducts } from '@/lib/seed-clothing-products'

/**
 * POST /api/admin/clothing/seed-products
 *
 * Seeds common clothing products (1067 items) for a specific clothing business.
 * This helps with bulk product registration by pre-populating products with zero quantities.
 *
 * Body: { businessId: string }
 *
 * Returns:
 * - 200: Success with import statistics
 * - 400: Invalid request (missing businessId, wrong business type, etc.)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { businessId } = body

    // Validate businessId
    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'businessId is required and must be a string'
        },
        { status: 400 }
      )
    }

    // Call seeding function
    const result = await seedClothingProducts(businessId)

    // If seeding failed, return appropriate error
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message || 'Failed to seed products',
          data: {
            imported: result.imported,
            skipped: result.skipped,
            errors: result.errors,
            totalProducts: result.totalProducts
          }
        },
        { status: 400 }
      )
    }

    // Success - return results
    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        totalProducts: result.totalProducts,
        errorLog: result.errors > 0 ? result.errorLog.slice(0, 10) : [] // Limit error log to first 10
      }
    })

  } catch (error: any) {
    console.error('Error in seed-products API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    )
  }
}
