import { NextRequest, NextResponse } from 'next/server'
import { calculateCancellationRefund } from '@/lib/layby/business-rules'

/**
 * POST /api/layby-rules/calculate-refund
 * Calculate cancellation refund based on business rules
 *
 * Body:
 * - businessType: string (required)
 * - totalPaid: number (required)
 * - depositAmount: number (required)
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

    if (typeof body.totalPaid !== 'number' || body.totalPaid < 0) {
      return NextResponse.json(
        { error: 'totalPaid must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof body.depositAmount !== 'number' || body.depositAmount < 0) {
      return NextResponse.json(
        { error: 'depositAmount must be a non-negative number' },
        { status: 400 }
      )
    }

    // Calculate refund
    const refundCalculation = calculateCancellationRefund(
      body.businessType,
      body.totalPaid,
      body.depositAmount
    )

    return NextResponse.json({
      data: {
        ...refundCalculation,
        totalPaid: body.totalPaid,
        depositAmount: body.depositAmount,
        businessType: body.businessType
      },
      message: 'Refund calculated successfully'
    })
  } catch (error) {
    console.error('Error calculating refund:', error)
    return NextResponse.json(
      { error: 'Failed to calculate refund' },
      { status: 500 }
    )
  }
}
