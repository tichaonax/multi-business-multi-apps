import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/coupons/validate
// Validates a coupon code or barcode for POS use
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { businessId, code, barcode } = data

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    if (!code && !barcode) {
      return NextResponse.json({
        success: false,
        error: 'Coupon code or barcode is required'
      }, { status: 400 })
    }

    // Find coupon by code or barcode
    const coupon = await prisma.coupons.findFirst({
      where: {
        businessId,
        isActive: true,
        ...(code
          ? { code: code.toUpperCase() }
          : { barcode })
      }
    })

    if (!coupon) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or inactive coupon'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountAmount: coupon.discountAmount,
        requiresApproval: coupon.requiresApproval
      }
    })

  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to validate coupon'
    }, { status: 500 })
  }
}
