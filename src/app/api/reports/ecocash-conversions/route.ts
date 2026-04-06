import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/ecocash-conversions
 * Query params: businessId (required), startDate, endDate
 *
 * Returns per-conversion rows for completed conversions plus summary totals
 * for all statuses in the period.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    const where: any = { businessId }
    if (Object.keys(dateFilter).length > 0) where.requestedAt = dateFilter

    const conversions = await prisma.ecocashConversion.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        completer: { select: { id: true, name: true } },
        rejecter: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: 'desc' },
    })

    // Summary totals from COMPLETED conversions only
    let totalRequested = 0
    let totalConverted = 0
    let pendingCount = 0
    let approvedCount = 0
    let completedCount = 0
    let rejectedCount = 0

    const rows = conversions.map((c) => {
      const requested = Number(c.amount)
      const tendered = c.tenderedAmount ? Number(c.tenderedAmount) : null

      if (c.status === 'COMPLETED') {
        totalRequested += requested
        totalConverted += tendered ?? 0
        completedCount++
      } else if (c.status === 'PENDING') {
        pendingCount++
      } else if (c.status === 'APPROVED') {
        approvedCount++
      } else if (c.status === 'REJECTED') {
        rejectedCount++
      }

      return {
        id: c.id,
        requestedAt: c.requestedAt,
        completedAt: c.completedAt,
        amount: requested,
        tenderedAmount: tendered,
        variance: tendered !== null ? tendered - requested : null,
        status: c.status,
        notes: c.notes,
        requestedBy: c.requester?.name ?? c.requestedBy,
        approvedBy: c.approver?.name ?? c.approvedBy ?? null,
        completedBy: c.completer?.name ?? c.completedBy ?? null,
        rejectedBy: c.rejecter?.name ?? c.rejectedBy ?? null,
        rejectionReason: c.rejectionReason,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        conversions: rows,
        summary: {
          totalRequested,
          totalConverted,
          totalVariance: totalConverted - totalRequested,
          completedCount,
          pendingCount,
          approvedCount,
          rejectedCount,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching ecocash conversion report:', error)
    return NextResponse.json({ error: 'Failed to fetch ecocash conversion report' }, { status: 500 })
  }
}
