import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// GET /api/business/[businessId]/suppliers/payment-summaries
// Returns per-supplier payment summary for the supplier list badges.
// Requires canViewSupplierPaymentQueue permission.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canViewSupplierPaymentQueue) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const requests = await prisma.supplierPaymentRequests.findMany({
      where: { businessId },
      select: {
        supplierId: true,
        amount: true,
        paidAmount: true,
        status: true,
        items: { select: { amount: true, approvedAmount: true, status: true } },
      },
    })

    // Fetch ratings for the business in one query
    const ratings = await prisma.supplierRatings.findMany({
      where: { businessId },
      select: { supplierId: true, rating: true },
    })

    // Compute average rating per supplier
    const ratingsBySupplier: Record<string, number[]> = {}
    for (const r of ratings) {
      if (!ratingsBySupplier[r.supplierId]) ratingsBySupplier[r.supplierId] = []
      ratingsBySupplier[r.supplierId].push(r.rating)
    }

    const summaries: Record<string, {
      totalSubmitted: number
      totalApproved: number
      totalPaid: number
      outstanding: number
      pendingCount: number
      requestCount: number
      averageRating: number | null
    }> = {}

    for (const r of requests) {
      const sid = r.supplierId
      if (!summaries[sid]) {
        summaries[sid] = { totalSubmitted: 0, totalApproved: 0, totalPaid: 0, outstanding: 0, pendingCount: 0, requestCount: 0, averageRating: null }
      }
      const s = summaries[sid]
      const reqAmount = parseFloat(r.amount.toString())
      const paidAmount = parseFloat(r.paidAmount.toString())

      // Approved total: item-based or request-level
      let approvedTotal = 0
      if (r.items && r.items.length > 0) {
        approvedTotal = r.items
          .filter((i: any) => ['APPROVED', 'PAID'].includes(i.status))
          .reduce((sum: number, i: any) => {
            const a = i.approvedAmount != null
              ? parseFloat(i.approvedAmount.toString())
              : parseFloat(i.amount.toString())
            return sum + a
          }, 0)
      } else if (!['PENDING', 'DENIED'].includes(r.status)) {
        approvedTotal = reqAmount
      }

      s.requestCount++
      s.totalSubmitted += reqAmount
      s.totalPaid += paidAmount
      s.totalApproved += approvedTotal
      if (['PENDING', 'APPROVED', 'PARTIAL'].includes(r.status)) {
        s.pendingCount++
      }
    }

    // Outstanding = approved - paid (per supplier); also attach average rating
    for (const sid in summaries) {
      summaries[sid].outstanding = Math.max(0, summaries[sid].totalApproved - summaries[sid].totalPaid)
      const rArr = ratingsBySupplier[sid]
      if (rArr && rArr.length > 0) {
        summaries[sid].averageRating = rArr.reduce((a, b) => a + b, 0) / rArr.length
      }
    }

    // Add entries for suppliers that have ratings but no payment requests
    for (const sid in ratingsBySupplier) {
      if (!summaries[sid]) {
        const rArr = ratingsBySupplier[sid]
        summaries[sid] = {
          totalSubmitted: 0, totalApproved: 0, totalPaid: 0,
          outstanding: 0, pendingCount: 0, requestCount: 0,
          averageRating: rArr.reduce((a, b) => a + b, 0) / rArr.length,
        }
      }
    }

    return NextResponse.json({ success: true, summaries })
  } catch (error) {
    console.error('Error fetching supplier payment summaries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
