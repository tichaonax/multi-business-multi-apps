import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/reports/coupon-usage?businessId=xxx&startDate=xxx&endDate=xxx
 * Coupon usage report: coupons redeemed, total discount given, by date range
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    // Get all coupon usages for this business's coupons
    const usages = await prisma.couponUsages.findMany({
      where: {
        coupons: { businessId },
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
      },
      include: {
        coupons: { select: { code: true, description: true, discountAmount: true } },
        orders: { select: { orderNumber: true, totalAmount: true, createdAt: true } },
        employees: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Aggregate by coupon
    const byCoupon: Record<string, { code: string; description: string | null; timesUsed: number; totalDiscount: number }> = {}
    let totalRedemptions = 0
    let totalDiscountGiven = 0

    for (const usage of usages) {
      const code = usage.coupons.code
      if (!byCoupon[code]) {
        byCoupon[code] = {
          code,
          description: usage.coupons.description,
          timesUsed: 0,
          totalDiscount: 0
        }
      }
      byCoupon[code].timesUsed++
      byCoupon[code].totalDiscount += Number(usage.appliedAmount)
      totalRedemptions++
      totalDiscountGiven += Number(usage.appliedAmount)
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRedemptions,
          totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
          uniqueCouponsUsed: Object.keys(byCoupon).length
        },
        byCoupon: Object.values(byCoupon).sort((a, b) => b.timesUsed - a.timesUsed),
        details: usages.map((u: any) => ({
          couponCode: u.coupons.code,
          appliedAmount: Number(u.appliedAmount),
          orderNumber: u.orders.orderNumber,
          orderTotal: Number(u.orders.totalAmount),
          approvedBy: u.employees?.name || null,
          date: u.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Coupon usage report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
