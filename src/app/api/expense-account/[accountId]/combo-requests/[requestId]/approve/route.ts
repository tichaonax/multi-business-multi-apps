import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { isComboRequestExpired, expireComboRequestTx } from '@/lib/expense-account/combo-request-expiry'
import { releaseExpenseLinesTx, approveExpenseLinesTx } from '@/lib/restaurant-expense-combo'
import { approveComboAsBusinessLoanTx, loanComboProblems, uniqueLoanNumber } from '@/lib/expense-account/combo-business-loan'
import { getLendingCashierUserIds } from '@/lib/loans/lending-cashiers'

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

    if (isComboRequestExpired(comboRequest)) {
      const expired = await prisma.$transaction(tx => expireComboRequestTx(tx, comboRequest))
      try {
        await emitNotification({
          userIds: [comboRequest.createdBy],
          type: 'COMBO_REQUEST_EXPIRED',
          title: 'Combo Request Expired',
          message: `"${comboRequest.title}" expired — it wasn't paid within 30 days of submission. Resubmit it to try again.`,
          linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
        })
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr)
      }
      return NextResponse.json({ error: `This request expired on ${expired.expiredAt?.toDateString()} — it was not paid within 30 days of submission and can no longer be approved.` }, { status: 400 })
    }

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

    // MBM-333: business-loan combo — lend the total to the target business
    // and pay the items out there (see combo-business-loan.ts)
    if (comboRequest.isBusinessLoan) {
      if (!permissions.canManageLending && user.role !== 'admin') {
        return NextResponse.json({ error: 'This request is a business loan — approving it also needs the lending permission (canManageLending)' }, { status: 403 })
      }
      const itemsTotal = comboRequest.sections.flatMap(s => s.items).reduce((s, i) => s + Number(i.estimatedAmount ?? 0), 0)
      if (Math.abs(approvedAmountNum - itemsTotal) > 0.005) {
        return NextResponse.json({ error: `A business-loan request is approved in full ($${itemsTotal.toFixed(2)}, the total of its items). To approve less, return it for changes.` }, { status: 400 })
      }
      const problems = loanComboProblems(comboRequest)
      if (problems.length > 0) {
        return NextResponse.json({ error: `Can't approve this loan yet — ${problems.join('; ')}. Return it for changes.` }, { status: 400 })
      }
      const target = await prisma.expenseAccounts.findUnique({ where: { id: comboRequest.loanExpenseAccountId! }, select: { isActive: true, businessId: true } })
      if (!target?.isActive || target.businessId !== comboRequest.loanBusinessId) {
        return NextResponse.json({ error: "The loan's receiving account is no longer an active account of that business. Return the request for changes." }, { status: 400 })
      }

      const employee = await prisma.employees.findFirst({ where: { userId: user.id }, select: { id: true } })
      const loanNumber = await uniqueLoanNumber()
      const { loan } = await prisma.$transaction(tx => approveComboAsBusinessLoanTx(tx, comboRequest, {
        userId: user.id,
        approverEmployeeId: employee?.id ?? null,
        amount: approvedAmountNum,
        approvalNote: approvalNote?.trim() || null,
        loanNumber,
      }))

      const business = await prisma.businesses.findUnique({ where: { id: comboRequest.loanBusinessId! }, select: { name: true } })
      try {
        await emitNotification({
          userIds: [comboRequest.createdBy],
          type: 'COMBO_REQUEST_APPROVED',
          title: 'Combo Request Approved as a Loan',
          message: `"${comboRequest.title}" was approved: $${approvedAmountNum.toFixed(2)} lent to ${business?.name ?? 'the business'} (${loan.loanNumber}) and set up there as ${comboRequest.sections.flatMap(s => s.items).length} payments`,
          linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
        })
        const lenders = (await getLendingCashierUserIds()).filter(id => id !== user.id)
        if (lenders.length > 0) {
          await emitNotification({
            userIds: lenders,
            type: 'LOAN_REQUEST_APPROVED',
            title: 'Loan disbursed from a combo request',
            message: `${loan.loanNumber} — $${approvedAmountNum.toFixed(2)} to ${business?.name ?? 'business'} for "${comboRequest.title}"`,
            linkUrl: `/expense-accounts/${comboRequest.loanExpenseAccountId}`,
            metadata: { loanId: loan.id, loanNumber: loan.loanNumber },
          })
        }
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr)
      }

      const fresh = await prisma.comboPaymentRequests.findUnique({ where: { id: requestId } })
      return NextResponse.json({ success: true, data: fresh })
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
          // The requester's original submission date, not the cashier's
          // approval timestamp — this is what the transaction history shows
          // as "Requested {date}" (see transaction-history.tsx paidLateNote).
          paymentDate: comboRequest.submittedAt ?? comboRequest.createdAt,
          status: 'APPROVED',
          paymentType: 'REGULAR',
          paymentChannel: 'CASH',
          notes: `Combo Request: ${comboRequest.title}`,
          createdBy: user.id,
          submittedBy: user.id,
          submittedAt: now,
        },
      })

      // MBM-286: start receipt accountability tracking the moment funds are
      // approved (the account balance is already deducted at this point —
      // see updateExpenseAccountBalanceTx below), not only once every last
      // planned item has been individually marked paid. Lets receipts be
      // added and reconciled against the approved amount from here on,
      // instead of the funds sitting untracked until full item-by-item
      // settlement. The items/[itemId] route still upserts this same row
      // as a defensive fallback for any request approved before this change.
      await tx.expensePaymentReceiptReviews.create({
        data: { expensePaymentId: linkedPayment.id, expectedAmount: approvedAmountNum },
      })

      // Mark not-funded items with approvedAmount = 0
      if (notFundedItemIds.size > 0) {
        await tx.comboPaymentRequestItems.updateMany({
          where: { id: { in: Array.from(notFundedItemIds) } },
          data: { approvedAmount: 0 },
        })
      }

      // MBM-319: unfunded recorded expenses go back to the unpaid queue; the
      // rest are approved, awaiting the requester's payment confirmation
      await releaseExpenseLinesTx(tx, { comboItemIds: Array.from(notFundedItemIds) })
      await approveExpenseLinesTx(tx, requestId)

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
