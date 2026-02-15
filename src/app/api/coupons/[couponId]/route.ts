import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/coupons/[couponId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params

    const coupon = await prisma.coupons.findUnique({
      where: { id: couponId },
      include: {
        employees: {
          select: { firstName: true, lastName: true }
        },
        coupon_usages: {
          include: {
            orders: {
              select: { orderNumber: true, totalAmount: true, createdAt: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: {
          select: { coupon_usages: true }
        }
      }
    })

    if (!coupon) {
      return NextResponse.json({
        success: false,
        error: 'Coupon not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: coupon
    })

  } catch (error) {
    console.error('Coupon fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch coupon'
    }, { status: 500 })
  }
}

// PUT /api/coupons/[couponId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params
    const data = await request.json()

    const { code, barcode, description, discountAmount, isActive } = data

    if (discountAmount !== undefined && discountAmount > 20) {
      return NextResponse.json({
        success: false,
        error: 'Discount amount cannot exceed $20'
      }, { status: 400 })
    }

    if (discountAmount !== undefined && discountAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Discount amount must be greater than 0'
      }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (code !== undefined) updateData.code = code.toUpperCase()
    if (barcode !== undefined) updateData.barcode = barcode || null
    if (description !== undefined) updateData.description = description || null
    if (discountAmount !== undefined) {
      updateData.discountAmount = discountAmount
      updateData.requiresApproval = discountAmount > 5
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const coupon = await prisma.coupons.update({
      where: { id: couponId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: coupon
    })

  } catch (error) {
    console.error('Coupon update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update coupon'
    }, { status: 500 })
  }
}

// DELETE /api/coupons/[couponId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params

    // Check if coupon has been used
    const usageCount = await prisma.couponUsages.count({
      where: { couponId }
    })

    if (usageCount > 0) {
      // Soft delete - deactivate instead of deleting
      await prisma.coupons.update({
        where: { id: couponId },
        data: { isActive: false }
      })

      return NextResponse.json({
        success: true,
        data: { deactivated: true, message: 'Coupon has usage history and was deactivated instead of deleted' }
      })
    }

    await prisma.coupons.delete({
      where: { id: couponId }
    })

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })

  } catch (error) {
    console.error('Coupon delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete coupon'
    }, { status: 500 })
  }
}
