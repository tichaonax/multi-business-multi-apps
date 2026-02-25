import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// GET /api/business/[businessId]/suppliers/[id]/payment-history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, id: supplierId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canViewSupplierPaymentQueue) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const requests = await prisma.supplierPaymentRequests.findMany({
      where: { businessId, supplierId },
      include: {
        items: { select: { id: true, amount: true, approvedAmount: true, status: true } },
        submitter: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        partialPayments: {
          include: { payer: { select: { id: true, name: true } } },
          orderBy: { paidAt: 'asc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    // Compute approved total for one request using its line items (or request-level amount)
    function calcApprovedTotal(r: any, parsedAmount: number): number {
      if (r.items && r.items.length > 0) {
        return r.items
          .filter((i: any) => ['APPROVED', 'PAID'].includes(i.status))
          .reduce((s: number, i: any) => {
            const a = i.approvedAmount != null
              ? parseFloat(i.approvedAmount.toString())
              : parseFloat(i.amount.toString())
            return s + a
          }, 0)
      }
      // No line items — use request amount if approved/partial/paid
      return ['PENDING', 'DENIED'].includes(r.status) ? 0 : parsedAmount
    }

    const reqList = requests.map((r: typeof requests[0]) => {
      const amount = parseFloat(r.amount.toString())
      const paidAmount = parseFloat(r.paidAmount.toString())
      const approvedTotal = calcApprovedTotal(r, amount)
      return {
        ...r,
        amount,
        paidAmount,
        approvedTotal,
        remainingAmount: Math.max(0, approvedTotal - paidAmount),
        items: r.items.map((i: any) => ({
          ...i,
          amount: parseFloat(i.amount.toString()),
          approvedAmount: i.approvedAmount != null ? parseFloat(i.approvedAmount.toString()) : null,
        })),
        partialPayments: r.partialPayments.map((p: typeof r.partialPayments[0]) => ({
          ...p,
          amount: parseFloat(p.amount.toString()),
        })),
      }
    })

    const totalRequested = reqList.reduce((sum: number, r: typeof reqList[0]) => sum + r.amount, 0)
    const totalPaid      = reqList.reduce((sum: number, r: typeof reqList[0]) => sum + r.paidAmount, 0)
    const totalApproved  = reqList.reduce((sum: number, r: typeof reqList[0]) => sum + r.approvedTotal, 0)
    // Outstanding = approved but not yet paid (across ALL statuses, including PAID-with-remaining)
    const totalOutstanding = Math.max(0, totalApproved - totalPaid)

    const pendingCount  = reqList.filter((r: typeof reqList[0]) => r.status === 'PENDING').length
    const approvedCount = reqList.filter((r: typeof reqList[0]) => r.status === 'APPROVED').length
    const partialCount  = reqList.filter((r: typeof reqList[0]) => r.status === 'PARTIAL').length
    const paidCount     = reqList.filter((r: typeof reqList[0]) => r.status === 'PAID').length
    const deniedCount   = reqList.filter((r: typeof reqList[0]) => r.status === 'DENIED').length

    // Latest payment date across all partial payments
    const allPaymentDates = reqList.flatMap((r: typeof reqList[0]) =>
      r.partialPayments.map((p: any) => new Date(p.paidAt).getTime())
    )
    const lastPaymentDate = allPaymentDates.length > 0
      ? new Date(Math.max(...allPaymentDates)).toISOString()
      : null

    // Oldest pending request date
    const pendingReqs = reqList.filter((r: typeof reqList[0]) => r.status === 'PENDING')
    const oldestPendingDate = pendingReqs.length > 0
      ? pendingReqs.reduce((oldest: typeof reqList[0], r: typeof reqList[0]) =>
          new Date(r.submittedAt) < new Date(oldest.submittedAt) ? r : oldest
        ).submittedAt
      : null

    return NextResponse.json({
      success: true,
      data: {
        requests: reqList,
        summary: {
          totalRequested,
          totalApproved,
          totalPaid,
          totalOutstanding,
          requestCount: reqList.length,
          pendingCount,
          approvedCount,
          partialCount,
          paidCount,
          deniedCount,
          lastPaymentDate,
          oldestPendingDate,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching supplier payment history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
