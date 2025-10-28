import { NextRequest, NextResponse } from 'next/server'
import {
  getBusinessRules,
  getAllBusinessTypes,
  getBusinessTypeName,
  validateLaybyAgainstRules,
  calculateRecommendedFees,
  calculateCancellationRefund,
  BusinessType,
  LaybyValidationInput
} from '@/lib/layby/business-rules'

/**
 * GET /api/layby-rules
 * Get business rules for a specific business type or all types
 *
 * Query params:
 * - businessType: optional, specific business type to get rules for
 * - all: optional, set to 'true' to get all business types
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessType = searchParams.get('businessType')
    const getAll = searchParams.get('all') === 'true'

    if (getAll) {
      // Return all business types with their rules
      const allTypes = getAllBusinessTypes()
      const allRules = allTypes.map(type => ({
        type,
        name: getBusinessTypeName(type),
        rules: getBusinessRules(type)
      }))

      return NextResponse.json({
        data: allRules,
        message: 'All business rules retrieved successfully'
      })
    }

    if (businessType) {
      // Return rules for specific business type
      const rules = getBusinessRules(businessType)

      return NextResponse.json({
        data: {
          businessType,
          name: getBusinessTypeName(businessType as BusinessType),
          rules
        },
        message: 'Business rules retrieved successfully'
      })
    }

    // Return list of available business types
    const allTypes = getAllBusinessTypes()
    const businessTypes = allTypes.map(type => ({
      type,
      name: getBusinessTypeName(type)
    }))

    return NextResponse.json({
      data: businessTypes,
      message: 'Available business types retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching business rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/layby-rules/validate
 * Validate a layby configuration against business rules
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.businessType) {
      return NextResponse.json(
        { error: 'businessType is required' },
        { status: 400 }
      )
    }

    const input: LaybyValidationInput = {
      businessType: body.businessType,
      depositPercent: body.depositPercent || 0,
      installmentFrequency: body.installmentFrequency,
      durationDays: body.durationDays || 0,
      totalAmount: body.totalAmount || 0,
      itemCount: body.itemCount || 0
    }

    // Validate against business rules
    const validationResult = validateLaybyAgainstRules(input)

    // Calculate recommended fees
    const recommendedFees = calculateRecommendedFees(
      input.businessType,
      input.totalAmount
    )

    // Get business rules for reference
    const rules = getBusinessRules(input.businessType)

    return NextResponse.json({
      data: {
        validation: validationResult,
        recommendedFees,
        businessRules: rules
      },
      message: validationResult.valid
        ? 'Layby configuration is valid'
        : 'Layby configuration has validation errors'
    })
  } catch (error) {
    console.error('Error validating layby rules:', error)
    return NextResponse.json(
      { error: 'Failed to validate layby configuration' },
      { status: 500 }
    )
  }
}
