import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/**
 * POST /api/expense-account-payments/collect
 * Body: { paymentId }
 * Marks an APPROVED payment as PAID (cash collected by requester).
 * Stamps paidAt = now and recalculates expense account balance.
 * Only the original requester can mark their own payment as collected.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId } = await request.json()
    if (!paymentId) return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, createdBy: true, expenseAccountId: true },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.createdBy !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (payment.status !== 'APPROVED') {
      return NextResponse.json({ error: `Payment is ${payment.status}, not APPROVED` }, { status: 400 })
    }

    const now = new Date()
    await prisma.$transaction(async (tx: any) => {
      await tx.expenseAccountPayments.update({
        where: { id: paymentId },
        data: { status: 'PAID', paidAt: now },
      })
      await updateExpenseAccountBalanceTx(tx, payment.expenseAccountId)
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/expense-account-payments/collect]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
