import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/eod-payment-batches?businessId=&status=
 * Returns EOD payment batches, optionally filtered by business and/or status.
 * Cashier sees only PENDING_REVIEW batches by default.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || undefined
    const status = searchParams.get('status') || 'PENDING_REVIEW'

    const batches = await prisma.eODPaymentBatch.findMany({
      where: {
        ...(businessId ? { businessId } : {}),
        status,
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        reviewer: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { eodDate: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: batches.map((b) => ({
        id: b.id,
        businessId: b.businessId,
        business: b.business,
        eodDate: b.eodDate.toISOString().split('T')[0],
        status: b.status,
        approvedCount: b.approvedCount,
        rejectedCount: b.rejectedCount,
        totalApproved: b.totalApproved != null ? Number(b.totalApproved) : null,
        paymentCount: b._count.payments,
        reviewedBy: b.reviewedBy,
        reviewer: b.reviewer,
        reviewedAt: b.reviewedAt?.toISOString() ?? null,
        notes: b.notes,
        createdAt: b.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching EOD payment batches:', error)
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}
