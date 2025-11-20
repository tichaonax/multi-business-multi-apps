import { NextRequest, NextResponse } from 'next/server'
import { seedRestaurantProducts } from '@/lib/seed-restaurant-products'

/**
 * POST /api/admin/restaurant/seed-products
 *
 * Seeds default restaurant menu items for a specific restaurant business.
 * This helps restaurants get started quickly by pre-populating products with zero prices.
 * Each restaurant can then set their own pricing.
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
    const result = await seedRestaurantProducts(businessId)

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
    console.error('Error in restaurant seed-products API:', error)
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
