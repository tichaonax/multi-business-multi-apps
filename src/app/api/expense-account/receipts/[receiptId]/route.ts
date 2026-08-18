import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { isAccountCashier } from '@/lib/expense-account/receipt-review-access'
import { createAuditLog } from '@/lib/audit'

const EDITABLE_FIELDS = ['receiptDate', 'amount', 'description', 'receiptNumber', 'imageId', 'notes'] as const

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
        receiptNumber: true, imageId: true, notes: true,
        expensePayment: { select: { expenseAccountId: true } },
      },
    })
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    const isAdmin = user.role === 'admin'
    const isOwner = receipt.createdBy === user.id
    const isCashier = await isAccountCashier(user.id, isAdmin, receipt.expensePayment.expenseAccountId)

    if (!isOwner && !isCashier) {
      return NextResponse.json({ error: 'You do not have permission to edit this receipt' }, { status: 403 })
    }

    const oldValues: Record<string, unknown> = {}
    const data: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        oldValues[field] = (receipt as any)[field]
        data[field] = field === 'receiptDate' ? new Date(body[field]) : body[field]
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    const updated = await prisma.expensePaymentReceipts.update({ where: { id: receiptId }, data })

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
        metadata: { paymentId: updated.expensePaymentId },
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
        expensePayment: { select: { expenseAccountId: true } },
      },
    })

    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

    const isAdmin = user.role === 'admin'
    const isOwner = receipt.createdBy === user.id
    const isCashier = !isOwner && await isAccountCashier(user.id, isAdmin, receipt.expensePayment.expenseAccountId)

    if (!isAdmin && !isOwner && !isCashier) {
      return NextResponse.json({ error: 'You can only delete receipts you created' }, { status: 403 })
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
