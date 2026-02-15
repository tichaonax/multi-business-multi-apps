import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/coupons?businessId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    const coupons = await prisma.coupons.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        employees: {
          select: { firstName: true, lastName: true }
        },
        _count: {
          select: { coupon_usages: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: coupons
    })

  } catch (error) {
    console.error('Coupons fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch coupons'
    }, { status: 500 })
  }
}

// POST /api/coupons
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const {
      businessId,
      code,
      barcode,
      description,
      discountAmount,
      createdBy
    } = data

    // Validation
    if (!businessId || !code || discountAmount === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Business ID, code, and discount amount are required'
      }, { status: 400 })
    }

    if (discountAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Discount amount must be greater than 0'
      }, { status: 400 })
    }

    if (discountAmount > 20) {
      return NextResponse.json({
        success: false,
        error: 'Discount amount cannot exceed $20'
      }, { status: 400 })
    }

    // Check for duplicate code in same business
    const existing = await prisma.coupons.findUnique({
      where: {
        businessId_code: { businessId, code: code.toUpperCase() }
      }
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'A coupon with this code already exists'
      }, { status: 409 })
    }

    const coupon = await prisma.coupons.create({
      data: {
        businessId,
        code: code.toUpperCase(),
        barcode: barcode || null,
        description: description || null,
        discountAmount,
        requiresApproval: discountAmount > 5,
        isActive: true,
        createdBy: createdBy || null
      }
    })

    return NextResponse.json({
      success: true,
      data: coupon
    })

  } catch (error) {
    console.error('Coupon creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create coupon'
    }, { status: 500 })
  }
}
