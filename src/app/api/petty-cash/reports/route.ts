import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/petty-cash/reports
 * Report data for petty cash activity.
 * Query params: businessId, dateFrom, dateTo, status, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25'))
    const offset = (page - 1) * limit

    const where: any = {}
    if (businessId) where.businessId = businessId
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.requestedAt = {}
      if (dateFrom) where.requestedAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.requestedAt.lte = end
      }
    }

    // All requests for summary + per-business breakdown
    const allRequests = await prisma.pettyCashRequests.findMany({
      where,
      select: {
        id: true,
        businessId: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        returnAmount: true,
        business: { select: { id: true, name: true, type: true } },
      },
    })

    // Paginated list for the table
    const [tableRequests, total] = await Promise.all([
      prisma.pettyCashRequests.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, type: true } },
          requester: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          settler: { select: { id: true, name: true } },
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.pettyCashRequests.count({ where }),
    ])

    // Compute overall summary
    const summary = allRequests.reduce(
      (acc: { totalRequested: number; totalApproved: number; totalReturned: number; outstandingCount: number }, r: any) => {
        acc.totalRequested += Number(r.requestedAmount)
        acc.totalApproved += Number(r.approvedAmount ?? 0)
        acc.totalReturned += Number(r.returnAmount ?? 0)
        if (r.status === 'APPROVED') acc.outstandingCount += 1
        return acc
      },
      { totalRequested: 0, totalApproved: 0, totalReturned: 0, outstandingCount: 0 }
    )

    // Per-business breakdown
    const businessMap = new Map<string, { business: any; totalRequested: number; totalApproved: number; totalReturned: number; netSpend: number; outstandingCount: number }>()
    for (const r of allRequests) {
      const key = r.businessId
      if (!businessMap.has(key)) {
        businessMap.set(key, {
          business: r.business,
          totalRequested: 0,
          totalApproved: 0,
          totalReturned: 0,
          netSpend: 0,
          outstandingCount: 0,
        })
      }
      const entry = businessMap.get(key)!
      entry.totalRequested += Number(r.requestedAmount)
      entry.totalApproved += Number(r.approvedAmount ?? 0)
      entry.totalReturned += Number(r.returnAmount ?? 0)
      entry.netSpend = entry.totalApproved - entry.totalReturned
      if (r.status === 'APPROVED') entry.outstandingCount += 1
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...summary,
          netSpend: summary.totalApproved - summary.totalReturned,
        },
        byBusiness: Array.from(businessMap.values()),
        requests: tableRequests.map((r: any) => ({
          id: r.id,
          business: r.business,
          requester: r.requester,
          approver: r.approver,
          settler: r.settler,
          status: r.status,
          requestedAmount: Number(r.requestedAmount),
          approvedAmount: r.approvedAmount != null ? Number(r.approvedAmount) : null,
          returnAmount: r.returnAmount != null ? Number(r.returnAmount) : null,
          netSpend: r.approvedAmount != null
            ? Number(r.approvedAmount) - Number(r.returnAmount ?? 0)
            : null,
          purpose: r.purpose,
          requestedAt: r.requestedAt.toISOString(),
          approvedAt: r.approvedAt?.toISOString() || null,
          settledAt: r.settledAt?.toISOString() || null,
        })),
        pagination: { total, page, limit, hasMore: offset + limit < total },
      },
    })
  } catch (error) {
    console.error('Error fetching petty cash report:', error)
    return NextResponse.json({ error: 'Failed to fetch petty cash report' }, { status: 500 })
  }
}
