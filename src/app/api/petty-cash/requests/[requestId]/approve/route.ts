import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { approvePettyCashInTx } from '@/lib/petty-cash-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

async function hasPettyCashApprove(userId: string): Promise<boolean> {
  const record = await prisma.userPermissions.findFirst({
    where: { userId, granted: true, permission: { name: 'petty_cash.approve' } },
  })
  return !!record
}

/**
 * POST /api/petty-cash/requests/[requestId]/approve
 * Cashier approves the request. Cash comes from the physical cash bucket. Atomically:
 *   1. Debits the cash bucket (OUTFLOW)
 *   2. Creates an ExpenseAccountDeposit (PETTY_CASH) into the expense account
 *   3. Updates request status to APPROVED
 * Body: { approvedAmount }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isSystemAdmin(user) && !(await hasPettyCashApprove(user.id))) {
      return NextResponse.json({ error: 'You do not have permission to approve petty cash requests' }, { status: 403 })
    }

    const { requestId } = await params
    const body = await request.json()
    const { approvedAmount, signatureData } = body

    if (!approvedAmount || Number(approvedAmount) <= 0) {
      return NextResponse.json({ error: 'approvedAmount must be a positive number' }, { status: 400 })
    }

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
      include: { business: { select: { id: true, name: true } } },
    })

    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })
    if (pcRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot approve a request with status ${pcRequest.status}` },
        { status: 400 }
      )
    }

    const amount = Number(approvedAmount)
    if (amount > Number(pcRequest.requestedAmount)) {
      return NextResponse.json(
        { error: 'approvedAmount cannot exceed the requestedAmount' },
        { status: 400 }
      )
    }

    const isEcocash = (pcRequest as any).paymentChannel === 'ECOCASH'

    // Verify business has sufficient funds in the appropriate bucket
    const bucketRows = await prisma.cashBucketEntry.groupBy({
      by: ['direction'],
      where: { businessId: pcRequest.businessId, paymentChannel: isEcocash ? 'ECOCASH' : 'CASH' },
      _sum: { amount: true },
    })
    const bucketInflow = Number(bucketRows.find(r => r.direction === 'INFLOW')?._sum.amount ?? 0)
    const bucketOutflow = Number(bucketRows.find(r => r.direction === 'OUTFLOW')?._sum.amount ?? 0)
    const bucketBalance = bucketInflow - bucketOutflow
    const bucketLabel = isEcocash ? 'EcoCash wallet' : 'cash bucket'
    if (bucketBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient funds in ${bucketLabel} for ${pcRequest.business?.name ?? 'this business'}. Available: $${bucketBalance.toFixed(2)}, Required: $${amount.toFixed(2)}` },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const { depositId } = await approvePettyCashInTx(tx, requestId, amount, user.id, false, signatureData)

      const updated = await tx.pettyCashRequests.findUnique({
        where: { id: requestId },
        include: {
          business: { select: { id: true, name: true, type: true } },
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
        },
      })

      return { updated, depositId }
    })

    // Notify the requester that their request was approved
    await emitNotification({
      userIds: [result.updated.requestedBy],
      type: 'PETTY_CASH_APPROVED',
      title: 'Petty Cash Approved',
      message: `Your request for $${amount.toFixed(2)} (${pcRequest.purpose}) has been approved by ${user.name}`,
      linkUrl: `/petty-cash/${requestId}`,
    })

    return NextResponse.json({
      success: true,
      message: `Petty cash request approved for $${amount.toFixed(2)}`,
      data: {
        request: {
          id: result.updated.id,
          status: result.updated.status,
          approvedAmount: Number(result.updated.approvedAmount),
          approvedAt: result.updated.approvedAt?.toISOString(),
          approver: result.updated.approver,
          depositId: result.updated.depositId,
        },
      },
    })
  } catch (error) {
    console.error('Error approving petty cash request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve petty cash request' },
      { status: 500 }
    )
  }
}
