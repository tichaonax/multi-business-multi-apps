import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * PUT /api/business-loans/[loanId]/withdrawal-requests/[requestId]
 *
 * Actions (body.action):
 *   approve     — admin: PENDING → APPROVED; notifies cashier + lender
 *   deny        — admin (PENDING) or cashier (APPROVED) → DENIED; body.deniedByRole + body.denialReason
 *   pay         — cashier: APPROVED → PAID (atomic tx); notifies lender
 *   rescind     — lender: PENDING or DRAFT → RESCINDED
 *   begin-edit  — lender: PENDING → DRAFT (invalidates current values for admin)
 *   cancel-edit — lender: DRAFT → PENDING (restores admin ability to act)
 *   resubmit    — lender: DRAFT or DENIED → PENDING with new amount/notes; re-notifies admin + cashier
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    const isAdmin = permissions.canManageBusinessLoans
    const isCashier = permissions.canSubmitPaymentBatch || isAdmin

    const { loanId, requestId } = await params

    const withdrawalRequest = await prisma.loanWithdrawalRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        loanId: true,
        requestNumber: true,
        requestMonth: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        notes: true,
        createdBy: true,
        loan: {
          select: {
            id: true,
            loanNumber: true,
            lenderName: true,
            status: true,
            expenseAccountId: true,
            lockedBalance: true,
            expenseAccount: { select: { balance: true } },
          },
        },
      },
    })

    if (!withdrawalRequest || withdrawalRequest.loanId !== loanId) {
      return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 })
    }

    const isRequester = withdrawalRequest.createdBy === user.id

    const body = await request.json()
    const { action } = body

    const validActions = ['approve', 'deny', 'pay', 'rescind', 'begin-edit', 'cancel-edit', 'resubmit']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 })
    }

    // ── Permission gates ────────────────────────────────────────────────────
    if (action === 'approve' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }
    if (action === 'pay' && !isCashier) {
      return NextResponse.json({ error: 'Forbidden — cashier permission required' }, { status: 403 })
    }
    if (['rescind', 'begin-edit', 'cancel-edit', 'resubmit'].includes(action) && !isRequester) {
      return NextResponse.json({ error: 'Forbidden — only the requester can perform this action' }, { status: 403 })
    }
    if (action === 'deny') {
      const deniedByRole: string = body.deniedByRole
      if (deniedByRole === 'ADMIN' && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
      }
      if (deniedByRole === 'CASHIER' && !isCashier) {
        return NextResponse.json({ error: 'Forbidden — cashier permission required' }, { status: 403 })
      }
      if (!deniedByRole || !['ADMIN', 'CASHIER'].includes(deniedByRole)) {
        return NextResponse.json({ error: 'deniedByRole must be ADMIN or CASHIER' }, { status: 400 })
      }
    }

    // Helper: find all admin user IDs
    async function getAdminIds(): Promise<string[]> {
      const admins = await prisma.users.findMany({
        where: { role: 'admin', isActive: true },
        select: { id: true },
      })
      return admins.map(u => u.id)
    }

    // Helper: find all cashier user IDs (excludes admins to avoid double-notify)
    async function getCashierIds(excludeIds: string[] = []): Promise<string[]> {
      const members = await prisma.businessMemberships.findMany({
        where: { isActive: true, role: { in: ['owner', 'manager', 'cashier'] } },
        select: { userId: true },
        distinct: ['userId'],
      })
      return [...new Set(members.map(m => m.userId))].filter(id => !excludeIds.includes(id))
    }

    const { loan } = withdrawalRequest
    const loanNumber = loan.loanNumber
    const lenderName = loan.lenderName
    const lenderUserId = withdrawalRequest.createdBy

    // ── Approve ─────────────────────────────────────────────────────────────
    if (action === 'approve') {
      if (withdrawalRequest.status === 'DRAFT') {
        return NextResponse.json(
          { error: 'Cannot approve — lender is currently editing this request' },
          { status: 409 }
        )
      }
      if (withdrawalRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Cannot approve: request is currently ${withdrawalRequest.status}` },
          { status: 400 }
        )
      }

      const { approvedAmount } = body
      if (!approvedAmount || isNaN(Number(approvedAmount)) || Number(approvedAmount) <= 0) {
        return NextResponse.json({ error: 'approvedAmount must be a positive number' }, { status: 400 })
      }
      const amount = Number(approvedAmount)

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', approvedAmount: amount, approvedBy: user.id, approvedAt: new Date() },
      })

      // Notify cashier + lender
      try {
        const adminIds = await getAdminIds()
        const cashierIds = await getCashierIds([...adminIds, lenderUserId])
        if (cashierIds.length > 0) {
          await emitNotification({
            userIds: cashierIds,
            type: 'WITHDRAWAL_ADMIN_APPROVED',
            title: 'Withdrawal Approved — Disburse Now',
            message: `Admin approved $${amount.toFixed(2)} for ${lenderName} (loan ${loanNumber}). Please hand over the cash.`,
            linkUrl: '/admin/pending-actions',
            metadata: { requestId, loanId, requestNumber: withdrawalRequest.requestNumber },
          })
        }
        await emitNotification({
          userIds: [lenderUserId],
          type: 'WITHDRAWAL_ADMIN_APPROVED',
          title: 'Withdrawal Request Approved',
          message: `Your withdrawal request for $${amount.toFixed(2)} has been approved. The cashier will disburse the funds shortly.`,
          linkUrl: `/loans/${loanId}?tab=withdrawals`,
          metadata: { requestId, loanId },
        })
      } catch (notifErr) {
        console.error('[withdrawal:approve] Notification error:', notifErr)
      }

      return NextResponse.json({ withdrawalRequest: updated })
    }

    // ── Deny (admin or cashier) ──────────────────────────────────────────────
    if (action === 'deny') {
      const deniedByRole: string = body.deniedByRole
      const { denialReason } = body

      if (!denialReason || String(denialReason).trim() === '') {
        return NextResponse.json({ error: 'denialReason is required' }, { status: 400 })
      }
      const reason = String(denialReason).trim()

      if (deniedByRole === 'ADMIN') {
        if (withdrawalRequest.status !== 'PENDING') {
          return NextResponse.json(
            { error: `Admin can only deny PENDING requests (current: ${withdrawalRequest.status})` },
            { status: 400 }
          )
        }
      } else {
        // CASHIER
        if (withdrawalRequest.status !== 'APPROVED') {
          return NextResponse.json(
            { error: `Cashier can only deny APPROVED requests (current: ${withdrawalRequest.status})` },
            { status: 400 }
          )
        }
      }

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'DENIED',
          rejectedBy: user.id,
          rejectedAt: new Date(),
          rejectionReason: reason,
          deniedByRole,
        },
      })

      // Notifications
      try {
        if (deniedByRole === 'ADMIN') {
          const displayAmount = Number(withdrawalRequest.requestedAmount)
          // Notify lender
          await emitNotification({
            userIds: [lenderUserId],
            type: 'WITHDRAWAL_DENIED_LENDER',
            title: 'Withdrawal Request Denied',
            message: `Your request for $${displayAmount.toFixed(2)} was denied by admin. Reason: ${reason}. You can edit and resubmit.`,
            linkUrl: `/loans/${loanId}?tab=withdrawals`,
            metadata: { requestId, loanId, reason },
          })
          // Notify cashier (so they don't expect disbursement)
          const adminIds = await getAdminIds()
          const cashierIds = await getCashierIds([...adminIds, lenderUserId])
          if (cashierIds.length > 0) {
            await emitNotification({
              userIds: cashierIds,
              type: 'WITHDRAWAL_CASHIER_ALERT',
              title: 'Withdrawal Request Denied by Admin',
              message: `${lenderName}'s $${displayAmount.toFixed(2)} request on loan ${loanNumber} was denied.`,
              linkUrl: '/admin/pending-actions',
              metadata: { requestId, loanId },
            })
          }
        } else {
          // CASHIER denial — notify lender + all admins
          const displayAmount = Number(withdrawalRequest.approvedAmount ?? withdrawalRequest.requestedAmount)
          await emitNotification({
            userIds: [lenderUserId],
            type: 'WITHDRAWAL_DENIED_LENDER',
            title: 'Withdrawal Could Not Be Disbursed',
            message: `The cashier could not disburse your $${displayAmount.toFixed(2)}. Reason: ${reason}. Please contact admin and resubmit when resolved.`,
            linkUrl: `/loans/${loanId}?tab=withdrawals`,
            metadata: { requestId, loanId, reason },
          })
          const adminIds = await getAdminIds()
          if (adminIds.length > 0) {
            await emitNotification({
              userIds: adminIds,
              type: 'WITHDRAWAL_DENIED_ADMIN',
              title: 'Cashier Denied a Withdrawal — Action Needed',
              message: `Cashier denied disbursement of $${displayAmount.toFixed(2)} to ${lenderName} (loan ${loanNumber}). Reason: ${reason}.`,
              linkUrl: '/admin/loans',
              metadata: { requestId, loanId, reason },
            })
          }
        }
      } catch (notifErr) {
        console.error('[withdrawal:deny] Notification error:', notifErr)
      }

      return NextResponse.json({ withdrawalRequest: updated })
    }

    // ── Pay ──────────────────────────────────────────────────────────────────
    if (action === 'pay') {
      if (withdrawalRequest.status !== 'APPROVED') {
        return NextResponse.json(
          { error: `Cannot mark paid: request must be APPROVED first (current: ${withdrawalRequest.status})` },
          { status: 400 }
        )
      }

      const expenseAccountId = withdrawalRequest.loan.expenseAccountId
      if (!expenseAccountId) {
        return NextResponse.json({ error: 'Loan has no expense account' }, { status: 400 })
      }

      const payAmount = Number(withdrawalRequest.approvedAmount)

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const payment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId,
            payeeType: 'LOAN_LENDER',
            amount: payAmount,
            paymentDate: new Date(),
            paymentType: 'LOAN_WITHDRAWAL',
            createdBy: user.id,
            status: 'SUBMITTED',
            isFullPayment: true,
          },
        })

        await tx.expenseAccounts.update({
          where: { id: expenseAccountId },
          data: { balance: { decrement: payAmount } },
        })

        const updatedRequest = await tx.loanWithdrawalRequest.update({
          where: { id: requestId },
          data: { status: 'PAID', paidBy: user.id, paidAt: new Date(), paymentId: payment.id },
        })

        return { payment, withdrawalRequest: updatedRequest }
      })

      // Notify lender
      try {
        await emitNotification({
          userIds: [lenderUserId],
          type: 'WITHDRAWAL_PAID',
          title: 'Withdrawal Payment Disbursed',
          message: `Your $${payAmount.toFixed(2)} withdrawal from loan ${loanNumber} has been paid. Please collect from the cashier.`,
          linkUrl: `/loans/${loanId}?tab=withdrawals`,
          metadata: { requestId, loanId },
        })
      } catch (notifErr) {
        console.error('[withdrawal:pay] Notification error:', notifErr)
      }

      return NextResponse.json(result)
    }

    // ── Rescind (lender self-cancels) ────────────────────────────────────────
    if (action === 'rescind') {
      if (!['PENDING', 'DRAFT'].includes(withdrawalRequest.status)) {
        return NextResponse.json(
          { error: `Cannot rescind: only PENDING or DRAFT requests can be rescinded (current: ${withdrawalRequest.status})` },
          { status: 409 }
        )
      }

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: { status: 'RESCINDED', rescindedBy: user.id, rescindedAt: new Date() },
      })

      return NextResponse.json({ success: true, status: 'RESCINDED', withdrawalRequest: updated })
    }

    // ── Begin-Edit (lender starts editing — immediately invalidates for admin) ─
    if (action === 'begin-edit') {
      if (withdrawalRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Cannot begin edit: request must be PENDING (current: ${withdrawalRequest.status})` },
          { status: 409 }
        )
      }

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: { status: 'DRAFT' },
      })

      return NextResponse.json({ success: true, status: 'DRAFT', withdrawalRequest: updated })
    }

    // ── Cancel-Edit (lender abandons the edit — restores PENDING) ───────────
    if (action === 'cancel-edit') {
      if (withdrawalRequest.status !== 'DRAFT') {
        return NextResponse.json(
          { error: `Cannot cancel edit: request must be DRAFT (current: ${withdrawalRequest.status})` },
          { status: 409 }
        )
      }

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: { status: 'PENDING' },
      })

      return NextResponse.json({ success: true, status: 'PENDING', withdrawalRequest: updated })
    }

    // ── Resubmit (lender saves edited values and re-queues for admin) ────────
    if (action === 'resubmit') {
      if (!['DRAFT', 'DENIED'].includes(withdrawalRequest.status)) {
        return NextResponse.json(
          { error: `Cannot resubmit: request must be DRAFT or DENIED (current: ${withdrawalRequest.status})` },
          { status: 409 }
        )
      }

      const { requestedAmount, notes: newNotes } = body
      if (!requestedAmount || isNaN(Number(requestedAmount)) || Number(requestedAmount) <= 0) {
        return NextResponse.json({ error: 'requestedAmount must be a positive number' }, { status: 400 })
      }
      const amount = Number(requestedAmount)

      // Validate amount <= availableToWithdraw
      const lockedBalance = Number(loan.lockedBalance ?? 0)
      const currentBalance = Number(loan.expenseAccount?.balance ?? 0)
      const availableToWithdraw = Math.max(0, Math.abs(lockedBalance) - Math.abs(currentBalance))
      if (amount > availableToWithdraw) {
        return NextResponse.json(
          { error: `Requested amount $${amount.toFixed(2)} exceeds available to withdraw $${availableToWithdraw.toFixed(2)}` },
          { status: 422 }
        )
      }

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'PENDING',
          requestedAmount: amount,
          notes: newNotes ?? null,
          // Clear any prior denial fields
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
          deniedByRole: null,
        },
      })

      // Re-notify admin + cashier
      try {
        const adminIds = await getAdminIds()
        const notesSummary = newNotes?.trim() ? ` Notes: "${newNotes.trim()}"` : ''
        if (adminIds.length > 0) {
          await emitNotification({
            userIds: adminIds,
            type: 'WITHDRAWAL_SUBMITTED',
            title: 'Withdrawal Request Resubmitted',
            message: `${user.name} updated and resubmitted their withdrawal request for $${amount.toFixed(2)} on loan ${loanNumber}.${notesSummary}`,
            linkUrl: '/admin/loans',
            metadata: { requestId, loanId, requestNumber: withdrawalRequest.requestNumber },
          })
        }
        const cashierIds = await getCashierIds([...adminIds, lenderUserId])
        if (cashierIds.length > 0) {
          await emitNotification({
            userIds: cashierIds,
            type: 'WITHDRAWAL_CASHIER_ALERT',
            title: 'Withdrawal Request Resubmitted — Awaiting Admin Approval',
            message: `${user.name} resubmitted a request for $${amount.toFixed(2)} from loan ${loanNumber}. Admin must approve before you can disburse.`,
            linkUrl: '/admin/pending-actions',
            metadata: { requestId, loanId, requestNumber: withdrawalRequest.requestNumber },
          })
        }
      } catch (notifErr) {
        console.error('[withdrawal:resubmit] Notification error:', notifErr)
      }

      return NextResponse.json({ withdrawalRequest: updated })
    }

    // Should not reach here (validActions guard above)
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('PUT /api/business-loans/[loanId]/withdrawal-requests/[requestId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
