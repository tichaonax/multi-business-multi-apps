import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { createAuditLog } from '@/lib/audit'

// Same set the existing petty-cash reversal uses — anything already counted
// against the account's balance (not just a draft/queued request).
const REVERSIBLE_STATUSES = ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'PAID']

/**
 * POST /api/expense-account/payments/[paymentId]/reverse
 *
 * Fully reverses a payment that was recorded in error (e.g. an accidental
 * duplicate) — as opposed to editing its amount down, which silently relies
 * on a separate "adjustment deposit" being created to compensate and leaves
 * a confusing paper trail (a fake-looking deposit next to a near-zero
 * payment) if that step doesn't happen cleanly.
 *
 * Sets status=REVERSED (same status the existing reverse-to-petty-cash flow
 * uses), which excludes it from updateExpenseAccountBalanceTx's payment sum
 * — the freed-up balance IS the correction, no compensating deposit needed.
 * Unlike reverse-to-petty-cash, this does NOT spawn a new PettyCashRequest —
 * it's for "this payment should never have happened," not "this should have
 * gone through petty cash instead."
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId } = await params
    const body = await request.json().catch(() => ({}))
    const reason: string = body?.reason?.trim() || ''
    if (!reason) return NextResponse.json({ error: 'A reversal reason is required' }, { status: 400 })

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true, status: true, createdBy: true, amount: true, notes: true,
        expenseAccountId: true, reversedAt: true,
      },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const isAdmin = (user as any).role === 'admin'
    if (payment.createdBy !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (payment.reversedAt) {
      return NextResponse.json({ error: 'This payment has already been reversed' }, { status: 400 })
    }
    if (!REVERSIBLE_STATUSES.includes(payment.status)) {
      return NextResponse.json(
        { error: `Only ${REVERSIBLE_STATUSES.join(', ')} payments can be reversed` },
        { status: 400 }
      )
    }

    const now = new Date()
    const reversalTag = `[Reversed ${now.toISOString().split('T')[0]}: ${reason}]`

    const newBalance = await prisma.$transaction(async (tx) => {
      await tx.expenseAccountPayments.update({
        where: { id: paymentId },
        data: {
          status: 'REVERSED',
          reversedAt: now,
          reversedBy: user.id,
          reversalNote: reason,
          notes: payment.notes ? `${payment.notes}\n${reversalTag}` : reversalTag,
        },
      })
      return updateExpenseAccountBalanceTx(tx, payment.expenseAccountId)
    })

    await createAuditLog({
      userId: user.id,
      action: 'PAYMENT_REVERSED',
      entityType: 'ExpenseAccount',
      entityId: paymentId,
      oldValues: { status: payment.status, amount: Number(payment.amount) },
      newValues: { status: 'REVERSED', reversalNote: reason },
      metadata: { reversedBy: user.name },
    })

    return NextResponse.json({
      success: true,
      message: `Payment reversed — $${Number(payment.amount).toFixed(2)} credited back to the account.`,
      newBalance,
    })
  } catch (error) {
    console.error('Error reversing payment:', error)
    return NextResponse.json({ error: 'Failed to reverse payment' }, { status: 500 })
  }
}
