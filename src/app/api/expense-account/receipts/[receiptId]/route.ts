import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { isAccountCashier } from '@/lib/expense-account/receipt-review-access'
import { createAuditLog } from '@/lib/audit'

const EDITABLE_FIELDS = ['receiptDate', 'amount', 'description', 'receiptNumber', 'imageId', 'notes'] as const
const PAYEE_FIELDS = ['payeeType', 'payeeName', 'payeePersonId', 'payeeBusinessId', 'payeeSupplierId'] as const

/**
 * PUT /api/expense-account/receipts/[receiptId]
 * Edit a receipt's fields. The creator can edit their own (subject to the
 * same 7-day window as delete); a cashier for the payment's account can edit
 * any receipt during review — cashier edits are audit-logged (MBM-271).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { receiptId } = await params
    const body = await request.json()

    const receipt = await prisma.expensePaymentReceipts.findUnique({
      where: { id: receiptId },
      select: {
        id: true, createdBy: true, receiptDate: true, amount: true, description: true,
        receiptNumber: true, imageId: true, notes: true, expensePaymentId: true,
        payeeType: true, payeeName: true, payeePersonId: true, payeeBusinessId: true, payeeSupplierId: true,
        expensePayment: {
          select: {
            expenseAccountId: true,
            receipt_review: { select: { status: true } },
            payeeType: true, payeePersonId: true, payeeBusinessId: true, payeeSupplierId: true,
            payeeUserId: true, payeeEmployeeId: true,
          },
        },
      },
    })
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    const isAdmin = user.role === 'admin'
    const isOwner = receipt.createdBy === user.id
    const isCashier = await isAccountCashier(user.id, isAdmin, receipt.expensePayment.expenseAccountId)

    if (!isOwner && !isCashier) {
      return NextResponse.json({ error: 'You do not have permission to edit this receipt' }, { status: 403 })
    }

    // Once a cashier has approved the receipt set, the submitter can no longer
    // edit it — only the cashier/admin can, during a re-review (MBM-271 follow-up).
    if (isOwner && !isCashier && receipt.expensePayment.receipt_review?.status === 'APPROVED') {
      return NextResponse.json({ error: 'This receipt has already been approved by the cashier and can no longer be edited' }, { status: 403 })
    }

    const oldValues: Record<string, unknown> = {}
    const data: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        oldValues[field] = (receipt as any)[field]
        data[field] = field === 'receiptDate' ? new Date(body[field]) : body[field]
      }
    }

    // Payee change — same shape as the Add Receipt flow, including FREEFORM
    // (a one-time name, no linked record) and clearing out the other payee-id
    // columns so a type change doesn't leave a stale cross-type id behind.
    if ('payeeType' in body) {
      for (const field of PAYEE_FIELDS) oldValues[field] = (receipt as any)[field]
      const payeeType = body.payeeType || null
      data.payeeType = payeeType
      data.payeeName = payeeType === 'FREEFORM' ? (body.payeeName ?? null) : null
      data.payeePersonId = payeeType === 'PERSON' ? (body.payeePersonId ?? null) : null
      data.payeeBusinessId = payeeType === 'BUSINESS' ? (body.payeeBusinessId ?? null) : null
      data.payeeSupplierId = payeeType === 'SUPPLIER' ? (body.payeeSupplierId ?? null) : null
    }

    // Optionally also correct the parent payment's own payee — same "does this
    // also apply to the payment?" choice the Add Receipt flow offers, now
    // available from Edit too. Only meaningful for a real structured payee.
    const updatePaymentPayee = body.updatePaymentPayee === true && data.payeeType && data.payeeType !== 'FREEFORM'

    if (Object.keys(data).length === 0 && !updatePaymentPayee) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = Object.keys(data).length > 0
        ? await tx.expensePaymentReceipts.update({ where: { id: receiptId }, data })
        : receipt

      if (updatePaymentPayee) {
        await tx.expenseAccountPayments.update({
          where: { id: receipt.expensePaymentId },
          data: {
            payeeType: data.payeeType as string,
            payeePersonId: data.payeeType === 'PERSON' ? (data.payeePersonId as string | null) : null,
            payeeBusinessId: data.payeeType === 'BUSINESS' ? (data.payeeBusinessId as string | null) : null,
            payeeSupplierId: data.payeeType === 'SUPPLIER' ? (data.payeeSupplierId as string | null) : null,
            payeeUserId: null,
            payeeEmployeeId: null,
          },
        })
      }

      return r
    })

    // Only log an audit entry when a cashier amends someone else's receipt —
    // the requester editing their own draft is normal self-service, not an amendment.
    if (isCashier && !isOwner) {
      await createAuditLog({
        userId: user.id,
        action: 'RECEIPT_AMENDED',
        entityType: 'ExpensePaymentReceipt',
        entityId: receiptId,
        oldValues,
        newValues: data,
        metadata: { paymentId: receipt.expensePaymentId },
      }).catch(err => console.error('[receipts PUT] audit log error (non-blocking):', err))
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating receipt:', error)
    return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 })
  }
}

/**
 * DELETE /api/expense-account/receipts/[receiptId]
 * The creator (within 7 days) or admin may delete, same as before — now also
 * a cashier for the payment's account, audit-logged as an amendment (MBM-271).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { receiptId } = await params

    const receipt = await prisma.expensePaymentReceipts.findUnique({
      where: { id: receiptId },
      select: {
        id: true, createdBy: true, amount: true, receiptDate: true, description: true, expensePaymentId: true,
        expensePayment: { select: { expenseAccountId: true, receipt_review: { select: { status: true } } } },
      },
    })

    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    const isAdmin = user.role === 'admin'
    const isOwner = receipt.createdBy === user.id
    const isCashier = !isOwner && await isAccountCashier(user.id, isAdmin, receipt.expensePayment.expenseAccountId)

    if (!isAdmin && !isOwner && !isCashier) {
      return NextResponse.json({ error: 'You can only delete receipts you created' }, { status: 403 })
    }

    // Once a cashier has approved the receipt set, the submitter can no longer
    // delete it — only the cashier/admin can (MBM-271 follow-up).
    if (isOwner && !isAdmin && receipt.expensePayment.receipt_review?.status === 'APPROVED') {
      return NextResponse.json({ error: 'This receipt has already been approved by the cashier and can no longer be deleted' }, { status: 403 })
    }

    await prisma.expensePaymentReceipts.delete({ where: { id: receiptId } })

    if (isCashier) {
      await createAuditLog({
        userId: user.id,
        action: 'RECEIPT_AMENDED',
        entityType: 'ExpensePaymentReceipt',
        entityId: receiptId,
        oldValues: { amount: Number(receipt.amount), receiptDate: receipt.receiptDate, description: receipt.description },
        newValues: { deleted: true },
        metadata: { paymentId: receipt.expensePaymentId },
      }).catch(err => console.error('[receipts DELETE] audit log error (non-blocking):', err))
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 })
  }
}
