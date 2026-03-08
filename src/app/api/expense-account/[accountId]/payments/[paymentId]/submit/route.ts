import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * POST /api/expense-account/[accountId]/payments/[paymentId]/submit
 * Requester confirms the physical handover has taken place for an APPROVED payment.
 * Transitions: APPROVED → SUBMITTED
 * Only the original creator or a system admin can submit.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, paymentId } = await params
    const body = await request.json().catch(() => ({}))
    const notes: string | undefined = body?.notes?.trim() || undefined

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        expenseAccountId: true,
        status: true,
        createdBy: true,
        amount: true,
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.expenseAccountId !== accountId) {
      return NextResponse.json({ error: 'Payment does not belong to this account' }, { status: 400 })
    }

    // Only creator or system admin can submit
    if (payment.createdBy !== user.id && !isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only the original requester or an admin can confirm this payment' },
        { status: 403 }
      )
    }

    if (payment.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Payment must be in APPROVED status to submit. Current status: ${payment.status}` },
        { status: 400 }
      )
    }

    const updated = await prisma.expenseAccountPayments.update({
      where: { id: paymentId },
      data: {
        status: 'SUBMITTED',
        submittedBy: user.id,
        submittedAt: new Date(),
        ...(notes ? { notes } : {}),
      },
      select: { id: true, status: true, submittedAt: true, submittedBy: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error submitting payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit payment' },
      { status: 500 }
    )
  }
}
