import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { createAuditLog } from '@/lib/audit'

/**
 * PATCH /api/expense-account/[accountId]/combo-requests/[requestId]/items/[itemId]/no-receipt
 * MBM-303: marks a planned combo item as having no receipt, with a mandatory
 * explanation — counts the item as accounted for (see the approve-gate check
 * in payments/[paymentId]/receipts/approve/route.ts) without a matching
 * receipt total. Body: { reason: string | null } — null clears the mark.
 *
 * Kept separate from the sibling items/[itemId]/route.ts PATCH: that one is
 * specifically the "mark paid" action, gated by `!item.isPaid` — an
 * unrelated precondition that would be wrong to reuse here (an item can be
 * marked no-receipt whether or not it's been flagged paid).
 */
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
      select: { id: true, createdBy: true },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })

    if (comboRequest.createdBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the requester can mark items as no-receipt' }, { status: 403 })
    }

    const item = await prisma.comboPaymentRequestItems.findFirst({
      where: { id: itemId, requestId },
      select: { id: true, description: true, noReceiptReason: true },
    })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const reason: string | null = typeof body?.reason === 'string' ? body.reason.trim() : null

    if (reason !== null && reason.length === 0) {
      return NextResponse.json({ error: 'A reason is required to mark an item as no-receipt' }, { status: 400 })
    }

    await prisma.comboPaymentRequestItems.update({
      where: { id: itemId },
      data: { noReceiptReason: reason },
    })

    await createAuditLog({
      userId: user.id,
      action: reason ? 'COMBO_ITEM_NO_RECEIPT_MARKED' : 'COMBO_ITEM_NO_RECEIPT_CLEARED',
      entityType: 'ComboPaymentRequestItem',
      entityId: itemId,
      oldValues: { noReceiptReason: item.noReceiptReason },
      newValues: { noReceiptReason: reason },
      metadata: { requestId, accountId, itemDescription: item.description },
    }).catch(err => console.error('[combo-requests items no-receipt] audit log error (non-blocking):', err))

    return NextResponse.json({ success: true, data: { noReceiptReason: reason } })
  } catch (error) {
    console.error('Error marking combo item as no-receipt:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}
