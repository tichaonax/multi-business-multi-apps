import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/payments/receipt-counts?paymentIds=a,b,c
 * Returns { [paymentId]: { count, review? } } for badge rendering — avoids N+1
 * queries. `review` is present only for payments requiring receipt
 * accountability (MBM-271) — combo-pay disbursements or opt-in advances.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('paymentIds') ?? ''
    const paymentIds = raw.split(',').map(s => s.trim()).filter(Boolean)

    if (paymentIds.length === 0) {
      return NextResponse.json({ success: true, data: {} })
    }

    const [counts, sums, reviews] = await Promise.all([
      prisma.expensePaymentReceipts.groupBy({
        by: ['expensePaymentId'],
        where: { expensePaymentId: { in: paymentIds } },
        _count: { id: true },
      }),
      prisma.expensePaymentReceipts.groupBy({
        by: ['expensePaymentId'],
        where: { expensePaymentId: { in: paymentIds } },
        _sum: { amount: true },
      }),
      prisma.expensePaymentReceiptReviews.findMany({
        where: { expensePaymentId: { in: paymentIds } },
        select: { expensePaymentId: true, status: true, expectedAmount: true, createdAt: true },
      }),
    ])

    const sumByPayment = new Map(sums.map(s => [s.expensePaymentId, Number(s._sum.amount ?? 0)]))
    const reviewByPayment = new Map(reviews.map(r => [r.expensePaymentId, r]))

    // Need paidAt for "days since disbursed" when a review row exists
    const reviewedPaymentIds = reviews.map(r => r.expensePaymentId)
    const paidAtByPayment = new Map<string, Date | null>()
    if (reviewedPaymentIds.length > 0) {
      const payments = await prisma.expenseAccountPayments.findMany({
        where: { id: { in: reviewedPaymentIds } },
        select: { id: true, paidAt: true },
      })
      for (const p of payments) paidAtByPayment.set(p.id, p.paidAt)
    }

    const result: Record<string, { count: number; review?: { status: string; total: number; expected: number; daysSincePaid: number } }> = {}
    for (const row of counts) {
      result[row.expensePaymentId] = { count: row._count.id }
    }
    for (const paymentId of paymentIds) {
      if (!result[paymentId]) result[paymentId] = { count: 0 }
      const review = reviewByPayment.get(paymentId)
      if (review) {
        const disbursedAt = paidAtByPayment.get(paymentId) ?? review.createdAt
        result[paymentId].review = {
          status: review.status,
          total: sumByPayment.get(paymentId) ?? 0,
          expected: Number(review.expectedAmount),
          daysSincePaid: Math.floor((Date.now() - disbursedAt.getTime()) / (24 * 60 * 60 * 1000)),
        }
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching receipt counts:', error)
    return NextResponse.json({ error: 'Failed to fetch receipt counts' }, { status: 500 })
  }
}
