import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId, itemId } = await params

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
      include: { items: true },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })

    if (!['APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID'].includes(comboRequest.status)) {
      return NextResponse.json({ error: 'Items can only be marked paid on approved requests' }, { status: 400 })
    }

    if (comboRequest.createdBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the requester can mark items as paid' }, { status: 403 })
    }

    const item = comboRequest.items.find(i => i.id === itemId)
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    if (item.isPaid) return NextResponse.json({ error: 'Item is already marked as paid' }, { status: 400 })

    const body = await request.json()
    const { paidAmount, receiptNumber, notes } = body

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      // Mark the item as paid
      await tx.comboPaymentRequestItems.update({
        where: { id: itemId },
        data: {
          isPaid: true,
          paidAt: now,
          paidAmount: paidAmount !== undefined ? Number(paidAmount) : null,
          receiptNumber: receiptNumber?.trim() || null,
          notes: notes?.trim() || null,
        },
      })

      // Check if all items are now paid (re-fetch fresh state)
      const allItems = await tx.comboPaymentRequestItems.findMany({
        where: { requestId },
        select: { id: true, isPaid: true, approvedAmount: true },
      })

      // Items with approvedAmount = 0 are "not funded" — they don't block full settlement
      const fundedItems = allItems.filter((i: { id: string; isPaid: boolean; approvedAmount: unknown }) => !(i.approvedAmount !== null && Number(i.approvedAmount) === 0))
      const allFundedPaid = fundedItems.every((i: { id: string; isPaid: boolean }) => i.isPaid || i.id === itemId)

      let newStatus = comboRequest.status
      if (allFundedPaid) {
        newStatus = 'PAID'

        // Update linked payment to PAID
        if (comboRequest.linkedPaymentId) {
          await tx.expenseAccountPayments.update({
            where: { id: comboRequest.linkedPaymentId },
            data: { status: 'PAID', paidAt: now },
          })
          await updateExpenseAccountBalanceTx(tx, accountId)
        }
      } else {
        // Transition from APPROVED/PARTIALLY_APPROVED to PARTIALLY_PAID
        if (['APPROVED', 'PARTIALLY_APPROVED'].includes(newStatus)) {
          newStatus = 'PARTIALLY_PAID'
        }
      }

      const updatedRequest = await tx.comboPaymentRequests.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          ...(newStatus === 'PAID' ? { paidAt: now } : {}),
        },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      })

      return { updatedRequest, allFundedPaid }
    })

    // Notify cashiers when fully settled (non-blocking)
    if (result.allFundedPaid) {
      try {
        const grants = await prisma.expenseAccountGrants.findMany({
          where: { expenseAccountId: accountId, permissionLevel: 'FULL' },
          select: { userId: true },
        })
        const cashierIds = grants.map(g => g.userId).filter(id => id !== user.id)
        if (cashierIds.length > 0) {
          await emitNotification({
            userIds: cashierIds,
            type: 'COMBO_REQUEST_PAID',
            title: 'Combo Request Fully Settled',
            message: `${user.name} has settled all items in "${comboRequest.title}" — ready for sign-off`,
            linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
          })
        }
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr)
      }
    }

    return NextResponse.json({ success: true, data: result.updatedRequest })
  } catch (error) {
    console.error('Error marking item as paid:', error)
    return NextResponse.json({ error: 'Failed to mark item as paid' }, { status: 500 })
  }
}
