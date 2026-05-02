import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only cashiers or admins can approve combo requests' }, { status: 403 })
    }

    const body = await request.json()
    const { approvedAmount, approvalNote } = body

    if (approvedAmount === undefined || approvedAmount === null) {
      return NextResponse.json({ error: 'approvedAmount is required' }, { status: 400 })
    }

    const approvedAmountNum = Number(approvedAmount)
    if (isNaN(approvedAmountNum) || approvedAmountNum <= 0) {
      return NextResponse.json({ error: 'approvedAmount must be a positive number' }, { status: 400 })
    }

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
      include: {
        sections: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })
    if (comboRequest.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Only SUBMITTED requests can be approved' }, { status: 400 })
    }

    // Check account balance
    const effectiveRequestedAmount = Number(comboRequest.overrideAmount ?? comboRequest.requestedAmount)
    const depositsAgg = await prisma.expenseAccountDeposits.aggregate({
      where: { expenseAccountId: accountId },
      _sum: { amount: true },
    })
    const paymentsAgg = await prisma.expenseAccountPayments.aggregate({
      where: { expenseAccountId: accountId, status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] } },
      _sum: { amount: true },
    })
    const availableBalance = Number(depositsAgg._sum.amount || 0) - Number(paymentsAgg._sum.amount || 0)

    if (approvedAmountNum > availableBalance) {
      return NextResponse.json({
        error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Requested approval: $${approvedAmountNum.toFixed(2)}`,
      }, { status: 400 })
    }

    const isPartial = approvedAmountNum < effectiveRequestedAmount
    const newStatus = isPartial ? 'PARTIALLY_APPROVED' : 'APPROVED'
    const now = new Date()

    // Determine which items are not funded (cumulative from the bottom)
    const allItems = comboRequest.sections.flatMap(s => s.items)
    const notFundedItemIds = new Set<string>()
    if (isPartial) {
      let cumulative = 0
      for (const item of [...allItems].reverse()) {
        const amt = Number(item.estimatedAmount || 0)
        if (cumulative + amt > effectiveRequestedAmount - approvedAmountNum) break
        notFundedItemIds.add(item.id)
        cumulative += amt
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Create the linked ExpenseAccountPayments record to deduct balance
      const linkedPayment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: accountId,
          payeeType: 'COMBO',
          amount: approvedAmountNum,
          paymentDate: now,
          status: 'APPROVED',
          paymentType: 'REGULAR',
          paymentChannel: 'CASH',
          notes: `Combo Request: ${comboRequest.title}`,
          createdBy: user.id,
          submittedBy: user.id,
          submittedAt: now,
        },
      })

      // Mark not-funded items with approvedAmount = 0
      if (notFundedItemIds.size > 0) {
        await tx.comboPaymentRequestItems.updateMany({
          where: { id: { in: Array.from(notFundedItemIds) } },
          data: { approvedAmount: 0 },
        })
      }

      // Update the combo request
      const req = await tx.comboPaymentRequests.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          approvedAmount: approvedAmountNum,
          approvalNote: approvalNote?.trim() || null,
          approvedBy: user.id,
          approvedAt: now,
          linkedPaymentId: linkedPayment.id,
        },
        include: {
          creator: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      })

      await updateExpenseAccountBalanceTx(tx, accountId)

      return req
    })

    // Notify requester (non-blocking)
    try {
      const isPartialResult = updated.status === 'PARTIALLY_APPROVED'
      await emitNotification({
        userIds: [comboRequest.createdBy],
        type: isPartialResult ? 'COMBO_REQUEST_PARTIALLY_APPROVED' : 'COMBO_REQUEST_APPROVED',
        title: isPartialResult ? 'Combo Request Partially Approved' : 'Combo Request Approved',
        message: isPartialResult
          ? `Your request "${comboRequest.title}" was partially approved for $${approvedAmountNum.toFixed(2)} of $${effectiveRequestedAmount.toFixed(2)}${approvalNote ? `. Note: ${approvalNote}` : ''}`
          : `Your request "${comboRequest.title}" has been approved for $${approvedAmountNum.toFixed(2)}`,
        linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
      })
    } catch (notifErr) {
      console.error('Notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error approving combo request:', error)
    return NextResponse.json({ error: 'Failed to approve combo request' }, { status: 500 })
  }
}
