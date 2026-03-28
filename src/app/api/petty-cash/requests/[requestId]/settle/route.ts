import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

async function hasPettyCashApprove(userId: string): Promise<boolean> {
  const record = await prisma.userPermissions.findFirst({
    where: { userId, granted: true, permission: { name: 'petty_cash.approve' } },
  })
  return !!record
}

/**
 * POST /api/petty-cash/requests/[requestId]/settle
 * Settle a petty cash request.
 *   Cash requests  — cashier/approver settles (receives physical cash back).
 *   EcoCash requests — requester settles (sends unused EcoCash back to business).
 *
 * Body: { returnAmount, notes?, returnEcocashCode? }
 *   returnAmount — unused amount returned. Must be >= 0 and <= approvedAmount.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requestId } = await params
    const body = await request.json()
    const returnAmount = Number(body.returnAmount ?? 0)
    const notes = body.notes?.trim() || null

    if (isNaN(returnAmount) || returnAmount < 0) {
      return NextResponse.json({ error: 'returnAmount must be zero or a positive number' }, { status: 400 })
    }

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
    })
    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })

    // Either the approver OR the requester can settle
    const canApprove = isSystemAdmin(user) || await hasPettyCashApprove(user.id)
    const isRequester = pcRequest.requestedBy === user.id
    if (!canApprove && !isRequester) {
      return NextResponse.json({ error: 'You do not have permission to settle this petty cash request' }, { status: 403 })
    }

    if (pcRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Only APPROVED requests can be settled. Current status: ${pcRequest.status}` },
        { status: 400 }
      )
    }

    const approvedAmount = Number(pcRequest.approvedAmount)
    if (returnAmount > approvedAmount) {
      return NextResponse.json(
        { error: `returnAmount ($${returnAmount.toFixed(2)}) cannot exceed approvedAmount ($${approvedAmount.toFixed(2)})` },
        { status: 400 }
      )
    }

    const now = new Date()

    const result = await prisma.$transaction(async (tx: any) => {
      let returnPaymentId: string | null = null

      if (returnAmount > 0) {
        // 1. Create ExpenseAccountPayment: money OUT of expense account (auto-PAID immediately)
        const returnPayment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: pcRequest.expenseAccountId,
            payeeType: 'NONE',
            amount: returnAmount,
            paymentDate: now,
            notes: notes || `Petty cash return: ${pcRequest.purpose}`,
            status: 'PAID',
            paymentType: 'PETTY_CASH_RETURN',
            paidAt: now,
            createdBy: user.id,
            submittedBy: user.id,
            submittedAt: now,
          },
        })
        returnPaymentId = returnPayment.id

        // 2. Update expense account balance (debit for the return)
        await updateExpenseAccountBalanceTx(tx, pcRequest.expenseAccountId)

        // 3. Credit the physical cash bucket — cash/ecocash is back
        await tx.cashBucketEntry.create({
          data: {
            businessId: pcRequest.businessId,
            entryType: 'PETTY_CASH_RETURN',
            direction: 'INFLOW',
            amount: returnAmount,
            paymentChannel: pcRequest.paymentChannel ?? 'CASH',
            referenceType: 'PETTY_CASH_RETURN',
            referenceId: requestId,
            notes: `Petty cash return: ${pcRequest.purpose}`,
            entryDate: now,
            createdBy: user.id,
          } as any,
        })
      }

      // 5. Settle the request
      const updated = await tx.pettyCashRequests.update({
        where: { id: requestId },
        data: {
          status: 'SETTLED',
          settledBy: user.id,
          settledAt: now,
          returnAmount,
          returnPaymentId,
          notes: notes && !pcRequest.notes ? notes : pcRequest.notes,
        },
        include: {
          business: { select: { id: true, name: true, type: true } },
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          settler: { select: { id: true, name: true, email: true } },
        },
      })

      return { updated, returnPaymentId }
    })

    const approvedAmt = Number(result.updated.approvedAmount)
    const retAmt = Number(result.updated.returnAmount ?? 0)
    const netSpend = approvedAmt - retAmt

    // Notify admins + managers when unused funds are returned
    if (retAmt > 0) {
      try {
        const managers = await prisma.users.findMany({
          where: { isActive: true, OR: [{ role: 'admin' }, { role: 'manager' }] },
          select: { id: true },
        })
        const managerIds = managers.map((m) => m.id)
        if (managerIds.length > 0) {
          const settlerName = result.updated.settler?.name ?? 'Unknown'
          await emitNotification({
            userIds: managerIds,
            type: 'PAYMENT_SUBMITTED',
            title: '💵 Unused Petty Cash Returned',
            message: `${settlerName} confirmed receipt of $${retAmt.toFixed(2)} unused funds from "${pcRequest.purpose}" — credited to cash bucket`,
            linkUrl: `/petty-cash/${requestId}`,
          })
        }
      } catch {
        // Non-critical — don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Petty cash request settled',
      data: {
        request: {
          id: result.updated.id,
          status: result.updated.status,
          approvedAmount: approvedAmt,
          returnAmount: retAmt,
          netSpend,
          settledAt: result.updated.settledAt?.toISOString(),
          settler: result.updated.settler,
          returnPaymentId: result.returnPaymentId,
        },
      },
    })
  } catch (error) {
    console.error('Error settling petty cash request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to settle petty cash request' },
      { status: 500 }
    )
  }
}
